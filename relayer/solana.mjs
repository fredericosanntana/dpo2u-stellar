#!/usr/bin/env node
// DPO2U cross-chain relayer — Solana target (#6 ported to a 3rd chain).
// Carries our BN254 Groth16 proof to Solana devnet, where the xchain-attest program
// RE-VERIFIES it on-chain (alt_bn128) and seals a CrossChainClaim PDA. Same courier
// trust model: transport only; verification is trustless on-chain (pinned vk).
//
// Env: PROGRAM_ID, RPC, ORIGIN, PROOF_JSON, KEYPAIR
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { readFileSync } from "node:fs";

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || "9muJSDtxSsKLKML5SPLn3XvKJoxaiZ6TzMjyGeFFtAib");
const RPC = process.env.RPC || "https://api.devnet.solana.com";
const ORIGIN = (process.env.ORIGIN || "evm").slice(0, 16);
const PROOF_JSON = process.env.PROOF_JSON || "../zk-prover/por/build/soroban-bn254.json";
const KEYPAIR = process.env.KEYPAIR || `${process.env.HOME}/.config/solana/id.json`;
const P = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

const be32 = (v) => { let h = BigInt(v).toString(16).padStart(64, "0"); return Buffer.from(h, "hex"); };

function negateA(proofAHex) {
  const x = Buffer.from(proofAHex.slice(0, 64), "hex");
  const y = BigInt("0x" + proofAHex.slice(64, 128));
  const ny = (P - (y % P)) % P;
  return Buffer.concat([x, be32(ny)]);
}

const j = JSON.parse(readFileSync(new URL(PROOF_JSON, import.meta.url)));
const piA = negateA(j.PROOF_A);              // 64B, A negated for groth16-solana
const piB = Buffer.from(j.PROOF_B, "hex");   // 128B
const piC = Buffer.from(j.PROOF_C, "hex");   // 64B
const pub = j.PUBLIC.map((d) => be32(d));    // 3 × 32B (BE)
const origin = Buffer.alloc(16);
Buffer.from(ORIGIN, "ascii").copy(origin);
const proofContext = pub[2];                 // pub[2] = context

const data = Buffer.concat([piA, piB, piC, pub[0], pub[1], pub[2], origin]); // 368B
if (data.length !== 368) throw new Error(`bad instruction data length ${data.length}`);

const [claimPda] = PublicKey.findProgramAddressSync([Buffer.from("xclaim"), proofContext], PROGRAM_ID);

const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(KEYPAIR))));
const ix = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: claimPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data,
});

const conn = new Connection(RPC, "confirmed");
console.log(`[relayer→solana] program ${PROGRAM_ID.toBase58()} claim PDA ${claimPda.toBase58()} origin=${ORIGIN}`);
const sig = await sendAndConfirmTransaction(conn, new Transaction().add(ix), [payer], { commitment: "confirmed" });
console.log(`[relayer→solana] verify_and_attest tx: ${sig}`);
console.log(`https://explorer.solana.com/tx/${sig}?cluster=devnet`);
console.log(`claim PDA: https://explorer.solana.com/address/${claimPda.toBase58()}?cluster=devnet`);
