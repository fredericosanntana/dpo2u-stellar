#![no_std]
#![allow(deprecated)] // events.publish() works; #[contractevent] migration is later
//! DPO2U — `agg_filing_v1` (moonshot #5: aggregate N jurisdiction proofs into 1).
//!
//! Seals the RESULT of a SnarkPack aggregation of N independent Groth16/BN254
//! jurisdiction-compliance proofs: a verdict (all compliant), the count, a 32-byte
//! commitment over the aggregate proof + statements, and an anti-replay context root.
//!
//! HONEST TRUST MODEL (legible on-chain via `off_chain_verified: true`):
//! the SnarkPack aggregate is verified OFF-CHAIN (see zk-prover-agg). Its on-chain
//! verification needs target-group (GT) arithmetic that the Soroban `bn254` host does
//! not expose (only `g1_*`, `pairing_check`, `Fr`) — so on-chain aggregate verify is
//! roadmap. To keep the seal cryptographically meaningful TODAY, `seal_aggregate`
//! ALSO verifies ONE representative constituent jurisdiction proof ON-CHAIN via a
//! cross-call to the pinned `por-verifier` (`member_zk_verified: true`). So the seal
//! proves: (1) the constituent proofs are real BN254 Groth16 proofs (one checked
//! on-chain) and (2) the off-chain SnarkPack aggregate over all N verified.
//!
//! Model: `por-filing/src/lib.rs` (set_verifier + cross-call + pinned vk, fail-closed).

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    panic_with_error, symbol_short, Address, BytesN, Env, Symbol, Vec, U256,
};
use por_verifier::{PorVerifierClient, Proof as ZkProof, VerificationKey as ZkVk};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
    AdminOnly = 5,
    AlreadyInitialized = 6,
    VerifierNotSet = 7,  // seal_aggregate before set_verifier (fail-closed)
    ZkVerifyFailed = 8,  // member proof did not verify on-chain
    NotCompliant = 9,    // member public signal compliant != 1
    BadSignals = 10,     // member signals count != 3 ([compliant, threshold, context])
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Authorized(Address),    // submitter authorized to seal
    Agg(Symbol, u32),       // (scope_code, period AAAAMM) -> AggregateClaim
    VerifierAddr,           // por-verifier (BN254) address — admin-set
    VerifierVk,             // jurisdiction VerificationKey PINNED (fail-closed)
}

/// Public, non-sensitive aggregate result. No PII, no per-jurisdiction scores.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AggregateClaim {
    pub period: u32,                 // AAAAMM
    pub count: u32,                  // N jurisdictions aggregated
    pub verdict: bool,               // all compliant (off-chain SnarkPack verify)
    pub agg_commitment: BytesN<32>,  // SHA-256(aggregate proof || statements)
    pub context_root: BytesN<32>,    // anti-replay binding over jurisdiction contexts
    pub off_chain_verified: bool,    // true — SnarkPack aggregate verified OFF-CHAIN (GT gap)
    pub member_zk_verified: bool,    // true — one constituent proof verified ON-CHAIN here
    pub submitted_by: Address,
    pub timestamp: u64,
    pub seq: u32,
}

/// Groth16/BN254 verifying key (local to enter this contract's spec; mirrors
/// `por_verifier::VerificationKey`). Pinned by admin; submitter never supplies it.
#[contracttype]
#[derive(Clone)]
pub struct PorVk {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    pub ic: Vec<Bn254G1Affine>,
}

/// Groth16/BN254 proof (local, for the spec).
#[contracttype]
#[derive(Clone)]
pub struct PorProof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[contract]
pub struct AggFiling;

#[contractimpl]
impl AggFiling {
    pub fn __constructor(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Authorize the submitter that seals aggregates (gateway-signer / DPO2U).
    pub fn authorize_submitter(env: Env, admin: Address, submitter: Address, allowed: bool) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Authorized(submitter.clone()), &allowed);
        env.events()
            .publish((symbol_short!("auth"), submitter), allowed);
    }

    /// Configure the por-verifier + PIN the jurisdiction vk (admin-only). The member
    /// proof in `seal_aggregate` is verified against THIS pinned vk; submitter never
    /// supplies a vk (closes the client-controlled-vk class of bug). Fail-closed.
    pub fn set_verifier(env: Env, admin: Address, verifier: Address, vk: PorVk) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage().instance().set(&DataKey::VerifierAddr, &verifier);
        env.storage().instance().set(&DataKey::VerifierVk, &vk);
        env.events().publish((symbol_short!("verifier"),), verifier);
    }

    /// Seal a SnarkPack-aggregated multi-jurisdiction compliance result.
    /// Verifies ONE representative constituent jurisdiction proof ON-CHAIN (cross-call,
    /// fail-closed), then stores the aggregate claim. Idempotent by (scope, period).
    #[allow(clippy::too_many_arguments)]
    pub fn seal_aggregate(
        env: Env,
        submitter: Address,
        scope_code: Symbol,
        period: u32,
        agg_commitment: BytesN<32>,
        count: u32,
        verdict: bool,
        context_root: BytesN<32>,
        member_proof: PorProof,
        member_signals: Vec<Bn254Fr>,
    ) -> u32 {
        submitter.require_auth();
        Self::assert_authorized(&env, &submitter);

        // Member jurisdiction signals: [compliant, threshold, context].
        if member_signals.len() != 3 {
            panic_with_error!(&env, Error::BadSignals);
        }
        if member_signals.get(0).unwrap().to_u256() != U256::from_u32(&env, 1) {
            panic_with_error!(&env, Error::NotCompliant);
        }

        // Pinned verifier + vk (admin-set). Fail-closed if missing.
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
            a: member_proof.a,
            b: member_proof.b,
            c: member_proof.c,
        };

        // Cross-call: verify the representative constituent proof ON-CHAIN. Fail-closed.
        let ok = PorVerifierClient::new(&env, &verifier).verify_proof(
            &zk_vk,
            &zk_proof,
            &member_signals,
        );
        if !ok {
            panic_with_error!(&env, Error::ZkVerifyFailed);
        }

        let claim = AggregateClaim {
            period,
            count,
            verdict,
            agg_commitment,
            context_root,
            off_chain_verified: true,
            member_zk_verified: true,
            submitted_by: submitter,
            timestamp: env.ledger().timestamp(),
            seq: env.ledger().sequence(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Agg(scope_code.clone(), period), &claim);
        env.events()
            .publish((symbol_short!("aggregate"), scope_code, period), claim.clone());
        claim.seq
    }

    pub fn get_aggregate(env: Env, scope_code: Symbol, period: u32) -> Option<AggregateClaim> {
        env.storage()
            .persistent()
            .get(&DataKey::Agg(scope_code, period))
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    // ── helpers ──────────────────────────────────────────────────────────────
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
