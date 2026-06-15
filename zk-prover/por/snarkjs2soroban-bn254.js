#!/usr/bin/env node
/**
 * DPO2U — conversor snarkjs (BN254/bn128) → bytes Soroban (Ethereum-compatible).
 *
 * O verificador Soroban consome pontos no formato uncompressed big-endian:
 *   - G1 (64B): be(X) || be(Y)
 *   - G2 (128B): para cada coord Fp2, be(c1) || be(c0)  → be(Xc1)||be(Xc0)||be(Yc1)||be(Yc0)
 *   - Fr/public (32B): be(value)
 * Isso é EXATAMENTE o formato que o snarkjs emite (decimais), só re-encodado.
 * snarkjs G2 = [[c0,c1],[c0,c1]]; o Soroban quer c1 PRIMEIRO (convenção EVM).
 *
 * Uso: node snarkjs2soroban-bn254.js <vk.json> <proof.json> <public.json> [out.json]
 */
const fs = require("fs");

function be32(dec) {
  let h = BigInt(dec).toString(16);
  if (h.length > 64) throw new Error("valor > 32 bytes: " + dec);
  return h.padStart(64, "0");
}
const g1 = (p) => be32(p[0]) + be32(p[1]);                 // be(X)||be(Y)
const g2 = (p) =>                                          // c1||c0 por coord
  be32(p[0][1]) + be32(p[0][0]) + be32(p[1][1]) + be32(p[1][0]);

const [, , vkPath, proofPath, pubPath, outPath] = process.argv;
if (!vkPath || !proofPath || !pubPath) {
  console.error("uso: node snarkjs2soroban-bn254.js <vk.json> <proof.json> <public.json> [out.json]");
  process.exit(2);
}
const vk = JSON.parse(fs.readFileSync(vkPath, "utf8"));
const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
const pub = JSON.parse(fs.readFileSync(pubPath, "utf8"));

if (vk.curve && vk.curve.toLowerCase() !== "bn128") {
  console.error("AVISO: vk.curve=" + vk.curve + " (esperado bn128/BN254)");
}

const out = {
  VK_ALPHA: g1(vk.vk_alpha_1),
  VK_BETA: g2(vk.vk_beta_2),
  VK_GAMMA: g2(vk.vk_gamma_2),
  VK_DELTA: g2(vk.vk_delta_2),
  VK_IC: vk.IC.map(g1),
  PROOF_A: g1(proof.pi_a),
  PROOF_B: g2(proof.pi_b),
  PROOF_C: g1(proof.pi_c),
  PUBLIC: pub.map((d) => BigInt(d).toString()),
};

// stdout: linhas chave=hex (cola no test_por_ceremony.rs)
console.log("VK_ALPHA=" + out.VK_ALPHA);
console.log("VK_BETA=" + out.VK_BETA);
console.log("VK_GAMMA=" + out.VK_GAMMA);
console.log("VK_DELTA=" + out.VK_DELTA);
out.VK_IC.forEach((h, i) => console.log("VK_IC" + i + "=" + h));
console.log("PROOF_A=" + out.PROOF_A);
console.log("PROOF_B=" + out.PROOF_B);
console.log("PROOF_C=" + out.PROOF_C);
out.PUBLIC.forEach((d, i) => console.log("PUBLIC_" + i + "=" + d));

if (outPath) {
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.error("# JSON escrito em " + outPath);
}
