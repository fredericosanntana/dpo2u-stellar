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
