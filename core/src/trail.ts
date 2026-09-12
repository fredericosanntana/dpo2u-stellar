// The evidentiary audit trail — the piece none of the four repositories had,
// and the first thing a bank's security function asks about.
//
// A rotating log file cannot answer a challenge years later, because nothing
// stops an entry being edited or removed. Each entry here carries the hash of
// the one before it, so any alteration anywhere breaks every link after it and
// `verifyChain` says exactly where.
//
// Hash-linking alone has one gap, and it is worth naming rather than hiding:
// it proves nothing was *altered*, not that nothing was *withheld*. Dropping
// the last N entries leaves a chain that still verifies perfectly. Signed
// checkpoints close that: a checkpoint asserts "at sequence N the head was H",
// signed, so a trail that later presents fewer than N entries contradicts a
// signature it cannot forge.
//
// Articles 62 to 65 of Circular BCB 3.978 require an annual effectiveness
// report naming the *tests applied* and the deficiencies found. This structure
// is what lets that report be demonstrated rather than merely asserted: the
// entries were written when the work happened, not reconstructed in March.

import { hashCanonical, type Canonical } from './canonical.js';
import type { Signer, Verifier } from './signing.js';

export type TrailAction =
  | 'pack.installed'
  | 'pack.activated'
  | 'pack.rolled_back'
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

/**
 * A signed assertion about the trail's length and head at a moment in time.
 *
 * `coversEntries` is a count, not an index: a checkpoint over an empty trail is
 * legitimate and says "nothing had happened yet", which is itself a fact worth
 * being able to prove.
 */
export interface TrailCheckpoint {
  readonly coversEntries: number;
  readonly headHash: string;
  /** ISO-8601, so the checkpoint is readable without the code that made it. */
  readonly at: string;
  readonly keyId: string;
  readonly signature: string;
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

/** Exactly what a checkpoint signature covers. */
export function checkpointPayload(
  checkpoint: Omit<TrailCheckpoint, 'signature'>,
): string {
  return hashCanonical({
    coversEntries: checkpoint.coversEntries,
    headHash: checkpoint.headHash,
    at: checkpoint.at,
    keyId: checkpoint.keyId,
  });
}

export interface ChainVerification {
  readonly ok: boolean;
  /** Sequence number of the first bad entry, when `ok` is false. */
  readonly brokenAt?: number;
  readonly reason?: string;
}

export type CheckpointFailure =
  | 'signature_invalid'
  | 'head_mismatch'
  | 'entries_missing'
  | 'unknown_key';

export interface CheckpointVerification {
  readonly ok: boolean;
  readonly checked: number;
  readonly failures: readonly {
    readonly coversEntries: number;
    readonly failure: CheckpointFailure;
    readonly detail: string;
  }[];
}

/**
 * Append-only, hash-linked trail. Deliberately storage-agnostic: persistence
 * and retention belong to the installation, which differ per bank. What this
 * class guarantees is that tampering is detectable wherever it is stored.
 */
export class AuditTrail {
  private readonly entries: TrailEntry[] = [];
  private readonly checkpoints: TrailCheckpoint[] = [];

  constructor(
    existing: readonly TrailEntry[] = [],
    checkpoints: readonly TrailCheckpoint[] = [],
  ) {
    if (existing.length > 0) {
      const check = AuditTrail.verify(existing);
      if (!check.ok) {
        throw new Error(`cannot load a broken trail: ${check.reason}`);
      }
      this.entries.push(...existing);
    }
    this.checkpoints.push(...checkpoints);
  }

  get length(): number {
    return this.entries.length;
  }

  get head(): string {
    return this.headAt(this.entries.length);
  }

  /** Head hash after the first `count` entries. */
  headAt(count: number): string {
    if (count <= 0) return GENESIS_HASH;
    if (count > this.entries.length) {
      throw new RangeError(
        `trail holds ${this.entries.length} entries; cannot report the head at ${count}`,
      );
    }
    return this.entries[count - 1].entryHash;
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

  /**
   * Seal the trail up to its current length.
   *
   * Cadence is the installation's call. Daily is a reasonable default; the
   * useful property is that anything between two checkpoints is the most a
   * silent truncation could ever hide, so the interval is the exposure.
   */
  async checkpoint(signer: Signer, at: Date): Promise<TrailCheckpoint> {
    const unsigned = {
      coversEntries: this.entries.length,
      headHash: this.head,
      at: at.toISOString(),
      keyId: signer.keyId,
    };
    const signature = await signer.sign(checkpointPayload(unsigned));
    const checkpoint: TrailCheckpoint = { ...unsigned, signature };
    this.checkpoints.push(checkpoint);
    return checkpoint;
  }

  toArray(): readonly TrailEntry[] {
    return [...this.entries];
  }

  checkpointsTaken(): readonly TrailCheckpoint[] {
    return [...this.checkpoints];
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

  /**
   * Checks every checkpoint against the entries actually present. This is what
   * catches withholding: a checkpoint over more entries than the trail now has
   * is a signed contradiction.
   */
  static async verifyCheckpoints(
    entries: readonly TrailEntry[],
    checkpoints: readonly TrailCheckpoint[],
    verifier: Verifier,
  ): Promise<CheckpointVerification> {
    const failures: {
      coversEntries: number;
      failure: CheckpointFailure;
      detail: string;
    }[] = [];

    for (const cp of checkpoints) {
      if (!verifier.knownKeyIds().includes(cp.keyId)) {
        failures.push({
          coversEntries: cp.coversEntries,
          failure: 'unknown_key',
          detail: `checkpoint signed by untrusted key "${cp.keyId}"`,
        });
        continue;
      }

      const signed = await verifier.verify(
        checkpointPayload(cp),
        cp.signature,
        cp.keyId,
      );
      if (!signed) {
        failures.push({
          coversEntries: cp.coversEntries,
          failure: 'signature_invalid',
          detail: 'checkpoint signature does not verify',
        });
        continue;
      }

      if (cp.coversEntries > entries.length) {
        failures.push({
          coversEntries: cp.coversEntries,
          failure: 'entries_missing',
          detail:
            `checkpoint covers ${cp.coversEntries} entries but the trail presents ` +
            `${entries.length} — ${cp.coversEntries - entries.length} withheld`,
        });
        continue;
      }

      const actualHead =
        cp.coversEntries === 0 ? GENESIS_HASH : entries[cp.coversEntries - 1].entryHash;
      if (actualHead !== cp.headHash) {
        failures.push({
          coversEntries: cp.coversEntries,
          failure: 'head_mismatch',
          detail: `checkpoint head does not match the trail at entry ${cp.coversEntries}`,
        });
      }
    }

    return { ok: failures.length === 0, checked: checkpoints.length, failures };
  }
}
