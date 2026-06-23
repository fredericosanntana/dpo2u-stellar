// Phase 2: Privy operator signs the DeFindex gate invocation (envelope) and submits.
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire('/root/dpo2u-stellar/sdk/package.json');
const { TransactionBuilder, Networks, rpc, Keypair } = require('@stellar/stellar-sdk');

const APP_ID = process.env.PRIVY_APP_ID, APP_SECRET = process.env.PRIVY_APP_SECRET;
const WALLET_ID = process.env.PRIVY_WALLET_ID ?? 'so41762oxmz6dtsw6hl57ut6';
const PRIVY_ADDR = 'GCGPXORXCF2DLCYSYZ652DCDRAFKXAXZLJFL2YXOOWHWSOLVUDSZXZAQ';
const xdr = readFileSync(process.argv[2], 'utf8').trim();
const headers = {
  Authorization: 'Basic ' + Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64'),
  'privy-app-id': APP_ID, 'Content-Type': 'application/json',
};

async function privyRawSign(h) {
  const r = await fetch(`https://api.privy.io/v1/wallets/${WALLET_ID}/raw_sign`, {
    method: 'POST', headers, body: JSON.stringify({ params: { hash: '0x' + h.toString('hex') } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('raw_sign: ' + JSON.stringify(j));
  return Buffer.from((j.data?.signature || j.signature).replace(/^0x/, ''), 'hex');
}

async function main() {
  const server = new rpc.Server('https://soroban-testnet.stellar.org');
  const tx0 = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);

  // Simulate + assemble so the tx carries the Soroban footprint + resource fee.
  const sim = await server.simulateTransaction(tx0);
  if (rpc.Api.isSimulationError(sim)) throw new Error('simulation: ' + sim.error);
  let builder = rpc.assembleTransaction(tx0, sim);
  try { builder = builder.setTimeout(300); } catch { /* timebounds already set */ }
  const tx = builder.build();

  const h = tx.hash();
  console.log('tx hash    :', h.toString('hex'));
  const sig = await privyRawSign(h);
  console.log('privy verify:', Keypair.fromPublicKey(PRIVY_ADDR).verify(h, sig));
  tx.addSignature(PRIVY_ADDR, sig.toString('base64'));

  const sent = await server.sendTransaction(tx);
  console.log('sent       :', sent.hash, sent.status);
  if (sent.status === 'ERROR') { console.error(JSON.stringify(sent.errorResult ?? sent)); process.exit(1); }
  let res = await server.getTransaction(sent.hash);
  for (let i = 0; res.status === 'NOT_FOUND' && i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    res = await server.getTransaction(sent.hash);
  }
  console.log('result     :', res.status);
  console.log('explorer   : https://stellar.expert/explorer/testnet/tx/' + sent.hash);
  process.exit(res.status === 'SUCCESS' ? 0 : 1);
}
main().catch((e) => { console.error('error:', e.message); process.exit(1); });
