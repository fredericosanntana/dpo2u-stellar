//! DPO2U — aggregate N jurisdiction-compliance Groth16/BN254 proofs (SnarkPack) and
//! verify the aggregate OFF-CHAIN. Emits `zk-prover/agg/aggregate.json` — the verdict +
//! commitment + count that the `agg-filing` Soroban contract seals on-chain.
//!
//! Run: `cargo run --release --bin aggregate`

use ark_std::rand::{rngs::StdRng, SeedableRng};
use std::path::PathBuf;
use zk_prover_agg::{aggregate_and_verify, prove_all, setup, Jurisdiction};

fn main() {
    // Fixed seed → reproducible DEV run (coordinator setup; not multi-party MPC).
    let mut rng = StdRng::seed_from_u64(0xD9_02_2Eu64);

    // DUAL-VERTICAL batch. All entries share the SAME generic compliance circuit/vk
    // ("private score >= public threshold, bound to context") — only threshold/context
    // differ — so data-protection AND AI-governance compliance aggregate into ONE proof.
    //
    // (1) Data-protection corpus: the 24 canonical JURISDICTION_CODES.
    let data_codes = [
        "LGPD", "GDPR", "DPDP", "MICAR", "MICAR-CASP", "PDPA", "UAE", "POPIA", "NDPA",
        "CCPA", "PIPEDA", "LAW25", "PIPA", "PDP", "APPI", "MEXICO", "VIETNAM", "MALAYSIA",
        "KENYA", "GHANA", "COLOMBIA", "TANZANIA", "RWANDA", "UGANDA",
    ];
    // (2) SCORED AI-governance frameworks (index/maturity scores → fit score>=threshold).
    //     Structural frameworks (EU-AIA risk-tier, Hiroshima attestation, AI-Gov-Stack
    //     methodology) need a different predicate circuit — see the #2 study doc.
    let ai_codes = ["CAIDP", "UNESCO-RAM", "MGF-AGENTIC", "AI-JAPAN", "AI-KOREA"];

    let mut jurs: Vec<Jurisdiction> = Vec::new();
    for (i, c) in data_codes.iter().enumerate() {
        let threshold = 50 + i as u64; // 8-bit safe
        jurs.push(Jurisdiction {
            code: (*c).to_string(),
            threshold,
            context: 1_000_001 + i as u64,
            score: threshold + 15,
        });
    }
    for (j, c) in ai_codes.iter().enumerate() {
        let threshold = 60 + j as u64; // AI-governance bar
        jurs.push(Jurisdiction {
            code: (*c).to_string(),
            threshold,
            context: 1_000_101 + j as u64,
            score: threshold + 15,
        });
    }
    let data_count = data_codes.len();
    let ai_count = ai_codes.len();

    println!("== [1/3] Groth16/BN254 setup (shared vk for all jurisdictions) ==");
    let (pk, vk) = setup(&mut rng);

    println!("== [2/3] proving {} independent jurisdiction proofs ==", jurs.len());
    let (proofs, statements) = prove_all(&pk, &jurs, &mut rng);
    // sanity: each individual proof verifies under the shared vk
    use ark_crypto_primitives::snark::SNARK;
    for (j, (p, s)) in jurs.iter().zip(proofs.iter().zip(statements.iter())) {
        let ok = ark_groth16::Groth16::<ark_bn254::Bn254>::verify(&vk, s, p).unwrap();
        println!("   [{}] individual proof verifies: {}", j.code, ok);
        assert!(ok);
    }

    println!("== [3/3] SnarkPack aggregate {} proofs → 1, verify off-chain ==", jurs.len());
    let out = aggregate_and_verify(&vk, &proofs, &statements, &jurs, &mut rng);
    assert!(out.verified, "aggregate verification failed");
    println!("   verify_aggregate == {} ({} jurisdictions, padded to {})", out.verified, out.count, out.padded_to);

    let agg_hex = hex::encode(out.agg_commitment);
    let ctx_hex = hex::encode(out.context_root);
    let codes: Vec<String> = jurs.iter().map(|j| j.code.clone()).collect();

    let json = serde_json::json!({
        "what": "DPO2U moonshot #5 — N compliance Groth16/BN254 proofs (data-protection + AI-governance) aggregated via SnarkPack (TIPP/MIPP), verified off-chain",
        "technique": "true recursive proof aggregation (ark-ip-proofs / arkworks-rs ripp), NOT a batch circuit",
        "curve": "BN254 (bn128)",
        "count": out.count,
        "data_jurisdictions": data_count,
        "ai_governance_frameworks": ai_count,
        "ai_note": "scored AI frameworks only (CAIDP/UNESCO-RAM/MGF/Japan/Korea). Structural ones (EU-AIA risk-tier, Hiroshima attestation) need a separate predicate circuit — see study doc.",
        "padded_to": out.padded_to,
        "verdict_all_compliant": out.verified,
        "jurisdictions": codes,
        "public_signals_order": ["compliant", "threshold", "context"],
        "agg_commitment": agg_hex,
        "context_root": ctx_hex,
        "onchain_verification": "INFEASIBLE on Soroban today — SnarkPack verify needs GT arithmetic; bn254 host exposes only g1_*, pairing_check, Fr. The aggregate verifies OFF-CHAIN; the result is sealed on-chain by agg-filing. On-chain aggregate verify = roadmap (GT host fns).",
        "honesty": "DEV coordinator setup (not multi-party MPC). arkworks-native proofs over the same jurisdiction statement as the snarkjs proofs in zk-prover/agg/."
    });

    // write to zk-prover/agg/aggregate.json (sibling of the snarkjs proofs)
    let out_path: PathBuf = std::env::var("AGG_OUT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
            p.pop();
            p.push("zk-prover/agg/aggregate.json");
            p
        });
    std::fs::write(&out_path, serde_json::to_string_pretty(&json).unwrap())
        .expect("write aggregate.json");
    println!("\naggregate.json written: {}", out_path.display());
    println!("  count            = {}", out.count);
    println!("  agg_commitment   = 0x{}", agg_hex);
    println!("  context_root     = 0x{}", ctx_hex);
}
