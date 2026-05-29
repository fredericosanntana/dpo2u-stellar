//! DPO2U — conversor snarkjs → Soroban/arkworks (uncompressed hex).
//!
//! O snarkjs emite VK/proof como decimais (G1 [x,y,z], G2 [[x0,x1],[y0,y1],[z0,z1]]).
//! O verificador Soroban (contracts/zk-verifier) consome pontos via
//! G1Affine/G2Affine::from_array — exatamente o formato `serialize_uncompressed`
//! do arkworks (96B G1 / 192B G2). Este bin reconstrói os pontos em ark-bls12-381,
//! VALIDA com Groth16::verify (prova de fidelidade da conversão) e emite o hex.
//!
//! A ordem de Fq2 (c0,c1) entre snarkjs e arkworks é auto-detectada: tenta as duas
//! e mantém a que verifica. Saída idêntica em formato ao zk-prover/src/main.rs.
//!
//! Uso: cargo run --release --bin snarkjs2soroban -- <vk.json> <proof.json> <public.json>

use ark_bls12_381::{Bls12_381, Fq, Fq2, Fr, G1Affine, G2Affine};
use ark_groth16::{Groth16, Proof, VerifyingKey};
use ark_serialize::CanonicalSerialize;
use ark_snark::SNARK;
use core::str::FromStr;
use serde_json::Value;

fn fq(s: &str) -> Fq {
    Fq::from_str(s).unwrap_or_else(|_| panic!("Fq parse falhou: {s}"))
}

fn g1(v: &Value) -> G1Affine {
    G1Affine::new_unchecked(
        fq(v[0].as_str().expect("g1.x string")),
        fq(v[1].as_str().expect("g1.y string")),
    )
}

fn g2(v: &Value, swap: bool) -> G2Affine {
    let (x0, x1) = (v[0][0].as_str().unwrap(), v[0][1].as_str().unwrap());
    let (y0, y1) = (v[1][0].as_str().unwrap(), v[1][1].as_str().unwrap());
    let x = if swap { Fq2::new(fq(x1), fq(x0)) } else { Fq2::new(fq(x0), fq(x1)) };
    let y = if swap { Fq2::new(fq(y1), fq(y0)) } else { Fq2::new(fq(y0), fq(y1)) };
    G2Affine::new_unchecked(x, y)
}

fn hexu<T: CanonicalSerialize>(p: &T) -> String {
    let mut b = Vec::new();
    p.serialize_uncompressed(&mut b).unwrap();
    hex::encode(b)
}

fn build_vk(vkj: &Value, swap: bool) -> VerifyingKey<Bls12_381> {
    VerifyingKey {
        alpha_g1: g1(&vkj["vk_alpha_1"]),
        beta_g2: g2(&vkj["vk_beta_2"], swap),
        gamma_g2: g2(&vkj["vk_gamma_2"], swap),
        delta_g2: g2(&vkj["vk_delta_2"], swap),
        gamma_abc_g1: vkj["IC"].as_array().unwrap().iter().map(g1).collect(),
    }
}

fn build_proof(pj: &Value, swap: bool) -> Proof<Bls12_381> {
    Proof {
        a: g1(&pj["pi_a"]),
        b: g2(&pj["pi_b"], swap),
        c: g1(&pj["pi_c"]),
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 4 {
        eprintln!("uso: snarkjs2soroban <vk.json> <proof.json> <public.json>");
        std::process::exit(2);
    }
    let vkj: Value = serde_json::from_str(&std::fs::read_to_string(&args[1]).unwrap()).unwrap();
    let pj: Value = serde_json::from_str(&std::fs::read_to_string(&args[2]).unwrap()).unwrap();
    let pubj: Value = serde_json::from_str(&std::fs::read_to_string(&args[3]).unwrap()).unwrap();

    let public_dec: Vec<String> = pubj
        .as_array()
        .unwrap()
        .iter()
        .map(|s| s.as_str().unwrap().to_string())
        .collect();
    let public: Vec<Fr> = public_dec
        .iter()
        .map(|s| Fr::from_str(s).unwrap())
        .collect();

    // Auto-detecta a ordem de Fq2 que verifica (snarkjs vs arkworks).
    let mut chosen = None;
    for swap in [false, true] {
        let vk = build_vk(&vkj, swap);
        let proof = build_proof(&pj, swap);
        if let Ok(true) = Groth16::<Bls12_381>::verify(&vk, &public, &proof) {
            chosen = Some(swap);
            break;
        }
    }
    let swap = chosen.expect("FALHA: nenhuma ordem de Fq2 verificou — conversão incompatível");
    eprintln!("# Groth16::verify (arkworks) = OK   [Fq2 swap={swap}]");
    eprintln!("# A VK/proof do snarkjs é um Groth16 válido sob a MESMA equação do verificador Soroban.");

    let vk = build_vk(&vkj, swap);
    let proof = build_proof(&pj, swap);

    println!("VK_ALPHA={}", hexu(&vk.alpha_g1));
    println!("VK_BETA={}", hexu(&vk.beta_g2));
    println!("VK_GAMMA={}", hexu(&vk.gamma_g2));
    println!("VK_DELTA={}", hexu(&vk.delta_g2));
    for (i, ic) in vk.gamma_abc_g1.iter().enumerate() {
        println!("VK_IC{i}={}", hexu(ic));
    }
    println!("PROOF_A={}", hexu(&proof.a));
    println!("PROOF_B={}", hexu(&proof.b));
    println!("PROOF_C={}", hexu(&proof.c));
    for (i, d) in public_dec.iter().enumerate() {
        println!("PUBLIC_{i}={d}");
    }

    // Opcional: 4º arg = caminho p/ escrever proof.json no formato arkworks
    // (consumido pelo gateway, pilot-gateway/src/lib/zk-verify.ts). public[0]=threshold,
    // public[1]=context.
    if let Some(out) = args.get(4) {
        let ic_hex: Vec<String> = vk.gamma_abc_g1.iter().map(hexu).collect();
        let json = serde_json::json!({
            "proof_system": "groth16-bls12-381",
            "statement": "score >= threshold",
            "public_threshold": public_dec.get(0).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0),
            "public_context": public_dec.get(1).cloned().unwrap_or_default(),
            "score_is_private": true,
            "vk": {
                "alpha": hexu(&vk.alpha_g1), "beta": hexu(&vk.beta_g2),
                "gamma": hexu(&vk.gamma_g2), "delta": hexu(&vk.delta_g2), "ic": ic_hex,
            },
            "proof": { "a": hexu(&proof.a), "b": hexu(&proof.b), "c": hexu(&proof.c) },
        });
        std::fs::write(out, serde_json::to_string_pretty(&json).unwrap() + "\n").unwrap();
        eprintln!("# proof.json escrito em {out}");
    }
}
