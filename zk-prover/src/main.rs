//! DPO2U — prover Groth16/BLS12-381 do enunciado "score privado, prova pública".
//!
//! Circuito: o detentor conhece um `score` (witness PRIVADO) e prova que
//! `score >= threshold` (threshold é sinal PÚBLICO), sem revelar o score.
//! A prova `diff = score - threshold` decompõe-se em N_BITS bits — o que só é
//! possível se `0 <= diff < 2^N_BITS`, logo `score >= threshold`.
//!
//! BINDING ANTI-REPLAY (A2): um 2º sinal PÚBLICO `context` ancora a prova a uma
//! atestação específica (= H(organização, jurisdição, nonce), computado
//! off-chain). A equação de Groth16 inclui todos os sinais públicos via o `ic`
//! da vk — então a prova só verifica para o `context` exato em que foi gerada.
//! Uma prova roubada não pode ser re-submetida para outra organização/nonce.
//!
//! Saída: vk + proof + sinais públicos serializados (uncompressed) em hex.
//!
//! Uso: cargo run --release -- <score> <threshold> <context-decimal>

use ark_bls12_381::{Bls12_381, Fr};
use ark_ff::{BigInteger, Field, PrimeField};
use ark_groth16::Groth16;
use ark_relations::lc;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError, Variable};
use ark_serialize::CanonicalSerialize;
use ark_snark::SNARK;
use ark_std::rand::{rngs::StdRng, SeedableRng};
use core::str::FromStr;

const N_BITS: usize = 8; // score/threshold em [0, 255] — escala de score de compliance

/// Circuito `score >= threshold` com binding anti-replay a `context`.
#[derive(Clone)]
struct ScoreThreshold {
    score: Option<u64>,
    threshold: Option<u64>,
    context: Option<Fr>,
}

impl ConstraintSynthesizer<Fr> for ScoreThreshold {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        // Sinal PÚBLICO 1: threshold.
        let threshold = cs.new_input_variable(|| {
            self.threshold
                .map(Fr::from)
                .ok_or(SynthesisError::AssignmentMissing)
        })?;
        // Sinal PÚBLICO 2: context — binding anti-replay (H(org, jurisdição, nonce)).
        let context = cs
            .new_input_variable(|| self.context.ok_or(SynthesisError::AssignmentMissing))?;
        // Witness PRIVADO: score (nunca revelado).
        let score = cs.new_witness_variable(|| {
            self.score
                .map(Fr::from)
                .ok_or(SynthesisError::AssignmentMissing)
        })?;

        let diff = match (self.score, self.threshold) {
            (Some(s), Some(t)) => Some(Fr::from(s) - Fr::from(t)),
            _ => None,
        };

        // Decomposição de diff em N_BITS bits witness; cada bit ∈ {0,1}.
        let mut acc = lc!();
        let mut coeff = Fr::from(1u64);
        for i in 0..N_BITS {
            let bit = cs.new_witness_variable(|| {
                let d = diff.ok_or(SynthesisError::AssignmentMissing)?;
                let byte0 = d.into_bigint().to_bytes_le()[0];
                Ok(Fr::from(((byte0 >> i) & 1) as u64))
            })?;
            // bit * bit == bit  ⇒  bit ∈ {0,1}
            cs.enforce_constraint(lc!() + bit, lc!() + bit, lc!() + bit)?;
            acc = acc + (coeff, bit);
            coeff = coeff.double();
        }

        // (score - threshold) * 1 == Σ b_i 2^i
        cs.enforce_constraint(lc!() + score - threshold, lc!() + Variable::One, acc)?;
        // Ancora `context` no R1CS (context * 1 == context). O binding vem de
        // `context` ser sinal público — a prova fica atada ao seu valor.
        cs.enforce_constraint(lc!() + context, lc!() + Variable::One, lc!() + context)?;
        Ok(())
    }
}

fn hex_uncompressed<T: CanonicalSerialize>(point: &T) -> String {
    let mut buf = Vec::new();
    point.serialize_uncompressed(&mut buf).unwrap();
    hex::encode(buf)
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let score: u64 = args.get(1).and_then(|s| s.parse().ok()).unwrap_or(85);
    let threshold: u64 = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(70);
    let context_str = args.get(3).cloned().unwrap_or_else(|| "1".to_string());
    let context = Fr::from_str(&context_str).expect("context deve ser um inteiro decimal (campo Fr)");
    assert!(score >= threshold && score - threshold < (1 << N_BITS), "score-threshold fora da faixa");

    // Seed fixa — determinístico para reprodutibilidade da demo (DEV-ONLY;
    // produção exige cerimônia de trusted setup — ver docs/zk-trusted-setup-runbook.md).
    let mut rng = StdRng::seed_from_u64(0x44504f3255);

    let circuit = ScoreThreshold {
        score: Some(score),
        threshold: Some(threshold),
        context: Some(context),
    };
    let (pk, vk) =
        Groth16::<Bls12_381>::circuit_specific_setup(circuit.clone(), &mut rng).expect("setup");
    let proof = Groth16::<Bls12_381>::prove(&pk, circuit, &mut rng).expect("prove");

    // Sanidade off-chain antes de emitir — sinais públicos: [threshold, context].
    let public = vec![Fr::from(threshold), context];
    let ok = Groth16::<Bls12_381>::verify(&vk, &public, &proof).expect("verify");
    assert!(ok, "prova não verifica off-chain");

    // Saída — hex uncompressed, consumível por G1Affine/G2Affine::from_array.
    let alpha = hex_uncompressed(&vk.alpha_g1);
    let beta = hex_uncompressed(&vk.beta_g2);
    let gamma = hex_uncompressed(&vk.gamma_g2);
    let delta = hex_uncompressed(&vk.delta_g2);
    let ic: Vec<String> = vk.gamma_abc_g1.iter().map(hex_uncompressed).collect();
    let pa = hex_uncompressed(&proof.a);
    let pb = hex_uncompressed(&proof.b);
    let pc = hex_uncompressed(&proof.c);

    println!("# DPO2U zk-prover — score>=threshold  (score={score} PRIVADO, threshold={threshold}, context={context_str})");
    println!("VK_ALPHA={alpha}\nVK_BETA={beta}\nVK_GAMMA={gamma}\nVK_DELTA={delta}");
    for (i, v) in ic.iter().enumerate() {
        println!("VK_IC{i}={v}");
    }
    println!("PROOF_A={pa}\nPROOF_B={pb}\nPROOF_C={pc}");
    println!("PUBLIC_THRESHOLD={threshold}\nPUBLIC_CONTEXT={context_str}");

    // Artefato JSON — consumido pelo runner de wiring do zk_compliance_v1.
    let ic_json = ic
        .iter()
        .map(|v| format!("\"{v}\""))
        .collect::<Vec<_>>()
        .join(",");
    let json = format!(
        "{{\n  \"proof_system\": \"groth16-bls12-381\",\n  \"statement\": \"score >= threshold\",\n  \"public_threshold\": {threshold},\n  \"public_context\": \"{context_str}\",\n  \"score_is_private\": true,\n  \"vk\": {{ \"alpha\": \"{alpha}\", \"beta\": \"{beta}\", \"gamma\": \"{gamma}\", \"delta\": \"{delta}\", \"ic\": [{ic_json}] }},\n  \"proof\": {{ \"a\": \"{pa}\", \"b\": \"{pb}\", \"c\": \"{pc}\" }}\n}}\n"
    );
    std::fs::write("proof.json", &json).expect("write proof.json");
    println!("# artefato: zk-prover/proof.json (sinais públicos: [threshold, context])");
}
