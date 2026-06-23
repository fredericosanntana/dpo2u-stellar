export type {
  Verdict,
  AttestationRecord,
  ClientConfig,
} from './types.js';
export { SdkError } from './types.js';
export {
  AttestationClient,
  testnetClient,
  mainnetClient,
  MAINNET_ATTESTATION_CONTRACT_ID,
} from './AttestationClient.js';
export type { SorobanRpcLike, VerifyResult } from './AttestationClient.js';
export {
  decodeAttestationRecord,
  decodeVerdict,
  decodeAddress,
  hexToBytes32,
} from './decoder.js';
export type { UseCaseLayer, UseCaseInfo } from './use-cases.js';
export {
  USE_CASES,
  useCasesByLayer,
  findUseCase,
  deployableUseCases,
  DATA_PROTECTION_JURISDICTIONS,
  AI_GOVERNANCE_FRAMEWORKS,
  SECTORAL_FRAMEWORKS,
} from './use-cases.js';
// DeFindex × DPO2U policy gateway (honest operator-surface integration).
export { DefindexPolicyGateway } from './DefindexPolicyGateway.js';
export type {
  AuthorizeArgs,
  PrepareRebalanceFromEvidenceArgs,
  SafeguardsRequestContext,
} from './DefindexPolicyGateway.js';
// BCB/VASP + CVM (RCVM 88) compliance pack — Category-A proof-bound predicates.
export {
  evaluateBcbVasp,
  evaluateCvmRcvm88,
  PREDICATE_REGISTRY,
  CVM_RETAIL_CAP_CENTAVOS,
  CVM_ISSUER_CAP_CENTAVOS,
  CVM_CAPTURE_MAX_DAYS,
  CVM_COOLDOWN_DAYS,
  BCB_COUNTERPARTY_CUTOFF_ISO,
} from './bcb-policy.js';
export type {
  PredicateVerdict,
  PredicateResult,
  PolicyEvaluation,
  PolicyAction,
  BcbSegregationEvidence,
  BcbBufferEvidence,
  BcbAdmissionEvidence,
  CvmInvestorProfile,
  CvmRetailEvidence,
  CvmIssuerEvidence,
  BcbVaspEvidence,
  CvmRcvm88Evidence,
} from './bcb-policy.js';
export { DefindexSdkAdapter } from './DefindexSdkAdapter.js';
export type { DefindexSdkAdapterOptions } from './DefindexSdkAdapter.js';
export { DEFAULT_OPERATION_POLICIES } from './defindex-policy-types.js';
export type {
  DefindexOperation,
  DefindexRole,
  OperationPolicy,
  PolicyDecision,
  PreparedTransaction,
  VaultRoles,
  VaultStrategy,
  VaultAssetAllocation,
  CreateVaultRequest,
  RebalanceInstruction,
  RebalanceRequest,
  RebalanceAssetScopeEntry,
  RebalanceMandateControls,
  RebalanceReview,
  RebalancePrivacyBoundary,
  RebalanceEvidencePayload,
  OperatorAdmissionStatus,
  OperatorAdmissionEvidencePayload,
  SafeguardsVerdict,
  SafeguardsControlStatus,
  IncidentStatus,
  IncidentSeverity,
  SafeguardsEvidencePayload,
  ReportingArtifactState,
  ReportingVerdict,
  ReportingEvidencePayload,
  TravelRuleVerdict,
  TravelRuleScreeningStatus,
  TravelRuleMessageStatus,
  TravelRuleEvidencePayload,
  RescueRequest,
  StrategyToggleRequest,
  DistributeFeesRequest,
  DefindexOperatorClient,
  DefindexAttestationVerifier,
  AuthorizedActionResult,
} from './defindex-policy-types.js';
