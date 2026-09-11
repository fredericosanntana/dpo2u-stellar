// UC-1 `bank_change_v1` — supplier bank-detail change, ported from the
// anti-corruption pilot PRD (§5.1) predicate by predicate.
//
// The pilot wrote these for municipal procurement. They are, unchanged, the
// vendor-payment fraud control that the B2B payments literature describes:
// invoice and vendor-master schemes are a fifth of occupational fraud cases,
// with a median fourteen months to detection. The control is the same; only the
// buyer changes.
//
// Note what the evidence view carries: booleans, not identifiers. The collector
// compares the new account holder against the registered supplier *inside the
// perimeter* and hands over the result. No tax number ever reaches a predicate,
// so none can reach an attestation.

import type { EvidenceView, Predicate, PredicateOutcome } from '../predicate.js';

interface NoParams {
}

const NO_PARAMS: NoParams = {};

/** P1.1 — account holder must be the registered supplier. */
export const bankChangeAccountHolder: Predicate<NoParams> = {
  id: 'bank_change_holder',
  version: 1,
  reads: ['holderMatchesSupplier', 'sharesCnpjRoot', 'hasPowerOfAttorney'],
  validateParams() {},
  evaluate(evidence: EvidenceView): PredicateOutcome {
    const matches = evidence.fields.holderMatchesSupplier as boolean;
    const sameRoot = evidence.fields.sharesCnpjRoot as boolean;
    const poa = evidence.fields.hasPowerOfAttorney as boolean;

    if (matches) {
      return { verdict: 'PASS', reason: 'holder.matches_supplier' };
    }
    // Same corporate root is the branch/subsidiary case — plausible, and the
    // single most exploited path in this fraud, so a human looks at it.
    if (sameRoot) {
      return { verdict: 'REVIEW', reason: 'holder.same_corporate_root' };
    }
    if (poa) {
      return { verdict: 'REVIEW', reason: 'holder.differs_with_power_of_attorney' };
    }
    return { verdict: 'FAIL', reason: 'holder.differs_without_power_of_attorney' };
  },
};

/** P1.2 — the request must arrive through an authenticated official channel. */
export const bankChangeRequestOrigin: Predicate<NoParams> = {
  id: 'bank_change_origin',
  version: 1,
  reads: ['channel', 'strongAuthentication'],
  validateParams() {},
  evaluate(evidence: EvidenceView): PredicateOutcome {
    const channel = evidence.fields.channel as string;
    const strongAuth = evidence.fields.strongAuthentication as boolean;

    if (channel === 'email' && !strongAuth) {
      return { verdict: 'FAIL', reason: 'origin.email_without_strong_authentication' };
    }
    if (channel === 'official_portal' && strongAuth) {
      return { verdict: 'PASS', reason: 'origin.authenticated_official_channel' };
    }
    return { verdict: 'REVIEW', reason: 'origin.channel_not_conclusive' };
  },
};

export interface RecentChangeParams {
  readonly windowDays: number;
}

/** P1.3 — no other bank-detail change for this supplier in the window. */
export const bankChangeRecentHistory: Predicate<RecentChangeParams> = {
  id: 'bank_change_history',
  version: 1,
  reads: ['daysSinceLastBankChange'],
  validateParams(params) {
    if (!Number.isInteger(params.windowDays) || params.windowDays < 1) {
      throw new RangeError(`windowDays must be a positive integer, got ${params.windowDays}`);
    }
  },
  evaluate(evidence: EvidenceView, params: RecentChangeParams): PredicateOutcome {
    const days = evidence.fields.daysSinceLastBankChange as number | null;

    if (days === null) {
      return { verdict: 'PASS', reason: 'history.no_previous_change' };
    }
    if (days < params.windowDays) {
      return {
        verdict: 'REVIEW',
        reason: 'history.recent_change_within_window',
        detail: { daysSinceLastBankChange: days, windowDays: params.windowDays },
      };
    }
    return { verdict: 'PASS', reason: 'history.no_recent_change' };
  },
};

export interface ImminentPaymentParams {
  readonly windowHours: number;
}

/**
 * P1.4 — no payment scheduled in the window.
 *
 * Change the account, then collect the payment already in flight: this pairing
 * is the whole point of the fraud, which is why proximity alone warrants review
 * even when every other check passes.
 */
export const bankChangeImminentPayment: Predicate<ImminentPaymentParams> = {
  id: 'bank_change_payment',
  version: 1,
  reads: ['hoursToNextScheduledPayment'],
  validateParams(params) {
    if (!Number.isInteger(params.windowHours) || params.windowHours < 1) {
      throw new RangeError(`windowHours must be a positive integer, got ${params.windowHours}`);
    }
  },
  evaluate(evidence: EvidenceView, params: ImminentPaymentParams): PredicateOutcome {
    const hours = evidence.fields.hoursToNextScheduledPayment as number | null;

    if (hours === null) {
      return { verdict: 'PASS', reason: 'payment.none_scheduled' };
    }
    if (hours <= params.windowHours) {
      return {
        verdict: 'REVIEW',
        reason: 'payment.imminent',
        detail: { hoursToNextScheduledPayment: hours, windowHours: params.windowHours },
      };
    }
    return { verdict: 'PASS', reason: 'payment.not_imminent' };
  },
};

/** P1.5 — destination institution must be a regulated one. */
export const bankChangeDestination: Predicate<NoParams> = {
  id: 'bank_change_destination',
  version: 1,
  reads: ['destinationIsRegulatedInstitution'],
  validateParams() {},
  evaluate(evidence: EvidenceView): PredicateOutcome {
    const regulated = evidence.fields.destinationIsRegulatedInstitution as boolean;
    return regulated
      ? { verdict: 'PASS', reason: 'destination.regulated_institution' }
      : { verdict: 'FAIL', reason: 'destination.not_a_regulated_institution' };
  },
};

/** The five predicates of `bank_change_v1`, with the pilot's default windows. */
export function bankChangePredicates(
  opts: { windowDays?: number; windowHours?: number } = {},
) {
  return [
    { predicate: bankChangeAccountHolder, params: NO_PARAMS },
    { predicate: bankChangeRequestOrigin, params: NO_PARAMS },
    {
      predicate: bankChangeRecentHistory,
      params: { windowDays: opts.windowDays ?? 30 } satisfies RecentChangeParams,
    },
    {
      predicate: bankChangeImminentPayment,
      params: { windowHours: opts.windowHours ?? 72 } satisfies ImminentPaymentParams,
    },
    { predicate: bankChangeDestination, params: NO_PARAMS },
  ];
}
