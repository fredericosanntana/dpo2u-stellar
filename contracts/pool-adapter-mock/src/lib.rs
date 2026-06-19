#![no_std]
#![allow(deprecated)] // events.publish() works fine; #[contractevent] migration is later
//! DPO2U — `pool-adapter-mock`.
//!
//! A **mock pool adapter** that proves the final link of the protocol thesis:
//! **registry → ASP → pool-adapter**.
//!
//! FINAL MVP SCOPE AFTER SPRINT 2
//! - Path A: `execute_if_member(...)` still gates by a fail-closed cross-contract
//!   `asp.contains(...)` call.
//! - Path B: `execute_with_membership_proof(...)` consumes a plain Merkle membership proof
//!   against the ASP's current root, proving the first real proof-plumbing layer.
//!
//! HONEST LIMITS
//! - This is still NOT a real pool, NOT anonymity, and NOT a ZK proof.
//! - The proof is a plain Merkle path against the ASP root; there is no nullifier logic beyond
//!   the mock spend-once guard.

use asp_mvp::AspMvpClient;
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    Bytes, BytesN, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The ASP's `contains(...)` returned `false` — the action is fail-closed (no membership).
    NotMember = 1,
    /// The supplied Merkle proof does not reconstruct the ASP's current root.
    InvalidProof = 2,
    /// This `deposit_commitment` was already released. Mock spend-once guard (NOT a nullifier).
    AlreadyExecuted = 3,
    /// Constructor called twice.
    AlreadyInitialized = 6,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Asp,
    Executed(BytesN<32>),
    ExecCount,
}

#[contract]
pub struct PoolAdapterMock;

#[contractimpl]
impl PoolAdapterMock {
    pub fn __constructor(env: Env, admin: Address, asp: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Asp, &asp);
        env.storage().instance().set(&DataKey::ExecCount, &0u32);
    }

    /// Release the symbolic pool action iff the ASP currently reports membership.
    pub fn execute_if_member(env: Env, user: Address, deposit_commitment: BytesN<32>) -> u32 {
        user.require_auth();
        let asp = Self::asp(env.clone());
        let is_member = AspMvpClient::new(&env, &asp).contains(&deposit_commitment);
        if !is_member {
            panic_with_error!(&env, Error::NotMember);
        }
        Self::record_release(&env, user, deposit_commitment)
    }

    /// Release the symbolic pool action iff the supplied Merkle path reconstructs the ASP's
    /// current authenticated root.
    pub fn execute_with_membership_proof(
        env: Env,
        user: Address,
        deposit_commitment: BytesN<32>,
        siblings: Vec<BytesN<32>>,
        index: u32,
    ) -> u32 {
        user.require_auth();
        let asp = Self::asp(env.clone());
        let root = AspMvpClient::new(&env, &asp).current_root();
        if !Self::verify_membership_proof(
            env.clone(),
            deposit_commitment.clone(),
            siblings,
            index,
            root,
        ) {
            panic_with_error!(&env, Error::InvalidProof);
        }
        Self::record_release(&env, user, deposit_commitment)
    }

    /// Read-only gate via the ASP's membership oracle.
    pub fn can_execute(env: Env, deposit_commitment: BytesN<32>) -> bool {
        let asp = Self::asp(env.clone());
        AspMvpClient::new(&env, &asp).contains(&deposit_commitment)
    }

    /// Read-only gate via proof verification against the ASP's current root.
    pub fn can_execute_with_proof(
        env: Env,
        deposit_commitment: BytesN<32>,
        siblings: Vec<BytesN<32>>,
        index: u32,
    ) -> bool {
        let asp = Self::asp(env.clone());
        let root = AspMvpClient::new(&env, &asp).current_root();
        Self::verify_membership_proof(env, deposit_commitment, siblings, index, root)
    }

    pub fn verify_membership_proof(
        env: Env,
        deposit_commitment: BytesN<32>,
        siblings: Vec<BytesN<32>>,
        mut index: u32,
        expected_root: BytesN<32>,
    ) -> bool {
        let mut hash = Self::hash_leaf(&env, &deposit_commitment);
        for sibling in siblings.iter() {
            hash = if index % 2 == 0 {
                Self::hash_node(&env, &hash, &sibling)
            } else {
                Self::hash_node(&env, &sibling, &hash)
            };
            index /= 2;
        }
        hash == expected_root
    }

    pub fn has_executed(env: Env, deposit_commitment: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Executed(deposit_commitment))
            .unwrap_or(false)
    }

    pub fn exec_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ExecCount)
            .unwrap_or(0)
    }

    pub fn asp(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Asp)
            .expect("contract not initialized")
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized")
    }

    fn record_release(env: &Env, user: Address, deposit_commitment: BytesN<32>) -> u32 {
        let exec_key = DataKey::Executed(deposit_commitment.clone());
        if env.storage().persistent().has(&exec_key) {
            panic_with_error!(env, Error::AlreadyExecuted);
        }
        env.storage().persistent().set(&exec_key, &true);

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ExecCount)
            .unwrap_or(0)
            + 1;
        env.storage().instance().set(&DataKey::ExecCount, &count);
        env.events().publish(
            (symbol_short!("released"), deposit_commitment),
            (user, count),
        );
        count
    }

    fn hash_leaf(env: &Env, commitment: &BytesN<32>) -> BytesN<32> {
        let mut buf = Bytes::new(env);
        buf.push_back(0u8);
        buf.extend_from_array(&commitment.to_array());
        env.crypto().sha256(&buf).to_bytes()
    }

    fn hash_node(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
        let mut buf = Bytes::new(env);
        buf.push_back(1u8);
        buf.extend_from_array(&left.to_array());
        buf.extend_from_array(&right.to_array());
        env.crypto().sha256(&buf).to_bytes()
    }
}

#[cfg(test)]
mod test;
