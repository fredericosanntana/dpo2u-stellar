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

import type { Attestation, Revocation } from './attestation.js';
import type { Verdict } from './predicate.js';

/** What the anchor stores. Deliberately minimal: no personal data, ever. */
export interface AnchorRecord {
  readonly useCaseId: string;
  readonly verdict: Verdict;
  readonly evidenceCommitment: string;
  readonly resultHash: string;
  readonly packHash: string;
  readonly packVersion: number;
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

export interface NetworkDescriptor {
  /** Stable adapter identifier, e.g. `stellar-testnet`. */
  readonly id: string;
  readonly displayName: string;
  /** True when anyone can read the anchor without credentials or cooperation. */
  readonly publiclyVerifiable: boolean;
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

/** Projection used by adapters, so no adapter reconstructs it differently. */
export function toAnchorRecord(attestation: Attestation): AnchorRecord {
  return {
    useCaseId: attestation.useCaseId,
    verdict: attestation.verdict,
    evidenceCommitment: attestation.evidenceCommitment,
    resultHash: attestation.resultHash,
    packHash: attestation.packHash,
    packVersion: attestation.packVersion,
    issuer: attestation.issuer,
    issuedAt: attestation.issuedAt,
    ...(attestation.validUntil ? { validUntil: attestation.validUntil } : {}),
    ...(attestation.revocation ? { revocation: attestation.revocation } : {}),
  };
}
