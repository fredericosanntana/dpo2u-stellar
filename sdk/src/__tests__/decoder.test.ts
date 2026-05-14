import { describe, it, expect } from 'vitest';
import { Address, Keypair, StrKey, xdr } from '@stellar/stellar-sdk';
import {
  decodeAddress,
  decodeAttestationRecord,
  decodeVerdict,
  hexToBytes32,
} from '../decoder.js';
import { SdkError } from '../types.js';

const TEST_PK = Keypair.random().publicKey();

function makeRecordScVal(args: {
  verdict: 'Pass' | 'Fail' | 'Review';
  predicateSet: string;
  predicateVersion: number;
  submittedBy: string;
  timestamp: bigint;
  metadataHashHex: string;
}): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('verdict'),
      val: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(args.verdict)]),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('predicate_set'),
      val: xdr.ScVal.scvSymbol(args.predicateSet),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('predicate_version'),
      val: xdr.ScVal.scvU32(args.predicateVersion),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('submitted_by'),
      val: new Address(args.submittedBy).toScVal(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('timestamp'),
      val: xdr.ScVal.scvU64(new xdr.Uint64(args.timestamp)),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('metadata_hash'),
      val: xdr.ScVal.scvBytes(Buffer.from(args.metadataHashHex, 'hex')),
    }),
  ]);
}

describe('hexToBytes32', () => {
  it('decodes 64-char hex', () => {
    expect(hexToBytes32('a'.repeat(64)).length).toBe(32);
  });
  it('rejects wrong length', () => {
    expect(() => hexToBytes32('a'.repeat(63))).toThrow(SdkError);
  });
  it('rejects non-hex chars', () => {
    expect(() => hexToBytes32('z'.repeat(64))).toThrow(SdkError);
  });
});

describe('decodeVerdict', () => {
  it('Pass -> PASS', () => {
    expect(
      decodeVerdict(xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Pass')])),
    ).toBe('PASS');
  });
  it('Fail -> FAIL', () => {
    expect(
      decodeVerdict(xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Fail')])),
    ).toBe('FAIL');
  });
  it('Review -> REVIEW', () => {
    expect(
      decodeVerdict(xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Review')])),
    ).toBe('REVIEW');
  });
  it('rejects unknown variant', () => {
    expect(() =>
      decodeVerdict(xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Unknown')])),
    ).toThrow(SdkError);
  });
  it('rejects non-Vec wrapper', () => {
    expect(() => decodeVerdict(xdr.ScVal.scvSymbol('Pass'))).toThrow(SdkError);
  });
});

describe('decodeAddress', () => {
  it('returns the canonical G... strkey for an account address', () => {
    const scv = new Address(TEST_PK).toScVal();
    const decoded = decodeAddress(scv);
    expect(decoded).toBe(TEST_PK);
    expect(StrKey.isValidEd25519PublicKey(decoded)).toBe(true);
  });
  it('throws on non-address ScVal', () => {
    expect(() => decodeAddress(xdr.ScVal.scvSymbol('nope'))).toThrow(SdkError);
  });
});

describe('decodeAttestationRecord', () => {
  it('returns null on null input', () => {
    expect(decodeAttestationRecord(null)).toBeNull();
  });

  it('returns null on scvVoid (Option::None)', () => {
    expect(decodeAttestationRecord(xdr.ScVal.scvVoid())).toBeNull();
  });

  it('decodes a complete record with canonical strkey for submitter', () => {
    const hash = 'a'.repeat(64);
    const scv = makeRecordScVal({
      verdict: 'Pass',
      predicateSet: 'bank_change_v1',
      predicateVersion: 1,
      submittedBy: TEST_PK,
      timestamp: 1_700_000_000n,
      metadataHashHex: hash,
    });
    const r = decodeAttestationRecord(scv)!;
    expect(r.verdict).toBe('PASS');
    expect(r.predicate_set).toBe('bank_change_v1');
    expect(r.predicate_version).toBe(1);
    expect(r.submitted_by).toBe(TEST_PK); // STRKEY-encoded, not hex
    expect(r.timestamp).toBe(1_700_000_000);
    expect(r.metadata_hash_hex).toBe(hash);
  });

  it('decodes Fail verdict', () => {
    const scv = makeRecordScVal({
      verdict: 'Fail',
      predicateSet: 'uc1',
      predicateVersion: 2,
      submittedBy: TEST_PK,
      timestamp: 1n,
      metadataHashHex: 'b'.repeat(64),
    });
    expect(decodeAttestationRecord(scv)!.verdict).toBe('FAIL');
  });

  it('decodes Review verdict', () => {
    const scv = makeRecordScVal({
      verdict: 'Review',
      predicateSet: 'uc1',
      predicateVersion: 7,
      submittedBy: TEST_PK,
      timestamp: 1n,
      metadataHashHex: 'c'.repeat(64),
    });
    expect(decodeAttestationRecord(scv)!.verdict).toBe('REVIEW');
  });

  it('throws on missing required field', () => {
    const partial = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('verdict'),
        val: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Pass')]),
      }),
    ]);
    expect(() => decodeAttestationRecord(partial)).toThrow(/missing required field/);
  });

  it('throws on non-map/non-void wrapper', () => {
    expect(() => decodeAttestationRecord(xdr.ScVal.scvSymbol('x'))).toThrow(
      SdkError,
    );
  });

  it('throws on unsafe-integer timestamp', () => {
    const overflow = makeRecordScVal({
      verdict: 'Pass',
      predicateSet: 'uc1',
      predicateVersion: 1,
      submittedBy: TEST_PK,
      timestamp: 2n ** 60n, // exceeds Number.MAX_SAFE_INTEGER
      metadataHashHex: 'a'.repeat(64),
    });
    expect(() => decodeAttestationRecord(overflow)).toThrow(/safe integer/);
  });
});
