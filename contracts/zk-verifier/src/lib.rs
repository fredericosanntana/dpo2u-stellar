#![no_std]
//! DPO2U — verificador Groth16 sobre BLS12-381, on-chain no Soroban.
//!
//! É o substrato da Fase 2 do roadmap: preservar "score privado, prova pública"
//! no Stellar. O detentor prova off-chain um enunciado — ex.: "meu score de
//! conformidade ≥ threshold" — sem revelar o score; este contrato verifica a
//! prova on-chain. O score nunca toca a chain; só a prova e os sinais públicos.
//!
//! O Soroban não tem o precompile BN254 do Solana, mas o Protocol 22 (CAP-0059)
//! adicionou host functions BLS12-381 — `env.crypto().bls12_381()` — sobre as
//! quais a equação de Groth16 é checada nativamente. Budget medido: ~41M de 100M
//! CPU para uma prova com 1 sinal público (cada sinal extra ≈ +2,5M).
//!
//! A lógica de verificação é a equação canônica de Groth16. Para produção, o
//! contrato ainda exige auditoria de segurança e uma cerimônia de trusted setup
//! por circuito (ver docs/2026-05-21-soroban-zk-spike.md).

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bls12_381::{Fr, G1Affine, G2Affine},
    vec, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ZkError {
    /// Nº de sinais públicos não bate com a verifying key (|ic| = |pub| + 1).
    MalformedVerifyingKey = 1,
}

/// Verifying key Groth16 (gerada na trusted setup, por circuito).
#[derive(Clone)]
#[contracttype]
pub struct VerificationKey {
    pub alpha: G1Affine,
    pub beta: G2Affine,
    pub gamma: G2Affine,
    pub delta: G2Affine,
    /// Coeficientes dos sinais públicos: ic[0] = constante, ic[i+1] = sinal i.
    pub ic: Vec<G1Affine>,
}

/// Prova Groth16 (gerada off-chain pelo prover — ver zk-prover/).
#[derive(Clone)]
#[contracttype]
pub struct Proof {
    pub a: G1Affine,
    pub b: G2Affine,
    pub c: G1Affine,
}

#[contract]
pub struct ZkVerifier;

#[contractimpl]
impl ZkVerifier {
    /// Verifica uma prova Groth16/BLS12-381 contra `vk` e os sinais públicos.
    ///
    /// `true` ⇒ a prova é válida: o prover conhece um witness que satisfaz o
    /// circuito da `vk` para esses `pub_signals` — sem revelar o witness.
    ///
    /// No uso DPO2U, `pub_signals` carrega o `threshold` e o compromisso da
    /// atestação; o `score` é witness privado e nunca aparece on-chain.
    pub fn verify_proof(
        env: Env,
        vk: VerificationKey,
        proof: Proof,
        pub_signals: Vec<Fr>,
    ) -> Result<bool, ZkError> {
        let bls = env.crypto().bls12_381();

        // vk_x = ic[0] + Σ pub_signals[i] · ic[i+1]  (MSM em G1).
        if pub_signals.len() + 1 != vk.ic.len() {
            return Err(ZkError::MalformedVerifyingKey);
        }
        let mut vk_x = vk.ic.get(0).unwrap();
        for (s, v) in pub_signals.iter().zip(vk.ic.iter().skip(1)) {
            let prod = bls.g1_mul(&v, &s);
            vk_x = bls.g1_add(&vk_x, &prod);
        }

        // Equação de Groth16:
        //   e(-A, B) · e(alpha, beta) · e(vk_x, gamma) · e(C, delta) == 1
        let neg_a = -proof.a;
        let vp1 = vec![&env, neg_a, vk.alpha, vk_x, proof.c];
        let vp2 = vec![&env, proof.b, vk.beta, vk.gamma, vk.delta];

        Ok(bls.pairing_check(vp1, vp2))
    }
}

mod test;
mod test_ceremony;
