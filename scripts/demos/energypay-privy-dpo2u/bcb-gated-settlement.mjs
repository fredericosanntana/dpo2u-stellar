// EnergyPay × Privy × DPO2U — settlement gated by a REAL BCB predicate set.
//
// Replaces the F1 demo's toy policy (amount ≤ threshold) with the verified BCB
// pack (segregation Res.520 Art.30 I + buffer 5% Art.30 §3 II + counterparty
// admission). The DPO2U verdict (predicate_set=bcb_vasp_v1, evidence hash bound
// to the action) is what gates the Privy-signed settlement, with the evidence
// pinned on-chain in the memo.
import { createRequire } from 'module';
import { evaluateBcbVasp } from '/root/dpo2u-stellar/sdk/dist/bcb-policy.js';
const require = createRequire('/root/dpo2u-stellar/sdk/package.json');
const { Horizon, Keypair, TransactionBuilder, Operation, Asset, Memo, Networks } =
  require('@stellar/stellar-sdk');

const HORIZON = 'https://horizon-testnet.stellar.org';
const PASSPHRASE = Networks.TESTNET;
const APP_ID = need('PRIVY_APP_ID');
const APP_SECRET = need('PRIVY_APP_SECRET');
const WALLET_ID = process.env.PRIVY_WALLET_ID ?? 'so41762oxmz6dtsw6hl57ut6';
const OPERATOR = 'GCGPXORXCF2DLCYSYZ652DCDRAFKXAXZLJFL2YXOOWHWSOLVUDSZXZAQ';
const RECIPIENT = 'GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN';

function need(n) { const v = process.env[n]; if (!v) throw new Error(`missing ${n}`); return v; }
const privyHeaders = {
  Authorization: 'Basic ' + Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64'),
  'privy-app-id': APP_ID, 'Content-Type': 'application/json',
};
async function privyRawSign(h) {
  const r = await fetch(`https://api.privy.io/v1/wallets/${WALLET_ID}/raw_sign`, {
    method: 'POST', headers: privyHeaders, body: JSON.stringify({ params: { hash: '0x' + h.toString('hex') } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('privy: ' + JSON.stringify(j));
  return Buffer.from((j.data?.signature || j.signature).replace(/^0x/, ''), 'hex');
}

// BCB evidence: the operator wallet is the provider; client wallets are distinct;
// `bufferProvider` drives the 5% predicate (5 = exactly 5%, 6 = over).
function bcbEvidence(bufferProvider) {
  return {
    segregation: { clientWallets: ['GCLIENT_A', 'GCLIENT_B'], providerWallets: [OPERATOR], controlIndependent: true },
    buffer: { providerAssetsInClientWalletsBaseUnits: String(bufferProvider), totalClientAssetsBaseUnits: '100' },
    counterparty: { subjectId: RECIPIENT, authorized: true, authorizationRef: 'BCB-REG-ATTEST-001' },
  };
}

async function settle(horizon, label, bufferProvider) {
  console.log(`\n── ${label} ──`);
  const action = { kind: 'settlement', subject: OPERATOR, timestampIso: '2026-11-01T00:00:00Z' };
  const evaln = evaluateBcbVasp(action, bcbEvidence(bufferProvider));
  console.log(`  DPO2U verdict: ${evaln.verdict}  (predicate_set=${evaln.predicateSet})`);
  for (const r of evaln.results) console.log(`    • ${r.id}: ${r.verdict} — ${r.reason}  [${r.citation}]`);
  console.log(`  evidence hash: ${evaln.evidenceHashHex}`);
  if (evaln.verdict !== 'PASS') { console.log('  ✗ blocked fail-closed — Privy signature NOT requested.'); return; }

  const src = await horizon.loadAccount(OPERATOR);
  const tx = new TransactionBuilder(src, { fee: '1000', networkPassphrase: PASSPHRASE })
    .addOperation(Operation.payment({ destination: RECIPIENT, asset: Asset.native(), amount: '1' }))
    .addMemo(Memo.hash(Buffer.from(evaln.evidenceHashHex, 'hex'))) // pin the BCB evidence on-chain
    .setTimeout(120)
    .build();
  const sig = await privyRawSign(tx.hash());
  tx.addSignature(OPERATOR, sig.toString('base64'));
  const r = await horizon.submitTransaction(tx);
  console.log(`  ✓ Privy signed + settled. tx ${r.hash}`);
  console.log(`    https://stellar.expert/explorer/testnet/tx/${r.hash}`);
}

async function main() {
  const horizon = new Horizon.Server(HORIZON);
  console.log('operator (Privy wallet):', OPERATOR);
  await settle(horizon, 'ALLOW — segregação OK + buffer 5% + contraparte autorizada', 5);
  await settle(horizon, 'DENY — buffer 6% (> 5%, Res. 520 Art. 30 §3 II)', 6);
  console.log('\nDone — a settlement only executes when the real BCB predicate set passes.');
}
main().catch((e) => { console.error('error:', e.message); process.exit(1); });
