// Evaluation — plane 3. Runs a policy pack over an evidence view and folds the
// per-predicate outcomes into one verdict.
//
// Aggregation is deliberately conservative and fixed: any FAIL fails the whole
// attestation, any REVIEW without a FAIL sends it to review, and PASS requires
// every predicate to pass. This mirrors the aggregation the anti-corruption
// pilot specified for `bank_change_v1` and keeps the rule legible to a
// supervisor, which a weighted score never is.

import { hashCanonical } from './canonical.js';
import type { PolicyPack } from './policy-pack.js';
import { predicateHash } from './predicate.js';
import type { EvidenceView, PredicateOutcome, Verdict } from './predicate.js';

export interface PredicateResult extends PredicateOutcome {
  readonly predicateId: string;
  readonly predicateVersion: number;
  /** Identity of the predicate as applied — id, version and parameters. */
  readonly predicateHash: string;
}

export interface Evaluation {
  readonly verdict: Verdict;
  readonly useCaseId: string;
  readonly packVersion: number;
  readonly packHash: string;
  readonly jurisdiction: string;
  readonly evidenceCommitment: string;
  readonly evaluatedAt: Date;
  readonly results: readonly PredicateResult[];
  /**
   * Commitment over the full result set. Lets an auditor confirm that a
   * published verdict corresponds to these per-predicate outcomes and no
   * others, without the outcomes having to go on chain.
   */
  readonly resultHash: string;
}

export class MissingEvidenceError extends Error {
  constructor(
    readonly predicateId: string,
    readonly field: string,
  ) {
    super(`predicate "${predicateId}" reads field "${field}", which the evidence view omits`);
    this.name = 'MissingEvidenceError';
  }
}

function fold(verdicts: readonly Verdict[]): Verdict {
  if (verdicts.includes('FAIL')) return 'FAIL';
  if (verdicts.includes('REVIEW')) return 'REVIEW';
  return 'PASS';
}

export function evaluate(
  pack: PolicyPack,
  evidence: EvidenceView,
  evaluatedAt: Date,
): Evaluation {
  const ctx = { jurisdiction: pack.jurisdiction, evaluatedAt };
  const results: PredicateResult[] = [];

  for (const bound of pack.predicates) {
    for (const field of bound.predicate.reads) {
      if (!(field in evidence.fields)) {
        throw new MissingEvidenceError(bound.predicate.id, field);
      }
    }

    const outcome = bound.predicate.evaluate(evidence, bound.params, ctx);
    results.push({
      ...outcome,
      predicateId: bound.predicate.id,
      predicateVersion: bound.predicate.version,
      predicateHash: predicateHash(bound),
    });
  }

  const resultHash = hashCanonical({
    packHash: pack.packHash,
    evidenceCommitment: evidence.commitment,
    evaluatedAt: evaluatedAt.toISOString(),
    results: results.map((r) => ({
      predicateHash: r.predicateHash,
      verdict: r.verdict,
      reason: r.reason,
      ...(r.detail === undefined ? {} : { detail: r.detail }),
    })),
  });

  return {
    verdict: fold(results.map((r) => r.verdict)),
    useCaseId: pack.useCaseId,
    packVersion: pack.version,
    packHash: pack.packHash,
    jurisdiction: pack.jurisdiction,
    evidenceCommitment: evidence.commitment,
    evaluatedAt,
    results,
    resultHash,
  };
}
