import { describe, expect, it } from 'vitest';

import { canonicalize, hashCanonical } from '../canonical.js';
import { definePolicyPack, requiredFields } from '../policy-pack.js';
import { evaluate, MissingEvidenceError } from '../engine.js';
import {
  assessFreshness,
  attestationFromEvaluation,
  isAcceptable,
  revoke,
} from '../attestation.js';
import { AuditTrail, GENESIS_HASH, type TrailEntry } from '../trail.js';
import {
  anchorFidelity,
  assertAnchorable,
  toAnchorRecord,
  UnpreservableSemanticsError,
  type NetworkCapabilities,
  type NetworkDescriptor,
} from '../adapter.js';
import { predicateHash } from '../predicate.js';
import type { EvidenceView } from '../predicate.js';
import {
  bankChangePredicates,
  brazilUboParams,
  uboThreshold,
  vaspClassification,
} from '../predicates/index.js';

const T0 = new Date('2026-09-11T12:00:00.000Z');

function evidence(fields: Record<string, unknown>): EvidenceView {
  return { commitment: hashCanonical({ fields: JSON.stringify(fields) }), fields };
}

describe('canonicalization', () => {
  it('is independent of key insertion order', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  it('preserves array order, which is meaningful', () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });

  it('refuses values that cannot round-trip', () => {
    expect(() => canonicalize(Number.NaN)).toThrow(TypeError);
    expect(() => canonicalize({ a: undefined as never })).toThrow(TypeError);
  });
});

describe('ubo_threshold — the parameterized model', () => {
  const risk = { institutionThresholdPct: 10, riskBasisRef: 'ARC-2026-004' };

  it('refuses a threshold above the jurisdiction cap', () => {
    expect(() =>
      uboThreshold.validateParams({
        ...brazilUboParams({ institutionThresholdPct: 30, riskBasisRef: 'x' }),
      }),
    ).toThrow(/exceeds the jurisdiction cap/);
  });

  it('refuses a threshold with no documented risk basis', () => {
    expect(() =>
      uboThreshold.validateParams(
        brazilUboParams({ institutionThresholdPct: 25, riskBasisRef: '  ' }),
      ),
    ).toThrow(/risk basis/);
  });

  it('gives the same rule at two thresholds two different identities', () => {
    const at10 = predicateHash({
      predicate: uboThreshold,
      params: brazilUboParams(risk),
    });
    const at25 = predicateHash({
      predicate: uboThreshold,
      params: brazilUboParams({ ...risk, institutionThresholdPct: 25 }),
    });
    expect(at10).not.toBe(at25);
  });

  it('passes when every holder above the threshold is verified and screened', () => {
    const out = uboThreshold.evaluate(
      evidence({
        owners: [
          { ref: 'o1', effectivePct: 40, identityVerified: true, screened: true },
          { ref: 'o2', effectivePct: 3, identityVerified: false, screened: false },
        ],
        controllers: [],
        unattributedOwnershipPct: 0,
      }),
      brazilUboParams(risk),
      { jurisdiction: 'BR', evaluatedAt: T0 },
    );
    expect(out.verdict).toBe('PASS');
  });

  it('counts a controller exercising actual control, not only percentages', () => {
    const fields = {
      owners: [{ ref: 'o1', effectivePct: 40, identityVerified: true, screened: true }],
      controllers: [
        {
          ref: 'c1',
          kind: 'attorney' as const,
          exercisesActualControl: true,
          identityVerified: false,
          screened: false,
        },
      ],
      unattributedOwnershipPct: 0,
    };

    const counted = uboThreshold.evaluate(evidence(fields), brazilUboParams(risk), {
      jurisdiction: 'BR',
      evaluatedAt: T0,
    });
    expect(counted.verdict).toBe('FAIL');
    expect(counted.reason).toBe('ubo.identity_not_verified');

    const ignored = uboThreshold.evaluate(
      evidence(fields),
      { ...brazilUboParams(risk), includeControlInFact: false },
      { jurisdiction: 'BR', evaluatedAt: T0 },
    );
    expect(ignored.verdict).toBe('PASS');
  });

  it('sends an incomplete ownership chain to review, not to pass', () => {
    const out = uboThreshold.evaluate(
      evidence({
        owners: [{ ref: 'o1', effectivePct: 40, identityVerified: true, screened: true }],
        controllers: [],
        unattributedOwnershipPct: 12,
      }),
      brazilUboParams(risk),
      { jurisdiction: 'BR', evaluatedAt: T0 },
    );
    expect(out.verdict).toBe('REVIEW');
    expect(out.reason).toBe('ubo.ownership_chain_incomplete');
  });

  it('changes the outcome for the same company when the jurisdiction changes', () => {
    const company = evidence({
      owners: [{ ref: 'o1', effectivePct: 10, identityVerified: false, screened: false }],
      controllers: [],
      unattributedOwnershipPct: 0,
    });
    const ctx = { jurisdiction: 'X', evaluatedAt: T0 };

    const brazil = uboThreshold.evaluate(
      company,
      brazilUboParams({ institutionThresholdPct: 25, riskBasisRef: 'ARC-BR' }),
      ctx,
    );
    const colombia = uboThreshold.evaluate(
      company,
      {
        jurisdictionCapPct: 5,
        institutionThresholdPct: 5,
        riskBasisRef: 'ARC-CO',
        includeControlInFact: true,
      },
      ctx,
    );

    expect(brazil.verdict).toBe('REVIEW'); // nobody reaches 25%
    expect(colombia.verdict).toBe('FAIL'); // the 10% holder is a UBO and unverified
  });
});

describe('bank_change_v1 — UC-1 of the anti-corruption pilot', () => {
  const pack = definePolicyPack({
    useCaseId: 'bank_change',
    version: 1,
    jurisdiction: 'BR',
    basis: ['DPO2U PRD Piloto Anticorrupção v0.3 §5.1'],
    predicates: bankChangePredicates(),
  });

  const clean = {
    holderMatchesSupplier: true,
    sharesCnpjRoot: false,
    hasPowerOfAttorney: false,
    channel: 'official_portal',
    strongAuthentication: true,
    daysSinceLastBankChange: null,
    hoursToNextScheduledPayment: null,
    destinationIsRegulatedInstitution: true,
  };

  it('declares the fields the collector must provide', () => {
    expect(requiredFields(pack)).toContain('holderMatchesSupplier');
    expect(requiredFields(pack)).toContain('hoursToNextScheduledPayment');
  });

  it('passes the clean path', () => {
    expect(evaluate(pack, evidence(clean), T0).verdict).toBe('PASS');
  });

  it('fails when the holder differs with no power of attorney', () => {
    const out = evaluate(pack, evidence({ ...clean, holderMatchesSupplier: false }), T0);
    expect(out.verdict).toBe('FAIL');
  });

  it('reviews a change made 5 days after the last one', () => {
    const out = evaluate(pack, evidence({ ...clean, daysSinceLastBankChange: 5 }), T0);
    expect(out.verdict).toBe('REVIEW');
  });

  it('lets a FAIL outrank a REVIEW', () => {
    const out = evaluate(
      pack,
      evidence({
        ...clean,
        daysSinceLastBankChange: 5,
        destinationIsRegulatedInstitution: false,
      }),
      T0,
    );
    expect(out.verdict).toBe('FAIL');
  });

  it('refuses to evaluate against an evidence view missing a declared field', () => {
    const { destinationIsRegulatedInstitution: _omitted, ...partial } = clean;
    expect(() => evaluate(pack, evidence(partial), T0)).toThrow(MissingEvidenceError);
  });

  it('is deterministic: same pack and evidence give the same result hash', () => {
    expect(evaluate(pack, evidence(clean), T0).resultHash).toBe(
      evaluate(pack, evidence(clean), T0).resultHash,
    );
  });
});

describe('vasp_classification — Travel Rule phase 0', () => {
  const params = {
    acceptedBases: ['proof_of_control', 'anchored_attestation', 'self_declaration'] as const,
    allowUnhostedWallet: true,
    maxLicenceAgeDays: 30,
  };
  const ctx = { jurisdiction: 'BR', evaluatedAt: T0 };

  it('surfaces an unhosted wallet resting on self-declaration', () => {
    const out = vaspClassification.evaluate(
      evidence({
        counterpartyKind: 'unhosted_wallet',
        attributionBasis: 'self_declaration',
        licenceEvidenceAgeDays: null,
      }),
      { ...params, acceptedBases: [...params.acceptedBases] },
      ctx,
    );
    expect(out.verdict).toBe('REVIEW');
    expect(out.reason).toBe('counterparty.unhosted_on_self_declaration');
  });

  it('passes the same wallet once control is proven', () => {
    const out = vaspClassification.evaluate(
      evidence({
        counterpartyKind: 'unhosted_wallet',
        attributionBasis: 'proof_of_control',
        licenceEvidenceAgeDays: null,
      }),
      { ...params, acceptedBases: [...params.acceptedBases] },
      ctx,
    );
    expect(out.verdict).toBe('PASS');
  });

  it('reviews a licensed provider whose licence evidence has gone stale', () => {
    const out = vaspClassification.evaluate(
      evidence({
        counterpartyKind: 'licensed_provider',
        attributionBasis: 'anchored_attestation',
        licenceEvidenceAgeDays: 120,
      }),
      { ...params, acceptedBases: [...params.acceptedBases] },
      ctx,
    );
    expect(out.verdict).toBe('REVIEW');
    expect(out.reason).toBe('counterparty.licence_evidence_stale');
  });
});

describe('attestation freshness', () => {
  const pack = definePolicyPack({
    useCaseId: 'bank_change',
    version: 1,
    jurisdiction: 'BR',
    basis: ['PRD §5.1'],
    predicates: bankChangePredicates(),
  });

  const att = attestationFromEvaluation(
    evaluate(
      pack,
      evidence({
        holderMatchesSupplier: true,
        sharesCnpjRoot: false,
        hasPowerOfAttorney: false,
        channel: 'official_portal',
        strongAuthentication: true,
        daysSinceLastBankChange: null,
        hoursToNextScheduledPayment: null,
        destinationIsRegulatedInstitution: true,
      }),
      T0,
    ),
    { issuer: 'submitter:pilot', validUntil: new Date('2026-12-11T12:00:00.000Z') },
  );

  it('is valid on the day it is issued', () => {
    expect(assessFreshness(att, T0).status).toBe('VALID');
  });

  it('expires when its validity window closes', () => {
    expect(assessFreshness(att, new Date('2027-01-01T00:00:00.000Z')).status).toBe('EXPIRED');
  });

  it('lets a relying party impose a shorter life than the issuer did', () => {
    const twoWeeksOn = new Date('2026-09-25T12:00:00.000Z');
    expect(assessFreshness(att, twoWeeksOn).status).toBe('VALID');
    expect(assessFreshness(att, twoWeeksOn, { maxAgeSeconds: 7 * 86_400 }).status).toBe('STALE');
  });

  it('reports revocation ahead of expiry', () => {
    const revoked = revoke(att, {
      revokedAt: new Date('2026-09-20T00:00:00.000Z'),
      reason: 'licence withdrawn',
    });
    const assessment = assessFreshness(revoked, new Date('2027-01-01T00:00:00.000Z'));
    expect(assessment.status).toBe('REVOKED');
    expect(assessment.reason).toBe('licence withdrawn');
  });

  it('keeps the anchor key stable across revocation', () => {
    const revoked = revoke(att, { revokedAt: T0, reason: 'superseded' });
    expect(revoked.attestationHash).toBe(att.attestationHash);
  });

  it('rejects an unacceptable attestation through the convenience check', () => {
    expect(isAcceptable(att, T0)).toBe(true);
    expect(isAcceptable(att, new Date('2027-06-01T00:00:00.000Z'))).toBe(false);
  });
});

describe('audit trail', () => {
  function seed(): AuditTrail {
    const trail = new AuditTrail();
    trail.append({
      action: 'pack.installed',
      at: T0,
      actor: 'role:compliance_engineer',
      subject: { packHash: 'a'.repeat(64) },
    });
    trail.append({
      action: 'policy.evaluated',
      at: new Date(T0.getTime() + 1000),
      actor: 'service:engine',
      subject: { verdict: 'PASS' },
    });
    return trail;
  }

  it('links the first entry to genesis', () => {
    expect(seed().toArray()[0].prevHash).toBe(GENESIS_HASH);
  });

  it('verifies an untouched chain', () => {
    expect(seed().verify().ok).toBe(true);
  });

  it('detects an edited entry and names where', () => {
    const entries = seed().toArray() as TrailEntry[];
    const tampered = [
      entries[0],
      { ...entries[1], subject: { verdict: 'FAIL' } },
    ] as TrailEntry[];

    const check = AuditTrail.verify(tampered);
    expect(check.ok).toBe(false);
    expect(check.brokenAt).toBe(1);
  });

  it('detects an entry removed from the middle', () => {
    const trail = seed();
    trail.append({
      action: 'attestation.issued',
      at: new Date(T0.getTime() + 2000),
      actor: 'service:engine',
      subject: { attestationHash: 'b'.repeat(64) },
    });
    const entries = trail.toArray();

    const check = AuditTrail.verify([entries[0], entries[2]]);
    expect(check.ok).toBe(false);
    expect(check.brokenAt).toBe(1);
  });

  it('cannot, on its own, detect a truncated tail — which is why the head is published', () => {
    const entries = seed().toArray();
    // Dropping the last entry leaves a chain that is still internally valid.
    // Hash-linking proves nothing was altered, not that nothing was withheld;
    // only publishing the head hash externally closes that gap.
    expect(AuditTrail.verify([entries[0]]).ok).toBe(true);
  });

  it('refuses an entry timestamped before its predecessor', () => {
    const trail = seed();
    expect(() =>
      trail.append({
        action: 'attestation.issued',
        at: new Date(T0.getTime() - 5000),
        actor: 'service:engine',
        subject: {},
      }),
    ).toThrow(RangeError);
  });

  it('refuses to load a broken trail', () => {
    const entries = seed().toArray() as TrailEntry[];
    expect(() => new AuditTrail([entries[0], { ...entries[1], actor: 'someone else' }])).toThrow(
      /broken trail/,
    );
  });
});

describe('anchor capabilities — the core asks before it writes', () => {
  const pack = definePolicyPack({
    useCaseId: 'bank_change',
    version: 1,
    jurisdiction: 'BR',
    basis: ['PRD §5.1'],
    predicates: bankChangePredicates(),
  });

  const clean = {
    holderMatchesSupplier: true,
    sharesCnpjRoot: false,
    hasPowerOfAttorney: false,
    channel: 'official_portal',
    strongAuthentication: true,
    daysSinceLastBankChange: null,
    hoursToNextScheduledPayment: null,
    destinationIsRegulatedInstitution: true,
  };

  function att(validUntil?: Date) {
    return attestationFromEvaluation(evaluate(pack, evidence(clean), T0), {
      issuer: 'submitter:pilot',
      ...(validUntil ? { validUntil } : {}),
    });
  }

  function net(caps: Partial<NetworkCapabilities>): NetworkDescriptor {
    return {
      id: 'test-net',
      displayName: 'Test',
      publiclyVerifiable: true,
      capabilities: {
        validityWindow: false,
        revocation: false,
        packHash: false,
        jurisdiction: false,
        ...caps,
      },
    };
  }

  it('blocks an expiry the network cannot record', () => {
    const fidelity = anchorFidelity(att(new Date('2027-01-01T00:00:00.000Z')), net({}));
    expect(fidelity.blocking).toContain('validUntil');
    expect(fidelity.faithful).toBe(false);
  });

  it('does not block when the network records validity', () => {
    const fidelity = anchorFidelity(
      att(new Date('2027-01-01T00:00:00.000Z')),
      net({ validityWindow: true }),
    );
    expect(fidelity.blocking).toHaveLength(0);
  });

  it('treats lost detail as reduced fidelity, not as a blocker', () => {
    const fidelity = anchorFidelity(att(), net({}));
    expect(fidelity.blocking).toHaveLength(0);
    expect(fidelity.reduced).toEqual(['packHash', 'jurisdiction']);
    // Still not faithful — worth recording in the trail, not worth refusing.
    expect(fidelity.faithful).toBe(false);
  });

  it('reports a fully faithful anchor when the network carries everything', () => {
    const fidelity = anchorFidelity(
      att(new Date('2027-01-01T00:00:00.000Z')),
      net({ validityWindow: true, revocation: true, packHash: true, jurisdiction: true }),
    );
    expect(fidelity.faithful).toBe(true);
  });

  it('throws on a blocking gap and names the network', () => {
    expect(() =>
      assertAnchorable(att(new Date('2027-01-01T00:00:00.000Z')), net({})),
    ).toThrow(UnpreservableSemanticsError);
    expect(() =>
      assertAnchorable(att(new Date('2027-01-01T00:00:00.000Z')), net({})),
    ).toThrow(/test-net/);
  });

  it('omits fields the network cannot hold instead of defaulting them', () => {
    const record = toAnchorRecord(att(), net({}));
    expect(record.packHash).toBeUndefined();
    expect(record.jurisdiction).toBeUndefined();

    const full = toAnchorRecord(att(), net({ packHash: true, jurisdiction: true }));
    expect(full.packHash).toMatch(/^[0-9a-f]{64}$/);
    expect(full.jurisdiction).toBe('BR');
  });
});
