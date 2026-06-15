// DPO2U composability example #1 — REMITTANCE GATE.
//
// "Compliant by composition": a payment/remittance app on Stellar gates a transfer
// on a DPO2U compliance seal. ~10 lines. Trustless, zero-fee, no DPO2U cooperation —
// just a read-only Soroban simulation against the public attestation contract.
//
// Hackathon teams: `npm i @dpo2u/sdk` and import from '@dpo2u/sdk'.
// (Here we import the local SDK source so the example runs in this repo.)
import { AttestationClient, testnetClient } from '../../sdk/src/index.js';

const client = new AttestationClient(testnetClient());

export interface Transfer {
  from: string;
  to: string;
  amount: string;
  // The compliance attestation that authorizes this corridor/sender:
  complianceUseCase: string;     // e.g. 'argentina_compliance_v1', 'vasp_por_br_v1', 'bank_chg'
  complianceEvidenceHash: string; // sha256 hex of the off-chain evidence
}

/** Allow the transfer ONLY if a PASS compliance seal exists on-chain. */
export async function gateTransfer(t: Transfer): Promise<{ allowed: boolean; reason: string; explorer?: string }> {
  const r = await client.verify({ useCaseId: t.complianceUseCase, evidenceHashHex: t.complianceEvidenceHash });
  if (!r.found) return { allowed: false, reason: 'no compliance seal on-chain — blocked' };
  if (r.record!.verdict !== 'PASS') return { allowed: false, reason: `seal verdict is ${r.record!.verdict} — blocked` };
  return { allowed: true, reason: `compliant by composition (${r.record!.predicate_set})`, explorer: r.explorer_url };
}

// ── demo ──────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith('gate.ts')) {
  (async () => {
    // A real PASS seal on testnet → transfer allowed.
    const ok = await gateTransfer({
      from: 'GAR...AR', to: 'GBR...BR', amount: '1000 USDC',
      complianceUseCase: 'bank_chg',
      complianceEvidenceHash: '0dbf43ad5862d6e1c3f16958056e531f09bd23eed0fb515d4185bdbf1206bed4',
    });
    console.log('transfer #1 (real seal):', ok);

    // No seal → transfer blocked.
    const blocked = await gateTransfer({
      from: 'GAR...AR', to: 'GBR...BR', amount: '1000 USDC',
      complianceUseCase: 'argentina_compliance_v1',
      complianceEvidenceHash: '00000000000000000000000000000000000000000000000000000000deadbeef',
    });
    console.log('transfer #2 (no seal):', blocked);
  })();
}
