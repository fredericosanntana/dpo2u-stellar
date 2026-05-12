// ScVal -> AttestationRecord decoder.
//
// Matches the on-chain Soroban schema:
//
//   pub enum Verdict { Pass, Fail, Review }
//
//   pub struct AttestationRecord {
//       pub verdict: Verdict,
//       pub predicate_set: Symbol,
//       pub predicate_version: u32,
//       pub submitted_by: Address,
//       pub timestamp: u64,
//       pub metadata_hash: BytesN<32>,
//   }
//
// Soroban encodes structs as scvMap of scvSymbol-keyed entries. Enum
// variants are scvVec([scvSymbol(name)]).

import { Address, StrKey, xdr } from '@stellar/stellar-sdk';
import { SdkError, type AttestationRecord, type Verdict } from './types.js';

const HEX64_RE = /^[0-9a-fA-F]{64}$/;

export function hexToBytes32(hex: string): Buffer {
  if (!HEX64_RE.test(hex)) {
    throw new SdkError(
      `evidence_hash must be 64 hex chars, got ${hex.length}`,
      'INVALID_INPUT',
    );
  }
  return Buffer.from(hex, 'hex');
}

export function decodeVerdict(scv: xdr.ScVal): Verdict {
  if (scv.switch().name !== 'scvVec') {
    throw new SdkError('verdict ScVal must be scvVec', 'DECODE_FAILED');
  }
  const vec = scv.vec();
  if (!vec || vec.length < 1) {
    throw new SdkError('verdict scvVec is empty', 'DECODE_FAILED');
  }
  const head = vec[0];
  if (head.switch().name !== 'scvSymbol') {
    throw new SdkError('verdict variant must be a Symbol', 'DECODE_FAILED');
  }
  const name = head.sym().toString();
  if (name === 'Pass') return 'PASS';
  if (name === 'Fail') return 'FAIL';
  if (name === 'Review') return 'REVIEW';
  throw new SdkError(`unknown verdict variant: ${name}`, 'DECODE_FAILED');
}

/**
 * Decode an Address ScVal to its canonical Stellar string form
 * (G… for accounts, C… for contracts). Uses StrKey from the SDK so
 * the encoding is identical to what `stellar keys address` produces.
 */
export function decodeAddress(scv: xdr.ScVal): string {
  if (scv.switch().name !== 'scvAddress') {
    throw new SdkError('expected scvAddress', 'DECODE_FAILED');
  }
  // Address.fromScVal can throw on malformed input; we wrap so callers
  // see an SdkError, not an internal SDK error.
  try {
    return Address.fromScVal(scv).toString();
  } catch (err) {
    // Fallback: manual strkey encoding.
    const sc = scv.address();
    if (sc.switch().name === 'scAddressTypeAccount') {
      const ed25519 = Buffer.from(sc.accountId().ed25519());
      return StrKey.encodeEd25519PublicKey(ed25519);
    }
    if (sc.switch().name === 'scAddressTypeContract') {
      return StrKey.encodeContract(Buffer.from(sc.contractId()));
    }
    throw new SdkError(
      `unsupported address sub-type`,
      'DECODE_FAILED',
      err,
    );
  }
}

/**
 * Decode the on-chain Option<AttestationRecord>:
 *   - Option::None  -> scvVoid                 -> returns null
 *   - Option::Some  -> scvMap (the struct)     -> returns AttestationRecord
 */
export function decodeAttestationRecord(
  scv: xdr.ScVal | null,
): AttestationRecord | null {
  if (!scv) return null;
  const kind = scv.switch().name;
  if (kind === 'scvVoid') return null;
  if (kind !== 'scvMap') {
    throw new SdkError(
      `expected scvMap or scvVoid, got ${kind}`,
      'DECODE_FAILED',
    );
  }

  const map = scv.map();
  if (!map) {
    throw new SdkError('scvMap is empty', 'DECODE_FAILED');
  }

  const fields = new Map<string, xdr.ScVal>();
  for (const entry of map) {
    const k = entry.key();
    if (k.switch().name !== 'scvSymbol') {
      throw new SdkError('field key must be Symbol', 'DECODE_FAILED');
    }
    fields.set(k.sym().toString(), entry.val());
  }

  const verdictScv = required(fields, 'verdict');
  const predicateSet = required(fields, 'predicate_set');
  const predicateVersion = required(fields, 'predicate_version');
  const submittedBy = required(fields, 'submitted_by');
  const timestamp = required(fields, 'timestamp');
  const metadataHash = required(fields, 'metadata_hash');

  if (predicateSet.switch().name !== 'scvSymbol') {
    throw new SdkError('predicate_set must be Symbol', 'DECODE_FAILED');
  }
  if (predicateVersion.switch().name !== 'scvU32') {
    throw new SdkError('predicate_version must be u32', 'DECODE_FAILED');
  }
  if (timestamp.switch().name !== 'scvU64') {
    throw new SdkError('timestamp must be u64', 'DECODE_FAILED');
  }
  if (metadataHash.switch().name !== 'scvBytes') {
    throw new SdkError('metadata_hash must be Bytes', 'DECODE_FAILED');
  }

  const tsString = timestamp.u64().toString();
  const ts = Number(tsString);
  if (!Number.isSafeInteger(ts)) {
    throw new SdkError(
      `timestamp ${tsString} exceeds safe integer range`,
      'DECODE_FAILED',
    );
  }

  return {
    verdict: decodeVerdict(verdictScv),
    predicate_set: predicateSet.sym().toString(),
    predicate_version: predicateVersion.u32(),
    submitted_by: decodeAddress(submittedBy),
    timestamp: ts,
    metadata_hash_hex: metadataHash.bytes().toString('hex'),
  };
}

function required(fields: Map<string, xdr.ScVal>, key: string): xdr.ScVal {
  const v = fields.get(key);
  if (!v) {
    throw new SdkError(
      `AttestationRecord missing required field: ${key}`,
      'DECODE_FAILED',
    );
  }
  return v;
}
