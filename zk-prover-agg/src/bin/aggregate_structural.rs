//! DPO2U — aggregate STRUCTURAL AI-governance proofs (study #2 implemented) via SnarkPack.
//! Hiroshima (N-of-M) + EU-AIA (tier) proofs over the governance_predicate circuit, folded
//! into ONE aggregate and verified OFF-CHAIN (the on-chain aggregate-verify gap is the same
//! GT-host limitation as the scored batch). Emits ../zk-prover/agg/structural-aggregate.json.
//!
//! Run: cargo run --release --bin aggregate-structural

use ark_crypto_primitives::snark::SNARK;
use ark_std::rand::{rngs::StdRng, SeedableRng};
use std::path::PathBuf;
use zk_prover_agg::{
    aggregate_and_verify, prove_gov_all, setup_gov, GovernancePredicateCircuit, Jurisdiction,
};

fn main() {
    let mut rng = StdRng::seed_from_u64(0x57_2c_72u64);

    // Four structural instances (power of two — no padding). framework_id: 1=Hiroshima, 2=EU-AIA.
    let items = vec![
        // Hiroshima org A — all 11 principles attested
        GovernancePredicateCircuit { framework_id: 1, context: 2_000_001, attested: [true; 11], tier: 0, redline_clear: true, hr_met: false },
        // EU-AIA high-risk system — red-line clear, obligations (IA + red-team) met
        GovernancePredicateCircuit { framework_id: 2, context: 2_000_002, attested: [false; 11], tier: 2, redline_clear: true, hr_met: true },
        // Hiroshima org B
        GovernancePredicateCircuit { framework_id: 1, context: 2_000_003, attested: [true; 11], tier: 0, redline_clear: true, hr_met: false },
        // EU-AIA limited-risk system (tier 1 ⇒ no high-risk obligations required)
        GovernancePredicateCircuit { framework_id: 2, context: 2_000_004, attested: [false; 11], tier: 1, redline_clear: true, hr_met: false },
    ];
    let labels = ["Hiroshima:orgA", "EU-AIA:high-risk", "Hiroshima:orgB", "EU-AIA:limited"];

    println!("== [1/3] Groth16/BN254 setup (shared structural vk) ==");
    let (pk, vk) = setup_gov(&mut rng);

    println!("== [2/3] proving {} structural proofs ==", items.len());
    let (proofs, statements) = prove_gov_all(&pk, &items, &mut rng);
    for (l, (p, s)) in labels.iter().zip(proofs.iter().zip(statements.iter())) {
        let ok = ark_groth16::Groth16::<ark_bn254::Bn254>::verify(&vk, s, p).unwrap();
        println!("   [{}] individual proof verifies: {}", l, ok);
        assert!(ok);
    }

    println!("== [3/3] SnarkPack aggregate {} structural proofs → 1, verify off-chain ==", items.len());
    // Reuse aggregate_and_verify; Jurisdiction is just a context carrier for the commitment.
    let ctx_carriers: Vec<Jurisdiction> = items
        .iter()
        .map(|c| Jurisdiction { code: String::new(), threshold: 0, context: c.context, score: 0 })
        .collect();
    let out = aggregate_and_verify(&vk, &proofs, &statements, &ctx_carriers, &mut rng);
    assert!(out.verified, "structural aggregate verification failed");
    println!("   verify_aggregate == {} ({} structural proofs, padded to {})", out.verified, out.count, out.padded_to);

    let agg_hex = hex::encode(out.agg_commitment);
    let ctx_hex = hex::encode(out.context_root);
    let json = serde_json::json!({
        "what": "DPO2U study #2 implemented — STRUCTURAL AI-governance proofs (Hiroshima N-of-M + EU-AIA tier) aggregated via SnarkPack, verified off-chain",
        "circuit": "governance_predicate (one structural vk; selected by framework_id)",
        "curve": "BN254 (bn128)",
        "count": out.count,
        "frameworks": labels,
        "public_signals_order": ["compliant", "framework_id", "context"],
        "agg_commitment": agg_hex,
        "context_root": ctx_hex,
        "padded_to": out.padded_to,
        "verdict_all_compliant": out.verified,
        "onchain_note": "Each structural proof verifies on-chain on the SAME generic por-verifier (IC=4) with the structural vk — zero contract change. Aggregate verify is off-chain (GT-host gap).",
        "honesty": "DEV coordinator setup; structural predicates encode legal classifications (K, allowed tiers, red-lines) that need legal review."
    });

    let mut out_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    out_path.pop();
    out_path.push("zk-prover/agg/structural-aggregate.json");
    std::fs::write(&out_path, serde_json::to_string_pretty(&json).unwrap()).expect("write");
    println!("\nstructural-aggregate.json written: {}", out_path.display());
    println!("  count={} agg_commitment=0x{} context_root=0x{}", out.count, agg_hex, ctx_hex);
}
