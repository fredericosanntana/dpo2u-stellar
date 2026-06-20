import { DefindexPolicyGateway } from '../dist/index.js';

const prepared = {
  unsignedXdr: 'AAAAAgAAAACdemo-reporting-xdr',
  description: 'rebalance DeFindex vault CVAULT',
  network: 'testnet',
};

const request = {
  vault: 'CVAULT',
  instructions: [{ action: 'invest', strategy: 'CSTRAT', amount: '1000' }],
  caller: 'GREBAL',
};

const reportingArtifact = {
  artifactType: 'operator_monthly_reporting',
  operatorId: 'operator-001',
  period: '2026-06',
  metrics: {
    incidents_open: 0,
    reserve_ratio_bps: 10000,
    segregation_checks_passed: true,
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

const artifactHashHex = gateway.hashReportingArtifact(reportingArtifact);
const reporting = {
  schema: 'dpo2u.defindex.reporting.v1',
  reportType: 'operator_monthly_reporting',
  operatorId: 'operator-001',
  artifactHashHex,
  artifactState: 'PRESENT',
  verdict: 'PASS',
  producedAt: '2026-06-20T00:00:00Z',
  validUntil: '2099-07-20T00:00:00Z',
  deliveryChannel: 'attestation_registry',
  evidenceRefs: ['sha256:report-1'],
};

const result = await gateway.prepareRebalanceIfAuthorized(request, artifactHashHex, undefined, undefined, reporting);

console.log(
  JSON.stringify(
    {
      phase2_demo: 'defindex-reporting-evidence-loop',
      operation: 'rebalanceVault',
      artifact: reportingArtifact,
      artifactHashHex,
      reporting,
      verifyCalls,
      decision: result.decision,
      prepared: result.prepared,
    },
    null,
    2,
  ),
);
