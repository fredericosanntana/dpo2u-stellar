#![no_std]
#![allow(deprecated)] // events.publish() works fine; #[contractevent] migration is later
//! DPO2U — `asp-mvp`.
//!
//! An **association-set provider (ASP) MVP**: it admits a `deposit_commitment` only when the
//! canonical `protocol-registry` verifies the backing claim via a fail-closed cross-contract call.
//!
//! FINAL MVP SCOPE AFTER SPRINT 2
//! - The set is **mutable**: members can be inactivated when their backing registry claim no
//!   longer verifies.
//! - `current_root()` is now a **real Merkle root** over the ACTIVE set, recomputed
//!   deterministically in insertion order.
//! - `contains(...)` answers operational membership; `current_root()` enables proof plumbing.
//!
//! HONEST LIMITS
//! - This is NOT yet a privacy pool and NOT a ZK membership proof.
//! - Removal is admin-triggered and grounded in registry invalidation; there is no autonomous watcher.

mod merkle;

use protocol_registry::ProtocolRegistryClient;
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    BytesN, Env, Symbol, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Registry canonical verification returned false at admission time.
    NotVerified = 1,
    /// Removal was requested while the backing claim still verifies.
    StillVerified = 2,
    /// This deposit commitment already has an ASP slot (insert-once even if later inactive).
    AlreadyMember = 3,
    /// Member slot absent or already inactive.
    NotMember = 4,
    /// Caller is not the admin.
    AdminOnly = 5,
    /// Constructor called twice.
    AlreadyInitialized = 6,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Registry,
    Root,
    /// Number of ACTIVE leaves.
    LeafCount,
    /// All commitments ever admitted, in deterministic insertion order.
    Members,
    /// Per-commitment membership record.
    Member(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberRecord {
    pub subject_commitment: BytesN<32>,
    pub claim_type: Symbol,
    pub jurisdiction: Symbol,
    pub attestation_root: BytesN<32>,
    pub active: bool,
    pub added_at: u64,
    /// `0` while active.
    pub removed_at: u64,
}

#[contract]
pub struct AspMvp;

#[contractimpl]
impl AspMvp {
    pub fn __constructor(env: Env, admin: Address, registry: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage()
            .instance()
            .set(&DataKey::Root, &merkle::zero_root(&env));
        env.storage().instance().set(&DataKey::LeafCount, &0u32);
        let members: Vec<BytesN<32>> = Vec::new(&env);
        env.storage().instance().set(&DataKey::Members, &members);
    }

    pub fn add_to_set(
        env: Env,
        submitter: Address,
        deposit_commitment: BytesN<32>,
        subject_commitment: BytesN<32>,
        claim_type: Symbol,
        jurisdiction: Symbol,
        attestation_root: BytesN<32>,
    ) -> u32 {
        submitter.require_auth();

        let registry: Address = env
            .storage()
            .instance()
            .get(&DataKey::Registry)
            .expect("contract not initialized");
        let verified = ProtocolRegistryClient::new(&env, &registry).verify_attestation_proof(
            &subject_commitment,
            &claim_type,
            &jurisdiction,
            &attestation_root,
        );
        if !verified {
            panic_with_error!(&env, Error::NotVerified);
        }

        let member_key = DataKey::Member(deposit_commitment.clone());
        if env.storage().persistent().has(&member_key) {
            panic_with_error!(&env, Error::AlreadyMember);
        }

        let record = MemberRecord {
            subject_commitment,
            claim_type,
            jurisdiction,
            attestation_root,
            active: true,
            added_at: env.ledger().timestamp(),
            removed_at: 0,
        };
        env.storage().persistent().set(&member_key, &record);

        let mut members = Self::member_list(&env);
        members.push_back(deposit_commitment.clone());
        env.storage().instance().set(&DataKey::Members, &members);

        let (root, count) = Self::recompute_state(&env);
        env.storage().instance().set(&DataKey::Root, &root);
        env.storage().instance().set(&DataKey::LeafCount, &count);

        env.events().publish(
            (symbol_short!("add_set"), deposit_commitment),
            (root, count),
        );
        count
    }

    /// Inactivate a member iff its backing registry claim no longer verifies.
    pub fn remove_from_set(env: Env, admin: Address, deposit_commitment: BytesN<32>) -> u32 {
        admin.require_auth();
        Self::assert_admin(&env, &admin);

        let member_key = DataKey::Member(deposit_commitment.clone());
        let mut record: MemberRecord = match env.storage().persistent().get(&member_key) {
            Some(r) => r,
            None => panic_with_error!(&env, Error::NotMember),
        };
        if !record.active {
            panic_with_error!(&env, Error::NotMember);
        }

        let registry: Address = env
            .storage()
            .instance()
            .get(&DataKey::Registry)
            .expect("contract not initialized");
        let still_verified = ProtocolRegistryClient::new(&env, &registry).verify_attestation_proof(
            &record.subject_commitment,
            &record.claim_type,
            &record.jurisdiction,
            &record.attestation_root,
        );
        if still_verified {
            panic_with_error!(&env, Error::StillVerified);
        }

        record.active = false;
        record.removed_at = env.ledger().timestamp();
        env.storage().persistent().set(&member_key, &record);

        let (root, count) = Self::recompute_state(&env);
        env.storage().instance().set(&DataKey::Root, &root);
        env.storage().instance().set(&DataKey::LeafCount, &count);

        env.events()
            .publish((symbol_short!("rm_set"), deposit_commitment), (root, count));
        count
    }

    pub fn contains(env: Env, deposit_commitment: BytesN<32>) -> bool {
        match env
            .storage()
            .persistent()
            .get::<DataKey, MemberRecord>(&DataKey::Member(deposit_commitment))
        {
            Some(record) => record.active,
            None => false,
        }
    }

    pub fn current_root(env: Env) -> BytesN<32> {
        env.storage()
            .instance()
            .get(&DataKey::Root)
            .unwrap_or_else(|| merkle::zero_root(&env))
    }

    pub fn leaf_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::LeafCount)
            .unwrap_or(0)
    }

    pub fn registry(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Registry)
            .expect("contract not initialized")
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized")
    }

    pub fn get_member(env: Env, deposit_commitment: BytesN<32>) -> Option<MemberRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Member(deposit_commitment))
    }

    fn member_list(env: &Env) -> Vec<BytesN<32>> {
        env.storage()
            .instance()
            .get(&DataKey::Members)
            .unwrap_or_else(|| Vec::new(env))
    }

    fn active_commitments(env: &Env) -> Vec<BytesN<32>> {
        let all = Self::member_list(env);
        let mut active: Vec<BytesN<32>> = Vec::new(env);
        for commitment in all.iter() {
            let key = DataKey::Member(commitment.clone());
            let record: Option<MemberRecord> = env.storage().persistent().get(&key);
            if let Some(member) = record {
                if member.active {
                    active.push_back(commitment);
                }
            }
        }
        active
    }

    fn recompute_state(env: &Env) -> (BytesN<32>, u32) {
        let active = Self::active_commitments(env);
        let count = active.len();
        let root = merkle::build_root(env, &active);
        (root, count)
    }

    fn assert_admin(env: &Env, claimed_admin: &Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized");
        if claimed_admin != &admin {
            panic_with_error!(env, Error::AdminOnly);
        }
    }
}

#[cfg(test)]
mod test;
