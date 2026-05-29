pragma circom 2.1.6;

// DPO2U — "score privado, prova pública" (port Circom do circuito arkworks).
//
// Enunciado: o detentor conhece `score` (PRIVADO) e prova `score >= threshold`
// (threshold PÚBLICO) sem revelar o score. Prova: diff = score - threshold se
// decompõe em nBits bits ⇒ 0 <= diff < 2^nBits ⇒ score >= threshold.
//
// BINDING ANTI-REPLAY (A2): 2º sinal PÚBLICO `context` (= H(org, jurisdição,
// nonce), off-chain) ancorado no R1CS — a prova só verifica para o context exato.
//
// PARIDADE com zk-prover/src/main.rs (arkworks):
//   - nBits = 8 (score/threshold em [0,255])
//   - sinais PÚBLICOS na ORDEM [threshold, context]  → IC = [1, threshold, context]
//   - witness PRIVADO: score
//   - curva BLS12-381 (compilar com --prime bls12381)

template ScoreThreshold(nBits) {
    signal input threshold;   // público #1
    signal input context;     // público #2 (binding anti-replay)
    signal input score;       // PRIVADO

    // diff = score - threshold
    signal diff;
    diff <== score - threshold;

    // Decomposição de diff em nBits bits; reconstrução força 0 <= diff < 2^nBits.
    signal bits[nBits];
    var acc = 0;
    for (var i = 0; i < nBits; i++) {
        bits[i] <-- (diff >> i) & 1;
        bits[i] * (bits[i] - 1) === 0;   // bit ∈ {0,1}
        acc += bits[i] * (1 << i);
    }
    diff === acc;                         // (score - threshold) == Σ b_i 2^i

    // Ancora `context` no sistema de constraints (espelha context*1==context do
    // arkworks). O binding vem de `context` ser público — a prova fica atada a ele.
    signal ctxBind;
    ctxBind <== context * context;
}

// Sinais públicos na ordem [threshold, context] (mesma ordem do verificador Soroban).
component main {public [threshold, context]} = ScoreThreshold(8);
