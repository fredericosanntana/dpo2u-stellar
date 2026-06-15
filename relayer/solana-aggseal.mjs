#!/usr/bin/env node
// DPO2U — Solana agg-filing seal client (moonshot #5 seal, ported). Seals a SnarkPack
// aggregate RESULT on Solana and verifies one member proof on-chain (pinned vk, fail-closed).
//
// Env: PROGRAM_ID, AGG_JSON, MEMBER_JSON, VK_ID, SCOPE, RPC, KEYPAIR
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { readFileSync } from "node:fs";

const PROGRAM_ID = new PublicKey(req("PROGRAM_ID"));
const AGG_JSON = req("AGG_JSON");
const MEMBER_JSON = req("MEMBER_JSON");
const VK_ID = Number(process.env.VK_ID || "0");
const SCOPE = (process.env.SCOPE || "GLOBAL").slice(0, 16);
const RPC = process.env.RPC || "https://api.devnet.solana.com";
const KEYPAIR = process.env.KEYPAIR || `${process.env.HOME}/.config/solana/id.json`;
const P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

function req(k) { if (!process.env[k]) throw new Error(`missing env ${k}`); return process.env[k]; }
const be32 = (v) => Buffer.from(BigInt(v).toString(16).padStart(64, "0"), "hex");
function negateA(hex) {
  const x = Buffer.from(hex.slice(0, 64), "hex");
  const y = BigInt("0x" + hex.slice(64, 128));
  return Buffer.concat([x, be32((P - (y % P)) % P)]);
}

const agg = JSON.parse(readFileSync(new URL(AGG_JSON, import.meta.url)));
const m = JSON.parse(readFileSync(new URL(MEMBER_JSON, import.meta.url)));

const aggCommitment = Buffer.from(agg.agg_commitment, "hex");          // 32B
const count = Buffer.alloc(4); count.writeUInt32LE(Number(agg.count));  // 4B LE
const verdict = Buffer.from([agg.verdict_all_compliant ? 1 : 0]);       // 1B
const contextRoot = Buffer.from(agg.context_root, "hex");               // 32B
const piA = negateA(m.PROOF_A);                                         // 64B
const piB = Buffer.from(m.PROOF_B, "hex");                              // 128B
const piC = Buffer.from(m.PROOF_C, "hex");                              // 64B
const pub = m.PUBLIC.map((d) => be32(d));                               // 3×32B
const scope = Buffer.alloc(16); Buffer.from(SCOPE, "ascii").copy(scope);

const data = Buffer.concat([
  Buffer.from([VK_ID]), aggCommitment, count, verdict, contextRoot, piA, piB, piC, pub[0], pub[1], pub[2], scope,
]); // 438B
if (data.length !== 438) throw new Error(`bad instruction data length ${data.length}`);

const [pda] = PublicKey.findProgramAddressSync([Buffer.from("aggclaim"), scope], PROGRAM_ID);
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(KEYPAIR))));
const ix = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: pda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data,
});

const conn = new Connection(RPC, "confirmed");
console.log(`[agg-seal] scope=${SCOPE} count=${agg.count} vk_id=${VK_ID} pda=${pda.toBase58()}`);
const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer], { commitment: "confirmed" });
console.log(`[agg-seal] seal tx: ${sig}`);
console.log(`https://explorer.solana.com/tx/${sig}?cluster=devnet`);
console.log(`agg PDA: https://explorer.solana.com/address/${pda.toBase58()}?cluster=devnet`);
