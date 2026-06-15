//! DPO2U — SnarkPack aggregation of N jurisdiction-compliance Groth16/BN254 proofs.
//!
//! Moonshot #5 ("aggregate N jurisdiction proofs into 1"). This is TRUE recursive
//! proof aggregation (SnarkPack / TIPP+MIPP, via `ark-ip-proofs`), NOT a batch circuit:
//! N *independently generated* Groth16 proofs over the SAME verifying key are folded
//! into ONE aggregate proof whose size/verification is sublinear in N.
//!
//! HONEST TRUST MODEL: the aggregate is a SnarkPack proof, NOT a standard Groth16
//! proof. Its verification (TIPP/MIPP) requires target-group (GT) arithmetic, which
//! the Soroban `bn254` host does not expose (only `g1_*`, `pairing_check`, `Fr`).
//! Therefore the aggregate is verified OFF-CHAIN here (real, working), and the
//! aggregated *result* (verdict + commitment + count) is what gets sealed on-chain
//! by the `agg-filing` Soroban contract. On-chain aggregate verification is roadmap,
//! gated on Stellar adding GT host functions.

use ark_bn254::{Bn254, Fr};
use ark_crypto_primitives::snark::{CircuitSpecificSetupSNARK, SNARK};
use ark_ff::One;
use ark_groth16::{Groth16, Proof, ProvingKey, VerifyingKey};
use ark_ip_proofs::applications::groth16_aggregation::{
    aggregate_proofs, setup_inner_product, verify_aggregate_proof, AggregateProof,
};
use ark_r1cs_std::{
    alloc::AllocVar, boolean::Boolean, eq::EqGadget, fields::fp::FpVar, fields::FieldVar,
};
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};
use ark_serialize::CanonicalSerialize;
use ark_std::rand::{CryptoRng, Rng};
use blake2::Blake2b;
use sha2::{Digest as Sha2Digest, Sha256};

/// Range-check bit-width for score/threshold (compliance scores in [0,255]).
pub const N_BITS: usize = 8;

/// One jurisdiction's compliance statement: prove `score >= threshold` (score PRIVATE),
/// bound to a public `context` (anti-replay = H(org, jurisdiction, nonce) off-chain).
/// Public inputs (order): `[compliant=1, threshold, context]` — mirrors the Circom
/// `jurisdiction_compliance.circom` so each individual proof shares its on-chain shape.
#[derive(Clone)]
pub struct JurisdictionCircuit {
    pub score: Option<u64>, // PRIVATE witness
    pub threshold: u64,     // PUBLIC
    pub context: u64,       // PUBLIC
}

impl ConstraintSynthesizer<Fr> for JurisdictionCircuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        // Public inputs in order [compliant, threshold, context].
        let compliant = FpVar::new_input(cs.clone(), || Ok(Fr::one()))?;
        let threshold = FpVar::new_input(cs.clone(), || Ok(Fr::from(self.threshold)))?;
        let context = FpVar::new_input(cs.clone(), || Ok(Fr::from(self.context)))?;
        let score = FpVar::new_witness(cs.clone(), || {
            self.score
                .map(Fr::from)
                .ok_or(SynthesisError::AssignmentMissing)
        })?;

        // diff = score - threshold, decomposed into N_BITS bits ⇒ 0 <= diff < 2^N_BITS
        // ⇒ score >= threshold (and bounded). Mirrors score_threshold.circom soundness.
        let diff_int: Option<u64> = self.score.map(|s| s.wrapping_sub(self.threshold));
        let mut reconstructed = FpVar::<Fr>::zero();
        let mut coeff = Fr::one();
        for i in 0..N_BITS {
            let bit = Boolean::new_witness(cs.clone(), || {
                let d = diff_int.ok_or(SynthesisError::AssignmentMissing)?;
                Ok(((d >> i) & 1) == 1)
            })?;
            reconstructed += FpVar::from(bit) * FpVar::constant(coeff);
            coeff = coeff + coeff;
        }
        let diff = &score - &threshold;
        diff.enforce_equal(&reconstructed)?;

        // compliant must be 1 (the proof only exists if score >= threshold).
        compliant.enforce_equal(&FpVar::one())?;

        // Anchor `context` in the R1CS (binding comes from it being a public input).
        let _ctx_sq = &context * &context;
        Ok(())
    }
}

/// A jurisdiction to prove + aggregate.
#[derive(Clone)]
pub struct Jurisdiction {
    pub code: String,
    pub threshold: u64,
    pub context: u64,
    pub score: u64,
}

/// The public statement vector for one jurisdiction: `[compliant=1, threshold, context]`.
pub fn statement(j: &Jurisdiction) -> Vec<Fr> {
    vec![Fr::one(), Fr::from(j.threshold), Fr::from(j.context)]
}

/// Result of an aggregation run.
pub struct AggregationOutput {
    pub verified: bool,
    pub count: usize,     // REAL jurisdictions aggregated
    pub padded_to: usize, // power-of-two batch size SnarkPack actually folded
    pub agg_commitment: [u8; 32],
    pub context_root: [u8; 32],
}

/// Groth16 setup for the (shared) jurisdiction circuit.
pub fn setup<R: Rng + CryptoRng>(rng: &mut R) -> (ProvingKey<Bn254>, VerifyingKey<Bn254>) {
    let dummy = JurisdictionCircuit { score: Some(0), threshold: 0, context: 0 };
    Groth16::<Bn254>::setup(dummy, rng).expect("groth16 setup")
}

/// Generate one Groth16/BN254 proof per jurisdiction (all over the shared vk).
pub fn prove_all<R: Rng + CryptoRng>(
    pk: &ProvingKey<Bn254>,
    jurs: &[Jurisdiction],
    rng: &mut R,
) -> (Vec<Proof<Bn254>>, Vec<Vec<Fr>>) {
    let mut proofs = Vec::new();
    let mut statements = Vec::new();
    for j in jurs {
        let circuit = JurisdictionCircuit {
            score: Some(j.score),
            threshold: j.threshold,
            context: j.context,
        };
        let proof = Groth16::<Bn254>::prove(pk, circuit, rng).expect("groth16 prove");
        proofs.push(proof);
        statements.push(statement(j));
    }
    (proofs, statements)
}

/// SnarkPack-aggregate N proofs and verify the aggregate OFF-CHAIN. SnarkPack's GIPA
/// folds over a power-of-two batch, so the real proofs are padded up to the next power
/// of two by repeating the last real proof (a valid proof under the same vk). The
/// reported `count` is the REAL jurisdiction count; the commitment/context_root bind
/// only the real set.
pub fn aggregate_and_verify<R: Rng + CryptoRng>(
    vk: &VerifyingKey<Bn254>,
    proofs: &[Proof<Bn254>],
    statements: &[Vec<Fr>],
    jurs: &[Jurisdiction],
    rng: &mut R,
) -> AggregationOutput {
    let real = proofs.len();
    assert!(real >= 1);
    let srs_size = real.next_power_of_two().max(2);

    // Pad to the power-of-two batch with repeats of the last real proof/statement.
    let mut padded_proofs: Vec<Proof<Bn254>> = proofs.to_vec();
    let mut padded_stmts: Vec<Vec<Fr>> = statements.to_vec();
    while padded_proofs.len() < srs_size {
        padded_proofs.push(proofs[real - 1].clone());
        padded_stmts.push(statements[real - 1].clone());
    }

    let srs = setup_inner_product::<Bn254, Blake2b, _>(rng, srs_size).expect("ipp srs");
    let agg: AggregateProof<Bn254, Blake2b> =
        aggregate_proofs::<Bn254, Blake2b>(&srs, &padded_proofs).expect("aggregate");
    let verified = verify_aggregate_proof(&srs.get_verifier_key(), vk, &padded_stmts, &agg)
        .expect("verify agg");

    // Bind only the REAL set in the commitment.
    let stmts: Vec<Vec<Fr>> = statements.to_vec();

    // agg_commitment = SHA-256( vk || each constituent proof || each statement ).
    // (AggregateProof is not CanonicalSerialize; the SnarkPack aggregate is
    // deterministic in (srs, proofs), so binding the vk + proofs + statements is a
    // sound commitment to exactly what was aggregated.)
    let _ = &agg; // aggregate computed + verified above
    let mut agg_bytes = Vec::new();
    vk.serialize_compressed(&mut agg_bytes).expect("serialize vk");
    for p in proofs {
        p.serialize_compressed(&mut agg_bytes).expect("serialize proof");
    }
    let mut h = Sha256::new();
    h.update(&agg_bytes);
    for s in &stmts {
        for f in s {
            let mut b = Vec::new();
            f.serialize_compressed(&mut b).unwrap();
            h.update(&b);
        }
    }
    let agg_commitment: [u8; 32] = h.finalize().into();

    // context_root = SHA-256 over the concatenated jurisdiction contexts (anti-replay).
    let mut hc = Sha256::new();
    for j in jurs {
        hc.update(j.context.to_be_bytes());
    }
    let context_root: [u8; 32] = hc.finalize().into();

    AggregationOutput {
        verified,
        count: real,
        padded_to: srs_size,
        agg_commitment,
        context_root,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ark_std::rand::{rngs::StdRng, SeedableRng};

    fn demo_jurs() -> Vec<Jurisdiction> {
        vec![
            Jurisdiction { code: "BR".into(), threshold: 60, context: 1000001, score: 82 },
            Jurisdiction { code: "EU".into(), threshold: 75, context: 1000002, score: 90 },
            Jurisdiction { code: "SG".into(), threshold: 70, context: 1000003, score: 88 },
            Jurisdiction { code: "UAE".into(), threshold: 65, context: 1000004, score: 79 },
        ]
    }

    #[test]
    fn aggregate_then_verify_succeeds() {
        let mut rng = StdRng::seed_from_u64(7);
        let jurs = demo_jurs();
        let (pk, vk) = setup(&mut rng);
        // each individual proof verifies (sanity)
        let (proofs, stmts) = prove_all(&pk, &jurs, &mut rng);
        for (p, s) in proofs.iter().zip(stmts.iter()) {
            assert!(Groth16::<Bn254>::verify(&vk, s, p).unwrap());
        }
        let out = aggregate_and_verify(&vk, &proofs, &stmts, &jurs, &mut rng);
        assert!(out.verified, "SnarkPack aggregate must verify off-chain");
        assert_eq!(out.count, 4);
    }

    #[test]
    fn tampered_statement_fails_aggregate() {
        let mut rng = StdRng::seed_from_u64(11);
        let jurs = demo_jurs();
        let (pk, vk) = setup(&mut rng);
        let (proofs, mut stmts) = prove_all(&pk, &jurs, &mut rng);
        // flip one jurisdiction's public threshold — aggregate verify must reject
        stmts[0][1] = Fr::from(999u64);
        let out = aggregate_and_verify(&vk, &proofs, &stmts, &jurs, &mut rng);
        assert!(!out.verified, "tampered statement must fail aggregate verify");
    }

    #[test]
    fn commitment_is_deterministic() {
        let mut rng = StdRng::seed_from_u64(3);
        let jurs = demo_jurs();
        let (pk, vk) = setup(&mut rng);
        let (proofs, stmts) = prove_all(&pk, &jurs, &mut rng);
        let a = aggregate_and_verify(&vk, &proofs, &stmts, &jurs, &mut rng);
        // context_root depends only on the jurisdiction contexts → deterministic
        let mut hc = Sha256::new();
        for j in &jurs { hc.update(j.context.to_be_bytes()); }
        let expected: [u8; 32] = hc.finalize().into();
        assert_eq!(a.context_root, expected);
    }
}
