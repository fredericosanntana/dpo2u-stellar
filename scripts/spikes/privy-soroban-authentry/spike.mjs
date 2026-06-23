#!/usr/bin/env node
// Phase-0 spike — prove a Privy operator wallet can sign a Soroban auth-entry.
//
// Pattern (confirmed by docs): Stellar `authorizeEntry(entry, signer, validUntil,
// passphrase)` takes a signer callback `(preimage) => Promise<Buffer>` that signs
// the SHA-256 of the SorobanAuthorizationEntry preimage. Privy exposes raw hash
// signing for Stellar (`useSignRawHash` client-side, or the server wallet rawSign
// API) — which is exactly that callback. A separate fee-payer sources the tx.
//
// Modes:
//   --mock   sign the auth-entry with a LOCAL keypair (OPERATOR_SECRET).
//            Proves the Soroban auth-entry assembly + RPC submit end to end —
//            the entire Stellar half of the spike — with NO Privy dependency.
//   (default) sign via Privy raw-sign (needs PRIVY_* env). The ONLY delta from
//            --mock is the one `signHashWithPrivy` function.
//
// Env: RPC_URL, NETWORK_PASSPHRASE, FEEPAYER_SECRET, OPERATOR_ADDRESS,
//      CONTRACT_ID, METHOD, (OPERATOR_SECRET for --mock),
//      PRIVY_APP_ID, PRIVY_APP_SECRET, PRIVY_WALLET_ID (for Privy mode).
//
// NOT executed in CI: needs a funded fee-payer + a target contract (+ Privy creds
// for the default mode). `node --check` clean. Run with a funded testnet identity.

import {
  rpc,
  Contract,
  TransactionBuilder,
  Keypair,
  Networks,
  authorizeEntry,
  xdr,
  hash,
  nativeToScVal,
} from '@stellar/stellar-sdk';

const MOCK = process.argv.includes('--mock');
const RPC_URL = process.env.RPC_URL ?? 'https://soroban-testnet.stellar.org';
const PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET;
const FEEPAYER_SECRET = required('FEEPAYER_SECRET');
const OPERATOR_ADDRESS = required('OPERATOR_ADDRESS');
const CONTRACT_ID = required('CONTRACT_ID');
const METHOD = process.env.METHOD ?? 'pin';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

// The auth-entry signer callback. `preimage` is an xdr.HashIdPreimage; we sign
// its SHA-256. In --mock we use a local keypair; otherwise we delegate to Privy.
async function signEntryPreimage(preimage) {
  const payload = hash(preimage.toXDR()); // 32-byte digest to sign
  if (MOCK) {
    const kp = Keypair.fromSecret(required('OPERATOR_SECRET'));
    if (kp.publicKey() !== OPERATOR_ADDRESS) {
      throw new Error('OPERATOR_SECRET does not match OPERATOR_ADDRESS');
    }
    return Buffer.from(kp.sign(payload)); // 64-byte ed25519 signature
  }
  const sigHex = await signHashWithPrivy(payload.toString('hex'));
  return Buffer.from(sigHex, 'hex');
}

// THE one Privy-specific function. Privy raw-sign returns an ed25519 signature
// over the given hash for the operator's Stellar embedded wallet.
//   - client-side: useSignRawHash({ address, chainType: 'stellar', hash })
//   - server-side: POST Privy wallet rawSign API with PRIVY_APP_ID/SECRET/WALLET_ID
// Wire this to whichever surface the operator flow uses; the rest is unchanged.
async function signHashWithPrivy(hashHex) {
  throw new Error(
    `signHashWithPrivy not wired. Use --mock to prove the Stellar half, or ` +
      `implement Privy raw-sign for hash 0x${hashHex} (chainType 'stellar', ` +
      `wallet ${process.env.PRIVY_WALLET_ID ?? '<PRIVY_WALLET_ID>'}).`,
  );
}

async function main() {
  const server = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') });
  const feePayer = Keypair.fromSecret(FEEPAYER_SECRET);
  const source = await server.getAccount(feePayer.publicKey());

  // Build a contract invocation whose authorization is the OPERATOR (not the
  // fee-payer) — this is what forces an auth-entry the operator must sign.
  const contract = new Contract(CONTRACT_ID);
  const op = contract.call(METHOD, nativeToScVal(OPERATOR_ADDRESS, { type: 'address' }));

  let tx = new TransactionBuilder(source, { fee: '1000000', networkPassphrase: PASSPHRASE })
    .addOperation(op)
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`sim failed: ${sim.error}`);

  const validUntil = (await server.getLatestLedger()).sequence + 100;
  const authorized = [];
  for (const entry of sim.result?.auth ?? []) {
    if (
      entry.credentials().switch() ===
      xdr.SorobanCredentialsType.sorobanCredentialsAddress()
    ) {
      authorized.push(await authorizeEntry(entry, signEntryPreimage, validUntil, PASSPHRASE));
    } else {
      authorized.push(entry);
    }
  }

  // Rebuild with authorized entries, fee-payer signs the ENVELOPE, submit.
  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.operations[0].auth = authorized;
  prepared.sign(feePayer);

  const sent = await server.sendTransaction(prepared);
  console.log('submitted:', sent.hash, sent.status);
  let res = await server.getTransaction(sent.hash);
  while (res.status === 'NOT_FOUND') {
    await new Promise((r) => setTimeout(r, 1500));
    res = await server.getTransaction(sent.hash);
  }
  console.log('result:', res.status, '→ explorer tx', sent.hash);
  if (res.status !== 'SUCCESS') process.exit(1);
}

main().catch((e) => {
  console.error('spike failed:', e.message);
  process.exit(1);
});
