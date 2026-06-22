// DeFindex × DPO2U policy types.
//
// This module models the HONEST integration surface between DPO2U attestation
// verification and DeFindex vault operations. The design intent (see
// docs/PULSO-DPO2U-DEFINDEX-PRD-v0.1.md) is:
//
//   DPO2U = the compliance/policy gate for *privileged* DeFindex vault
//   operations (create / rebalance / rescue / fee distribution / pause), NOT a
//   retail "KYC every deposit" allowlist.
//
// Why this framing and not deposit-gating:
//   - DeFindex docs describe deposits/withdrawals as user-facing surfaces and
//     do NOT describe an on-chain deposit allowlist. We therefore do not claim
//     one. Native gating lives where DeFindex actually role-gates: the
//     Manager / Emergency Manager / Rebalance Manager / Fee Receiver actions.
//   - DeFindex role addresses *can be smart contracts*. That is the load-bearing
//     hook: a DPO2U policy contract (or, in this slice, an off-chain operator
//     gateway) can occupy a vault role and only emit/sign a privileged action
//     after an attestation verdict verifies on Stellar.
//
// Nothing here moves value or signs transactions. The gateway PREPARES an
// unsigned action and returns a structured allow/deny decision; signing and
// broadcast remain the operator's responsibility.

import type { Verdict } from './types.js';
import type { VerifyResult } from './AttestationClient.js';

/**
 * Privileged DeFindex vault operations that DPO2U can gate.
 *
 * These map 1:1 onto operations the DeFindex docs describe as role-gated.
 * Deposits/withdrawals are deliberately absent: they are user-facing and not
 * gated on-chain by DeFindex, so gating them here would be off-chain UX policy
 * only — out of scope for this honest slice.
 */
export type DefindexOperation =
  | 'createVault'
  | 'rebalanceVault'
  | 'rescueVault'
  | 'distributeFees'
  | 'pauseStrategy'
  | 'unpauseStrategy';

/**
 * DeFindex vault roles. Role addresses can be accounts (G…) or contracts (C…),
 * which is precisely what lets a DPO2U policy layer hold a role.
 */
export type DefindexRole =
  | 'Manager'
  | 'RebalanceManager'
  | 'EmergencyManager'
  | 'FeeReceiver';

/**
 * One gate: which DeFindex role normally performs the operation, and which
 * DPO2U `use_case_id` (Soroban Symbol) must carry a PASS attestation before the
 * operation is authorized.
 *
 * `useCaseId` must be a valid Soroban Symbol (≤32 chars, [a-zA-Z0-9_]) so it can
 * be passed straight to `AttestationClient.verify`.
 */
export interface OperationPolicy {
  readonly operation: DefindexOperation;
  /** DeFindex role that natively authorizes this op on-chain. */
  readonly requiredRole: DefindexRole;
  /** Canonical operator service scope required for this operation. */
  readonly requiredServiceScope: string;
  /** DPO2U use_case_id whose PASS attestation gates this op. */
  readonly useCaseId: string;
  /** Human-readable rationale for the gate (for audit / handoff to DeFindex). */
  readonly rationale: string;
}

/**
 * Structured outcome of a single authorization check. Deterministic and
 * side-effect free: every field is derived from the policy + the on-chain
 * attestation read, so it is safe to log, persist, or attach to an audit trail.
 */
export interface PolicyDecision {
  readonly allowed: boolean;
  readonly operation: DefindexOperation;
  /** DeFindex role the action would run under. */
  readonly requiredRole: DefindexRole;
  /** DPO2U use_case_id that was checked. */
  readonly useCaseId: string;
  /** Evidence hash (hex) the decision was bound to. */
  readonly evidenceHashHex: string;
  /** Whether an attestation existed for (useCaseId, evidenceHash). */
  readonly attestationFound: boolean;
  /** Decoded verdict, or null when no attestation was found. */
  readonly verdict: Verdict | null;
  /** Stellar address (G…/C…) that submitted the attestation, if found. */
  readonly attestedBy: string | null;
  /** On-chain attestation timestamp (epoch seconds), if found. */
  readonly attestedAt: number | null;
  /** Stellar Expert URL for the attestation contract (transparency). */
  readonly explorerUrl: string;
  /** Why the gate allowed or denied — stable, machine-parseable prefix. */
  readonly reason: string;
}

// ── Injected DeFindex client surface ─────────────────────────────────────────
//
// We define our OWN narrow interface instead of hard-wiring `@defindex/sdk` so
// that (a) tests never touch the network and (b) we don't overclaim a live
// DeFindex integration beyond the code we add. The method shapes mirror the
// documented `@defindex/sdk` operator surfaces (createVault, rebalance,
// emergency rescue, pause/unpause strategy). A real adapter is a thin wrapper:
//
//   class DefindexSdkAdapter implements DefindexOperatorClient {
//     constructor(private sdk: import('@defindex/sdk').DefindexSDK) {}
//     createVault(req) {
//       return this.sdk.createVault({ ...map(req) }).then(toPrepared);
//     }
//     rebalance(req) { return this.sdk.rebalance(...).then(toPrepared); }
//   }
//
// The DeFindex SDK returns transaction XDR that the caller then signs and
// broadcasts (`sendTransaction`). We deliberately stop at "prepared, unsigned".

/** Unsigned, prepared action returned by the DeFindex client. */
export interface PreparedTransaction {
  /** Base64 Soroban transaction XDR, ready for signing. */
  readonly unsignedXdr: string;
  /** Human description of what will be signed. */
  readonly description: string;
  /** Stellar network passphrase the XDR targets. */
  readonly network: string;
}

/** DeFindex role assignment for a vault. Each address may be G… or C…. */
export interface VaultRoles {
  readonly manager: string;
  readonly emergencyManager: string;
  readonly rebalanceManager: string;
  readonly feeReceiver: string;
}

/** One strategy slot inside a vault asset allocation. */
export interface VaultStrategy {
  readonly address: string;
  readonly name: string;
  readonly paused?: boolean;
}

/** One asset + its strategies inside a vault. */
export interface VaultAssetAllocation {
  /** Asset contract address (e.g. a Stellar Asset Contract C…). */
  readonly asset: string;
  readonly strategies: readonly VaultStrategy[];
}

/** Arguments to create a DeFindex vault (mirrors `@defindex/sdk` createVault). */
export interface CreateVaultRequest {
  readonly roles: VaultRoles;
  readonly name: string;
  readonly symbol: string;
  readonly assets: readonly VaultAssetAllocation[];
  /** Vault fee in basis points (e.g. 100 = 1%). */
  readonly vaultFeeBps: number;
  /** Account (G…) that will sign/submit the create transaction. */
  readonly caller: string;
  /**
   * Whether the vault's WASM is upgradable. The DeFindex SDK requires this
   * flag; when omitted the adapter defaults to `false` (immutable), the
   * conservative choice for a compliance-gated vault.
   */
  readonly upgradable?: boolean;
}

/**
 * A single rebalance instruction. Loose union mirroring `@defindex/sdk`'s
 * `InstructionParam`: invest/unwind move a strategy balance; the swap variants
 * route between two tokens. Amounts are decimal strings here and converted to
 * the SDK's numeric `amount` by the adapter.
 */
export interface RebalanceInstruction {
  readonly action: 'invest' | 'unwind' | 'swapExactIn' | 'swapExactOut';
  /** Target strategy address for invest/unwind. */
  readonly strategy?: string;
  /** Amount (stroops / token base units) as a decimal string. */
  readonly amount?: string;
  /** Swap-only: input token contract address (`token_in`). */
  readonly tokenIn?: string;
  /** Swap-only: output token contract address (`token_out`). */
  readonly tokenOut?: string;
  /** Swap-only: slippage tolerance in basis points. */
  readonly slippageToleranceBps?: number;
  /** Swap-only: Unix deadline (seconds) for the swap. */
  readonly deadline?: number;
}

/** Arguments to rebalance a vault (mirrors `@defindex/sdk` rebalance). */
export interface RebalanceRequest {
  readonly vault: string;
  readonly instructions: readonly RebalanceInstruction[];
  readonly caller: string;
}

/** One asset/strategy pair referenced by a rebalance mandate scope. */
export interface RebalanceAssetScopeEntry {
  readonly asset: string;
  readonly strategy: string;
}

/** Narrow mandate/risk controls bound into the rebalance evidence payload. */
export interface RebalanceMandateControls {
  readonly mandateId: string;
  readonly mandateVersion: string;
  readonly allocationPolicyId: string;
  readonly riskPolicyId: string;
  readonly maxDeviationBps: number;
  readonly assetAllowed: boolean;
  readonly strategyAllowed: boolean;
  readonly withinAllocationLimits: boolean;
}

/** Review metadata for the off-chain dossier behind a rebalance verdict. */
export interface RebalanceReview {
  readonly reviewer: string;
  readonly reviewedAt: string;
  readonly validUntil: string;
  readonly sourceEvidenceRefs: readonly string[];
}

/** Privacy/disclosure boundary carried by the rebalance evidence payload. */
export interface RebalancePrivacyBoundary {
  readonly piiOnchain: boolean;
  readonly publicFieldsOnly: boolean;
  readonly disclosureBoundary: string;
}

/**
 * Canonical payload hashed for the S1/S2 rebalance circuit.
 *
 * This is deliberately narrow: one privileged rebalance action, one operator
 * predicate, one primary legal anchor, and opaque refs to the upstream dossier.
 */
export interface RebalanceEvidencePayload {
  readonly schema: string;
  readonly operation: 'rebalanceVault';
  readonly operatorPredicate: string;
  readonly primaryLegalAnchor: string;
  readonly network: string;
  readonly vault: string;
  readonly requestedBy: string;
  readonly requiredRole: DefindexRole;
  readonly rebalanceIntent: {
    readonly instructions: readonly RebalanceInstruction[];
    readonly assetScope: readonly RebalanceAssetScopeEntry[];
  };
  readonly mandateControls: RebalanceMandateControls;
  readonly review: RebalanceReview;
  readonly privacy: RebalancePrivacyBoundary;
}

export type OperatorAdmissionStatus = 'PASS' | 'FAIL' | 'REVIEW';

export interface OperatorAdmissionEvidencePayload {
  readonly schema: string;
  readonly operatorId: string;
  readonly operatorCategory: string;
  readonly serviceScope: string;
  readonly jurisdiction: string;
  readonly requiredRole: DefindexRole;
  readonly status: OperatorAdmissionStatus;
  readonly reviewedAt: string;
  readonly validUntil: string;
  readonly evidenceRefs: readonly string[];
  readonly notes?: string;
}

export type SafeguardsVerdict = 'PASS' | 'FAIL' | 'REVIEW';
export type SafeguardsControlStatus = 'PASS' | 'FAIL' | 'REVIEW';
export type IncidentStatus = 'NONE' | 'OPEN' | 'RESOLVED';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SafeguardsEvidencePayload {
  readonly schema: string;
  readonly operatorId: string;
  readonly vault: string;
  readonly requiredRole: DefindexRole;
  readonly verdict: SafeguardsVerdict;
  readonly proofOfReserveStatus: SafeguardsControlStatus;
  readonly segregationStatus: SafeguardsControlStatus;
  readonly incidentStatus: IncidentStatus;
  readonly incidentSeverity: IncidentSeverity;
  readonly assessedAt: string;
  readonly validUntil: string;
  readonly evidenceRefs: readonly string[];
}

export type ReportingArtifactState = 'PRESENT' | 'MISSING' | 'EXPIRED';
export type ReportingVerdict = 'PASS' | 'FAIL' | 'REVIEW';

export interface ReportingEvidencePayload {
  readonly schema: string;
  readonly reportType: string;
  readonly operatorId: string;
  readonly artifactHashHex: string;
  readonly artifactState: ReportingArtifactState;
  readonly verdict: ReportingVerdict;
  readonly producedAt: string;
  readonly validUntil: string;
  readonly deliveryChannel: string;
  readonly evidenceRefs: readonly string[];
}

export type TravelRuleVerdict = 'PASS' | 'FAIL' | 'REVIEW';
export type TravelRuleScreeningStatus = 'PASS' | 'FAIL' | 'REVIEW';
export type TravelRuleMessageStatus = 'PRESENT' | 'MISSING' | 'REJECTED';

export interface TravelRuleEvidencePayload {
  readonly schema: string;
  readonly transferContext: string;
  readonly originatorRef: string;
  readonly beneficiaryRef: string;
  readonly jurisdictionPair: string;
  readonly verdict: TravelRuleVerdict;
  readonly screeningStatus: TravelRuleScreeningStatus;
  readonly messageStatus: TravelRuleMessageStatus;
  readonly assessedAt: string;
  readonly validUntil: string;
  readonly evidenceRefs: readonly string[];
}

/** Arguments for an emergency rescue / emergency withdraw. */
export interface RescueRequest {
  readonly vault: string;
  readonly strategy: string;
  readonly caller: string;
}

/** Arguments for pausing/unpausing a strategy. */
export interface StrategyToggleRequest {
  readonly vault: string;
  readonly strategy: string;
  readonly caller: string;
}

/**
 * Arguments for distributing accumulated vault fees to the fee receiver.
 * DeFindex's `distributeVaultFees` only needs the caller; we also carry the
 * vault so the request is self-describing for audit/handoff.
 */
export interface DistributeFeesRequest {
  readonly vault: string;
  readonly caller: string;
}

/**
 * The DeFindex operator surface the gateway can drive once authorized.
 *
 * `createVault` and `rebalance` are the minimum required surface because those
 * are the first execution helpers we ship. The remaining methods are optional so
 * a partial mock still satisfies the type, while the real adapter can implement
 * the full privileged operator surface.
 */
export interface DefindexOperatorClient {
  createVault(req: CreateVaultRequest): Promise<PreparedTransaction>;
  rebalance(req: RebalanceRequest): Promise<PreparedTransaction>;
  emergencyRescue?(req: RescueRequest): Promise<PreparedTransaction>;
  pauseStrategy?(req: StrategyToggleRequest): Promise<PreparedTransaction>;
  unpauseStrategy?(req: StrategyToggleRequest): Promise<PreparedTransaction>;
  distributeFees?(req: DistributeFeesRequest): Promise<PreparedTransaction>;
}

/**
 * Minimal DPO2U verifier shape. Structurally satisfied by `AttestationClient`,
 * so callers pass a real client; tests pass a fake. We never construct one here.
 */
export interface DefindexAttestationVerifier {
  verify(args: {
    useCaseId: string;
    evidenceHashHex: string;
  }): Promise<VerifyResult>;
}

/** Result of an execution helper: the decision plus the prepared tx (if allowed). */
export interface AuthorizedActionResult {
  readonly decision: PolicyDecision;
  /** Prepared, unsigned tx when `decision.allowed`; null when denied. */
  readonly prepared: PreparedTransaction | null;
}

/**
 * Default DPO2U → DeFindex policy mapping.
 *
 * The `useCaseId` values are dedicated DeFindex operator predicates. Each is the
 * key under which the DPO2U compliance engine (MCP/gateway) submits a PASS/FAIL
 * verdict for that class of privileged action; the evidence hash binds the
 * verdict to the specific action payload (vault params, rebalance instructions).
 *
 * Role assignments follow the DeFindex docs' role semantics. They are our policy
 * choice, not an on-chain DeFindex constraint — DeFindex lets the Manager
 * perform most privileged ops; we split them across roles for least-privilege.
 */
export const DEFAULT_OPERATION_POLICIES: readonly OperationPolicy[] = [
  {
    operation: 'createVault',
    requiredRole: 'Manager',
    requiredServiceScope: 'defindex_vault_manager',
    useCaseId: 'defindex_vault_create_v1',
    rationale:
      'New managed vault must clear treasury-mandate / MiCAR-ART / CVM-175 ' +
      'compliance before the Manager role provisions it.',
  },
  {
    operation: 'rebalanceVault',
    requiredRole: 'RebalanceManager',
    requiredServiceScope: 'defindex_rebalance_manager',
    useCaseId: 'defindex_rebalance_v1',
    rationale:
      'Reallocation across strategies must match the approved mandate/risk ' +
      'policy bound in the attestation evidence hash.',
  },
  {
    operation: 'rescueVault',
    requiredRole: 'EmergencyManager',
    requiredServiceScope: 'defindex_emergency_manager',
    useCaseId: 'defindex_rescue_v1',
    rationale:
      'Emergency withdraw is high-impact; gate on an incident/authorization ' +
      'attestation so the rescue is provably sanctioned.',
  },
  {
    operation: 'distributeFees',
    requiredRole: 'FeeReceiver',
    requiredServiceScope: 'defindex_fee_receiver',
    useCaseId: 'defindex_fee_distrib_v1',
    rationale:
      'Fee distribution to the receiver gated on a settlement/AML attestation ' +
      'for the destination.',
  },
  {
    operation: 'pauseStrategy',
    requiredRole: 'EmergencyManager',
    requiredServiceScope: 'defindex_emergency_manager',
    useCaseId: 'defindex_pause_v1',
    rationale:
      'Pausing a strategy is a protective action; require an incident/risk ' +
      'attestation to keep an audit trail of why it was paused.',
  },
  {
    operation: 'unpauseStrategy',
    requiredRole: 'EmergencyManager',
    requiredServiceScope: 'defindex_emergency_manager',
    useCaseId: 'defindex_unpause_v1',
    rationale:
      'Resuming a paused strategy must re-clear the risk attestation that ' +
      'justified the original pause.',
  },
];
