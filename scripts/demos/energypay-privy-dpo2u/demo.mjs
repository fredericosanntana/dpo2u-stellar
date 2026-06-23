// EnergyPay × Privy × DPO2U — Phase-1 end-to-end demo (our credentials).
//
// Realizes the F1 architecture live on Stellar testnet:
//   Privy (operator signer) → DPO2U admit() (decides, evidence bound to the exact
//   action) → settlement (Stellar payment) → evidence hash pinned on-chain (memo).
// Negative lane: a deny PREVENTS the Privy signature — nothing settles.
//
// Reads PRIVY_APP_ID / PRIVY_APP_SECRET from env (never hard-coded).
import { createRequire } from 'module';
import { createHash } from 'crypto';
const require = createRequire('/root/dpo2u-stellar/sdk/package.json');
const { Horizon, Keypair, TransactionBuilder, Operation, Asset, Memo, Networks } =
  require('@stellar/stellar-sdk');

const HORIZON = 'https://horizon-testnet.stellar.org';
const PASSPHRASE = Networks.TESTNET;
const APP_ID = need('PRIVY_APP_ID');
const APP_SECRET = need('PRIVY_APP_SECRET');
// Operator = the Privy Stellar wallet from the Phase-0 spike (override via env).
const WALLET_ID = process.env.PRIVY_WALLET_ID ?? 'so41762oxmz6dtsw6hl57ut6';
const OPERATOR = process.env.OPERATOR_ADDRESS ?? 'GCGPXORXCF2DLCYSYZ652DCDRAFKXAXZLJFL2YXOOWHWSOLVUDSZXZAQ';
const RECIPIENT = process.env.RECIPIENT ?? 'GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN';

function need(n) { const v = process.env[n]; if (!v) throw new Error(`missing ${n}`); return v; }
const privyHeaders = {
  Authorization: 'Basic ' + Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64'),
  'privy-app-id': APP_ID,
  'Content-Type': 'application/json',
};

// ── DPO2U EnergyPaySettlementGateway (off-chain admission, F1) ────────────────
const POLICY = { version: 'settlement_v1', maxAmountStroops: 50_000_000n, allowlist: new Set([OPERATOR]) };

function deriveActionDigest(a) {
  const canon = JSON.stringify({ operator: a.operator, dest: a.dest, asset: a.asset, amount: a.amount, nonce: a.nonce });
  return createHash('sha256').update(canon).digest();
}
function admit(action) {
  const actionDigest = deriveActionDigest(action);
  const withinLimit = BigInt(action.amount) <= POLICY.maxAmountStroops;
  const admitted = POLICY.allowlist.has(action.operator);
  const decision = withinLimit && admitted ? 'allow' : 'deny';
  const reason = decision === 'allow' ? 'within settlement mandate + operator admitted'
    : !withinLimit ? 'amount exceeds settlement mandate' : 'operator not admitted';
  // Evidence binds the verdict to the EXACT action digest (Tyler's TOCTOU fix).
  const evidenceHash = createHash('sha256')
    .update(Buffer.concat([Buffer.from(POLICY.version), Buffer.from(decision), actionDigest]))
    .digest();
  return { decision, reason, evidenceHash, actionDigest, expiresAt: Math.floor(Date.now() / 1000) + 300 };
}

// ── Privy operator signer ────────────────────────────────────────────────────
async function privyRawSign(hash32) {
  const r = await fetch(`https://api.privy.io/v1/wallets/${WALLET_ID}/raw_sign`, {
    method: 'POST', headers: privyHeaders,
    body: JSON.stringify({ params: { hash: '0x' + hash32.toString('hex') } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('privy raw_sign failed: ' + JSON.stringify(j));
  return Buffer.from((j.data?.signature || j.signature).replace(/^0x/, ''), 'hex');
}

async function fundIfNeeded(horizon, address) {
  try { await horizon.loadAccount(address); return 'already funded'; }
  catch { await fetch(`https://friendbot.stellar.org?addr=${address}`);
    await new Promise(r => setTimeout(r, 4000)); return 'funded via friendbot'; }
}

// ── Settlement orchestrator (admit → sign → submit → pin evidence) ────────────
async function settle(horizon, action) {
  const decision = admit(action);
  console.log(`  DPO2U admit → ${decision.decision.toUpperCase()} (${decision.reason})`);
  console.log(`  evidence hash: ${decision.evidenceHash.toString('hex')}`);
  if (decision.decision !== 'allow') {
    console.log('  ✗ Privy signature NOT requested — settlement blocked fail-closed.');
    return { settled: false, decision };
  }

  const src = await horizon.loadAccount(OPERATOR);
  const amountXlm = (Number(action.amount) / 1e7).toString();
  const tx = new TransactionBuilder(src, { fee: '1000', networkPassphrase: PASSPHRASE })
    .addOperation(Operation.payment({ destination: action.dest, asset: Asset.native(), amount: amountXlm }))
    .addMemo(Memo.hash(decision.evidenceHash)) // pin DPO2U evidence on-chain
    .setTimeout(120)
    .build();

  // TOCTOU guard: the tx we are about to sign must match the admitted action.
  const reDigest = deriveActionDigest(action);
  if (!reDigest.equals(decision.actionDigest)) throw new Error('action digest drift — refusing to sign');
  if (tx.operations[0].destination !== action.dest ||
      Number(tx.operations[0].amount) !== Number(amountXlm))
    throw new Error('tx does not match admitted action — refusing to sign');

  const sig = await privyRawSign(tx.hash());
  tx.addSignature(OPERATOR, sig.toString('base64')); // verifies the Privy sig against tx.hash()
  const res = await horizon.submitTransaction(tx);
  console.log(`  ✓ operator signed via Privy + settled. tx: ${res.hash}`);
  console.log(`    https://stellar.expert/explorer/testnet/tx/${res.hash}`);
  console.log(`    memo (evidence pinned on-chain): ${res.memo ?? decision.evidenceHash.toString('hex')}`);
  return { settled: true, decision, txHash: res.hash };
}

async function main() {
  const horizon = new Horizon.Server(HORIZON);
  console.log('operator (Privy wallet):', OPERATOR);
  console.log('fund:', await fundIfNeeded(horizon, OPERATOR), '\n');

  const nonce = Date.now();
  console.log('── ALLOW lane — compliant settlement (1 XLM, within mandate) ──');
  await settle(horizon, { operator: OPERATOR, dest: RECIPIENT, asset: 'native', amount: '10000000', nonce });

  console.log('\n── DENY lane — over-mandate settlement (100,000 XLM) ──');
  await settle(horizon, { operator: OPERATOR, dest: RECIPIENT, asset: 'native', amount: '1000000000000', nonce: nonce + 1 });

  console.log('\nDone. DPO2U decided; Privy signed only the admitted action; evidence is on-chain.');
}
main().catch((e) => { console.error('demo error:', e.message); process.exit(1); });
