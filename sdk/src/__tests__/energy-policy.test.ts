import { describe, expect, it } from 'vitest';
import { evaluateEnergyAcl, ENERGY_PREDICATE_REGISTRY } from '../energy-policy.js';
import type { PolicyAction } from '../bcb-policy.js';
import { SdkError } from '../types.js';

const action: PolicyAction = { kind: 'energy-settlement', subject: 'GTRADER', timestampIso: '2026-11-01T00:00:00Z' };
function res(e: { results: readonly { id: string; verdict: string }[] }, id: string) {
  return e.results.find((r) => r.id === id);
}
// 2024 PLD bounds in centavos/MWh: min R$61,07 = 6107; structural max R$716,80 = 71680.
const pld = (price: string, source = 'CCEE') => ({
  priceCentavosPerMwh: price, pldMinCentavosPerMwh: '6107', pldMaxCentavosPerMwh: '71680', feedSource: source,
});

describe('PLD range (oracle, deterministic)', () => {
  it('in range → PASS; boundaries inclusive', () => {
    expect(evaluateEnergyAcl(action, { pld: pld('22500') }).verdict).toBe('PASS'); // R$225/MWh
    expect(evaluateEnergyAcl(action, { pld: pld('6107') }).verdict).toBe('PASS'); // == min
    expect(evaluateEnergyAcl(action, { pld: pld('71680') }).verdict).toBe('PASS'); // == max
  });
  it('below floor / above ceiling → FAIL', () => {
    expect(evaluateEnergyAcl(action, { pld: pld('6106') }).verdict).toBe('FAIL');
    expect(evaluateEnergyAcl(action, { pld: pld('71681') }).verdict).toBe('FAIL');
  });
  it('unrecognized feed source → REVIEW', () => {
    expect(res(evaluateEnergyAcl(action, { pld: pld('22500', 'random-blog') }), 'energy_pld_range')?.verdict).toBe('REVIEW');
  });
  it('rejects non-numeric price', () => {
    expect(() => evaluateEnergyAcl(action, { pld: pld('225,00') })).toThrow(SdkError);
  });
});

describe('attestation predicates', () => {
  it('comercializadora: authorized + habilitated → PASS; missing either → FAIL', () => {
    expect(evaluateEnergyAcl(action, { comercializadora: { subjectId: 'C', authorizedAneel: true, habilitatedCcee: true } }).verdict).toBe('PASS');
    expect(evaluateEnergyAcl(action, { comercializadora: { subjectId: 'C', authorizedAneel: true, habilitatedCcee: false } }).verdict).toBe('FAIL');
    expect(evaluateEnergyAcl(action, { comercializadora: { subjectId: 'C', authorizedAneel: false, habilitatedCcee: true } }).verdict).toBe('FAIL');
  });

  it('consumer: Grupo A eligible → PASS; Grupo B → FAIL; Grupo A not eligible → FAIL', () => {
    expect(evaluateEnergyAcl(action, { consumer: { consumerId: 'U', group: 'A', eligible: true } }).verdict).toBe('PASS');
    expect(evaluateEnergyAcl(action, { consumer: { consumerId: 'U', group: 'B', eligible: true } }).verdict).toBe('FAIL');
    expect(evaluateEnergyAcl(action, { consumer: { consumerId: 'U', group: 'A', eligible: false } }).verdict).toBe('FAIL');
  });

  it('lastro CCEE (anti-double-counting): registered + not double → PASS; else FAIL', () => {
    expect(evaluateEnergyAcl(action, { lastro: { contractRef: 'K1', cceeRegistered: true, notDoubleCounted: true } }).verdict).toBe('PASS');
    expect(evaluateEnergyAcl(action, { lastro: { contractRef: 'K1', cceeRegistered: false, notDoubleCounted: true } }).verdict).toBe('FAIL');
    const dbl = evaluateEnergyAcl(action, { lastro: { contractRef: 'K1', cceeRegistered: true, notDoubleCounted: false } });
    expect(dbl.verdict).toBe('FAIL');
    expect(res(dbl, 'energy_lastro_ccee')?.reason).toContain('Art. 11');
  });
});

describe('pack plumbing', () => {
  it('aggregates: one FAIL makes the whole verdict FAIL', () => {
    const e = evaluateEnergyAcl(action, {
      pld: pld('22500'),
      comercializadora: { subjectId: 'C', authorizedAneel: true, habilitatedCcee: true },
      lastro: { contractRef: 'K1', cceeRegistered: true, notDoubleCounted: false }, // FAIL
    });
    expect(e.verdict).toBe('FAIL');
    expect(e.predicateSet).toBe('energy_acl_v1');
    expect(e.results).toHaveLength(3);
  });
  it('evidence hash is bound to the action', () => {
    const ev = { pld: pld('22500') };
    expect(evaluateEnergyAcl(action, ev).evidenceHashHex).not.toBe(evaluateEnergyAcl({ ...action, subject: 'GX' }, ev).evidenceHashHex);
  });
  it('throws when no energy predicate present', () => {
    expect(() => evaluateEnergyAcl(action, {})).toThrow(SdkError);
  });
  it('registry documents 4 predicates with citations', () => {
    expect(ENERGY_PREDICATE_REGISTRY).toHaveLength(4);
    expect(ENERGY_PREDICATE_REGISTRY.every((p) => p.citation.length > 0)).toBe(true);
  });
});
