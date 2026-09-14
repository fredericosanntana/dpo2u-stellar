// Deterministic serialization and hashing.
//
// Every hash the core produces — predicate hashes, policy-pack hashes, evidence
// commitments, audit-trail links — must be reproducible by an auditor who holds
// the same inputs and nothing else. That rules out `JSON.stringify` on its own,
// whose key order follows insertion order.
//
// Object keys are sorted; arrays keep their order because order is meaningful
// wherever we use them (a predicate list is a sequence, not a set).

import { createHash } from 'node:crypto';

export type Canonical =
  | string
  | number
  | boolean
  | null
  | readonly Canonical[]
  | { readonly [key: string]: Canonical };

/**
 * Deterministic JSON. Rejects values that cannot round-trip identically
 * (undefined, NaN, Infinity) rather than silently dropping or coercing them —
 * a hash over a silently-dropped field is a hash over the wrong document.
 */
export function canonicalize(value: Canonical): string {
  if (value === null) return 'null';

  const t = typeof value;

  if (t === 'boolean') return value ? 'true' : 'false';

  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new TypeError(`non-finite number cannot be canonicalized: ${String(value)}`);
    }
    return JSON.stringify(value);
  }

  if (t === 'string') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalize(v)).join(',')}]`;
  }

  if (t === 'object') {
    const obj = value as { readonly [key: string]: Canonical };
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      if (v === undefined) {
        throw new TypeError(`undefined value at key "${k}" cannot be canonicalized`);
      }
      parts.push(`${JSON.stringify(k)}:${canonicalize(v)}`);
    }
    return `{${parts.join(',')}}`;
  }

  throw new TypeError(`unsupported type for canonicalization: ${t}`);
}

/** Lowercase hex SHA-256 of the canonical form. */
export function hashCanonical(value: Canonical): string {
  return createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}

/** Lowercase hex SHA-256 of raw bytes or a UTF-8 string. */
export function hashBytes(input: Uint8Array | string): string {
  return createHash('sha256')
    .update(typeof input === 'string' ? Buffer.from(input, 'utf8') : input)
    .digest('hex');
}

const HEX32 = /^[0-9a-f]{64}$/;

export function isHash32(value: string): boolean {
  return HEX32.test(value);
}

export function assertHash32(value: string, label: string): string {
  if (!HEX32.test(value)) {
    throw new TypeError(`${label} must be 64 lowercase hex characters, got: ${value}`);
  }
  return value;
}
