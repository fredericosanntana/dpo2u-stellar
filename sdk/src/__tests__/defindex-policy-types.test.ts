import { describe, expect, it } from 'vitest';
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
} from '../defindex-policy-types.js';

const role: DefindexRole = 'RebalanceManager';

describe('Phase 2 defindex policy types', () => {
  it('accepts canonical operator admission payloads', () => {
    const status: OperatorAdmissionStatus = 'PASS';

    const payload: OperatorAdmissionEvidencePayload = {
      schema: 'dpo2u.defindex.operator-admission.v1',
      operatorId: 'operator-001',
      operatorCategory: 'institutional_operator',
      serviceScope: 'defindex_rebalance_manager',
      jurisdiction: 'BR',
      requiredRole: role,
      status,
      reviewedAt: '2026-06-20T00:00:00Z',
      validUntil: '2026-06-27T00:00:00Z',
      evidenceRefs: ['sha256:operator-admission-1'],
      notes: 'operator cleared for role-gated privileged actions',
    };

    expect(payload.status).toBe('PASS');
    expect(payload.requiredRole).toBe('RebalanceManager');
    expect(payload.evidenceRefs).toHaveLength(1);
  });

  it('accepts canonical safeguards payloads', () => {
    const verdict: SafeguardsVerdict = 'REVIEW';

    const payload: SafeguardsEvidencePayload = {
      schema: 'dpo2u.defindex.safeguards.v1',
      operatorId: 'operator-001',
      vault: 'CVAULT',
      requiredRole: role,
      verdict,
      proofOfReserveStatus: 'PASS',
      segregationStatus: 'PASS',
      incidentStatus: 'OPEN',
      incidentSeverity: 'HIGH',
      assessedAt: '2026-06-20T00:00:00Z',
      validUntil: '2026-06-21T00:00:00Z',
      evidenceRefs: ['sha256:safeguards-1'],
    };

    expect(payload.verdict).toBe('REVIEW');
    expect(payload.incidentStatus).toBe('OPEN');
    expect(payload.incidentSeverity).toBe('HIGH');
  });

  it('accepts canonical reporting evidence payloads', () => {
    const artifactState: ReportingArtifactState = 'PRESENT';

    const payload: ReportingEvidencePayload = {
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
    };

    expect(payload.artifactHashHex).toHaveLength(64);
    expect(payload.artifactState).toBe('PRESENT');
    expect(payload.verdict).toBe('PASS');
  });

  it('accepts canonical Travel Rule adjacent payloads', () => {
    const verdict: TravelRuleVerdict = 'FAIL';

    const payload: TravelRuleEvidencePayload = {
      schema: 'dpo2u.defindex.travel-rule.v1',
      transferContext: 'settlement_adjacent',
      originatorRef: 'originator-001',
      beneficiaryRef: 'beneficiary-001',
      jurisdictionPair: 'BR-US',
      verdict,
      screeningStatus: 'FAIL',
      messageStatus: 'MISSING',
      assessedAt: '2026-06-20T00:00:00Z',
      validUntil: '2026-06-20T12:00:00Z',
      evidenceRefs: ['sha256:travel-rule-1'],
    };

    expect(payload.verdict).toBe('FAIL');
    expect(payload.screeningStatus).toBe('FAIL');
    expect(payload.messageStatus).toBe('MISSING');
  });
});
