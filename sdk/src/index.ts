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
export type { AuthorizeArgs } from './DefindexPolicyGateway.js';
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
  RescueRequest,
  StrategyToggleRequest,
  DistributeFeesRequest,
  DefindexOperatorClient,
  DefindexAttestationVerifier,
  AuthorizedActionResult,
} from './defindex-policy-types.js';
