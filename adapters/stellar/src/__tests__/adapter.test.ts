import { describe, expect, it } from 'vitest';

import {
  attestationFromEvaluation,
  bankChangePredicates,
  definePolicyPack,
  evaluate,
  hashCanonical,
  revoke,
  UnpreservableSemanticsError,
  type Attestation,
  type EvidenceView,
} from '@dpo2u/core';

import {
  describeFidelityGap,
  StellarAdapter,
  UnsupportedByContractError,
  type InvocationResult,
  type SorobanAttestationRecord,
} from '../index.js';

const T0 = new Date('2026-09-12T09:00:00.000Z');

const pack = definePolicyPack({
  useCaseId: 'bank_change',
  version: 1,
  jurisdiction: 'BR',
  basis: ['DPO2U PRD Piloto Anticorrupção v0.3 §5.1'],
  predicates: bankChangePredicates(),
});

const cleanFields = {
  holderMatchesSupplier: true,
  sharesCnpjRoot: false,
  hasPowerOfAttorney: false,
  channel: 'official_portal',
  strongAuthentication: true,
  daysSinceLastBankChange: null,
  hoursToNextScheduledPayment: null,
  destinationIsRegulatedInstitution: true,
};

function evidence(fields: Record<string, unknown>): EvidenceView {
  return { commitment: hashCanonical({ f: JSON.stringify(fields) }), fields };
}

function attestation(opts: { validUntil?: Date } = {}): Attestation {
  return attestationFromEvaluation(evaluate(pack, evidence(cleanFields), T0), {
    issuer: 'GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN',
    ...(opts.validUntil ? { validUntil: opts.validUntil } : {}),
  });
}

/** Records what the adapter asked the chain to do, without a chain. */
class FakeInvoker {
  readonly calls: { method: string; args: readonly unknown[] }[] = [];
  async invoke(args: {
    method: 'register_attestation' | 'authorize_submitter';
    args: readonly unknown[];
  }): Promise<InvocationResult> {
    this.calls.push({ method: args.method, args: args.args });
    return { txId: 'tx-' + this.calls.length, explorerUrl: 'https://example.test/tx' };
  }
}

class FakeReader {
  constructor(private readonly record: SorobanAttestationRecord | null) {}
  async verify() {
    return { found: this.record !== null, record: this.record };
  }
}

function adapter(invoker = new FakeInvoker(), reader = new FakeReader(null)) {
  return new StellarAdapter({ reader, invoker, now: () => T0 });
}

describe('capability declaration', () => {
  it('declares publicly verifiable, which is the commercial argument', () => {
    expect(adapter().network.publiclyVerifiable).toBe(true);
  });

  it('declares honestly that the deployed contract preserves none of the four', () => {
    expect(adapter().network.capabilities).toEqual({
      validityWindow: false,
      revocation: false,
      packHash: false,
      jurisdiction: false,
    });
  });
});

describe('register', () => {
  it('anchors an attestation with no validity window', async () => {
    const invoker = new FakeInvoker();
    const receipt = await adapter(invoker).register(attestation());

    expect(receipt.txId).toBe('tx-1');
    expect(invoker.calls[0].method).toBe('register_attestation');
  });

  it('sends the result hash, so the verdict stays tied to the outcomes', async () => {
    const invoker = new FakeInvoker();
    const att = attestation();
    await adapter(invoker).register(att);

    expect(invoker.calls[0].args).toContain(att.resultHash);
    expect(invoker.calls[0].args).toContain(att.evidenceCommitment);
  });

  it('refuses an attestation that expires, rather than dropping the expiry', async () => {
    const invoker = new FakeInvoker();
    const expiring = attestation({ validUntil: new Date('2026-12-12T09:00:00.000Z') });

    await expect(adapter(invoker).register(expiring)).rejects.toThrow(
      UnpreservableSemanticsError,
    );
    // The point of refusing before writing: nothing reached the chain.
    expect(invoker.calls).toHaveLength(0);
  });

  it('names what would have been lost', async () => {
    const expiring = attestation({ validUntil: new Date('2026-12-12T09:00:00.000Z') });
    await expect(adapter().register(expiring)).rejects.toThrow(/validUntil/);
  });

  it('refuses to anchor a revoked attestation', async () => {
    const revoked = revoke(attestation(), {
      revokedAt: new Date('2026-09-13T00:00:00.000Z'),
      reason: 'superseded by a later assessment',
    });
    await expect(adapter().register(revoked)).rejects.toThrow(/revocation/);
  });
});

describe('read', () => {
  it('returns null when nothing is anchored', async () => {
    expect(await adapter().read('bank_change', 'a'.repeat(64))).toBeNull();
  });

  it('maps the contract record without inventing the fields it lacks', async () => {
    const reader = new FakeReader({
      verdict: 'PASS',
      predicate_set: 'bank_change_v1',
      predicate_version: 1,
      submitted_by: 'GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN',
      timestamp: Math.floor(T0.getTime() / 1000),
      metadata_hash_hex: 'b'.repeat(64),
    });

    const record = await new StellarAdapter({
      reader,
      invoker: new FakeInvoker(),
      now: () => T0,
    }).read('bank_change', 'a'.repeat(64));

    expect(record).not.toBeNull();
    expect(record!.verdict).toBe('PASS');
    expect(record!.resultHash).toBe('b'.repeat(64));
    expect(record!.issuedAt.toISOString()).toBe(T0.toISOString());

    // Absent, not defaulted — a default here would be a lie in a place nobody
    // would think to check.
    expect(record!.validUntil).toBeUndefined();
    expect(record!.revocation).toBeUndefined();
    expect(record!.packHash).toBeUndefined();
    expect(record!.jurisdiction).toBeUndefined();
  });
});

describe('revoke', () => {
  it('fails loudly, and says where revocation does live', async () => {
    await expect(
      adapter().revoke('bank_change', 'a'.repeat(64), {
        revokedAt: T0,
        reason: 'licence withdrawn',
      }),
    ).rejects.toThrow(UnsupportedByContractError);

    await expect(
      adapter().revoke('bank_change', 'a'.repeat(64), { revokedAt: T0, reason: 'x' }),
    ).rejects.toThrow(/audit trail/);
  });
});

describe('setAuthorized', () => {
  it('passes the submitter and the flag through to the contract', async () => {
    const invoker = new FakeInvoker();
    await adapter(invoker).setAuthorized('GSUBMITTER', true);

    expect(invoker.calls[0].method).toBe('authorize_submitter');
    expect(invoker.calls[0].args).toEqual(['GSUBMITTER', true]);
  });
});

describe('fidelity reporting', () => {
  it('names the detail the chain cannot carry, for the audit trail', () => {
    const gaps = describeFidelityGap(attestation());
    expect(gaps.join(' ')).toMatch(/packHash/);
    expect(gaps.join(' ')).toMatch(/jurisdiction/);
  });
});
