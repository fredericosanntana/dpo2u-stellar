#![no_std]
#![allow(deprecated)]
//! DPO2U — bounded selective-disclosure helper.
//!
//! This contract does NOT store or decrypt sensitive payloads on-chain.
//! It only records an authorized disclosure grant that is:
//! - bound to a canonical registry statement,
//! - bound to an off-chain payload hash,
//! - scoped to one reviewer,
//! - fail-closed if the backing registry verification stops being true.

use protocol_registry::ProtocolRegistryClient;
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    BytesN, Env, Symbol,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
    GrantExists = 2,
    GrantNotFound = 3,
    InvalidExpiry = 4,
    AdminOnly = 5,
    AlreadyInitialized = 6,
    RegistryVerifyFailed = 7,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    RegistryAddr,
    AuthorizedOperator(Address),
    Grant(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisclosureGrant {
    pub reviewer: Address,
    pub issued_by: Address,
    pub subject_commitment: BytesN<32>,
    pub claim_type: Symbol,
    pub jurisdiction: Symbol,
    pub attestation_root: BytesN<32>,
    pub disclosed_payload_hash: BytesN<32>,
    pub active: bool,
    /// Unix-seconds expiry. `0` = no expiry.
    pub valid_until: u64,
    pub issued_at: u64,
    pub seq: u32,
}

#[contract]
pub struct DisclosureHelper;

#[contractimpl]
impl DisclosureHelper {
    pub fn __constructor(env: Env, admin: Address, registry: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::RegistryAddr, &registry);
    }

    pub fn authorize_operator(env: Env, admin: Address, operator: Address, allowed: bool) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage()
            .instance()
            .set(&DataKey::AuthorizedOperator(operator.clone()), &allowed);
        env.events()
            .publish((symbol_short!("auth"), operator), allowed);
    }

    pub fn issue_grant(
        env: Env,
        operator: Address,
        grant_id: BytesN<32>,
        reviewer: Address,
        subject_commitment: BytesN<32>,
        claim_type: Symbol,
        jurisdiction: Symbol,
        attestation_root: BytesN<32>,
        disclosed_payload_hash: BytesN<32>,
        valid_until: u64,
    ) -> u32 {
        operator.require_auth();
        Self::assert_operator(&env, &operator);

        if valid_until != 0 && valid_until <= env.ledger().timestamp() {
            panic_with_error!(&env, Error::InvalidExpiry);
        }
        let key = DataKey::Grant(grant_id.clone());
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, Error::GrantExists);
        }
        if !Self::registry_verify(
            &env,
            &subject_commitment,
            &claim_type,
            &jurisdiction,
            &attestation_root,
        ) {
            panic_with_error!(&env, Error::RegistryVerifyFailed);
        }

        let grant = DisclosureGrant {
            reviewer: reviewer.clone(),
            issued_by: operator,
            subject_commitment,
            claim_type: claim_type.clone(),
            jurisdiction: jurisdiction.clone(),
            attestation_root: attestation_root.clone(),
            disclosed_payload_hash: disclosed_payload_hash.clone(),
            active: true,
            valid_until,
            issued_at: env.ledger().timestamp(),
            seq: env.ledger().sequence(),
        };
        env.storage().persistent().set(&key, &grant);
        env.events().publish(
            (symbol_short!("grant"), reviewer, claim_type, jurisdiction),
            (grant_id, attestation_root, disclosed_payload_hash),
        );
        grant.seq
    }

    pub fn revoke_grant(env: Env, caller: Address, grant_id: BytesN<32>) {
        caller.require_auth();
        let key = DataKey::Grant(grant_id.clone());
        let mut grant: DisclosureGrant = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, Error::GrantNotFound));

        let admin = Self::admin(env.clone());
        if caller != admin && caller != grant.issued_by {
            panic_with_error!(&env, Error::NotAuthorized);
        }

        grant.active = false;
        env.storage().persistent().set(&key, &grant);
        env.events()
            .publish((symbol_short!("revoke"), grant_id), caller);
    }

    pub fn get_grant(env: Env, grant_id: BytesN<32>) -> Option<DisclosureGrant> {
        env.storage().persistent().get(&DataKey::Grant(grant_id))
    }

    pub fn can_review(env: Env, grant_id: BytesN<32>, reviewer: Address) -> bool {
        let grant: DisclosureGrant = match env.storage().persistent().get(&DataKey::Grant(grant_id)) {
            Some(g) => g,
            None => return false,
        };

        if !grant.active || grant.reviewer != reviewer {
            return false;
        }
        if grant.valid_until != 0 && grant.valid_until <= env.ledger().timestamp() {
            return false;
        }

        Self::registry_verify(
            &env,
            &grant.subject_commitment,
            &grant.claim_type,
            &grant.jurisdiction,
            &grant.attestation_root,
        )
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn registry(env: Env) -> Address {
        env.storage().instance().get(&DataKey::RegistryAddr).unwrap()
    }

    fn assert_admin(env: &Env, who: &Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if admin != *who {
            panic_with_error!(env, Error::AdminOnly);
        }
    }

    fn assert_operator(env: &Env, operator: &Address) {
        let ok: bool = env
            .storage()
            .instance()
            .get(&DataKey::AuthorizedOperator(operator.clone()))
            .unwrap_or(false);
        if !ok {
            panic_with_error!(env, Error::NotAuthorized);
        }
    }

    fn registry_verify(
        env: &Env,
        subject_commitment: &BytesN<32>,
        claim_type: &Symbol,
        jurisdiction: &Symbol,
        attestation_root: &BytesN<32>,
    ) -> bool {
        let registry: Address = env.storage().instance().get(&DataKey::RegistryAddr).unwrap();
        ProtocolRegistryClient::new(env, &registry).verify_attestation_proof(
            subject_commitment,
            claim_type,
            jurisdiction,
            attestation_root,
        )
    }
}

mod test;
