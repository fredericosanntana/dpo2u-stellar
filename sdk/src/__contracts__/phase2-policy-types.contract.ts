import type {
  DefindexRole,
  OperatorAdmissionEvidencePayload,
  OperatorAdmissionStatus,
  ReportingArtifactState,
  ReportingEvidencePayload,
  SafeguardsEvidencePayload,
  SafeguardsVerdict,
  TravelRuleEvidencePayload,
  TravelRuleVerdict,
} from '../index.js';

const role: DefindexRole = 'RebalanceManager';
const operatorStatus: OperatorAdmissionStatus = 'PASS';
const safeguardsVerdict: SafeguardsVerdict = 'REVIEW';
const artifactState: ReportingArtifactState = 'PRESENT';
const travelRuleVerdict: TravelRuleVerdict = 'FAIL';

export const phase2PolicyTypeContract = {
  operator: {
    schema: 'dpo2u.defindex.operator-admission.v1',
    operatorId: 'operator-001',
    operatorCategory: 'institutional_operator',
    serviceScope: 'defindex_rebalance_manager',
    jurisdiction: 'BR',
    requiredRole: role,
    status: operatorStatus,
    reviewedAt: '2026-06-20T00:00:00Z',
    validUntil: '2026-06-27T00:00:00Z',
    evidenceRefs: ['sha256:operator-admission-1'],
    notes: 'operator cleared for role-gated privileged actions',
  } satisfies OperatorAdmissionEvidencePayload,
  safeguards: {
    schema: 'dpo2u.defindex.safeguards.v1',
    operatorId: 'operator-001',
    vault: 'CVAULT',
    requiredRole: role,
    verdict: safeguardsVerdict,
    proofOfReserveStatus: 'PASS',
    segregationStatus: 'PASS',
    incidentStatus: 'OPEN',
    incidentSeverity: 'HIGH',
    assessedAt: '2026-06-20T00:00:00Z',
    validUntil: '2026-06-21T00:00:00Z',
    evidenceRefs: ['sha256:safeguards-1'],
  } satisfies SafeguardsEvidencePayload,
  reporting: {
    schema: 'dpo2u.defindex.reporting.v1',
    reportType: 'operator_monthly_reporting',
    operatorId: 'operator-001',
    artifactHashHex: 'a'.repeat(64),
    artifactState,
    verdict: 'PASS',
    producedAt: '2026-06-20T00:00:00Z',
    validUntil: '2026-07-20T00:00:00Z',
    deliveryChannel: 'attestation_registry',
    evidenceRefs: ['sha256:report-1'],
  } satisfies ReportingEvidencePayload,
  travelRule: {
    schema: 'dpo2u.defindex.travel-rule.v1',
    transferContext: 'settlement_adjacent',
    originatorRef: 'originator-001',
    beneficiaryRef: 'beneficiary-001',
    jurisdictionPair: 'BR-US',
    verdict: travelRuleVerdict,
    screeningStatus: 'FAIL',
    messageStatus: 'MISSING',
    assessedAt: '2026-06-20T00:00:00Z',
    validUntil: '2026-06-20T12:00:00Z',
    evidenceRefs: ['sha256:travel-rule-1'],
  } satisfies TravelRuleEvidencePayload,
} as const;
