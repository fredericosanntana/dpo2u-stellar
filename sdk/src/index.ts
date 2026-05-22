export type {
  Verdict,
  AttestationRecord,
  ClientConfig,
} from './types.js';
export { SdkError } from './types.js';
export {
  AttestationClient,
  testnetClient,
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
  DATA_PROTECTION_JURISDICTIONS,
} from './use-cases.js';
