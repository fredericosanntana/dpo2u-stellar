// DPO2U composability example #2 — RWA / STABLECOIN ISSUER ATTESTATION.
//
// A counterparty independently verifies an issuer's compliance seal BEFORE accepting
// the asset — without trusting the issuer or DPO2U. The issuer publishes a verdict
// on-chain (proof-of-reserve, VASP registration, jurisdiction compliance); anyone
// verifies it read-only. This is the "trustless, no cooperation needed" surface.
//
// Hackathon teams: `npm i @dpo2u/sdk`. (Local import here so the example runs in-repo.)
import { AttestationClient, testnetClient } from '../../sdk/src/index.js';

const client = new AttestationClient(testnetClient());

export interface IssuerCheck {
  issuer: string;
  // The compliance claim the issuer published (e.g. PoR, LatAm jurisdiction):
  useCase: string;
  evidenceHash: string;
}

/** A counterparty's gate: accept the asset only if the issuer's seal is PASS. */
export async function acceptAssetIfCompliant(c: IssuerCheck): Promise<{ accept: boolean; detail: string; explorer?: string }> {
  const r = await client.verify({ useCaseId: c.useCase, evidenceHashHex: c.evidenceHash });
  if (!r.found) return { accept: false, detail: `${c.issuer}: no published seal — do not accept` };
  const rec = r.record!;
  const ok = rec.verdict === 'PASS';
  return {
    accept: ok,
    detail: `${c.issuer}: ${rec.predicate_set} verdict=${rec.verdict} (submitted_by=${rec.submitted_by.slice(0, 6)}…, ts=${rec.timestamp})`,
    explorer: r.explorer_url,
  };
}

// ── demo ──────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith('verify-issuer.ts')) {
  (async () => {
    const res = await acceptAssetIfCompliant({
      issuer: 'AcmeStable (AR/BR corridor)',
      useCase: 'bank_chg',
      evidenceHash: '0dbf43ad5862d6e1c3f16958056e531f09bd23eed0fb515d4185bdbf1206bed4',
    });
    console.log('counterparty decision:', res);
  })();
}
