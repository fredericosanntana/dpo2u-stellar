#!/usr/bin/env node
// Emite as constantes Rust (VK + prova + sinais) do test_ceremony.rs do por-verifier
// a partir do soroban-bn254.json gerado por 05-convert.sh.
//   node 06-rust-fixture.js ensaio/soroban-bn254.json > /tmp/consts.rs
const fs = require("fs");
const j = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const be32 = (d) => BigInt(d).toString(16).padStart(64, "0");
const L = [];
const c = (k, v) => L.push(`const CER_${k}: &str = "${v}";`);
c("VK_ALPHA", j.VK_ALPHA); c("VK_BETA", j.VK_BETA); c("VK_GAMMA", j.VK_GAMMA); c("VK_DELTA", j.VK_DELTA);
j.VK_IC.forEach((h, i) => c("VK_IC" + i, h));
c("PROOF_A", j.PROOF_A); c("PROOF_B", j.PROOF_B); c("PROOF_C", j.PROOF_C);
["SOLVENT", "COMMIT", "CONTEXT"].forEach((n, i) => c("PUB_" + n, be32(j.PUBLIC[i])));
console.log(L.join("\n"));
