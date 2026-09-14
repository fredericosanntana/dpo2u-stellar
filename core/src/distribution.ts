// How a policy pack crosses into the bank, and the only thing that does.
//
// On-premise delivery inverts the usual trust question. The institution is not
// asking us to protect their data — the data never reaches us. They are asking
// why they should run our rules inside their perimeter. The answer has to be
// checkable by them, offline, before anything executes: a signed manifest whose
// hash matches the pack they were handed, verified against a key they obtained
// once and kept.
//
// Version monotonicity is the second half. A silent downgrade to a superseded
// pack is how an attacker — or an ordinary mistake — reinstates a rule an
// institution deliberately retired. Rolling back stays possible, because
// sometimes the new pack is the problem, but never quietly: it takes an
// explicit decision with a recorded reason.

import { hashCanonical } from './canonical.js';
import type { PolicyPack } from './policy-pack.js';
import type { Signer, Verifier } from './signing.js';

export interface PackManifestBody {
  readonly useCaseId: string;
  readonly version: number;
  readonly jurisdiction: string;
  /** Identity of the pack, parameters included. */
  readonly packHash: string;
  /** Norms this pack implements, carried for the institution's own file. */
  readonly basis: readonly string[];
  readonly issuedAt: string;
  /** Version this one replaces; `null` for the first of a use case. */
  readonly supersedes: number | null;
  readonly keyId: string;
}

export interface PackManifest extends PackManifestBody {
  readonly signature: string;
}

/** Exactly what the publisher's signature covers. */
export function manifestPayload(body: PackManifestBody): string {
  return hashCanonical({
    useCaseId: body.useCaseId,
    version: body.version,
    jurisdiction: body.jurisdiction,
    packHash: body.packHash,
    basis: [...body.basis],
    issuedAt: body.issuedAt,
    supersedes: body.supersedes,
    keyId: body.keyId,
  });
}

export async function signPackManifest(
  pack: PolicyPack,
  signer: Signer,
  opts: { issuedAt: Date; supersedes: number | null },
): Promise<PackManifest> {
  const body: PackManifestBody = {
    useCaseId: pack.useCaseId,
    version: pack.version,
    jurisdiction: pack.jurisdiction,
    packHash: pack.packHash,
    basis: [...pack.basis],
    issuedAt: opts.issuedAt.toISOString(),
    supersedes: opts.supersedes,
    keyId: signer.keyId,
  };
  return { ...body, signature: await signer.sign(manifestPayload(body)) };
}

export type ManifestProblem =
  | 'untrusted_key'
  | 'signature_invalid'
  | 'pack_hash_mismatch'
  | 'use_case_mismatch'
  | 'version_mismatch'
  | 'jurisdiction_mismatch';

export interface ManifestVerification {
  readonly ok: boolean;
  readonly problems: readonly { readonly problem: ManifestProblem; readonly detail: string }[];
}

/**
 * Checks a manifest against the pack it claims to describe. Offline by
 * construction: everything needed is the manifest, the pack, and a key the
 * institution already trusts.
 */
export async function verifyPackManifest(
  manifest: PackManifest,
  pack: PolicyPack,
  verifier: Verifier,
): Promise<ManifestVerification> {
  const problems: { problem: ManifestProblem; detail: string }[] = [];

  if (!verifier.knownKeyIds().includes(manifest.keyId)) {
    problems.push({
      problem: 'untrusted_key',
      detail: `manifest signed by "${manifest.keyId}", which this installation does not trust`,
    });
    // Without a trusted key there is nothing to check the rest against, and
    // reporting content checks would suggest a verification that did not happen.
    return { ok: false, problems };
  }

  const signed = await verifier.verify(
    manifestPayload(manifest),
    manifest.signature,
    manifest.keyId,
  );
  if (!signed) {
    problems.push({ problem: 'signature_invalid', detail: 'manifest signature does not verify' });
    return { ok: false, problems };
  }

  // The signature proves who issued the manifest. These prove the manifest
  // describes the pack actually in hand — a signed manifest paired with a
  // different pack is the substitution this exists to catch.
  if (manifest.packHash !== pack.packHash) {
    problems.push({
      problem: 'pack_hash_mismatch',
      detail: `manifest declares ${manifest.packHash}, pack hashes to ${pack.packHash}`,
    });
  }
  if (manifest.useCaseId !== pack.useCaseId) {
    problems.push({
      problem: 'use_case_mismatch',
      detail: `manifest is for "${manifest.useCaseId}", pack is "${pack.useCaseId}"`,
    });
  }
  if (manifest.version !== pack.version) {
    problems.push({
      problem: 'version_mismatch',
      detail: `manifest declares version ${manifest.version}, pack is ${pack.version}`,
    });
  }
  if (manifest.jurisdiction !== pack.jurisdiction) {
    problems.push({
      problem: 'jurisdiction_mismatch',
      detail: `manifest declares ${manifest.jurisdiction}, pack is ${pack.jurisdiction}`,
    });
  }

  return { ok: problems.length === 0, problems };
}

export interface InstalledPack {
  readonly useCaseId: string;
  readonly version: number;
  readonly packHash: string;
  readonly installedAt: Date;
}

export type InstallDecision =
  | { readonly action: 'install'; readonly reason: string }
  | { readonly action: 'reinstall'; readonly reason: string }
  | { readonly action: 'rollback'; readonly reason: string }
  | { readonly action: 'refuse'; readonly reason: string };

export interface InstallOptions {
  /** Set only by an operator making a deliberate downgrade. */
  readonly allowRollback?: boolean;
  /** Required whenever `allowRollback` is set; ends up in the audit trail. */
  readonly rollbackReason?: string;
}

/**
 * Decides what installing this manifest would mean, without doing it.
 *
 * Separated from the act so the decision can be shown to an operator, written
 * to the trail, and — for a rollback — put in front of a second approver before
 * anything changes.
 */
export function planInstall(
  current: InstalledPack | null,
  manifest: PackManifest,
  options: InstallOptions = {},
): InstallDecision {
  if (current === null) {
    return { action: 'install', reason: `first installation of ${manifest.useCaseId}` };
  }

  if (current.useCaseId !== manifest.useCaseId) {
    return {
      action: 'refuse',
      reason: `manifest is for "${manifest.useCaseId}" but "${current.useCaseId}" is installed`,
    };
  }

  if (manifest.version > current.version) {
    return {
      action: 'install',
      reason: `upgrade from version ${current.version} to ${manifest.version}`,
    };
  }

  if (manifest.version === current.version) {
    // Same version, different content is never a reinstall — it is either a
    // tampered pack or a publisher mistake, and both deserve a hard stop.
    if (manifest.packHash !== current.packHash) {
      return {
        action: 'refuse',
        reason:
          `version ${manifest.version} is already installed with a different pack hash; ` +
          'a version must identify exactly one pack',
      };
    }
    return { action: 'reinstall', reason: `version ${manifest.version} already installed` };
  }

  if (!options.allowRollback) {
    return {
      action: 'refuse',
      reason:
        `refusing a silent downgrade from ${current.version} to ${manifest.version}; ` +
        'a rollback has to be an explicit decision',
    };
  }

  if (!options.rollbackReason || options.rollbackReason.trim() === '') {
    return {
      action: 'refuse',
      reason: 'a rollback requires a recorded reason',
    };
  }

  return {
    action: 'rollback',
    reason: `deliberate rollback from ${current.version} to ${manifest.version}: ${options.rollbackReason}`,
  };
}
