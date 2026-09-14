// Policy as versioned code — plane 1 of the architecture.
//
// A predicate is a pure, deterministic function from an evidence view to an
// outcome. It never performs I/O, never reads a clock it was not handed, and
// never knows which blockchain (if any) sits downstream. Those constraints are
// what let the same predicate run inside a bank, be replayed by an auditor, and
// be compiled into a circuit later.
//
// Jurisdiction is a *parameter*, never a fork. Circular BCB 3.978 makes this
// concrete: the beneficial-ownership threshold is chosen by each institution on
// a risk basis and merely capped at 25% — so the same predicate must accept a
// different value per institution and record which value it applied.

import { hashCanonical, type Canonical } from './canonical.js';

/** PASS / FAIL / REVIEW, matching the on-chain verdict enum. */
export type Verdict = 'PASS' | 'FAIL' | 'REVIEW';

export type Jurisdiction = string;

/**
 * What a predicate is allowed to see. Never raw evidence: the collector hands
 * over a projection plus the commitment that binds it to the source document.
 * Predicates read `fields`; the commitment travels with the outcome so a
 * verifier can tie a verdict to the evidence it was computed over.
 */
export interface EvidenceView {
  readonly commitment: string;
  readonly fields: Readonly<Record<string, unknown>>;
}

export interface PredicateOutcome {
  readonly verdict: Verdict;
  /** Stable machine-readable reason, e.g. `ubo.below_threshold`. */
  readonly reason: string;
  /**
   * Non-identifying detail safe to carry into an attestation: counts,
   * thresholds, booleans. Never names, documents, or account numbers.
   */
  readonly detail?: Canonical;
}

export interface PredicateContext {
  readonly jurisdiction: Jurisdiction;
  /** Injected, never read from the host clock — replay must be exact. */
  readonly evaluatedAt: Date;
}

export interface Predicate<P extends object = Record<string, unknown>> {
  readonly id: string;
  readonly version: number;
  /** Field names this predicate reads. Enforced by the engine. */
  readonly reads: readonly string[];
  /** Rejects parameters the norm does not allow (e.g. a threshold above the cap). */
  validateParams(params: P): void;
  evaluate(evidence: EvidenceView, params: P, ctx: PredicateContext): PredicateOutcome;
}

/** A predicate bound to the parameters one institution actually applies. */
export interface BoundPredicate<P extends object = Record<string, unknown>> {
  readonly predicate: Predicate<P>;
  readonly params: P;
}

const ID_RE = /^[a-z][a-z0-9_]{2,31}$/;

export function assertPredicateId(id: string): string {
  if (!ID_RE.test(id)) {
    throw new TypeError(
      `predicate id must match /^[a-z][a-z0-9_]{2,31}$/ (lowercase, snake_case), got: ${id}`,
    );
  }
  return id;
}

/**
 * Identity of a predicate *as applied*: id, version and the exact parameters.
 * Two institutions running `ubo_threshold` v1 at 10% and at 25% produce
 * different hashes, which is the point — the attestation must show which rule
 * was in force, not merely that a rule with that name was.
 */
export function predicateHash(bound: BoundPredicate): string {
  // Parameters are plain data by contract. `canonicalize` rejects anything that
  // cannot round-trip, so an offending parameter fails loudly at pack
  // definition rather than producing a hash nobody can reproduce.
  return hashCanonical({
    id: bound.predicate.id,
    version: bound.predicate.version,
    params: bound.params as unknown as Canonical,
  });
}

/** Convenience for predicates whose parameters need no validation. */
export function noValidation(): void {
  /* intentionally empty */
}
