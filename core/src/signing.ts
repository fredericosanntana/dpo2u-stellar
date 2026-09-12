// Signing, as an interface first and an implementation second.
//
// Key custody differs per installation — a bank will want its signing key in an
// HSM, a pilot will want it in a file, and neither should change the code that
// produces the signed material. So the core depends on the interface, and the
// Ed25519 implementation here is a default, not a requirement.
//
// The interface is async even though Node's Ed25519 is synchronous. An HSM or a
// remote KMS is not, and a signer that cannot be swapped for one is a signer
// that has to be rewritten the first time a real client asks.

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as nodeSign,
  verify as nodeVerify,
  type KeyObject,
} from 'node:crypto';

/** Produces detached signatures over canonical strings. */
export interface Signer {
  /** Identifies the key, so a verifier knows which one to check against. */
  readonly keyId: string;
  sign(message: string): Promise<string>;
}

/** Checks a signature against a key the caller has decided to trust. */
export interface Verifier {
  verify(message: string, signature: string, keyId: string): Promise<boolean>;
  /** Key identifiers this verifier can check. */
  knownKeyIds(): readonly string[];
}

export class UnknownKeyError extends Error {
  constructor(readonly keyId: string) {
    super(`no verifying key registered for "${keyId}"`);
    this.name = 'UnknownKeyError';
  }
}

export interface KeyMaterial {
  readonly keyId: string;
  /** PKCS#8 PEM. Never leaves the installation. */
  readonly signingKeyPem: string;
  /** SPKI PEM. Travels with every export, so a regulator can check offline. */
  readonly verifyingKeyPem: string;
}

/** Ed25519: small signatures, no parameter choices to get wrong. */
export function generateSigningMaterial(keyId: string): KeyMaterial {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    keyId,
    signingKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    verifyingKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

export class Ed25519Signer implements Signer {
  private readonly key: KeyObject;

  constructor(
    readonly keyId: string,
    signingKeyPem: string,
  ) {
    this.key = createPrivateKey(signingKeyPem);
  }

  static from(material: KeyMaterial): Ed25519Signer {
    return new Ed25519Signer(material.keyId, material.signingKeyPem);
  }

  async sign(message: string): Promise<string> {
    // Ed25519 takes no digest algorithm — passing one is an error, not a choice.
    return nodeSign(null, Buffer.from(message, 'utf8'), this.key).toString('base64');
  }
}

export class Ed25519Verifier implements Verifier {
  private readonly keys = new Map<string, KeyObject>();

  constructor(entries: readonly { keyId: string; verifyingKeyPem: string }[] = []) {
    for (const e of entries) this.trust(e.keyId, e.verifyingKeyPem);
  }

  /**
   * Registers a key as trusted. Trust is the caller's decision and has to be
   * explicit: a verifier that accepts any key presented alongside the signature
   * verifies nothing at all.
   */
  trust(keyId: string, verifyingKeyPem: string): this {
    this.keys.set(keyId, createPublicKey(verifyingKeyPem));
    return this;
  }

  knownKeyIds(): readonly string[] {
    return [...this.keys.keys()].sort();
  }

  async verify(message: string, signature: string, keyId: string): Promise<boolean> {
    const key = this.keys.get(keyId);
    if (!key) throw new UnknownKeyError(keyId);

    let sig: Buffer;
    try {
      sig = Buffer.from(signature, 'base64');
    } catch {
      return false;
    }

    try {
      return nodeVerify(null, Buffer.from(message, 'utf8'), key, sig);
    } catch {
      // Malformed signature bytes throw rather than returning false. A
      // corrupted signature is a failed verification, not a crash.
      return false;
    }
  }
}
