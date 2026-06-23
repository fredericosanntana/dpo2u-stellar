import { describe, expect, it } from 'vitest';
import {
  evaluateBcbVasp,
  evaluateCvmRcvm88,
  PREDICATE_REGISTRY,
  type PolicyAction,
} from '../bcb-policy.js';
import { SdkError } from '../types.js';

const action: PolicyAction = { kind: 'settlement', subject: 'GOPERATOR', timestampIso: '2026-11-01T00:00:00Z' };

function res(e: { results: readonly { id: string; verdict: string }[] }, id: string) {
  return e.results.find((r) => r.id === id);
}

describe('BCB/VASP predicates', () => {
  it('segregation: distinct wallets + independent control → PASS', () => {
    const e = evaluateBcbVasp(action, {
      segregation: { clientWallets: ['GA', 'GB'], providerWallets: ['GP'], controlIndependent: true },
    });
    expect(e.verdict).toBe('PASS');
  });

  it('segregation: shared wallet → FAIL', () => {
    const e = evaluateBcbVasp(action, {
      segregation: { clientWallets: ['GA', 'GP'], providerWallets: ['GP'], controlIndependent: true },
    });
    expect(res(e, 'bcb_segregation')?.verdict).toBe('FAIL');
    expect(e.verdict).toBe('FAIL');
  });

  it('segregation: dependent control → FAIL', () => {
    const e = evaluateBcbVasp(action, {
      segregation: { clientWallets: ['GA'], providerWallets: ['GP'], controlIndependent: false },
    });
    expect(res(e, 'bcb_segregation')?.verdict).toBe('FAIL');
  });

  it('buffer 5%: exactly 5% → PASS; over → FAIL; provider with no client assets → FAIL', () => {
    expect(evaluateBcbVasp(action, { buffer: { providerAssetsInClientWalletsBaseUnits: '5', totalClientAssetsBaseUnits: '100' } }).verdict).toBe('PASS');
    expect(evaluateBcbVasp(action, { buffer: { providerAssetsInClientWalletsBaseUnits: '6', totalClientAssetsBaseUnits: '100' } }).verdict).toBe('FAIL');
    expect(evaluateBcbVasp(action, { buffer: { providerAssetsInClientWalletsBaseUnits: '1', totalClientAssetsBaseUnits: '0' } }).verdict).toBe('FAIL');
    expect(evaluateBcbVasp(action, { buffer: { providerAssetsInClientWalletsBaseUnits: '0', totalClientAssetsBaseUnits: '0' } }).verdict).toBe('PASS');
  });

  it('buffer: handles large i128-scale amounts without float drift', () => {
    // 5% of a 2^90-scale balance, exact boundary.
    const total = (2n ** 90n).toString();
    const provider = ((2n ** 90n) / 20n).toString();
    expect(evaluateBcbVasp(action, { buffer: { providerAssetsInClientWalletsBaseUnits: provider, totalClientAssetsBaseUnits: total } }).verdict).toBe('PASS');
  });

  it('operator admission: authorized → PASS; not → FAIL', () => {
    expect(evaluateBcbVasp(action, { operator: { subjectId: 'GOP', authorized: true, authorizationRef: 'BCB-123' } }).verdict).toBe('PASS');
    expect(evaluateBcbVasp(action, { operator: { subjectId: 'GOP', authorized: false } }).verdict).toBe('FAIL');
  });

  it('counterparty: not authorized FAILS after 30/10/2026, REVIEWs before', () => {
    const post = evaluateBcbVasp({ ...action, timestampIso: '2026-11-01T00:00:00Z' }, { counterparty: { subjectId: 'GC', authorized: false } });
    expect(post.verdict).toBe('FAIL');
    const pre = evaluateBcbVasp({ ...action, timestampIso: '2026-06-01T00:00:00Z' }, { counterparty: { subjectId: 'GC', authorized: false } });
    expect(pre.verdict).toBe('REVIEW');
    const ok = evaluateBcbVasp(action, { counterparty: { subjectId: 'GC', authorized: true } });
    expect(ok.verdict).toBe('PASS');
  });

  it('rejects non-numeric base-unit strings (no float coercion)', () => {
    expect(() => evaluateBcbVasp(action, { buffer: { providerAssetsInClientWalletsBaseUnits: '5.0', totalClientAssetsBaseUnits: '100' } })).toThrow(SdkError);
  });

  it('throws when no BCB predicate present', () => {
    expect(() => evaluateBcbVasp(action, {})).toThrow(SdkError);
  });
});

describe('CVM RCVM 88 predicates', () => {
  it('retail cap: at the cap with cross-platform declaration → PASS', () => {
    const e = evaluateCvmRcvm88(action, {
      retail: { investorId: 'I1', investorProfile: 'retail', ytdInvestedCentavos: '1000000', investmentCentavos: '1000000', crossPlatformSelfDeclared: true },
    });
    expect(e.verdict).toBe('PASS'); // 1,000,000 + 1,000,000 == 2,000,000 (R$20k)
  });

  it('retail cap: under cap but missing cross-platform declaration → REVIEW', () => {
    const e = evaluateCvmRcvm88(action, {
      retail: { investorId: 'I1', investorProfile: 'retail', ytdInvestedCentavos: '0', investmentCentavos: '500000' },
    });
    expect(res(e, 'cvm_rcvm88_retail_cap')?.verdict).toBe('REVIEW');
  });

  it('retail cap: over cap → FAIL', () => {
    const e = evaluateCvmRcvm88(action, {
      retail: { investorId: 'I1', investorProfile: 'retail', ytdInvestedCentavos: '1500000', investmentCentavos: '600000', crossPlatformSelfDeclared: true },
    });
    expect(e.verdict).toBe('FAIL');
  });

  it('retail cap: qualified investor is exempt → PASS', () => {
    const e = evaluateCvmRcvm88(action, {
      retail: { investorId: 'I1', investorProfile: 'qualified', ytdInvestedCentavos: '9999999999', investmentCentavos: '9999999999' },
    });
    expect(e.verdict).toBe('PASS');
  });

  it('issuer cap: ≤ R$15M → PASS; > R$15M → FAIL', () => {
    expect(evaluateCvmRcvm88(action, { issuer: { issuerCnpj: 'X', offeringTargetCentavos: '1000000000', priorYearCapturedCentavos: '500000000', captureWindowDays: 100 } }).verdict).toBe('PASS');
    expect(evaluateCvmRcvm88(action, { issuer: { issuerCnpj: 'X', offeringTargetCentavos: '1000000001', priorYearCapturedCentavos: '500000000', captureWindowDays: 100 } }).verdict).toBe('FAIL');
  });

  it('capture window: ≤180d PASS, >180d FAIL', () => {
    expect(res(evaluateCvmRcvm88(action, { issuer: { issuerCnpj: 'X', offeringTargetCentavos: '1', priorYearCapturedCentavos: '0', captureWindowDays: 180 } }), 'cvm_rcvm88_capture_window')?.verdict).toBe('PASS');
    expect(res(evaluateCvmRcvm88(action, { issuer: { issuerCnpj: 'X', offeringTargetCentavos: '1', priorYearCapturedCentavos: '0', captureWindowDays: 181 } }), 'cvm_rcvm88_capture_window')?.verdict).toBe('FAIL');
  });

  it('cooldown: ≥120d PASS, <120d FAIL, none → PASS', () => {
    const longGap = evaluateCvmRcvm88({ ...action, timestampIso: '2026-06-01T00:00:00Z' }, { issuer: { issuerCnpj: 'X', offeringTargetCentavos: '1', priorYearCapturedCentavos: '0', captureWindowDays: 10, lastSuccessfulOfferingEndIso: '2026-01-01T00:00:00Z' } });
    expect(res(longGap, 'cvm_rcvm88_cooldown')?.verdict).toBe('PASS');
    const shortGap = evaluateCvmRcvm88({ ...action, timestampIso: '2026-06-01T00:00:00Z' }, { issuer: { issuerCnpj: 'X', offeringTargetCentavos: '1', priorYearCapturedCentavos: '0', captureWindowDays: 10, lastSuccessfulOfferingEndIso: '2026-05-01T00:00:00Z' } });
    expect(res(shortGap, 'cvm_rcvm88_cooldown')?.verdict).toBe('FAIL');
    const none = evaluateCvmRcvm88(action, { issuer: { issuerCnpj: 'X', offeringTargetCentavos: '1', priorYearCapturedCentavos: '0', captureWindowDays: 10 } });
    expect(res(none, 'cvm_rcvm88_cooldown')?.verdict).toBe('PASS');
  });
});

describe('pack plumbing', () => {
  it('evidence hash is deterministic and bound to the action', () => {
    const ev = { operator: { subjectId: 'GOP', authorized: true } };
    const a = evaluateBcbVasp(action, ev);
    const b = evaluateBcbVasp(action, ev);
    expect(a.evidenceHashHex).toBe(b.evidenceHashHex);
    const c = evaluateBcbVasp({ ...action, subject: 'GOTHER' }, ev);
    expect(c.evidenceHashHex).not.toBe(a.evidenceHashHex);
  });

  it('registry documents 8 predicates with citations', () => {
    expect(PREDICATE_REGISTRY).toHaveLength(8);
    expect(PREDICATE_REGISTRY.every((p) => p.citation.length > 0)).toBe(true);
  });
});
