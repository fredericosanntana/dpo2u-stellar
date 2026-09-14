import { beforeAll, describe, expect, it } from 'vitest';

import { hashCanonical } from '../canonical.js';
import { definePolicyPack } from '../policy-pack.js';
import { bankChangePredicates } from '../predicates/index.js';
import {
  Ed25519Signer,
  Ed25519Verifier,
  generateSigningMaterial,
  UnknownKeyError,
  type KeyMaterial,
} from '../signing.js';
import { AuditTrail, type TrailCheckpoint, type TrailEntry } from '../trail.js';
import { buildExport, serializeExport, verifyExport, type ExportKey } from '../export.js';
import {
  planInstall,
  signPackManifest,
  verifyPackManifest,
  type InstalledPack,
  type PackManifest,
} from '../distribution.js';

const T0 = new Date('2026-09-12T08:00:00.000Z');
const later = (s: number) => new Date(T0.getTime() + s * 1000);

let ops: KeyMaterial;
let publisher: KeyMaterial;
let opsSigner: Ed25519Signer;
let publisherSigner: Ed25519Signer;

beforeAll(() => {
  ops = generateSigningMaterial('institution-ops-2026');
  publisher = generateSigningMaterial('dpo2u-publisher-2026');
  opsSigner = Ed25519Signer.from(ops);
  publisherSigner = Ed25519Signer.from(publisher);
});

function exportKeys(m: KeyMaterial): ExportKey[] {
  return [{ keyId: m.keyId, verifyingKeyPem: m.verifyingKeyPem }];
}

async function seededTrail(entryCount = 3): Promise<AuditTrail> {
  const trail = new AuditTrail();
  for (let i = 0; i < entryCount; i += 1) {
    trail.append({
      action: 'policy.evaluated',
      at: later(i * 60),
      actor: 'service:engine',
      subject: { verdict: 'PASS', n: i },
    });
  }
  return trail;
}

describe('signing', () => {
  it('round-trips a signature', async () => {
    const sig = await opsSigner.sign('hello');
    const verifier = new Ed25519Verifier(exportKeys(ops));
    expect(await verifier.verify('hello', sig, ops.keyId)).toBe(true);
  });

  it('rejects a signature over different content', async () => {
    const sig = await opsSigner.sign('hello');
    const verifier = new Ed25519Verifier(exportKeys(ops));
    expect(await verifier.verify('goodbye', sig, ops.keyId)).toBe(false);
  });

  it('rejects a signature from another key', async () => {
    const sig = await publisherSigner.sign('hello');
    const verifier = new Ed25519Verifier(exportKeys(ops));
    expect(await verifier.verify('hello', sig, ops.keyId)).toBe(false);
  });

  it('treats a corrupted signature as a failure, not a crash', async () => {
    const verifier = new Ed25519Verifier(exportKeys(ops));
    expect(await verifier.verify('hello', 'not-base64-at-all!!', ops.keyId)).toBe(false);
  });

  it('refuses to verify against a key it was never given', async () => {
    const verifier = new Ed25519Verifier(exportKeys(ops));
    await expect(verifier.verify('hello', 'x', 'some-other-key')).rejects.toThrow(
      UnknownKeyError,
    );
  });
});

describe('signed checkpoints — closing the withholding gap', () => {
  it('seals the trail at its current length', async () => {
    const trail = await seededTrail(3);
    const cp = await trail.checkpoint(opsSigner, later(200));

    expect(cp.coversEntries).toBe(3);
    expect(cp.headHash).toBe(trail.head);
  });

  it('verifies an intact trail against its checkpoints', async () => {
    const trail = await seededTrail(3);
    await trail.checkpoint(opsSigner, later(200));

    const result = await AuditTrail.verifyCheckpoints(
      trail.toArray(),
      trail.checkpointsTaken(),
      new Ed25519Verifier(exportKeys(ops)),
    );
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(1);
  });

  it('catches a withheld tail — the gap hash-linking alone leaves open', async () => {
    const trail = await seededTrail(3);
    await trail.checkpoint(opsSigner, later(200));

    // Someone presents the first two entries and drops the third. The chain
    // still verifies perfectly; the checkpoint does not.
    const truncated = trail.toArray().slice(0, 2);
    expect(AuditTrail.verify(truncated).ok).toBe(true);

    const result = await AuditTrail.verifyCheckpoints(
      truncated,
      trail.checkpointsTaken(),
      new Ed25519Verifier(exportKeys(ops)),
    );
    expect(result.ok).toBe(false);
    expect(result.failures[0].failure).toBe('entries_missing');
    expect(result.failures[0].detail).toMatch(/1 withheld/);
  });

  it('leaves content tampering to the chain check, which is what catches it', async () => {
    // The two checks divide the work, and it is worth being precise about how.
    // Editing an entry's content without recomputing its hash leaves the head
    // untouched, so the checkpoint has nothing to notice — the chain check is
    // what fails here.
    const trail = await seededTrail(3);
    await trail.checkpoint(opsSigner, later(200));

    const entries = trail.toArray() as TrailEntry[];
    const tampered: TrailEntry[] = [
      entries[0],
      entries[1],
      { ...entries[2], actor: 'someone else' },
    ];

    expect(AuditTrail.verify(tampered).ok).toBe(false);
    expect(AuditTrail.verify(tampered).brokenAt).toBe(2);

    const cpResult = await AuditTrail.verifyCheckpoints(
      tampered,
      trail.checkpointsTaken(),
      new Ed25519Verifier(exportKeys(ops)),
    );
    expect(cpResult.ok).toBe(true);
  });

  it('catches the competent tamperer, who recomputes the hashes', async () => {
    // Someone who edits an entry *and* repairs the chain defeats the chain
    // check — the trail verifies cleanly. What they cannot repair is the
    // signed head, because they do not hold the key.
    const trail = await seededTrail(3);
    await trail.checkpoint(opsSigner, later(200));

    const rebuilt = new AuditTrail();
    rebuilt.append({
      action: 'policy.evaluated',
      at: later(0),
      actor: 'service:engine',
      subject: { verdict: 'PASS', n: 0 },
    });
    rebuilt.append({
      action: 'policy.evaluated',
      at: later(60),
      actor: 'service:engine',
      subject: { verdict: 'PASS', n: 1 },
    });
    rebuilt.append({
      action: 'policy.evaluated',
      at: later(120),
      // The edit, with every downstream hash correctly recomputed.
      actor: 'someone else',
      subject: { verdict: 'PASS', n: 2 },
    });

    expect(rebuilt.verify().ok).toBe(true);

    const cpResult = await AuditTrail.verifyCheckpoints(
      rebuilt.toArray(),
      trail.checkpointsTaken(),
      new Ed25519Verifier(exportKeys(ops)),
    );
    expect(cpResult.ok).toBe(false);
    expect(cpResult.failures[0].failure).toBe('head_mismatch');
  });

  it('catches a forged checkpoint', async () => {
    const trail = await seededTrail(3);
    await trail.checkpoint(opsSigner, later(200));

    const real = trail.checkpointsTaken()[0];
    const forged: TrailCheckpoint = { ...real, coversEntries: 2 };

    const result = await AuditTrail.verifyCheckpoints(
      trail.toArray(),
      [forged],
      new Ed25519Verifier(exportKeys(ops)),
    );
    expect(result.ok).toBe(false);
    expect(result.failures[0].failure).toBe('signature_invalid');
  });

  it('rejects a checkpoint signed by an untrusted key', async () => {
    const trail = await seededTrail(2);
    await trail.checkpoint(publisherSigner, later(200));

    const result = await AuditTrail.verifyCheckpoints(
      trail.toArray(),
      trail.checkpointsTaken(),
      new Ed25519Verifier(exportKeys(ops)),
    );
    expect(result.ok).toBe(false);
    expect(result.failures[0].failure).toBe('unknown_key');
  });

  it('can seal an empty trail, which is itself a fact worth proving', async () => {
    const trail = new AuditTrail();
    const cp = await trail.checkpoint(opsSigner, T0);
    expect(cp.coversEntries).toBe(0);

    const result = await AuditTrail.verifyCheckpoints(
      [],
      [cp],
      new Ed25519Verifier(exportKeys(ops)),
    );
    expect(result.ok).toBe(true);
  });
});

describe('export to a supervisor', () => {
  async function bundle() {
    const trail = await seededTrail(3);
    await trail.checkpoint(opsSigner, later(200));
    return buildExport(trail, {
      institution: 'banco-exemplo',
      producedAt: later(300),
      keys: exportKeys(ops),
    });
  }

  it('verifies against the keys it carries', async () => {
    const result = await verifyExport(await bundle());
    expect(result.ok).toBe(true);
    expect(result.entriesChecked).toBe(3);
    expect(result.partial).toBe(false);
  });

  it('verifies against a key obtained through another channel', async () => {
    // The stronger question: not "is this internally consistent?" but "was it
    // signed by the key I already trust?"
    const result = await verifyExport(await bundle(), exportKeys(ops));
    expect(result.ok).toBe(true);
  });

  it('fails against the wrong trusted key', async () => {
    const result = await verifyExport(await bundle(), exportKeys(publisher));
    expect(result.ok).toBe(false);
    expect(result.checkpoints.failures[0].failure).toBe('unknown_key');
  });

  it('detects an edited bundle', async () => {
    const b = await bundle();
    const edited = { ...b, institution: 'outro-banco' };
    const result = await verifyExport(edited);
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toMatch(/bundle hash/);
  });

  it('detects entries removed from the bundle after it was built', async () => {
    const b = await bundle();
    const stripped = { ...b, entries: b.entries.slice(0, 2) };
    const result = await verifyExport(stripped);
    expect(result.ok).toBe(false);
  });

  it('says plainly what verification does and does not prove', async () => {
    const b = await bundle();
    expect(b.attestationOfScope).toMatch(/does not prove/);
    expect(b.attestationOfScope).toMatch(/remains with the institution/);
  });

  it('warns when a bundle carries no checkpoints', async () => {
    const trail = await seededTrail(2);
    const b = buildExport(trail, {
      institution: 'banco-exemplo',
      producedAt: later(300),
      keys: exportKeys(ops),
    });
    const result = await verifyExport(b);
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toMatch(/withholding is not/);
  });

  it('serializes deterministically', async () => {
    const b = await bundle();
    expect(serializeExport(b)).toBe(serializeExport(b));
  });

  it('supports a period-scoped export without renumbering entries', async () => {
    const trail = await seededTrail(4);
    await trail.checkpoint(opsSigner, later(500));

    const b = buildExport(trail, {
      institution: 'banco-exemplo',
      producedAt: later(600),
      keys: exportKeys(ops),
      since: later(120),
    });

    expect(b.entries.length).toBe(2);
    // Original sequence preserved: the recipient checks the chain, so the
    // window must not be renumbered to look like it starts at genesis.
    expect(b.entries[0].seq).toBe(2);

    const result = await verifyExport(b);
    expect(result.partial).toBe(true);
    expect(result.chain.ok).toBe(true);
  });
});

describe('signed pack distribution', () => {
  const pack = definePolicyPack({
    useCaseId: 'bank_change',
    version: 2,
    jurisdiction: 'BR',
    basis: ['Circular BCB 3.978/2020'],
    predicates: bankChangePredicates(),
  });

  async function manifest(): Promise<PackManifest> {
    return signPackManifest(pack, publisherSigner, { issuedAt: T0, supersedes: 1 });
  }

  it('verifies a manifest against the pack it describes', async () => {
    const result = await verifyPackManifest(
      await manifest(),
      pack,
      new Ed25519Verifier(exportKeys(publisher)),
    );
    expect(result.ok).toBe(true);
  });

  it('refuses a manifest signed by an untrusted publisher', async () => {
    const result = await verifyPackManifest(
      await manifest(),
      pack,
      new Ed25519Verifier(exportKeys(ops)),
    );
    expect(result.ok).toBe(false);
    expect(result.problems[0].problem).toBe('untrusted_key');
  });

  it('catches a manifest paired with a different pack', async () => {
    const other = definePolicyPack({
      useCaseId: 'bank_change',
      version: 2,
      jurisdiction: 'BR',
      basis: ['Circular BCB 3.978/2020'],
      // Same rule, different window — a different pack, and the hash says so.
      predicates: bankChangePredicates({ windowDays: 90 }),
    });

    const result = await verifyPackManifest(
      await manifest(),
      other,
      new Ed25519Verifier(exportKeys(publisher)),
    );
    expect(result.ok).toBe(false);
    expect(result.problems[0].problem).toBe('pack_hash_mismatch');
  });

  it('catches a tampered manifest field', async () => {
    const m = await manifest();
    const result = await verifyPackManifest(
      { ...m, version: 99 },
      pack,
      new Ed25519Verifier(exportKeys(publisher)),
    );
    expect(result.ok).toBe(false);
    expect(result.problems[0].problem).toBe('signature_invalid');
  });
});

describe('install planning', () => {
  const installed: InstalledPack = {
    useCaseId: 'bank_change',
    version: 2,
    packHash: hashCanonical({ pack: 'v2' }),
    installedAt: T0,
  };

  function m(version: number, packHash = hashCanonical({ pack: `v${version}` })): PackManifest {
    return {
      useCaseId: 'bank_change',
      version,
      jurisdiction: 'BR',
      packHash,
      basis: [],
      issuedAt: T0.toISOString(),
      supersedes: version - 1,
      keyId: publisher?.keyId ?? 'k',
      signature: 'irrelevant-here',
    };
  }

  it('installs the first pack for a use case', () => {
    expect(planInstall(null, m(1)).action).toBe('install');
  });

  it('installs an upgrade', () => {
    const decision = planInstall(installed, m(3));
    expect(decision.action).toBe('install');
    expect(decision.reason).toMatch(/upgrade from version 2 to 3/);
  });

  it('treats the same version and hash as a reinstall', () => {
    expect(planInstall(installed, m(2, installed.packHash)).action).toBe('reinstall');
  });

  it('refuses the same version with different content', () => {
    const decision = planInstall(installed, m(2, hashCanonical({ pack: 'tampered' })));
    expect(decision.action).toBe('refuse');
    expect(decision.reason).toMatch(/exactly one pack/);
  });

  it('refuses a silent downgrade', () => {
    const decision = planInstall(installed, m(1));
    expect(decision.action).toBe('refuse');
    expect(decision.reason).toMatch(/silent downgrade/);
  });

  it('refuses a rollback with no recorded reason', () => {
    const decision = planInstall(installed, m(1), { allowRollback: true });
    expect(decision.action).toBe('refuse');
    expect(decision.reason).toMatch(/recorded reason/);
  });

  it('allows a deliberate rollback and carries the reason forward', () => {
    const decision = planInstall(installed, m(1), {
      allowRollback: true,
      rollbackReason: 'v2 produz REVIEW em massa por erro de limiar',
    });
    expect(decision.action).toBe('rollback');
    expect(decision.reason).toMatch(/limiar/);
  });

  it('refuses a manifest for another use case', () => {
    const decision = planInstall(installed, { ...m(3), useCaseId: 'kyb_onboarding' });
    expect(decision.action).toBe('refuse');
  });
});
