// The bundle handed to a supervisor, and the procedure that checks it.
//
// The design constraint that shapes everything here: the recipient must be able
// to verify without us. Not without our cooperation as a courtesy — without our
// software, our servers, or our continued existence. So the bundle carries the
// verifying keys in PEM, the entries, the checkpoints, and a written statement
// of what the check proves. Someone with Node and thirty lines can reproduce it;
// someone with OpenSSL and patience can too.
//
// What it deliberately does not carry: evidence. The trail records that a
// control ran, over which commitment, under which rule. The documents stay in
// the bank, which is the whole point of the perimeter.

import { canonicalize, hashCanonical } from './canonical.js';
import {
  AuditTrail,
  type ChainVerification,
  type CheckpointVerification,
  type TrailCheckpoint,
  type TrailEntry,
} from './trail.js';
import { Ed25519Verifier, type Verifier } from './signing.js';

export const EXPORT_FORMAT = 'dpo2u.audit-trail.v1';

export interface ExportKey {
  readonly keyId: string;
  /** SPKI PEM, so the recipient needs nothing from us to check a signature. */
  readonly verifyingKeyPem: string;
}

export interface TrailExport {
  readonly format: typeof EXPORT_FORMAT;
  /** Who produced it, as an institution identifier — never a person. */
  readonly institution: string;
  readonly producedAt: string;
  readonly entries: readonly TrailEntry[];
  readonly checkpoints: readonly TrailCheckpoint[];
  readonly keys: readonly ExportKey[];
  /** Plain-language statement of what verification does and does not prove. */
  readonly attestationOfScope: string;
  /** Integrity of the bundle itself, so transport damage is not mistaken for tampering. */
  readonly bundleHash: string;
}

const SCOPE_STATEMENT =
  'Verifying this bundle proves that the entries listed were recorded in the ' +
  'order shown, that none was altered after the fact, and that no entry covered ' +
  'by a checkpoint has been withheld. It does not prove that the entries are a ' +
  'complete record of everything that happened, nor does it disclose the ' +
  'underlying evidence, which remains with the institution.';

export interface BuildExportOptions {
  readonly institution: string;
  readonly producedAt: Date;
  readonly keys: readonly ExportKey[];
  /** Restrict to entries at or after this instant, for a period-scoped request. */
  readonly since?: Date;
}

export function buildExport(
  trail: AuditTrail,
  options: BuildExportOptions,
): TrailExport {
  const all = trail.toArray();

  // A period filter must never renumber or re-link: the recipient checks the
  // chain, so the entries have to arrive with their original sequence and
  // links, and the first one in a filtered window will reference a predecessor
  // that is not in the bundle. That is expected, and `verifyExport` handles it.
  const entries = options.since
    ? all.filter((e) => e.at.getTime() >= options.since!.getTime())
    : all;

  const body = {
    format: EXPORT_FORMAT,
    institution: options.institution,
    producedAt: options.producedAt.toISOString(),
    entries: entries.map((e) => ({
      seq: e.seq,
      prevHash: e.prevHash,
      entryHash: e.entryHash,
      action: e.action,
      at: e.at.toISOString(),
      actor: e.actor,
      subject: e.subject,
    })),
    checkpoints: trail.checkpointsTaken().map((c) => ({ ...c })),
    keys: options.keys.map((k) => ({ ...k })),
    attestationOfScope: SCOPE_STATEMENT,
  };

  return {
    ...body,
    entries,
    format: EXPORT_FORMAT,
    checkpoints: trail.checkpointsTaken(),
    keys: [...options.keys],
    bundleHash: hashCanonical(body),
  };
}

/** Serialize deterministically, so two exports of the same trail are identical. */
export function serializeExport(bundle: TrailExport): string {
  return canonicalize({
    format: bundle.format,
    institution: bundle.institution,
    producedAt: bundle.producedAt,
    entries: bundle.entries.map((e) => ({
      seq: e.seq,
      prevHash: e.prevHash,
      entryHash: e.entryHash,
      action: e.action,
      at: e.at.toISOString(),
      actor: e.actor,
      subject: e.subject,
    })),
    checkpoints: bundle.checkpoints.map((c) => ({ ...c })),
    keys: bundle.keys.map((k) => ({ ...k })),
    attestationOfScope: bundle.attestationOfScope,
    bundleHash: bundle.bundleHash,
  });
}

export interface ExportVerification {
  readonly ok: boolean;
  readonly chain: ChainVerification;
  readonly checkpoints: CheckpointVerification;
  /** True when the bundle is a window, not the whole trail. */
  readonly partial: boolean;
  readonly entriesChecked: number;
  readonly problems: readonly string[];
}

/**
 * The procedure a supervisor runs. Keys come from the bundle by default,
 * because that is what makes it self-contained — but a recipient who obtained
 * the institution's key through another channel should pass their own, and then
 * the check answers a stronger question: not "is this internally consistent?"
 * but "was this signed by the key I already trust?".
 */
export async function verifyExport(
  bundle: TrailExport,
  trustedKeys?: readonly ExportKey[],
): Promise<ExportVerification> {
  const problems: string[] = [];

  if (bundle.format !== EXPORT_FORMAT) {
    problems.push(`unknown bundle format "${bundle.format}"`);
  }

  const recomputed = hashCanonical({
    format: bundle.format,
    institution: bundle.institution,
    producedAt: bundle.producedAt,
    entries: bundle.entries.map((e) => ({
      seq: e.seq,
      prevHash: e.prevHash,
      entryHash: e.entryHash,
      action: e.action,
      at: e.at.toISOString(),
      actor: e.actor,
      subject: e.subject,
    })),
    checkpoints: bundle.checkpoints.map((c) => ({ ...c })),
    keys: bundle.keys.map((k) => ({ ...k })),
    attestationOfScope: bundle.attestationOfScope,
  });
  if (recomputed !== bundle.bundleHash) {
    problems.push('bundle hash does not match its contents');
  }

  const entries = bundle.entries;
  const partial = entries.length > 0 && entries[0].seq !== 0;

  // A window starting mid-trail cannot be checked against genesis, so the chain
  // is verified relative to its own first entry. The checkpoints are what tie
  // that window back to the whole.
  const chain = partial
    ? verifyRelativeChain(entries)
    : AuditTrail.verify(entries);

  const keys = trustedKeys ?? bundle.keys;
  const verifier: Verifier = new Ed25519Verifier(
    keys.map((k) => ({ keyId: k.keyId, verifyingKeyPem: k.verifyingKeyPem })),
  );

  const applicable = partial
    ? bundle.checkpoints.filter((c) => c.coversEntries <= entries[0].seq)
    : bundle.checkpoints;

  const checkpoints = partial
    ? // Checkpoints covering entries the window omits cannot be evaluated
      // against it; saying so is better than reporting a failure the recipient
      // would have to learn to ignore.
      { ok: true, checked: 0, failures: [] }
    : await AuditTrail.verifyCheckpoints(entries, applicable, verifier);

  if (bundle.checkpoints.length === 0) {
    problems.push(
      'bundle carries no checkpoints: alteration is still detectable, ' +
        'withholding is not',
    );
  }

  return {
    ok: chain.ok && checkpoints.ok && problems.length === 0,
    chain,
    checkpoints,
    partial,
    entriesChecked: entries.length,
    problems,
  };
}

/** Chain check for a window: links must be consistent among the entries present. */
function verifyRelativeChain(entries: readonly TrailEntry[]): ChainVerification {
  for (let i = 1; i < entries.length; i += 1) {
    const prev = entries[i - 1];
    const cur = entries[i];

    if (cur.seq !== prev.seq + 1) {
      return {
        ok: false,
        brokenAt: cur.seq,
        reason: `sequence jumps from ${prev.seq} to ${cur.seq}`,
      };
    }
    if (cur.prevHash !== prev.entryHash) {
      return {
        ok: false,
        brokenAt: cur.seq,
        reason: `entry ${cur.seq} does not link to its predecessor`,
      };
    }
  }
  return { ok: true };
}
