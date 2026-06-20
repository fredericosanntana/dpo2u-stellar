import { describe, it, expect, vi } from 'vitest';
import { DefindexPolicyGateway } from '../DefindexPolicyGateway.js';
import {
  DEFAULT_OPERATION_POLICIES,
  type CreateVaultRequest,
  type DefindexAttestationVerifier,
  type DefindexOperatorClient,
  type OperatorAdmissionEvidencePayload,
  type PreparedTransaction,
  type RebalanceEvidencePayload,
  type RebalanceRequest,
  type SafeguardsEvidencePayload,
} from '../defindex-policy-types.js';
import type { Verdict } from '../types.js';
import type { VerifyResult } from '../AttestationClient.js';
import { SdkError } from '../types.js';

const SYMBOL_RE = /^[a-zA-Z0-9_]{1,32}$/;
const HASH = 'a'.repeat(64);

/** Build a VerifyResult; `verdict === null` models "no attestation found". */
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

/** Verifier fake that records the args it was called with. */
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

/** DeFindex client spy: counts create/rebalance invocations. */
function spyClient(): {
  client: DefindexOperatorClient;
  createVault: ReturnType<typeof vi.fn>;
  rebalance: ReturnType<typeof vi.fn>;
} {
  const createVault = vi.fn(async (_req: CreateVaultRequest) => prepared);
  const rebalance = vi.fn(async (_req: RebalanceRequest) => prepared);
  return { client: { createVault, rebalance }, createVault, rebalance };
}

const createReq: CreateVaultRequest = {
  roles: {
    manager: 'GMANAGER',
    emergencyManager: 'GEMERGENCY',
    rebalanceManager: 'GREBAL',
    feeReceiver: 'GFEE',
  },
  name: 'DPO2U Compliant USDC Vault',
  symbol: 'dCUSDC',
  assets: [{ asset: 'CUSDC', strategies: [{ address: 'CSTRAT', name: 'blend' }] }],
  vaultFeeBps: 100,
  caller: 'GMANAGER',
};

const rebalanceReq: RebalanceRequest = {
  vault: 'CVAULT',
  instructions: [{ action: 'invest', strategy: 'CSTRAT', amount: '1000' }],
  caller: 'GREBAL',
};

function rebalanceEvidencePayload(
  overrides: Partial<RebalanceEvidencePayload> = {},
): RebalanceEvidencePayload {
  return {
    schema: 'dpo2u.defindex.rebalance.cvm175.v1',
    operation: 'rebalanceVault',
    operatorPredicate: 'defindex_rebalance_v1',
    primaryLegalAnchor: 'sect_cvm_175_v1',
    network: 'testnet',
    vault: rebalanceReq.vault,
    requestedBy: rebalanceReq.caller,
    requiredRole: 'RebalanceManager',
    rebalanceIntent: {
      instructions: rebalanceReq.instructions,
      assetScope: [{ asset: 'CUSDC', strategy: 'CSTRAT' }],
    },
    mandateControls: {
      mandateId: 'opaque-mandate-id',
      mandateVersion: '2026-06-20',
      allocationPolicyId: 'opaque-policy-id',
      riskPolicyId: 'opaque-risk-id',
      maxDeviationBps: 500,
      assetAllowed: true,
      strategyAllowed: true,
      withinAllocationLimits: true,
    },
    review: {
      reviewer: 'issuer-or-policy-engine-id',
      reviewedAt: '2026-06-20T00:00:00Z',
      validUntil: '2026-06-27T00:00:00Z',
      sourceEvidenceRefs: ['sha256:abc'],
    },
    privacy: {
      piiOnchain: false,
      publicFieldsOnly: true,
      disclosureBoundary: 'lgpd_minimized_hash_only',
    },
    ...overrides,
  };
}

function operatorAdmissionPayload(
  overrides: Partial<OperatorAdmissionEvidencePayload> = {},
): OperatorAdmissionEvidencePayload {
  return {
    schema: 'dpo2u.defindex.operator-admission.v1',
    operatorId: 'operator-001',
    operatorCategory: 'institutional_operator',
    serviceScope: 'defindex_rebalance_manager',
    jurisdiction: 'BR',
    requiredRole: 'RebalanceManager',
    status: 'PASS',
    reviewedAt: '2026-06-20T00:00:00Z',
    validUntil: '2099-06-27T00:00:00Z',
    evidenceRefs: ['sha256:operator-admission-1'],
    notes: 'operator cleared for role-gated privileged actions',
    ...overrides,
  };
}

function safeguardsPayload(
  overrides: Partial<SafeguardsEvidencePayload> = {},
): SafeguardsEvidencePayload {
  return {
    schema: 'dpo2u.defindex.safeguards.v1',
    operatorId: 'operator-001',
    vault: rebalanceReq.vault,
    requiredRole: 'RebalanceManager',
    verdict: 'PASS',
    proofOfReserveStatus: 'PASS',
    segregationStatus: 'PASS',
    incidentStatus: 'NONE',
    incidentSeverity: 'LOW',
    assessedAt: '2026-06-20T00:00:00Z',
    validUntil: '2099-06-21T00:00:00Z',
    evidenceRefs: ['sha256:safeguards-1'],
    ...overrides,
  };
}

describe('DefindexPolicyGateway.authorize', () => {
  it('PASS attestation authorizes a create-vault operation', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({ operation: 'createVault', evidenceHashHex: HASH });

    expect(d.allowed).toBe(true);
    expect(d.verdict).toBe('PASS');
    expect(d.operation).toBe('createVault');
    expect(d.requiredRole).toBe('Manager');
    expect(d.attestationFound).toBe(true);
    expect(d.attestedBy).toContain('GDPO2U');
    expect(d.attestedAt).toBe(1_700_000_000);
    expect(d.reason).toMatch(/^ALLOW:PASS/);
    // verdict was read for the correct use case + hash
    expect(calls).toEqual([{ useCaseId: 'defindex_vault_create_v1', evidenceHashHex: HASH }]);
  });

  it('missing attestation denies (fail-closed)', async () => {
    const { verifier } = fakeVerifier(null);
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({ operation: 'rebalanceVault', evidenceHashHex: HASH });

    expect(d.allowed).toBe(false);
    expect(d.attestationFound).toBe(false);
    expect(d.verdict).toBeNull();
    expect(d.attestedBy).toBeNull();
    expect(d.reason).toMatch(/^DENY:NO_ATTESTATION/);
  });

  it('FAIL verdict denies even though an attestation exists', async () => {
    const { verifier } = fakeVerifier('FAIL');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({ operation: 'rescueVault', evidenceHashHex: HASH });

    expect(d.allowed).toBe(false);
    expect(d.attestationFound).toBe(true);
    expect(d.verdict).toBe('FAIL');
    expect(d.reason).toMatch(/^DENY:FAIL/);
  });

  it('REVIEW verdict denies (only PASS authorizes)', async () => {
    const { verifier } = fakeVerifier('REVIEW');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({ operation: 'pauseStrategy', evidenceHashHex: HASH });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:REVIEW/);
  });

  it('operator admission FAIL denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      operatorAdmission: operatorAdmissionPayload({ status: 'FAIL' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:OPERATOR_ADMISSION_FAIL/);
    expect(d.attestationFound).toBe(false);
    expect(calls).toEqual([]);
  });

  it('operator admission REVIEW denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      operatorAdmission: operatorAdmissionPayload({ status: 'REVIEW' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:OPERATOR_ADMISSION_REVIEW/);
    expect(calls).toEqual([]);
  });

  it('expired operator admission denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      operatorAdmission: operatorAdmissionPayload({ validUntil: '2000-01-01T00:00:00Z' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:OPERATOR_ADMISSION_EXPIRED/);
    expect(calls).toEqual([]);
  });

  it('role-mismatched operator admission denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      operatorAdmission: operatorAdmissionPayload({ requiredRole: 'Manager' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:OPERATOR_ROLE_MISMATCH/);
    expect(calls).toEqual([]);
  });

  it('PASS operator admission still requires PASS attestation', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      operatorAdmission: operatorAdmissionPayload(),
    });

    expect(d.allowed).toBe(true);
    expect(d.reason).toMatch(/^ALLOW:PASS/);
    expect(calls).toEqual([{ useCaseId: 'defindex_rebalance_v1', evidenceHashHex: HASH }]);
  });

  it('safeguards FAIL denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      safeguards: safeguardsPayload({ verdict: 'FAIL' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:SAFEGUARDS_FAIL/);
    expect(calls).toEqual([]);
  });

  it('safeguards REVIEW denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      safeguards: safeguardsPayload({ verdict: 'REVIEW' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:SAFEGUARDS_REVIEW/);
    expect(calls).toEqual([]);
  });

  it('missing proof-of-reserve attestation denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      safeguards: safeguardsPayload({ proofOfReserveStatus: 'FAIL' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:SAFEGUARDS_PROOF_OF_RESERVE/);
    expect(calls).toEqual([]);
  });

  it('open incident denies before verifier is called', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      safeguards: safeguardsPayload({ incidentStatus: 'OPEN', incidentSeverity: 'HIGH' }),
    });

    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/^DENY:SAFEGUARDS_INCIDENT_OPEN/);
    expect(calls).toEqual([]);
  });

  it('PASS safeguards still requires PASS attestation', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const d = await gw.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex: HASH,
      safeguards: safeguardsPayload(),
    });

    expect(d.allowed).toBe(true);
    expect(calls).toEqual([{ useCaseId: 'defindex_rebalance_v1', evidenceHashHex: HASH }]);
  });

  it('maps distinct operations to distinct roles + use cases', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);

    const create = await gw.authorize({ operation: 'createVault', evidenceHashHex: HASH });
    const rebalance = await gw.authorize({ operation: 'rebalanceVault', evidenceHashHex: HASH });
    const fees = await gw.authorize({ operation: 'distributeFees', evidenceHashHex: HASH });

    expect(create.requiredRole).toBe('Manager');
    expect(rebalance.requiredRole).toBe('RebalanceManager');
    expect(fees.requiredRole).toBe('FeeReceiver');

    expect(create.useCaseId).toBe('defindex_vault_create_v1');
    expect(rebalance.useCaseId).toBe('defindex_rebalance_v1');
    expect(fees.useCaseId).toBe('defindex_fee_distrib_v1');

    // each authorize call verified its own use case
    expect(calls.map((c) => c.useCaseId)).toEqual([
      'defindex_vault_create_v1',
      'defindex_rebalance_v1',
      'defindex_fee_distrib_v1',
    ]);
  });

  it('throws for an operation with no configured policy', async () => {
    const { verifier } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client, [
      DEFAULT_OPERATION_POLICIES[0]!,
    ]);
    // rebalanceVault is not in the single-policy override
    await expect(
      gw.authorize({ operation: 'rebalanceVault', evidenceHashHex: HASH }),
    ).rejects.toBeInstanceOf(SdkError);
  });
});

describe('DefindexPolicyGateway execution helpers', () => {
  it('prepares a create-vault tx when authorized', async () => {
    const { verifier } = fakeVerifier('PASS');
    const spy = spyClient();
    const gw = new DefindexPolicyGateway(verifier, spy.client);

    const out = await gw.prepareVaultCreationIfAuthorized(createReq, HASH);

    expect(out.decision.allowed).toBe(true);
    expect(out.prepared).toEqual(prepared);
    expect(spy.createVault).toHaveBeenCalledTimes(1);
    expect(spy.createVault).toHaveBeenCalledWith(createReq);
  });

  it('does NOT call the DeFindex client when create is denied', async () => {
    const { verifier } = fakeVerifier(null); // no attestation
    const spy = spyClient();
    const gw = new DefindexPolicyGateway(verifier, spy.client);

    const out = await gw.prepareVaultCreationIfAuthorized(createReq, HASH);

    expect(out.decision.allowed).toBe(false);
    expect(out.prepared).toBeNull();
    expect(spy.createVault).not.toHaveBeenCalled();
  });

  it('does NOT call the DeFindex client when rebalance is denied (FAIL)', async () => {
    const { verifier } = fakeVerifier('FAIL');
    const spy = spyClient();
    const gw = new DefindexPolicyGateway(verifier, spy.client);

    const out = await gw.prepareRebalanceIfAuthorized(rebalanceReq, HASH);

    expect(out.decision.allowed).toBe(false);
    expect(out.prepared).toBeNull();
    expect(spy.rebalance).not.toHaveBeenCalled();
  });

  it('prepares a rebalance tx when authorized', async () => {
    const { verifier } = fakeVerifier('PASS');
    const spy = spyClient();
    const gw = new DefindexPolicyGateway(verifier, spy.client);

    const out = await gw.prepareRebalanceIfAuthorized(rebalanceReq, HASH);

    expect(out.decision.allowed).toBe(true);
    expect(out.prepared).toEqual(prepared);
    expect(spy.rebalance).toHaveBeenCalledWith(rebalanceReq);
  });

  it('derives a deterministic canonical evidence hash for rebalance payloads', () => {
    const gw = new DefindexPolicyGateway(fakeVerifier('PASS').verifier, spyClient().client);
    const payloadA = rebalanceEvidencePayload();
    const payloadB = {
      review: payloadA.review,
      network: payloadA.network,
      schema: payloadA.schema,
      primaryLegalAnchor: payloadA.primaryLegalAnchor,
      requiredRole: payloadA.requiredRole,
      operation: payloadA.operation,
      operatorPredicate: payloadA.operatorPredicate,
      requestedBy: payloadA.requestedBy,
      rebalanceIntent: payloadA.rebalanceIntent,
      mandateControls: payloadA.mandateControls,
      vault: payloadA.vault,
      privacy: payloadA.privacy,
    } satisfies RebalanceEvidencePayload;

    const hashA = gw.hashRebalanceEvidencePayload(payloadA);
    const hashB = gw.hashRebalanceEvidencePayload(payloadB);

    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
    expect(hashB).toBe(hashA);
  });

  it('denies rebalance fail-closed on hash mismatch before verify/client calls', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const spy = spyClient();
    const gw = new DefindexPolicyGateway(verifier, spy.client);

    const out = await gw.prepareRebalanceFromEvidenceIfAuthorized({
      request: rebalanceReq,
      payload: rebalanceEvidencePayload(),
      expectedEvidenceHashHex: HASH,
    });

    expect(out.decision.allowed).toBe(false);
    expect(out.decision.reason).toMatch(/^DENY:HASH_MISMATCH/);
    expect(out.prepared).toBeNull();
    expect(calls).toEqual([]);
    expect(spy.rebalance).not.toHaveBeenCalled();
  });

  it('uses the derived evidence hash for an authorized rebalance-from-payload flow', async () => {
    const { verifier, calls } = fakeVerifier('PASS');
    const spy = spyClient();
    const gw = new DefindexPolicyGateway(verifier, spy.client);
    const payload = rebalanceEvidencePayload();
    const expectedHash = gw.hashRebalanceEvidencePayload(payload);

    const out = await gw.prepareRebalanceFromEvidenceIfAuthorized({
      request: rebalanceReq,
      payload,
      expectedEvidenceHashHex: expectedHash,
    });

    expect(out.decision.allowed).toBe(true);
    expect(out.decision.evidenceHashHex).toBe(expectedHash);
    expect(out.prepared).toEqual(prepared);
    expect(calls).toEqual([
      { useCaseId: 'defindex_rebalance_v1', evidenceHashHex: expectedHash },
    ]);
    expect(spy.rebalance).toHaveBeenCalledWith(rebalanceReq);
  });
});

describe('DEFAULT_OPERATION_POLICIES', () => {
  it('covers all six privileged operations', () => {
    expect(DEFAULT_OPERATION_POLICIES.map((p) => p.operation).sort()).toEqual(
      [
        'createVault',
        'distributeFees',
        'pauseStrategy',
        'rebalanceVault',
        'rescueVault',
        'unpauseStrategy',
      ].sort(),
    );
  });

  it('every use_case_id is a valid Soroban Symbol (≤32 chars)', () => {
    for (const p of DEFAULT_OPERATION_POLICIES) {
      expect(SYMBOL_RE.test(p.useCaseId), `invalid symbol: ${p.useCaseId}`).toBe(true);
    }
  });

  it('listPolicies / policyFor expose the configured map', () => {
    const { verifier } = fakeVerifier('PASS');
    const gw = new DefindexPolicyGateway(verifier, spyClient().client);
    expect(gw.listPolicies()).toHaveLength(DEFAULT_OPERATION_POLICIES.length);
    expect(gw.policyFor('rescueVault').requiredRole).toBe('EmergencyManager');
  });
});
