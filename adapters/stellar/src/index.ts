// Stellar/Soroban adapter — the first implementation of the plane-5 contract,
// and therefore the first real test of whether that contract was honest.
//
// It was not, quite. Building this surfaced something the interface had been
// quietly assuming: that every network can store everything an attestation
// carries. The deployed `anticorruption-attestation` contract stores
//
//     verdict, predicate_set, predicate_version, submitted_by,
//     timestamp, metadata_hash
//
// and nothing else. No end of validity. No revocation. No pack hash, and no
// jurisdiction. An attestation that expires in the core would, anchored here,
// read as current forever to anyone verifying from the chain alone.
//
// The fix was not to widen the contract — it is immutable by design, and
// evolving it means a new contract at a new address. The fix was to make the
// core ask first. This adapter declares what it can preserve, and
// `assertAnchorable` refuses the writes that would lose meaning.
//
// See docs/ADR-001-anchor-capabilities.md for the contract change this implies.

import {
  assertAnchorable,
  toAnchorRecord,
  type AnchorReceipt,
  type AnchorRecord,
  type Attestation,
  type ChainAdapter,
  type NetworkDescriptor,
  type Revocation,
  type Verdict,
} from '@dpo2u/core';

export class UnsupportedByContractError extends Error {
  constructor(operation: string, remedy: string) {
    super(`${operation} is not supported by the deployed contract. ${remedy}`);
    this.name = 'UnsupportedByContractError';
  }
}

/**
 * The on-chain record, in the shape the contract actually stores it. Decoding
 * from XDR belongs to `@dpo2u/stellar-sdk`; this adapter consumes the decoded
 * form so it stays testable without a network and without an RPC stub.
 */
export interface SorobanAttestationRecord {
  readonly verdict: Verdict;
  readonly predicate_set: string;
  readonly predicate_version: number;
  readonly submitted_by: string;
  /** Seconds since epoch, as the ledger reports it. */
  readonly timestamp: number;
  readonly metadata_hash_hex: string;
}

/** Read side. Satisfied by `AttestationClient` from `@dpo2u/stellar-sdk`. */
export interface SorobanReader {
  verify(args: {
    useCaseId: string;
    evidenceHashHex: string;
  }): Promise<{ found: boolean; record: SorobanAttestationRecord | null }>;
}

export interface InvocationResult {
  readonly txId: string;
  readonly explorerUrl?: string;
}

/**
 * Write side. Signing and submission are the installation's business — key
 * custody differs per bank, and this package must not assume a wallet.
 */
export interface SorobanInvoker {
  invoke(args: {
    method: 'register_attestation' | 'authorize_submitter';
    args: readonly unknown[];
  }): Promise<InvocationResult>;
}

export interface StellarAdapterConfig {
  readonly networkId?: string;
  readonly displayName?: string;
  readonly reader: SorobanReader;
  readonly invoker: SorobanInvoker;
  /** Injected so replay and tests are exact. Defaults to the host clock. */
  readonly now?: () => Date;
}

/**
 * Capabilities of the *currently deployed* contract. Every `false` here is a
 * finding, not a design choice — see the ADR.
 */
export const DEPLOYED_CONTRACT_CAPABILITIES = {
  validityWindow: false,
  revocation: false,
  packHash: false,
  jurisdiction: false,
} as const;

/**
 * Capabilities of `contracts/attestation-registry` (v2), written but not yet
 * deployed. Kept here so that switching this adapter over is a one-line change
 * once the deploy ceremony runs — and so the difference between the two is
 * visible in one place rather than inferred from two contracts.
 */
export const V2_CONTRACT_CAPABILITIES = {
  validityWindow: true,
  revocation: true,
  packHash: true,
  jurisdiction: true,
} as const;

export class StellarAdapter implements ChainAdapter {
  readonly network: NetworkDescriptor;

  private readonly reader: SorobanReader;
  private readonly invoker: SorobanInvoker;
  private readonly now: () => Date;

  constructor(config: StellarAdapterConfig) {
    this.network = {
      id: config.networkId ?? 'stellar-testnet',
      displayName: config.displayName ?? 'Stellar Testnet (Soroban)',
      // The whole commercial argument: an auditor reads this without a wallet,
      // without a fee, and without asking the institution for anything.
      publiclyVerifiable: true,
      capabilities: { ...DEPLOYED_CONTRACT_CAPABILITIES },
    };
    this.reader = config.reader;
    this.invoker = config.invoker;
    this.now = config.now ?? (() => new Date());
  }

  async register(attestation: Attestation): Promise<AnchorReceipt> {
    // Refuses before writing, rather than dropping a field and reporting
    // success. A silent partial write is the failure mode that would cost the
    // most trust and be discovered the latest.
    assertAnchorable(attestation, this.network);

    const result = await this.invoker.invoke({
      method: 'register_attestation',
      args: [
        attestation.issuer,
        attestation.useCaseId,
        attestation.verdict,
        attestation.evidenceCommitment,
        // The contract's single hash slot carries the result commitment, which
        // is what lets a verifier tie the verdict to the per-predicate outcomes.
        attestation.resultHash,
      ],
    });

    return {
      txId: result.txId,
      ...(result.explorerUrl ? { explorerUrl: result.explorerUrl } : {}),
      anchoredAt: this.now(),
    };
  }

  async read(
    useCaseId: string,
    evidenceCommitment: string,
  ): Promise<AnchorRecord | null> {
    const { found, record } = await this.reader.verify({
      useCaseId,
      evidenceHashHex: evidenceCommitment,
    });

    if (!found || record === null) return null;

    return {
      useCaseId,
      verdict: record.verdict,
      evidenceCommitment,
      resultHash: record.metadata_hash_hex,
      packVersion: record.predicate_version,
      issuer: record.submitted_by,
      issuedAt: new Date(record.timestamp * 1000),
      // No validUntil, no revocation, no packHash, no jurisdiction: the record
      // genuinely does not carry them, and inventing defaults here would be a
      // lie told in a place nobody would think to check.
    };
  }

  async revoke(
    _useCaseId: string,
    _evidenceCommitment: string,
    _revocation: Revocation,
  ): Promise<AnchorReceipt> {
    throw new UnsupportedByContractError(
      'revocation',
      'The deployed contract has no revocation field. Until a contract carrying ' +
        'it is deployed at a new address, revocation lives only in the internal ' +
        'audit trail, and a verifier reading the chain alone cannot see it.',
    );
  }

  async setAuthorized(submitter: string, allowed: boolean): Promise<AnchorReceipt> {
    const result = await this.invoker.invoke({
      method: 'authorize_submitter',
      args: [submitter, allowed],
    });
    return {
      txId: result.txId,
      ...(result.explorerUrl ? { explorerUrl: result.explorerUrl } : {}),
      anchoredAt: this.now(),
    };
  }
}

/**
 * What the anchor would drop for this attestation, in the caller's own words.
 * Worth writing to the audit trail on every anchor: it is the record of what
 * the chain could not be asked to remember.
 */
export function describeFidelityGap(attestation: Attestation): readonly string[] {
  const record = toAnchorRecord(attestation, {
    id: 'stellar-testnet',
    displayName: 'Stellar Testnet (Soroban)',
    publiclyVerifiable: true,
    capabilities: { ...DEPLOYED_CONTRACT_CAPABILITIES },
  });

  const gaps: string[] = [];
  if (record.packHash === undefined) {
    gaps.push('packHash — the chain records a pack version, not the pack identity');
  }
  if (record.jurisdiction === undefined) {
    gaps.push('jurisdiction — recoverable only from the off-chain pack');
  }
  return gaps;
}
