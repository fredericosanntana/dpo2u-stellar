// Beneficial ownership — the predicate that proves the parameterized model is
// necessary rather than elegant.
//
// Circular BCB 3.978 does not set a threshold. It requires each institution to
// set its own on a risk basis and caps it at 25%, counting direct and indirect
// holdings, and it treats a representative, attorney or agent exercising actual
// control as a beneficial owner too. Across Latin America the cap itself moves:
// 5% in Colombia and Bolivia, 10% in Argentina, Chile and Costa Rica, 15% in
// Uruguay and El Salvador, 25% in Brazil, Mexico and Peru — and several
// jurisdictions publish a control test with no single number at all.
//
// A threshold compiled in as a constant therefore cannot satisfy the norm in
// any of them. It is a parameter, it is recorded in the attestation through the
// predicate hash, and the risk basis that justifies it is carried alongside
// because a supervisor will ask for it.

import type { EvidenceView, Predicate, PredicateContext, PredicateOutcome } from '../predicate.js';

export interface UboThresholdParams {
  /** Regulatory ceiling for this jurisdiction. Brazil: 25. */
  readonly jurisdictionCapPct: number;
  /** What this institution actually applies. Must not exceed the cap. */
  readonly institutionThresholdPct: number;
  /** Reference to the internal risk assessment justifying the choice. */
  readonly riskBasisRef: string;
  /** Whether actual control counts alongside the ownership percentage. */
  readonly includeControlInFact: boolean;
}

/**
 * One party in the ownership structure. References are opaque handles minted by
 * the collector inside the perimeter — never a name or a tax number. The
 * predicate needs to count and check parties, not to know who they are.
 */
export interface OwnerRecord {
  readonly ref: string;
  /** Effective holding, direct and indirect combined. */
  readonly effectivePct: number;
  readonly identityVerified: boolean;
  readonly screened: boolean;
}

export interface ControllerRecord {
  readonly ref: string;
  readonly kind: 'representative' | 'attorney' | 'agent';
  readonly exercisesActualControl: boolean;
  readonly identityVerified: boolean;
  readonly screened: boolean;
}

export const uboThreshold: Predicate<UboThresholdParams> = {
  id: 'ubo_threshold',
  version: 1,
  reads: ['owners', 'controllers', 'unattributedOwnershipPct'],

  validateParams(params) {
    const { jurisdictionCapPct: cap, institutionThresholdPct: chosen } = params;

    if (!(cap > 0 && cap <= 100)) {
      throw new RangeError(`jurisdictionCapPct must be in (0, 100], got ${cap}`);
    }
    if (!(chosen > 0 && chosen <= 100)) {
      throw new RangeError(`institutionThresholdPct must be in (0, 100], got ${chosen}`);
    }
    // The norm caps the threshold; a looser one is not a configuration choice,
    // it is non-compliance, so the pack must not be constructible.
    if (chosen > cap) {
      throw new RangeError(
        `institutionThresholdPct ${chosen}% exceeds the jurisdiction cap of ${cap}%`,
      );
    }
    if (params.riskBasisRef.trim() === '') {
      throw new TypeError(
        'riskBasisRef is required: the threshold must be justified on a risk basis',
      );
    }
  },

  evaluate(
    evidence: EvidenceView,
    params: UboThresholdParams,
    _ctx: PredicateContext,
  ): PredicateOutcome {
    const owners = evidence.fields.owners as readonly OwnerRecord[];
    const controllers = evidence.fields.controllers as readonly ControllerRecord[];
    const unattributed = evidence.fields.unattributedOwnershipPct as number;

    const threshold = params.institutionThresholdPct;

    const ownersAbove = owners.filter((o) => o.effectivePct >= threshold);
    const controllersInScope = params.includeControlInFact
      ? controllers.filter((c) => c.exercisesActualControl)
      : [];

    const identified = ownersAbove.length + controllersInScope.length;
    const unverified =
      ownersAbove.filter((o) => !o.identityVerified).length +
      controllersInScope.filter((c) => !c.identityVerified).length;
    const unscreened =
      ownersAbove.filter((o) => o.identityVerified && !o.screened).length +
      controllersInScope.filter((c) => c.identityVerified && !c.screened).length;

    const detail = {
      thresholdPct: threshold,
      capPct: params.jurisdictionCapPct,
      identified,
      unverified,
      unscreened,
      unattributedOwnershipPct: unattributed,
      controlInFactCounted: params.includeControlInFact,
    };

    if (unverified > 0) {
      return {
        verdict: 'FAIL',
        reason: 'ubo.identity_not_verified',
        detail,
      };
    }

    if (unscreened > 0) {
      return {
        verdict: 'FAIL',
        reason: 'ubo.not_screened',
        detail,
      };
    }

    // Ownership that could not be attributed may hide a holder above the
    // threshold. That is not a pass and not yet a failure — it is the case a
    // human has to look at, which is what REVIEW exists for.
    if (unattributed >= threshold) {
      return {
        verdict: 'REVIEW',
        reason: 'ubo.ownership_chain_incomplete',
        detail,
      };
    }

    if (identified === 0) {
      // No holder reaches the threshold and the chain is accounted for. Under a
      // control test this is legitimate (widely held company), but it warrants
      // a look rather than a silent pass.
      return {
        verdict: 'REVIEW',
        reason: 'ubo.none_above_threshold',
        detail,
      };
    }

    return {
      verdict: 'PASS',
      reason: 'ubo.all_identified_and_screened',
      detail,
    };
  },
};

/**
 * Brazil under Circular BCB 3.978: cap of 25%, actual control counted. The
 * institution still has to choose its own threshold and say why.
 */
export function brazilUboParams(opts: {
  institutionThresholdPct: number;
  riskBasisRef: string;
}): UboThresholdParams {
  return {
    jurisdictionCapPct: 25,
    institutionThresholdPct: opts.institutionThresholdPct,
    riskBasisRef: opts.riskBasisRef,
    includeControlInFact: true,
  };
}
