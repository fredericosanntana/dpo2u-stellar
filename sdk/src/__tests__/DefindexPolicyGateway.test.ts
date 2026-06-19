import { describe, it, expect, vi } from 'vitest';
import { DefindexPolicyGateway } from '../DefindexPolicyGateway.js';
import {
  DEFAULT_OPERATION_POLICIES,
  type CreateVaultRequest,
  type DefindexAttestationVerifier,
  type DefindexOperatorClient,
  type PreparedTransaction,
  type RebalanceRequest,
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
