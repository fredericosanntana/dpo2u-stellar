pragma circom 2.1.6;

// DPO2U — ZK Proof-of-Reserve / Solvência (Cunha 1-B), curva BN254 (bn128).
//
// Enunciado: o emissor conhece reservas[i] e obrigações[i] (PRIVADAS, por ativo)
// e prova `Σ reservas ≥ Σ obrigações` — solvência PÚBLICA, posições PRIVADAS —
// atado a um `context` público (anti-replay = H(psav,"BCB-PoR",data_base,nonce)).
//
// Estruturalmente é o sucessor multi-ativo do score_threshold (valor privado ≥
// threshold), agora sobre BN254 (formato Ethereum-compatible = default do snarkjs)
// para casar com as host functions do Soroban P25/P26 (`env.crypto().bn254()`).
//
// SOUNDNESS (crítico): cada input é range-checado a 64 bits. Sem isso, um prover
// malicioso usaria uma obrigação "negativa" no campo (r - k ≡ -k) para fingir
// solvência. Num2Bits força 0 ≤ input < 2^64.
//
// Poseidon (nativo no P25) commita os totais → o claim on-chain fica atado a
// (sumR, sumL) committed; o auditor abre a reconciliação off-chain.
//
// Sinais PÚBLICOS (ordem do snarkjs = [outputs, public inputs]):
//   [solvent, commit, context]   → IC tem 4 elementos (1 + 3).

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

template PoRSolvency(N) {
    signal input reserves[N];      // PRIVADO — reserva por ativo (unidades inteiras)
    signal input liabilities[N];   // PRIVADO — obrigação por ativo
    signal input context;          // PÚBLICO — binding anti-replay

    signal output solvent;         // PÚBLICO — 1 (enunciado provado)
    signal output commit;          // PÚBLICO — Poseidon(sumR, sumL)

    // Range-check de cada input a 64 bits (não-negativo, limitado) — soundness.
    component rcR[N];
    component rcL[N];
    var accR = 0;
    var accL = 0;
    for (var i = 0; i < N; i++) {
        rcR[i] = Num2Bits(64);
        rcR[i].in <== reserves[i];
        rcL[i] = Num2Bits(64);
        rcL[i].in <== liabilities[i];
        accR += reserves[i];
        accL += liabilities[i];
    }
    signal sumR;
    signal sumL;
    sumR <== accR;
    sumL <== accL;

    // Σ reservas ≥ Σ obrigações. Com N≤4 e inputs<2^64, as somas cabem em <2^66,
    // logo GreaterEqThan(67) é seguro (inputs < 2^67).
    component ge = GreaterEqThan(67);
    ge.in[0] <== sumR;
    ge.in[1] <== sumL;
    ge.out === 1;            // ENFORCED — a prova só existe se solvente
    solvent <== ge.out;

    // Commitment Poseidon dos totais (binding p/ reconciliação do auditor).
    component h = Poseidon(2);
    h.inputs[0] <== sumR;
    h.inputs[1] <== sumL;
    commit <== h.out;

    // Ancora `context` no R1CS (o binding vem de `context` ser público).
    signal ctxBind;
    ctxBind <== context * context;
}

component main {public [context]} = PoRSolvency(4);
