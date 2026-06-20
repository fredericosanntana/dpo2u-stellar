import { describe, expect, it, vi } from 'vitest';
import { DefindexPolicyGateway } from '../DefindexPolicyGateway.js';
import type {
  DefindexAttestationVerifier,
  DefindexOperatorClient,
  PreparedTransaction,
  ReportingEvidencePayload,
  RebalanceRequest,
} from '../defindex-policy-types.js';
import type { Verdict } from '../types.js';
import type { VerifyResult } from '../AttestationClient.js';

const HASH = 'a'.repeat(64);

function verifyResult(verdict: Verdict | null): VerifyResult {
  const record =
    verdict === null
      ? null
      : {
          verdict,
          predicate_set: 'defindex',
          predicate_version: 1,
          submitted_by: 'GDPO2UTESTACCOUNTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          timestamp: 1_700_000_000,
          metadata_hash_hex: HASH,
        };
  return {
    found: record !== null,
    record,
    explorer_url: 'https://stellar.expert/explorer/testnet/contract/CTEST',
    contract_id: 'CTEST',
    network_passphrase: 'Test SDF Network ; September 2015',
  };
}

function fakeVerifier(verdict: Verdict | null): {
  verifier: DefindexAttestationVerifier;
  calls: Array<{ useCaseId: string; evidenceHashHex: string }>;
} {
  const calls: Array<{ useCaseId: string; evidenceHashHex: string }> = [];
  return {
    calls,
    verifier: {
      async verify(args) {
        calls.push(args);
        return verifyResult(verdict);
      },
    },
  };
}

const prepared: PreparedTransaction = {
  unsignedXdr: 'AAAA…fake-xdr',
  description: 'prepared',
  network: 'Test SDF Network ; September 2015',
};

function spyClient(): {
  client: DefindexOperatorClient;
  rebalance: ReturnType<typeof vi.fn>;
} {
  const rebalance = vi.fn(async (_req: RebalanceRequest) => prepared);
  return {
    client: {
      async createVault() {
        throw new Error('not used in this test');
      },
      rebalance,
    },
    rebalance,
  };
}

const rebalanceReq: RebalanceRequest = {
  vault: 'CVAULT',
  instructions: [{ action: 'invest', strategy: 'CSTRAT', amount: '1000' }],
  caller: 'GREBAL',
};

function reportingPayload(
  overrides: Partial<ReportingEvidencePayload> = {},
): ReportingEvidencePayload {
  return {
    schema: 'dpo2u.defindex.reporting.v1',
    reportType: 'operator_monthly_reporting',
    operatorId: 'operator-001',
    artifactHashHex: HASH,
    artifactState: 'PRESENT',
    verdict: 'PASS',
    producedAt: '2026-06-20T00:00:00Z',
    validUntil: '2099-07-20T00:00:00Z',
    deliveryChannel: 'attestation_registry',
    evidenceRefs: ['sha256:report-1'],
    ...overrides,
  };
}

describe('Reporting evidence flow', () => {
  it('derives a deterministic hash for reporting artifacts', () => {
    const gateway = new DefindexPolicyGateway(fakeVerifier('PASS').verifier, spyClient().client);
    const artifact = {
      artifactType: 'operator_monthly_reporting',
      operatorId: 'operator-001',
      period: '2026-06',
      metrics: { incidents_open: 0, reserve_ratio_bps: 10000 },
    };

    const a = gateway.hashReportingArtifact(artifact);
    const b = gateway.hashReportingArtifact({
      metrics: { reserve_ratio_bps: 10000, incidents_open: 0 },
      period: '2026-06',
      operatorId: 'operator-001',
      artifactType: 'operator_monthly_reporting',
    });

    expect(a).toHaveLength(64);
    expect(a).toBe(b);
  });

  it('reporting artifact missing denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      reporting: reportingPayload({ artifactState: 'MISSING' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:REPORTING_ARTIFACT_STATE/);
    expect(calls).toEqual([]);
  });

  it('reporting REVIEW denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      reporting: reportingPayload({ verdict: 'REVIEW' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:REPORTING_REVIEW/);
    expect(calls).toEqual([]);
  });

  it('expired reporting payload denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      reporting: reportingPayload({ validUntil: '2000-01-01T00:00:00Z' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:REPORTING_EXPIRED/);
    expect(calls).toEqual([]);
  });

  it('PASS reporting still requires PASS attestation', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      reporting: reportingPayload(),
    });

    expect(d.allowed).toBe(true);
    expect(calls).toEqual([{ useCaseId: 'defindex_rebalance_v1', evidenceHashHex: HASH }]);
  });
});
