import { DefindexPolicyGateway } from '../dist/index.js';

const prepared = {
  unsignedXdr: 'AAAAAgAAAACdemo-proof-bound-xdr',
  description: 'rebalance DeFindex vault CVAULT',
  network: 'testnet',
};

const request = {
  vault: 'CVAULT',
  instructions: [{ action: 'invest', strategy: 'CSTRAT', amount: '1000' }],
  caller: 'GREBAL',
};

const payload = {
  schema: 'dpo2u.defindex.rebalance.cvm175.v1',
  operation: 'rebalanceVault',
  operatorPredicate: 'defindex_rebalance_v1',
  primaryLegalAnchor: 'sect_cvm_175_v1',
  network: 'testnet',
  vault: request.vault,
  requestedBy: request.caller,
  requiredRole: 'RebalanceManager',
  rebalanceIntent: {
    instructions: request.instructions,
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
};

const verifyCalls = [];
const gateway = new DefindexPolicyGateway(
  {
    async verify(args) {
      verifyCalls.push(args);
      return {
        found: true,
        record: {
          verdict: 'PASS',
          predicate_set: 'defindex',
          predicate_version: 1,
          submitted_by: 'GDPO2UTESTACCOUNTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          timestamp: 1700000000,
          metadata_hash_hex: 'a'.repeat(64),
        },
        explorer_url: 'https://stellar.expert/explorer/testnet/contract/CTEST',
        contract_id: 'CTEST',
        network_passphrase: 'Test SDF Network ; September 2015',
      };
    },
  },
  {
    async createVault() {
      throw new Error('not used in this demo');
    },
    async rebalance() {
      return prepared;
    },
  },
);

const derivedEvidenceHashHex = gateway.hashRebalanceEvidencePayload(payload);
const result = await gateway.prepareRebalanceFromEvidenceIfAuthorized({
  request,
  payload,
  expectedEvidenceHashHex: derivedEvidenceHashHex,
});

console.log(
  JSON.stringify(
    {
      s3_demo: 'defindex-proof-bound-rebalance',
      circuit: 'Governança de rebalance via CVM 175',
      operation: 'rebalanceVault',
      vault: request.vault,
      use_case_id: 'defindex_rebalance_v1',
      primary_legal_anchor: 'sect_cvm_175_v1',
      derivedEvidenceHashHex,
      verifyCalls,
      decision: result.decision,
      prepared: result.prepared,
      live_reference: {
        evidence_hash: '395ae02e84d72e73a18ded2818a40e30f48248fda85f2c2963ca7e2e7605228e',
        rebalance_tx: 'cf790f4d96e7087c0c756531d2bea89f45b88a2e1389d579ed5f9ada5832e3d5',
        vault: 'CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W',
      },
    },
    null,
    2,
  ),
);
