// Public types for @dpo2u/stellar-sdk.
//
// Verdict mirrors the on-chain Soroban enum order: Pass=0, Fail=1, Review=2.
// We expose it as a string union because that's what auditors actually want
// to see on screen; the wire encoding is handled by the decoder.

export type Verdict = 'PASS' | 'FAIL' | 'REVIEW';

/**
 * On-chain AttestationRecord, decoded into JS-friendly types.
 *
 * `submitted_by` is rendered as the Stellar G… strkey (account) or C…
 * (contract) address. `metadata_hash_hex` is lowercase hex (64 chars).
 * `timestamp` is seconds-since-epoch.
 */
export interface AttestationRecord {
  readonly verdict: Verdict;
  readonly predicate_set: string;
  readonly predicate_version: number;
  readonly submitted_by: string;
  readonly timestamp: number;
  readonly metadata_hash_hex: string;
}

export interface ClientConfig {
  /** Soroban RPC URL, e.g. https://soroban-testnet.stellar.org. */
  readonly rpcUrl: string;
  /** Network passphrase. Testnet: "Test SDF Network ; September 2015". */
  readonly networkPassphrase: string;
  /** Soroban contract id (C…) of the deployed attestation contract. */
  readonly contractId: string;
  /**
   * Public key (G…) of a funded account used as the simulation source.
   * Soroban RPC `simulateTransaction` requires loading an account; verify
   * is read-only but the SDK still wants one. The friendbot-funded
   * dpo2u-deployer account works fine on testnet.
   */
  readonly viewerAccount: string;
  /** Block explorer base URL. Default Stellar Expert testnet. */
  readonly explorerBaseUrl?: string;
}

export class SdkError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'SIMULATION_FAILED'
      | 'DECODE_FAILED'
      | 'INVALID_INPUT'
      | 'NETWORK',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SdkError';
  }
}
