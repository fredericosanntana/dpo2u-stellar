pragma circom 2.1.6;

// DPO2U — ZK Jurisdiction Compliance (moonshot #5, curva BN254/bn128).
//
// Enunciado: a organização conhece `score` (PRIVADO) e prova `score >= threshold`
// para a jurisdição, sem revelar o score — atado a um `context` público
// (anti-replay = H(org, jurisdição, nonce), off-chain).
//
// É o port BN254 do zk-prover/circom/score_threshold.circom (que é BLS12-381),
// para casar com o por-verifier on-chain (env.crypto().bn254()). MESMO circuito +
// MESMA vk para todas as jurisdições; só threshold/context mudam por jurisdição —
// requisito do SnarkPack (agrega provas sobre o mesmo circuito com inputs distintos).
//
// SOUNDNESS: score/threshold range-checados a nBits (não-negativo no campo).
//
// Sinais PÚBLICOS (ordem snarkjs = [outputs, public inputs]):
//   [compliant, threshold, context]   → IC tem 4 elementos (1 + 3) = MESMO shape do
//   PoR, então o por-verifier verifica cada prova de jurisdição SEM mudança.

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

template JurisdictionCompliance(nBits) {
    signal input threshold;    // PÚBLICO — limiar de compliance da jurisdição
    signal input context;      // PÚBLICO — binding anti-replay (jurisdição + nonce)
    signal input score;        // PRIVADO — score de compliance da org

    signal output compliant;   // PÚBLICO — 1 (score >= threshold provado)

    // Range-check (soundness vs. valor "negativo" no campo).
    component rcS = Num2Bits(nBits);
    rcS.in <== score;
    component rcT = Num2Bits(nBits);
    rcT.in <== threshold;

    // score >= threshold. nBits-bit inputs ⇒ GreaterEqThan(nBits+1) é seguro.
    component ge = GreaterEqThan(nBits + 1);
    ge.in[0] <== score;
    ge.in[1] <== threshold;
    ge.out === 1;              // ENFORCED — a prova só existe se compliant
    compliant <== ge.out;

    // Ancora `context` no R1CS (o binding vem de `context` ser público).
    signal ctxBind;
    ctxBind <== context * context;
}

component main {public [threshold, context]} = JurisdictionCompliance(8);
