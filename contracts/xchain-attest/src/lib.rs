#![no_std]
#![allow(deprecated)] // events.publish() works; #[contractevent] migration is later
//! DPO2U — `xchain_attest_v1` (moonshot #6-C: private cross-chain bridge).
//!
//! Verifies a Groth16/BN254 proof that ORIGINATED on another (EVM) chain and was
//! carried here by a relayer, then attests the cross-chain verification on Stellar.
//! BN254 mirrors Ethereum's precompile curve, so a proof minted in the EVM world
//! verifies natively on Soroban (`env.crypto().bn254()`) — the proof bytes are the
//! same field elements, just re-encoded (G2 c1-first = EVM convention).
//!
//! TRUST MODEL (legible on-chain via `relayed_by`): this attests verification done
//! by a RELAYER (a trusted courier that transports the proof from chain A to Stellar).
//! It is NOT a trustless light-client bridge — there is no EVM state proof. What IS
//! trustless is the *verification*: the Groth16/BN254 check runs on-chain on Soroban
//! against a PINNED vk (fail-closed). So: trust the relayer to deliver the bytes;
//! do NOT trust it about validity — the chain re-verifies.
//!
//! Model: `por-filing::seal_solvency` (set_verifier + cross-call + pinned vk).

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    panic_with_error, symbol_short, Address, BytesN, Env, Symbol, Vec,
};
use por_verifier::{PorVerifierClient, Proof as ZkProof, VerificationKey as ZkVk};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
    AdminOnly = 5,
    AlreadyInitialized = 6,
    VerifierNotSet = 7, // verify_and_attest before set_verifier (fail-closed)
    ZkVerifyFailed = 8, // relayed proof did not verify on-chain
    BadSignals = 10,    // signals count != 3
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Authorized(Address),       // relayer authorized to submit
    Claim(Symbol, BytesN<32>), // (origin_chain, proof_context) -> CrossChainClaim
    VerifierAddr,
    VerifierVk,
}

/// On-chain record that a proof from another chain was verified on Stellar.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CrossChainClaim {
    pub origin_chain: Symbol,       // e.g. "baseSepol" / "anvil"
    pub proof_context: BytesN<32>,  // public anti-replay context signal
    pub zk_verified: bool,          // true — Groth16/BN254 verified ON-CHAIN here
    pub relayed_by: Address,        // the relayer (trust = transport only)
    pub timestamp: u64,
    pub seq: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct PorVk {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    pub ic: Vec<Bn254G1Affine>,
}

#[contracttype]
#[derive(Clone)]
pub struct PorProof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[contract]
pub struct XChainAttest;

#[contractimpl]
impl XChainAttest {
    pub fn __constructor(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn authorize_submitter(env: Env, admin: Address, submitter: Address, allowed: bool) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Authorized(submitter.clone()), &allowed);
        env.events()
            .publish((symbol_short!("auth"), submitter), allowed);
    }

    /// Configure the por-verifier + PIN the vk for the origin circuit (admin-only).
    pub fn set_verifier(env: Env, admin: Address, verifier: Address, vk: PorVk) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage().instance().set(&DataKey::VerifierAddr, &verifier);
        env.storage().instance().set(&DataKey::VerifierVk, &vk);
        env.events().publish((symbol_short!("verifier"),), verifier);
    }

    /// Verify a proof relayed from `origin_chain` ON-CHAIN (cross-call, fail-closed)
    /// and attest the cross-chain verification. Idempotent by (origin_chain, context).
    pub fn verify_and_attest(
        env: Env,
        submitter: Address,
        origin_chain: Symbol,
        proof: PorProof,
        pub_signals: Vec<Bn254Fr>,
    ) -> u32 {
        submitter.require_auth();
        Self::assert_authorized(&env, &submitter);

        if pub_signals.len() != 3 {
            panic_with_error!(&env, Error::BadSignals);
        }

        let verifier: Address = match env.storage().instance().get(&DataKey::VerifierAddr) {
            Some(a) => a,
            None => panic_with_error!(&env, Error::VerifierNotSet),
        };
        let vk: PorVk = match env.storage().instance().get(&DataKey::VerifierVk) {
            Some(v) => v,
            None => panic_with_error!(&env, Error::VerifierNotSet),
        };

        let zk_vk = ZkVk {
            alpha: vk.alpha,
            beta: vk.beta,
            gamma: vk.gamma,
            delta: vk.delta,
            ic: vk.ic,
        };
        let zk_proof = ZkProof {
            a: proof.a,
            b: proof.b,
            c: proof.c,
        };

        // Trustless re-verification of the relayed proof, on-chain. Fail-closed.
        let ok = PorVerifierClient::new(&env, &verifier).verify_proof(&zk_vk, &zk_proof, &pub_signals);
        if !ok {
            panic_with_error!(&env, Error::ZkVerifyFailed);
        }

        let proof_context: BytesN<32> = pub_signals.get(2).unwrap().to_bytes();
        let claim = CrossChainClaim {
            origin_chain: origin_chain.clone(),
            proof_context: proof_context.clone(),
            zk_verified: true,
            relayed_by: submitter,
            timestamp: env.ledger().timestamp(),
            seq: env.ledger().sequence(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Claim(origin_chain.clone(), proof_context.clone()), &claim);
        env.events()
            .publish((symbol_short!("xchain"), origin_chain, proof_context), claim.clone());
        claim.seq
    }

    pub fn get_claim(env: Env, origin_chain: Symbol, proof_context: BytesN<32>) -> Option<CrossChainClaim> {
        env.storage()
            .persistent()
            .get(&DataKey::Claim(origin_chain, proof_context))
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    fn assert_admin(env: &Env, who: &Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != *who {
            panic_with_error!(env, Error::AdminOnly);
        }
    }

    fn assert_authorized(env: &Env, submitter: &Address) {
        let ok: bool = env
            .storage()
            .instance()
            .get(&DataKey::Authorized(submitter.clone()))
            .unwrap_or(false);
        if !ok {
            panic_with_error!(env, Error::NotAuthorized);
        }
    }
}

mod test;
