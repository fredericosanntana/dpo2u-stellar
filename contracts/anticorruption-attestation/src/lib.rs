#![no_std]
#![allow(deprecated)] // events.publish() works fine; #[contractevent] migration is v0.2
//! DPO2U Anti-corruption Pilot — Attestation Registry
//!
//! Minimal, immutable Soroban contract that persists compliance attestations
//! emitted by an off-chain MCP predicate engine. No PII on-chain.
//!
//! Reference: DPO2U_PRD_Piloto_Anticorrupcao_v0.2 (see `docs/`).

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    BytesN, Env, Symbol,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
    UseCaseInactive = 2,
    AttestationExists = 3,
    AttestationNotFound = 4,
    AdminOnly = 5,
    AlreadyInitialized = 6,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    UseCaseConfig(Symbol),
    Authorized(Address),
    Attestation(Symbol, BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Verdict {
    Pass,
    Fail,
    Review,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UseCaseConfig {
    pub active: bool,
    pub predicate_set: Symbol,
    pub predicate_version: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AttestationRecord {
    pub verdict: Verdict,
    pub predicate_set: Symbol,
    pub predicate_version: u32,
    pub submitted_by: Address,
    pub timestamp: u64,
    pub metadata_hash: BytesN<32>,
}

#[contract]
pub struct AntiCorruptionAttestation;

#[contractimpl]
impl AntiCorruptionAttestation {
    pub fn __constructor(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn configure_use_case(
        env: Env,
        admin: Address,
        use_case_id: Symbol,
        config: UseCaseConfig,
    ) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::UseCaseConfig(use_case_id.clone()), &config);
        env.events()
            .publish((symbol_short!("config"), use_case_id), config);
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

    pub fn register_attestation(
        env: Env,
        submitter: Address,
        use_case_id: Symbol,
        verdict: Verdict,
        evidence_hash: BytesN<32>,
        metadata_hash: BytesN<32>,
    ) -> u32 {
        submitter.require_auth();

        let authorized: bool = env
            .storage()
            .instance()
            .get(&DataKey::Authorized(submitter.clone()))
            .unwrap_or(false);
        if !authorized {
            panic_with_error!(&env, Error::NotAuthorized);
        }

        let config: UseCaseConfig = match env
            .storage()
            .instance()
            .get(&DataKey::UseCaseConfig(use_case_id.clone()))
        {
            Some(c) => c,
            None => panic_with_error!(&env, Error::UseCaseInactive),
        };
        if !config.active {
            panic_with_error!(&env, Error::UseCaseInactive);
        }

        let key = DataKey::Attestation(use_case_id.clone(), evidence_hash.clone());
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, Error::AttestationExists);
        }

        let record = AttestationRecord {
            verdict,
            predicate_set: config.predicate_set,
            predicate_version: config.predicate_version,
            submitted_by: submitter,
            timestamp: env.ledger().timestamp(),
            metadata_hash,
        };

        env.storage().persistent().set(&key, &record);

        env.events().publish(
            (symbol_short!("attest"), use_case_id, evidence_hash),
            record,
        );

        env.ledger().sequence()
    }

    pub fn verify_attestation(
        env: Env,
        use_case_id: Symbol,
        evidence_hash: BytesN<32>,
    ) -> Option<AttestationRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Attestation(use_case_id, evidence_hash))
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized")
    }

    fn assert_admin(env: &Env, claimed_admin: &Address) {
        let admin: Address = match env.storage().instance().get(&DataKey::Admin) {
            Some(a) => a,
            None => panic_with_error!(env, Error::AdminOnly),
        };
        if claimed_admin != &admin {
            panic_with_error!(env, Error::AdminOnly);
        }
    }
}

#[cfg(test)]
mod test;
