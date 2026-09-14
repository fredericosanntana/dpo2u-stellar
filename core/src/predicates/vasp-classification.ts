// Counterparty classification — the check both market guides name repeatedly
// and phase 0 of the portable Travel Rule design depends on.
//
// Before any obligation can be derived, you have to establish what the other
// side *is*: a licensed provider, an unregulated one, or an unhosted wallet
// with nobody on the other end. Resolution BCB 520 article 89 phases this in
// from February 2027 domestically and February 2028 across borders, and — this
// is the opening — permits the provider to rely on a documented customer
// self-declaration to identify the parties throughout both phases.
//
// Self-declaration is the weakest control there is. This predicate treats it as
// such: it passes, because the norm allows it, but never silently. A proof of
// address control bound to a verified identity is what upgrades that branch,
// and the outcome distinguishes the two so an institution can see how much of
// its book rests on someone's word.

import type { EvidenceView, Predicate, PredicateOutcome } from '../predicate.js';

export type CounterpartyKind =
  | 'licensed_provider'
  | 'unregulated_provider'
  | 'unhosted_wallet'
  | 'unknown';

export type AttributionBasis =
  | 'proof_of_control'
  | 'anchored_attestation'
  | 'directory_lookup'
  | 'self_declaration'
  | 'none';

export interface VaspClassificationParams {
  /** Bases this institution accepts. Order carries no meaning; presence does. */
  readonly acceptedBases: readonly AttributionBasis[];
  /** Whether transfers to unhosted wallets are permitted at all. */
  readonly allowUnhostedWallet: boolean;
  /** Licence evidence older than this is not acted upon. */
  readonly maxLicenceAgeDays: number;
}

export const vaspClassification: Predicate<VaspClassificationParams> = {
  id: 'vasp_classification',
  version: 1,
  reads: ['counterpartyKind', 'attributionBasis', 'licenceEvidenceAgeDays'],

  validateParams(params) {
    if (params.acceptedBases.length === 0) {
      throw new TypeError('acceptedBases must list at least one accepted basis');
    }
    if (params.acceptedBases.includes('none')) {
      throw new TypeError('"none" is not an acceptable attribution basis');
    }
    if (!Number.isInteger(params.maxLicenceAgeDays) || params.maxLicenceAgeDays < 1) {
      throw new RangeError(
        `maxLicenceAgeDays must be a positive integer, got ${params.maxLicenceAgeDays}`,
      );
    }
  },

  evaluate(evidence: EvidenceView, params: VaspClassificationParams): PredicateOutcome {
    const kind = evidence.fields.counterpartyKind as CounterpartyKind;
    const basis = evidence.fields.attributionBasis as AttributionBasis;
    const licenceAge = evidence.fields.licenceEvidenceAgeDays as number | null;

    const detail = { kind, basis, licenceEvidenceAgeDays: licenceAge };

    if (basis === 'none' || !params.acceptedBases.includes(basis)) {
      return { verdict: 'FAIL', reason: 'counterparty.attribution_basis_not_accepted', detail };
    }

    if (kind === 'unknown') {
      return { verdict: 'FAIL', reason: 'counterparty.unclassified', detail };
    }

    if (kind === 'unhosted_wallet') {
      if (!params.allowUnhostedWallet) {
        return { verdict: 'FAIL', reason: 'counterparty.unhosted_wallet_not_permitted', detail };
      }
      // Permitted by the norm on a documented self-declaration, but the whole
      // assurance rests on the customer's word — surfaced, never buried.
      if (basis === 'self_declaration') {
        return { verdict: 'REVIEW', reason: 'counterparty.unhosted_on_self_declaration', detail };
      }
      return { verdict: 'PASS', reason: 'counterparty.unhosted_with_proof_of_control', detail };
    }

    if (kind === 'unregulated_provider') {
      return { verdict: 'REVIEW', reason: 'counterparty.provider_not_licensed', detail };
    }

    // Licensed provider: a licence proven long ago may have been withdrawn
    // since. Freshness is part of the check, not a detail of it.
    if (licenceAge === null) {
      return { verdict: 'REVIEW', reason: 'counterparty.licence_age_unknown', detail };
    }
    if (licenceAge > params.maxLicenceAgeDays) {
      return { verdict: 'REVIEW', reason: 'counterparty.licence_evidence_stale', detail };
    }

    return { verdict: 'PASS', reason: 'counterparty.licensed_and_fresh', detail };
  },
};
