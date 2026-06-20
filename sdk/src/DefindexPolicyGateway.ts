// DefindexPolicyGateway — DPO2U attestation as a compliance gate for DeFindex
// privileged vault operations.
//
// HONEST SCOPE (read before extending):
//   - This gates DeFindex's role-gated *operator* actions (create / rebalance /
//     rescue / fee distribution / pause / unpause). It does NOT gate user
//     deposits: DeFindex deposits are user-facing and have no on-chain
//     allowlist, so any deposit gating would be off-chain UX policy only.
//   - The gateway READS an attestation via the injected DPO2U verifier
//     (`AttestationClient`-compatible) and returns a structured allow/deny
//     decision. It only PREPARES (unsigned) DeFindex actions; it never signs or
//     broadcasts, and it never moves value.
//   - Both the verifier and the DeFindex client are injected, so no network I/O
//     happens in tests.
//
// Institutional thesis: because a DeFindex vault role address can be a smart
// contract, a DPO2U policy contract can eventually OCCUPY a role and only emit a
// privileged action after the verdict verifies on-chain. This class is the
// off-chain, operator-surface expression of that target — a concrete direction
// we can hand to the DeFindex team.

import { createHash } from 'node:crypto';
import type { Verdict } from './types.js';
import { SdkError } from './types.js';
import {
  DEFAULT_OPERATION_POLICIES,
  type AuthorizedActionResult,
  type CreateVaultRequest,
  type DefindexAttestationVerifier,
  type DefindexOperation,
  type DefindexOperatorClient,
  type DistributeFeesRequest,
  type OperationPolicy,
  type OperatorAdmissionEvidencePayload,
  type PolicyDecision,
  type RebalanceEvidencePayload,
  type RebalanceRequest,
  type ReportingEvidencePayload,
  type SafeguardsEvidencePayload,
} from './defindex-policy-types.js';

export interface AuthorizeArgs {
  /** Privileged DeFindex operation being requested. */
  readonly operation: DefindexOperation;
  /**
   * Hex (64-char) evidence hash that the compliance verdict is bound to —
   * typically the hash of the action payload (vault params, rebalance
   * instructions, rescue target). Passed verbatim to the verifier.
   */
  readonly evidenceHashHex: string;
  /**
   * Optional Phase 2 operator-admission payload. When present, the gateway
   * short-circuits fail-closed on non-PASS / expiry / role mismatch before any
   * verifier read or downstream DeFindex client call.
   */
  readonly operatorAdmission?: OperatorAdmissionEvidencePayload;
  /**
   * Optional Phase 2 safeguards payload. When present, the gateway short-
   * circuits fail-closed on non-PASS safeguards posture before any verifier read
   * or downstream DeFindex client call.
   */
  readonly safeguards?: SafeguardsEvidencePayload;
  /**
   * Optional Phase 2 reporting payload. When present, the gateway short-
   * circuits fail-closed on missing/invalid/expired reporting posture before any
   * verifier read or downstream DeFindex client call.
   */
  readonly reporting?: ReportingEvidencePayload;
}

export interface PrepareRebalanceFromEvidenceArgs {
  readonly request: RebalanceRequest;
  readonly payload: RebalanceEvidencePayload;
  /** Optional caller-supplied hash to enforce exact payload binding. */
  readonly expectedEvidenceHashHex?: string;
}

export class DefindexPolicyGateway {
  private readonly policies: Map<DefindexOperation, OperationPolicy>;

  /**
   * @param verifier DPO2U attestation verifier (e.g. an `AttestationClient`).
   * @param defindex Injected DeFindex operator client; never called when denied.
   * @param policies Optional override of the default DPO2U→DeFindex policy map.
   */
  constructor(
    private readonly verifier: DefindexAttestationVerifier,
    private readonly defindex: DefindexOperatorClient,
    policies: readonly OperationPolicy[] = DEFAULT_OPERATION_POLICIES,
  ) {
    this.policies = new Map(policies.map((p) => [p.operation, p]));
  }

  /** Returns the policy gating an operation, or throws if none is configured. */
  policyFor(operation: DefindexOperation): OperationPolicy {
    const policy = this.policies.get(operation);
    if (!policy) {
      throw new SdkError(
        `no policy configured for operation '${operation}'`,
        'INVALID_INPUT',
      );
    }
    return policy;
  }

  /** All configured policies (for display / audit / handoff). */
  listPolicies(): OperationPolicy[] {
    return [...this.policies.values()];
  }

  /** Deterministic SHA-256 hash of the canonical rebalance evidence payload. */
  hashRebalanceEvidencePayload(payload: RebalanceEvidencePayload): string {
    const canonical = canonicalJson(payload);
    return createHash('sha256').update(canonical).digest('hex');
  }

  /** Deterministic SHA-256 hash of a canonicalized reporting artifact payload. */
  hashReportingArtifact(artifact: unknown): string {
    const canonical = canonicalJson(artifact);
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Core gate. Reads the on-chain attestation for the operation's use case and
   * the supplied evidence hash, and returns a structured decision.
   *
   * Allow iff an attestation exists AND its verdict is PASS. FAIL, REVIEW, and
   * "not found" all deny (fail-closed).
   */
  async authorize(args: AuthorizeArgs): Promise<PolicyDecision> {
    const policy = this.policyFor(args.operation);
    const operatorAdmissionDecision = this.evaluateOperatorAdmission(
      policy,
      args.evidenceHashHex,
      args.operatorAdmission,
    );
    if (operatorAdmissionDecision) {
      return operatorAdmissionDecision;
    }
    const safeguardsDecision = this.evaluateSafeguards(
      policy,
      args.evidenceHashHex,
      args.safeguards,
    );
    if (safeguardsDecision) {
      return safeguardsDecision;
    }
    const reportingDecision = this.evaluateReporting(
      policy,
      args.evidenceHashHex,
      args.reporting,
    );
    if (reportingDecision) {
      return reportingDecision;
    }

    const result = await this.verifier.verify({
      useCaseId: policy.useCaseId,
      evidenceHashHex: args.evidenceHashHex,
    });

    const verdict: Verdict | null = result.record?.verdict ?? null;
    const allowed = result.found && verdict === 'PASS';

    return {
      allowed,
      operation: policy.operation,
      requiredRole: policy.requiredRole,
      useCaseId: policy.useCaseId,
      evidenceHashHex: args.evidenceHashHex,
      attestationFound: result.found,
      verdict,
      attestedBy: result.record?.submitted_by ?? null,
      attestedAt: result.record?.timestamp ?? null,
      explorerUrl: result.explorer_url,
      reason: reasonFor(result.found, verdict, policy),
    };
  }

  /**
   * Execution helper: prepare a vault-creation tx IFF authorized.
   *
   * When denied, the injected DeFindex client is NOT called and `prepared` is
   * null — the decision carries the reason. When allowed, the client prepares an
   * unsigned tx the operator then signs and broadcasts.
   */
  async prepareVaultCreationIfAuthorized(
    request: CreateVaultRequest,
    evidenceHashHex: string,
    operatorAdmission?: OperatorAdmissionEvidencePayload,
    safeguards?: SafeguardsEvidencePayload,
    reporting?: ReportingEvidencePayload,
  ): Promise<AuthorizedActionResult> {
    const decision = await this.authorize({
      operation: 'createVault',
      evidenceHashHex,
      operatorAdmission,
      safeguards,
      reporting,
    });
    if (!decision.allowed) {
      return { decision, prepared: null };
    }
    const prepared = await this.defindex.createVault(request);
    return { decision, prepared };
  }

  /**
   * Execution helper: prepare a rebalance tx IFF authorized. Same fail-closed
   * contract as {@link prepareVaultCreationIfAuthorized}.
   */
  async prepareRebalanceIfAuthorized(
    request: RebalanceRequest,
    evidenceHashHex: string,
    operatorAdmission?: OperatorAdmissionEvidencePayload,
    safeguards?: SafeguardsEvidencePayload,
    reporting?: ReportingEvidencePayload,
  ): Promise<AuthorizedActionResult> {
    const decision = await this.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex,
      operatorAdmission,
      safeguards,
      reporting,
    });
    if (!decision.allowed) {
      return { decision, prepared: null };
    }
    const prepared = await this.defindex.rebalance(request);
    return { decision, prepared };
  }

  /**
   * S2 helper: derives the canonical evidence hash from a rebalance payload,
   * denies on hash mismatch before any verify/client call, then authorizes using
   * the derived hash.
   */
  async prepareRebalanceFromEvidenceIfAuthorized(
    args: PrepareRebalanceFromEvidenceArgs,
  ): Promise<AuthorizedActionResult> {
    const derivedEvidenceHashHex = this.hashRebalanceEvidencePayload(args.payload);
    if (
      args.expectedEvidenceHashHex &&
      args.expectedEvidenceHashHex !== derivedEvidenceHashHex
    ) {
      return {
        decision: this.denyRebalanceHashMismatch(
          args.expectedEvidenceHashHex,
          derivedEvidenceHashHex,
        ),
        prepared: null,
      };
    }
    return this.prepareRebalanceIfAuthorized(args.request, derivedEvidenceHashHex);
  }

  /**
   * Execution helper: prepare a fee-distribution tx IFF authorized.
   */
  async prepareFeeDistributionIfAuthorized(
    request: DistributeFeesRequest,
    evidenceHashHex: string,
    operatorAdmission?: OperatorAdmissionEvidencePayload,
    safeguards?: SafeguardsEvidencePayload,
    reporting?: ReportingEvidencePayload,
  ): Promise<AuthorizedActionResult> {
    const decision = await this.authorize({
      operation: 'distributeFees',
      evidenceHashHex,
      operatorAdmission,
      safeguards,
      reporting,
    });
    if (!decision.allowed) {
      return { decision, prepared: null };
    }
    if (!this.defindex.distributeFees) {
      throw new SdkError(
        'injected DeFindex client does not implement distributeFees',
        'INVALID_INPUT',
      );
    }
    const prepared = await this.defindex.distributeFees(request);
    return { decision, prepared };
  }

  private evaluateOperatorAdmission(
    policy: OperationPolicy,
    evidenceHashHex: string,
    operatorAdmission?: OperatorAdmissionEvidencePayload,
  ): PolicyDecision | null {
    if (!operatorAdmission) {
      return null;
    }
    if (operatorAdmission.requiredRole !== policy.requiredRole) {
      return this.denyOperatorAdmission(
        policy,
        evidenceHashHex,
        'OPERATOR_ROLE_MISMATCH',
        `operator admission role ${operatorAdmission.requiredRole} does not match required role ${policy.requiredRole}`,
      );
    }
    if (operatorAdmission.status === 'FAIL') {
      return this.denyOperatorAdmission(
        policy,
        evidenceHashHex,
        'OPERATOR_ADMISSION_FAIL',
        'operator admission payload exists but status is FAIL',
      );
    }
    if (operatorAdmission.status === 'REVIEW') {
      return this.denyOperatorAdmission(
        policy,
        evidenceHashHex,
        'OPERATOR_ADMISSION_REVIEW',
        'operator admission payload exists but status is REVIEW; PASS is required',
      );
    }
    if (Date.parse(operatorAdmission.validUntil) <= Date.now()) {
      return this.denyOperatorAdmission(
        policy,
        evidenceHashHex,
        'OPERATOR_ADMISSION_EXPIRED',
        `operator admission expired at ${operatorAdmission.validUntil}`,
      );
    }
    return null;
  }

  private denyOperatorAdmission(
    policy: OperationPolicy,
    evidenceHashHex: string,
    code:
      | 'OPERATOR_ADMISSION_FAIL'
      | 'OPERATOR_ADMISSION_REVIEW'
      | 'OPERATOR_ADMISSION_EXPIRED'
      | 'OPERATOR_ROLE_MISMATCH',
    detail: string,
  ): PolicyDecision {
    return {
      allowed: false,
      operation: policy.operation,
      requiredRole: policy.requiredRole,
      useCaseId: policy.useCaseId,
      evidenceHashHex,
      attestationFound: false,
      verdict: null,
      attestedBy: null,
      attestedAt: null,
      explorerUrl: '',
      reason: `DENY:${code} ${detail}`,
    };
  }

  private evaluateSafeguards(
    policy: OperationPolicy,
    evidenceHashHex: string,
    safeguards?: SafeguardsEvidencePayload,
  ): PolicyDecision | null {
    if (!safeguards) {
      return null;
    }
    if (safeguards.requiredRole !== policy.requiredRole) {
      return this.denySafeguards(
        policy,
        evidenceHashHex,
        'SAFEGUARDS_ROLE_MISMATCH',
        `safeguards role ${safeguards.requiredRole} does not match required role ${policy.requiredRole}`,
      );
    }
    if (safeguards.verdict === 'FAIL') {
      return this.denySafeguards(
        policy,
        evidenceHashHex,
        'SAFEGUARDS_FAIL',
        'safeguards payload exists but verdict is FAIL',
      );
    }
    if (safeguards.verdict === 'REVIEW') {
      return this.denySafeguards(
        policy,
        evidenceHashHex,
        'SAFEGUARDS_REVIEW',
        'safeguards payload exists but verdict is REVIEW; PASS is required',
      );
    }
    if (safeguards.proofOfReserveStatus !== 'PASS') {
      return this.denySafeguards(
        policy,
        evidenceHashHex,
        'SAFEGUARDS_PROOF_OF_RESERVE',
        `proof-of-reserve status is ${safeguards.proofOfReserveStatus}; PASS is required`,
      );
    }
    if (safeguards.segregationStatus !== 'PASS') {
      return this.denySafeguards(
        policy,
        evidenceHashHex,
        'SAFEGUARDS_SEGREGATION',
        `segregation status is ${safeguards.segregationStatus}; PASS is required`,
      );
    }
    if (safeguards.incidentStatus === 'OPEN') {
      return this.denySafeguards(
        policy,
        evidenceHashHex,
        'SAFEGUARDS_INCIDENT_OPEN',
        `incident remains OPEN with severity ${safeguards.incidentSeverity}`,
      );
    }
    if (Date.parse(safeguards.validUntil) <= Date.now()) {
      return this.denySafeguards(
        policy,
        evidenceHashHex,
        'SAFEGUARDS_EXPIRED',
        `safeguards payload expired at ${safeguards.validUntil}`,
      );
    }
    return null;
  }

  private denySafeguards(
    policy: OperationPolicy,
    evidenceHashHex: string,
    code:
      | 'SAFEGUARDS_FAIL'
      | 'SAFEGUARDS_REVIEW'
      | 'SAFEGUARDS_PROOF_OF_RESERVE'
      | 'SAFEGUARDS_SEGREGATION'
      | 'SAFEGUARDS_INCIDENT_OPEN'
      | 'SAFEGUARDS_EXPIRED'
      | 'SAFEGUARDS_ROLE_MISMATCH',
    detail: string,
  ): PolicyDecision {
    return {
      allowed: false,
      operation: policy.operation,
      requiredRole: policy.requiredRole,
      useCaseId: policy.useCaseId,
      evidenceHashHex,
      attestationFound: false,
      verdict: null,
      attestedBy: null,
      attestedAt: null,
      explorerUrl: '',
      reason: `DENY:${code} ${detail}`,
    };
  }

  private evaluateReporting(
    policy: OperationPolicy,
    evidenceHashHex: string,
    reporting?: ReportingEvidencePayload,
  ): PolicyDecision | null {
    if (!reporting) {
      return null;
    }
    if (reporting.artifactState !== 'PRESENT') {
      return this.denyReporting(
        policy,
        evidenceHashHex,
        'REPORTING_ARTIFACT_STATE',
        `reporting artifact state is ${reporting.artifactState}; PRESENT is required`,
      );
    }
    if (reporting.verdict === 'FAIL') {
      return this.denyReporting(
        policy,
        evidenceHashHex,
        'REPORTING_FAIL',
        'reporting payload exists but verdict is FAIL',
      );
    }
    if (reporting.verdict === 'REVIEW') {
      return this.denyReporting(
        policy,
        evidenceHashHex,
        'REPORTING_REVIEW',
        'reporting payload exists but verdict is REVIEW; PASS is required',
      );
    }
    if (Date.parse(reporting.validUntil) <= Date.now()) {
      return this.denyReporting(
        policy,
        evidenceHashHex,
        'REPORTING_EXPIRED',
        `reporting payload expired at ${reporting.validUntil}`,
      );
    }
    return null;
  }

  private denyReporting(
    policy: OperationPolicy,
    evidenceHashHex: string,
    code:
      | 'REPORTING_ARTIFACT_STATE'
      | 'REPORTING_FAIL'
      | 'REPORTING_REVIEW'
      | 'REPORTING_EXPIRED',
    detail: string,
  ): PolicyDecision {
    return {
      allowed: false,
      operation: policy.operation,
      requiredRole: policy.requiredRole,
      useCaseId: policy.useCaseId,
      evidenceHashHex,
      attestationFound: false,
      verdict: null,
      attestedBy: null,
      attestedAt: null,
      explorerUrl: '',
      reason: `DENY:${code} ${detail}`,
    };
  }

  private denyRebalanceHashMismatch(
    expectedEvidenceHashHex: string,
    derivedEvidenceHashHex: string,
  ): PolicyDecision {
    const policy = this.policyFor('rebalanceVault');
    return {
      allowed: false,
      operation: policy.operation,
      requiredRole: policy.requiredRole,
      useCaseId: policy.useCaseId,
      evidenceHashHex: derivedEvidenceHashHex,
      attestationFound: false,
      verdict: null,
      attestedBy: null,
      attestedAt: null,
      explorerUrl: '',
      reason:
        `DENY:HASH_MISMATCH derived rebalance evidence hash ${derivedEvidenceHashHex} ` +
        `did not match supplied hash ${expectedEvidenceHashHex}`,
    };
  }
}

/** Stable, machine-parseable reason strings (prefix = code). */
function reasonFor(
  found: boolean,
  verdict: Verdict | null,
  policy: OperationPolicy,
): string {
  if (!found) {
    return `DENY:NO_ATTESTATION no attestation found for use_case '${policy.useCaseId}' and the supplied evidence hash`;
  }
  if (verdict === 'PASS') {
    return `ALLOW:PASS attestation verdict PASS authorizes '${policy.operation}' (role ${policy.requiredRole})`;
  }
  return `DENY:${verdict} attestation exists but verdict is ${verdict}; '${policy.operation}' requires PASS`;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortRecursively(value));
}

function sortRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortRecursively);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortRecursively(nested)]),
    );
  }
  return value;
}
