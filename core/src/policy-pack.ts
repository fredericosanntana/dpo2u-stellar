// A policy pack is the unit that ships to an installation and the unit an
// attestation cites. It is the answer to "under which rule was this judged?".
//
// On-premise delivery makes the pack the update channel: it crosses into the
// bank's perimeter signed, and nothing else does. The pack hash is what an
// auditor compares years later against the version recorded on chain.

import { hashCanonical, type Canonical } from './canonical.js';
import {
  assertPredicateId,
  predicateHash,
  type BoundPredicate,
  type Jurisdiction,
} from './predicate.js';

export interface PolicyPackInput {
  /** Use-case identifier, mirrored on chain as the Soroban `Symbol`. */
  readonly useCaseId: string;
  readonly version: number;
  readonly jurisdiction: Jurisdiction;
  /** Free-form citation of the norm this pack implements, for the audit file. */
  readonly basis: readonly string[];
  readonly predicates: readonly BoundPredicate[];
}

export interface PolicyPack extends PolicyPackInput {
  /** Deterministic identity of the pack, parameters included. */
  readonly packHash: string;
}

const USE_CASE_RE = /^[a-z][a-z0-9_]{2,31}$/;

export function definePolicyPack(input: PolicyPackInput): PolicyPack {
  if (!USE_CASE_RE.test(input.useCaseId)) {
    throw new TypeError(
      `useCaseId must match /^[a-z][a-z0-9_]{2,31}$/, got: ${input.useCaseId}`,
    );
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new TypeError(`pack version must be a positive integer, got: ${input.version}`);
  }
  if (input.predicates.length === 0) {
    throw new TypeError(`policy pack "${input.useCaseId}" has no predicates`);
  }

  const seen = new Set<string>();
  for (const bound of input.predicates) {
    assertPredicateId(bound.predicate.id);
    if (seen.has(bound.predicate.id)) {
      throw new TypeError(
        `predicate "${bound.predicate.id}" appears twice in pack "${input.useCaseId}"`,
      );
    }
    seen.add(bound.predicate.id);
    // Fail at pack definition, not at evaluation: a pack that cannot legally
    // exist should never reach an installation.
    bound.predicate.validateParams(bound.params);
  }

  const packHash = hashCanonical({
    useCaseId: input.useCaseId,
    version: input.version,
    jurisdiction: input.jurisdiction,
    basis: [...input.basis],
    predicates: input.predicates.map((b) => predicateHash(b)),
  } satisfies Canonical);

  return { ...input, packHash };
}

/** Every field a predicate in this pack declares it reads. */
export function requiredFields(pack: PolicyPack): readonly string[] {
  const out = new Set<string>();
  for (const bound of pack.predicates) {
    for (const f of bound.predicate.reads) out.add(f);
  }
  return [...out].sort();
}
