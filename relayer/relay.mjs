#!/usr/bin/env node
// DPO2U cross-chain relayer (#6-C). A trusted COURIER, not a trustless bridge:
// it reads a Groth16/BN254 proof posted on an EVM origin chain (ProofRegistry) and
// submits it to Stellar, where the `xchain-attest` contract RE-VERIFIES it on-chain
// (trustless) and records a CrossChainClaim. Trust = transport only.
//
// Env: REGISTRY, RPC, PROOF_ID, XCHAIN_ID, ORIGIN, STELLAR_SRC, NET, FOUNDRY_BIN, STELLAR_BIN
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { evmProofToSoroban } from "./convert.mjs";

const REGISTRY = req("REGISTRY");
const XCHAIN_ID = req("XCHAIN_ID");
const RPC = process.env.RPC || "http://127.0.0.1:8545";
const PROOF_ID = process.env.PROOF_ID || "0";
const ORIGIN = process.env.ORIGIN || "anvil";
const STELLAR_SRC = process.env.STELLAR_SRC || "dpo2u-deployer";
const NET = process.env.NET || "testnet";
const CAST = process.env.FOUNDRY_BIN || `${process.env.HOME}/.foundry/bin/cast`;
const STELLAR = process.env.STELLAR_BIN || `${process.env.HOME}/.cargo/bin/stellar`;

function req(k) {
  if (!process.env[k]) throw new Error(`missing env ${k}`);
  return process.env[k];
}

console.log(`[relayer] watching EVM origin '${ORIGIN}' (${RPC}) registry ${REGISTRY}, proof #${PROOF_ID}`);

// 1) READ the proof from the EVM origin chain (the "watch/observe" step).
const sig = "getProof(uint256)(uint256[2],uint256[2][2],uint256[2],uint256[3])";
const raw = execFileSync(CAST, ["call", REGISTRY, sig, PROOF_ID, "--rpc-url", RPC], {
  encoding: "utf8",
});
// cast annotates each uint with scientific notation, e.g. "7191... [7.191e75]".
// Strip those annotations, then extract integers in order: pA(2),pB(4),pC(2),pub(3)=11.
const cleaned = raw.replace(/\s*\[[\d.]+e[+-]?\d+\]/g, "");
const nums = cleaned.match(/\d+/g) || [];
if (nums.length < 11) throw new Error(`expected >=11 numbers from getProof, got ${nums.length}: ${raw}`);
const n = nums.slice(0, 11);
const pA = [n[0], n[1]];
const pB = [[n[2], n[3]], [n[4], n[5]]];
const pC = [n[6], n[7]];
const pub = [n[8], n[9], n[10]];
console.log(`[relayer] read proof from EVM. context=${pub[2]}`);

// 2) CONVERT EVM bytes -> Soroban args (pure re-encoding; conventions already match).
const { proof, signals } = evmProofToSoroban(pA, pB, pC, pub);
writeFileSync("/tmp/relay-proof.json", JSON.stringify(proof));
writeFileSync("/tmp/relay-pub.json", JSON.stringify(signals));

// 3) SUBMIT to Stellar — xchain-attest RE-VERIFIES on-chain (trustless) + attests.
console.log(`[relayer] submitting to Stellar ${NET} xchain-attest ${XCHAIN_ID} ...`);
const out = execFileSync(
  STELLAR,
  [
    "contract", "invoke", "--id", XCHAIN_ID, "--source", STELLAR_SRC, "--network", NET, "--send=yes",
    "--", "verify_and_attest",
    "--submitter", stellarAddr(STELLAR_SRC),
    "--origin_chain", ORIGIN,
    "--proof-file-path", "/tmp/relay-proof.json",
    "--pub_signals-file-path", "/tmp/relay-pub.json",
  ],
  { encoding: "utf8" }
);
console.log(`[relayer] Stellar result:\n${out.trim()}`);

function stellarAddr(src) {
  return execFileSync(STELLAR, ["keys", "address", src], { encoding: "utf8" }).trim();
}
