// Plane 5 — the only place in the system allowed to know that a blockchain
// exists.
//
// Chain independence is the product, not a posture: a bank does not buy a
// dependency on one network, and the choice will change at least once during
// the life of a commercial contract. The promise is only real if `Symbol`,
// `Pubkey`, `Bytes<32>` and their kin never leak upward. Everything the core
// hands an adapter is already a hex hash or a plain string; everything an
// adapter returns is the same.
//
// Adapters live in separate packages (`@dpo2u/adapter-stellar`, and later
// Solana, Midnight or a dedicated network). This module defines the contract
// and nothing else — the core must not import an implementation.
//
// Networks are not interchangeable in what they can *record*, and pretending
// otherwise is how an attestation ends up meaning one thing in the core and
// another on chain. So a network declares what it can preserve, and the core
// refuses to anchor semantics that would be silently dropped.

import type { Attestation, Revocation } from './attestation.js';
import type { Verdict } from './predicate.js';

/**
 * What an anchor can actually store. Declared per network, checked before
 * every write.
 *
 * This is the same principle as the Travel Rule enablement handshake, applied
 * one layer down: establish what the other side can do *before* handing it
 * something, rather than discovering the gap from a missing field years later
 * during an audit.
 */
export interface NetworkCapabilities {
  /** Stores an explicit end of validity, not merely an issuance timestamp. */
  readonly validityWindow: boolean;
  /** Records a revocation against an already-anchored attestation. */
  readonly revocation: boolean;
  /** Stores the policy-pack hash, not only a pack name and version number. */
  readonly packHash: boolean;
  /** Stores the jurisdiction whose rules the pack encoded. */
  readonly jurisdiction: boolean;
}

export interface NetworkDescriptor {
  /** Stable adapter identifier, e.g. `stellar-testnet`. */
  readonly id: string;
  readonly displayName: string;
  /** True when anyone can read the anchor without credentials or cooperation. */
  readonly publiclyVerifiable: boolean;
  readonly capabilities: NetworkCapabilities;
}

/** What the anchor stores. Deliberately minimal: no personal data, ever. */
export interface AnchorRecord {
  readonly useCaseId: string;
  readonly verdict: Verdict;
  readonly evidenceCommitment: string;
  readonly resultHash: string;
  readonly packHash?: string;
  readonly packVersion: number;
  readonly jurisdiction?: string;
  readonly issuer: string;
  readonly issuedAt: Date;
  readonly validUntil?: Date;
  readonly revocation?: Revocation;
}

export interface AnchorReceipt {
  /** Network-native transaction identifier, opaque to the core. */
  readonly txId: string;
  /** Where a third party can look it up without asking the institution. */
  readonly explorerUrl?: string;
  readonly anchoredAt: Date;
}

/**
 * The narrow interface every network implements. Narrow on purpose: anything a
 * network offers beyond these operations is convenience, not requirement, and
 * accepting it into the interface would make the next adapter harder to write.
 */
export interface ChainAdapter {
  readonly network: NetworkDescriptor;

  /** Write an attestation. Must reject a duplicate rather than overwrite it. */
  register(attestation: Attestation): Promise<AnchorReceipt>;

  /** Read-only, no credentials — this is what an external auditor calls. */
  read(useCaseId: string, evidenceCommitment: string): Promise<AnchorRecord | null>;

  /** Record a revocation against an existing anchor. */
  revoke(
    useCaseId: string,
    evidenceCommitment: string,
    revocation: Revocation,
  ): Promise<AnchorReceipt>;

  /** Add or remove a submitter from the authorized set. */
  setAuthorized(submitter: string, allowed: boolean): Promise<AnchorReceipt>;
}

export class DuplicateAttestationError extends Error {
  constructor(useCaseId: string, evidenceCommitment: string) {
    super(`attestation already anchored for ${useCaseId}/${evidenceCommitment}`);
    this.name = 'DuplicateAttestationError';
  }
}

export class NotAuthorizedError extends Error {
  constructor(submitter: string) {
    super(`submitter not authorized: ${submitter}`);
    this.name = 'NotAuthorizedError';
  }
}

/**
 * Raised when anchoring would strip meaning the attestation depends on — an
 * attestation that expires in the core but never expires on chain is worse than
 * no anchor at all, because a verifier reading only the chain would treat a
 * lapsed assertion as current.
 */
export class UnpreservableSemanticsError extends Error {
  constructor(
    readonly networkId: string,
    readonly missing: readonly string[],
  ) {
    super(
      `network "${networkId}" cannot preserve: ${missing.join(', ')}. ` +
        'Anchor without it, or use a network whose record carries it.',
    );
    this.name = 'UnpreservableSemanticsError';
  }
}

/**
 * Fields the anchor will not carry for this attestation.
 *
 * Split by consequence. `blocking` entries change what the record *means* to
 * someone reading only the chain. `reduced` entries lose detail the verifier
 * can still recover from the off-chain pack, given the result hash — worth
 * writing to the audit trail, not worth refusing the write.
 */
export interface AnchorFidelity {
  readonly blocking: readonly string[];
  readonly reduced: readonly string[];
  readonly faithful: boolean;
}

export function anchorFidelity(
  attestation: Attestation,
  network: NetworkDescriptor,
): AnchorFidelity {
  const blocking: string[] = [];
  const reduced: string[] = [];
  const caps = network.capabilities;

  // An unrecorded expiry silently promotes a lapsed assertion to a current one.
  if (attestation.validUntil && !caps.validityWindow) {
    blocking.push('validUntil');
  }
  // Likewise a revocation that exists off chain and not on it.
  if (attestation.revocation && !caps.revocation) {
    blocking.push('revocation');
  }

  if (!caps.packHash) reduced.push('packHash');
  if (!caps.jurisdiction) reduced.push('jurisdiction');

  return {
    blocking,
    reduced,
    faithful: blocking.length === 0 && reduced.length === 0,
  };
}

/** Throws when the network would drop meaning the attestation depends on. */
export function assertAnchorable(
  attestation: Attestation,
  network: NetworkDescriptor,
): void {
  const fidelity = anchorFidelity(attestation, network);
  if (fidelity.blocking.length > 0) {
    throw new UnpreservableSemanticsError(network.id, fidelity.blocking);
  }
}

/** Projection used by adapters, so no adapter reconstructs it differently. */
export function toAnchorRecord(
  attestation: Attestation,
  network?: NetworkDescriptor,
): AnchorRecord {
  const caps = network?.capabilities;
  return {
    useCaseId: attestation.useCaseId,
    verdict: attestation.verdict,
    evidenceCommitment: attestation.evidenceCommitment,
    resultHash: attestation.resultHash,
    packVersion: attestation.packVersion,
    issuer: attestation.issuer,
    issuedAt: attestation.issuedAt,
    ...(caps && !caps.packHash ? {} : { packHash: attestation.packHash }),
    ...(caps && !caps.jurisdiction ? {} : { jurisdiction: attestation.jurisdiction }),
    ...(attestation.validUntil ? { validUntil: attestation.validUntil } : {}),
    ...(attestation.revocation ? { revocation: attestation.revocation } : {}),
  };
}
