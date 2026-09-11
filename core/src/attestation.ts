// The attestation record and, above all, its freshness.
//
// With perpetual KYC now the operating standard for essentially every surveyed
// bank, a point-in-time attestation loses value every day it ages. A record
// that carries only a timestamp cannot answer the one question a relying party
// actually asks: *is this still true right now?*
//
// So validity and revocation are part of the record, not metadata bolted on
// later. The Anchor registry in the Solana repository already models this
// (`expires_at`, `revoked_at`, `revocation_reason`); the Soroban contract does
// not. This is the shape the anchor should converge on.
//
// The same mechanism serves the Travel Rule enablement handshake: proving a
// counterparty holds a licence is worthless if the proof may describe a licence
// revoked last month.

import { assertHash32, hashCanonical } from './canonical.js';
import type { Evaluation } from './engine.js';
import type { Verdict } from './predicate.js';

export interface AttestationInput {
  readonly useCaseId: string;
  readonly verdict: Verdict;
  readonly evidenceCommitment: string;
  readonly resultHash: string;
  readonly packHash: string;
  readonly packVersion: number;
  readonly jurisdiction: string;
  /** Who asserts it — an authorized submitter, not a natural person. */
  readonly issuer: string;
  readonly issuedAt: Date;
  /**
   * When the assertion stops standing on its own. Absent means indefinite,
   * which should be rare and deliberate: for anything driven by a watchlist or
   * an ownership structure, indefinite is the wrong answer.
   */
  readonly validUntil?: Date;
}

export interface Revocation {
  readonly revokedAt: Date;
  readonly reason: string;
}

export interface Attestation extends AttestationInput {
  readonly revocation?: Revocation;
  /** Identity of the record, used as the anchor key. */
  readonly attestationHash: string;
}

export function createAttestation(input: AttestationInput): Attestation {
  assertHash32(input.evidenceCommitment, 'evidenceCommitment');
  assertHash32(input.resultHash, 'resultHash');
  assertHash32(input.packHash, 'packHash');

  if (input.validUntil && input.validUntil.getTime() <= input.issuedAt.getTime()) {
    throw new RangeError('validUntil must be after issuedAt');
  }

  const attestationHash = hashCanonical({
    useCaseId: input.useCaseId,
    verdict: input.verdict,
    evidenceCommitment: input.evidenceCommitment,
    resultHash: input.resultHash,
    packHash: input.packHash,
    packVersion: input.packVersion,
    jurisdiction: input.jurisdiction,
    issuer: input.issuer,
    issuedAt: input.issuedAt.toISOString(),
    validUntil: input.validUntil ? input.validUntil.toISOString() : null,
  });

  return { ...input, attestationHash };
}

/** Build an attestation straight from an evaluation, carrying the bindings over. */
export function attestationFromEvaluation(
  evaluation: Evaluation,
  opts: { issuer: string; validUntil?: Date },
): Attestation {
  return createAttestation({
    useCaseId: evaluation.useCaseId,
    verdict: evaluation.verdict,
    evidenceCommitment: evaluation.evidenceCommitment,
    resultHash: evaluation.resultHash,
    packHash: evaluation.packHash,
    packVersion: evaluation.packVersion,
    jurisdiction: evaluation.jurisdiction,
    issuer: opts.issuer,
    issuedAt: evaluation.evaluatedAt,
    validUntil: opts.validUntil,
  });
}

export function revoke(attestation: Attestation, revocation: Revocation): Attestation {
  if (revocation.revokedAt.getTime() < attestation.issuedAt.getTime()) {
    throw new RangeError('revokedAt cannot precede issuedAt');
  }
  // The hash covers the assertion, not its withdrawal, so it is stable across
  // revocation — the anchor key must not move when a record is revoked.
  return { ...attestation, revocation };
}

export type FreshnessStatus = 'VALID' | 'EXPIRED' | 'REVOKED' | 'STALE';

export interface FreshnessAssessment {
  readonly status: FreshnessStatus;
  readonly reason: string;
  /** Whole seconds since issuance, for the caller's own policy. */
  readonly ageSeconds: number;
}

export interface FreshnessPolicy {
  /**
   * How old an assertion may be before this relying party stops accepting it,
   * regardless of `validUntil`. This is the relying party's call, not the
   * issuer's — a counterparty may accept a six-month-old check where a
   * supervisor would not.
   */
  readonly maxAgeSeconds?: number;
}

/**
 * Answers "is this still true right now?" — the question a timestamp alone
 * cannot answer. Revocation beats expiry, expiry beats staleness, because that
 * is the order in which a supervisor would read them.
 */
export function assessFreshness(
  attestation: Attestation,
  now: Date,
  policy: FreshnessPolicy = {},
): FreshnessAssessment {
  const ageSeconds = Math.floor((now.getTime() - attestation.issuedAt.getTime()) / 1000);

  if (attestation.revocation && attestation.revocation.revokedAt.getTime() <= now.getTime()) {
    return {
      status: 'REVOKED',
      reason: attestation.revocation.reason,
      ageSeconds,
    };
  }

  if (attestation.validUntil && attestation.validUntil.getTime() <= now.getTime()) {
    return {
      status: 'EXPIRED',
      reason: `validity ended at ${attestation.validUntil.toISOString()}`,
      ageSeconds,
    };
  }

  if (policy.maxAgeSeconds !== undefined && ageSeconds > policy.maxAgeSeconds) {
    return {
      status: 'STALE',
      reason: `age ${ageSeconds}s exceeds relying-party limit of ${policy.maxAgeSeconds}s`,
      ageSeconds,
    };
  }

  return { status: 'VALID', reason: 'within validity and freshness limits', ageSeconds };
}

/** A relying party should act on the assertion only when this is true. */
export function isAcceptable(
  attestation: Attestation,
  now: Date,
  policy: FreshnessPolicy = {},
): boolean {
  return assessFreshness(attestation, now, policy).status === 'VALID';
}
