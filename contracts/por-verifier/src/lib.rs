#![no_std]
//! DPO2U — verificador Groth16 sobre **BN254** (alt_bn128), on-chain no Soroban.
//!
//! Sucessor do `zk-verifier` (BLS12-381). Preserva "solvência pública, posições
//! privadas": o emissor prova off-chain `Σ reservas ≥ Σ obrigações` (circuito
//! `zk-prover/por/por_solvency.circom`) sem revelar saldos; este contrato verifica
//! a prova on-chain. Saldos nunca tocam a chain — só a prova e os sinais públicos
//! `[solvent, commit, context]`.
//!
//! Usa as host functions BN254 do Protocol 25 (X-Ray) / Protocol 26 (Yardstick) —
//! `env.crypto().bn254()` — incluindo `g1_msm` (multi-scalar multiplication, P26)
//! para computar `vk_x`. Pontos no formato Ethereum-compatible (be(X)||be(Y) em G1;
//! be(c1)||be(c0) por coord Fp2 em G2) = o default do snarkjs/Circom (bn128).
//!
//! Produção ainda exige auditoria de segurança e uma cerimônia de trusted-setup
//! multi-party por circuito (ver scripts/zk-ceremony/).

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    vec, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ZkError {
    /// Nº de sinais públicos não bate com a verifying key (|ic| = |pub| + 1).
    MalformedVerifyingKey = 1,
}

/// Verifying key Groth16/BN254 (gerada na trusted setup, por circuito).
#[derive(Clone)]
#[contracttype]
pub struct VerificationKey {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    /// Coeficientes dos sinais públicos: ic[0] = constante, ic[i+1] = sinal i.
    pub ic: Vec<Bn254G1Affine>,
}

/// Prova Groth16/BN254 (gerada off-chain — ver zk-prover/por/).
#[derive(Clone)]
#[contracttype]
pub struct Proof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[contract]
pub struct PorVerifier;

#[contractimpl]
impl PorVerifier {
    /// Verifica uma prova Groth16/BN254 contra `vk` e os sinais públicos.
    ///
    /// `true` ⇒ o prover conhece um witness que satisfaz o circuito da `vk` para
    /// esses `pub_signals` — sem revelar o witness. No uso PoR, `pub_signals` =
    /// `[solvent, commit, context]`; reservas/obrigações são witness privado.
    pub fn verify_proof(
        env: Env,
        vk: VerificationKey,
        proof: Proof,
        pub_signals: Vec<Bn254Fr>,
    ) -> Result<bool, ZkError> {
        let bn = env.crypto().bn254();

        // |ic| = |pub| + 1, senão a vk está malformada para esses sinais.
        if pub_signals.len() + 1 != vk.ic.len() {
            return Err(ZkError::MalformedVerifyingKey);
        }

        // vk_x = ic[0] + Σ pub_signals[i]·ic[i+1]  (MSM em G1 — host fn do P26).
        let ic0 = vk.ic.get(0).unwrap();
        let mut ic_rest: Vec<Bn254G1Affine> = vec![&env];
        let mut i = 1;
        while i < vk.ic.len() {
            ic_rest.push_back(vk.ic.get(i).unwrap());
            i += 1;
        }
        let vk_x = if ic_rest.is_empty() {
            ic0
        } else {
            let msm = bn.g1_msm(ic_rest, pub_signals);
            bn.g1_add(&ic0, &msm)
        };

        // Equação de Groth16:
        //   e(-A, B) · e(alpha, beta) · e(vk_x, gamma) · e(C, delta) == 1
        let neg_a = -proof.a;
        let vp1 = vec![&env, neg_a, vk.alpha, vk_x, proof.c];
        let vp2 = vec![&env, proof.b, vk.beta, vk.gamma, vk.delta];

        Ok(bn.pairing_check(vp1, vp2))
    }
}

mod test;
