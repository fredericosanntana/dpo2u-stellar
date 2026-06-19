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
  type PolicyDecision,
  type RebalanceRequest,
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

  /**
   * Core gate. Reads the on-chain attestation for the operation's use case and
   * the supplied evidence hash, and returns a structured decision.
   *
   * Allow iff an attestation exists AND its verdict is PASS. FAIL, REVIEW, and
   * "not found" all deny (fail-closed).
   */
  async authorize(args: AuthorizeArgs): Promise<PolicyDecision> {
    const policy = this.policyFor(args.operation);
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
  ): Promise<AuthorizedActionResult> {
    const decision = await this.authorize({
      operation: 'createVault',
      evidenceHashHex,
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
  ): Promise<AuthorizedActionResult> {
    const decision = await this.authorize({
      operation: 'rebalanceVault',
      evidenceHashHex,
    });
    if (!decision.allowed) {
      return { decision, prepared: null };
    }
    const prepared = await this.defindex.rebalance(request);
    return { decision, prepared };
  }

  /**
   * Execution helper: prepare a fee-distribution tx IFF authorized.
   */
  async prepareFeeDistributionIfAuthorized(
    request: DistributeFeesRequest,
    evidenceHashHex: string,
  ): Promise<AuthorizedActionResult> {
    const decision = await this.authorize({
      operation: 'distributeFees',
      evidenceHashHex,
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
