// The evidentiary audit trail — the piece none of the four repositories had,
// and the first thing a bank's security function asks about.
//
// A rotating log file cannot answer a challenge years later, because nothing
// stops an entry being edited or removed. Each entry here carries the hash of
// the one before it, so any alteration anywhere breaks every link after it and
// `verifyChain` says exactly where.
//
// Articles 62 to 65 of Circular BCB 3.978 require an annual effectiveness
// report naming the *tests applied* and the deficiencies found. This structure
// is what lets that report be demonstrated rather than merely asserted: the
// entries were written when the work happened, not reconstructed in March.

import { hashCanonical, type Canonical } from './canonical.js';

export type TrailAction =
  | 'pack.installed'
  | 'pack.activated'
  | 'evidence.collected'
  | 'policy.evaluated'
  | 'attestation.issued'
  | 'attestation.anchored'
  | 'attestation.revoked'
  | 'authorization.changed';

export interface TrailEntryInput {
  readonly action: TrailAction;
  readonly at: Date;
  /** Role or service account. Never an end customer. */
  readonly actor: string;
  /** Non-identifying payload: hashes, ids, counts, verdicts. */
  readonly subject: Canonical;
}

export interface TrailEntry extends TrailEntryInput {
  readonly seq: number;
  /** Hash of the previous entry; the genesis entry links to 64 zeros. */
  readonly prevHash: string;
  readonly entryHash: string;
}

export const GENESIS_HASH = '0'.repeat(64);

function computeEntryHash(
  input: TrailEntryInput,
  seq: number,
  prevHash: string,
): string {
  return hashCanonical({
    seq,
    prevHash,
    action: input.action,
    at: input.at.toISOString(),
    actor: input.actor,
    subject: input.subject,
  });
}

export interface ChainVerification {
  readonly ok: boolean;
  /** Sequence number of the first bad entry, when `ok` is false. */
  readonly brokenAt?: number;
  readonly reason?: string;
}

/**
 * Append-only, hash-linked trail. Deliberately storage-agnostic: persistence,
 * signing and retention belong to the installation, which differ per bank. What
 * this class guarantees is that tampering is detectable wherever it is stored.
 */
export class AuditTrail {
  private readonly entries: TrailEntry[] = [];

  constructor(existing: readonly TrailEntry[] = []) {
    if (existing.length > 0) {
      const check = AuditTrail.verify(existing);
      if (!check.ok) {
        throw new Error(`cannot load a broken trail: ${check.reason}`);
      }
      this.entries.push(...existing);
    }
  }

  get length(): number {
    return this.entries.length;
  }

  get head(): string {
    return this.entries.length === 0
      ? GENESIS_HASH
      : this.entries[this.entries.length - 1].entryHash;
  }

  append(input: TrailEntryInput): TrailEntry {
    const last = this.entries[this.entries.length - 1];
    if (last && input.at.getTime() < last.at.getTime()) {
      throw new RangeError(
        `entry timestamp ${input.at.toISOString()} precedes the previous entry ` +
          `(${last.at.toISOString()}); the trail must not go backwards`,
      );
    }

    const seq = this.entries.length;
    const prevHash = this.head;
    const entry: TrailEntry = {
      ...input,
      seq,
      prevHash,
      entryHash: computeEntryHash(input, seq, prevHash),
    };
    this.entries.push(entry);
    return entry;
  }

  toArray(): readonly TrailEntry[] {
    return [...this.entries];
  }

  verify(): ChainVerification {
    return AuditTrail.verify(this.entries);
  }

  /** Verifies a trail loaded from storage, entry by entry. */
  static verify(entries: readonly TrailEntry[]): ChainVerification {
    let prevHash = GENESIS_HASH;

    for (let i = 0; i < entries.length; i += 1) {
      const e = entries[i];

      if (e.seq !== i) {
        return { ok: false, brokenAt: i, reason: `entry ${i} declares seq ${e.seq}` };
      }
      if (e.prevHash !== prevHash) {
        return { ok: false, brokenAt: i, reason: `entry ${i} does not link to its predecessor` };
      }

      const expected = computeEntryHash(e, e.seq, e.prevHash);
      if (expected !== e.entryHash) {
        return { ok: false, brokenAt: i, reason: `entry ${i} content does not match its hash` };
      }

      prevHash = e.entryHash;
    }

    return { ok: true };
  }
}
