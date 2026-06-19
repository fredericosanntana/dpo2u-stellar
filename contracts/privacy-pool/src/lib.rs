#![no_std]
#![allow(deprecated)] // events.publish() works fine; #[contractevent] migration is later
//! DPO2U — `privacy-pool`.
//!
//! A fixed-denomination, symbolic-state privacy pool prototype:
//! - deposits persist opaque note commitments into a small Merkle root for this vertical slice;
//! - withdrawals verify a real Groth16/BN254 membership proof against the configured VK;
//! - nullifier hashes are recorded on-chain to prevent double-withdrawal.
//!
//! Honest limits: this is not token custody. `pool_balance` is symbolic accounting used to
//! prove the state machine and proof plumbing before adding Soroban token integration.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    panic_with_error, symbol_short, Address, Bytes, BytesN, Env, Vec,
};

const TREE_DEPTH: u32 = 4;
const TREE_CAPACITY: u32 = 1 << TREE_DEPTH;
const ROOT_HISTORY_SIZE: u32 = 32;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AdminOnly = 1,
    AlreadyInitialized = 2,
    VerifyingKeyNotSet = 3,
    DuplicateDeposit = 4,
    TreeFull = 5,
    BadSignals = 6,
    RootMismatch = 7,
    NullifierMismatch = 8,
    RecipientMismatch = 9,
    ContextMismatch = 10,
    ZkVerifyFailed = 11,
    NullifierSpent = 12,
    EmptyPool = 13,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    VerifyingKey,
    Deposits,
    Deposit(BytesN<32>),
    Nullifier(BytesN<32>),
    Root,
    NextIndex,
    DepositCount,
    WithdrawCount,
    PoolBalance,
    RootHistory(u32),
    RootHistoryHead,
    RootHistoryCount,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositRecord {
    pub depositor: Address,
    pub commitment: BytesN<32>,
    pub index: u32,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawRecord {
    pub recipient: BytesN<32>,
    pub context: BytesN<32>,
    pub nullifier_hash: BytesN<32>,
    pub root: BytesN<32>,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct PrivacyPoolVk {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    pub ic: Vec<Bn254G1Affine>,
}

#[contracttype]
#[derive(Clone)]
pub struct PrivacyPoolProof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[contract]
pub struct PrivacyPool;

#[contractimpl]
impl PrivacyPool {
    pub fn __constructor(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        let deposits: Vec<BytesN<32>> = Vec::new(&env);
        env.storage().instance().set(&DataKey::Deposits, &deposits);
        env.storage().instance().set(&DataKey::DepositCount, &0u32);
        env.storage().instance().set(&DataKey::WithdrawCount, &0u32);
        env.storage().instance().set(&DataKey::PoolBalance, &0i128);
        env.storage().instance().set(&DataKey::NextIndex, &0u32);
        env.storage().instance().set(&DataKey::RootHistoryHead, &0u32);
        env.storage().instance().set(&DataKey::RootHistoryCount, &0u32);
        let root = Self::compute_root_from(&env, &deposits);
        env.storage().instance().set(&DataKey::Root, &root);
        Self::push_root_history(&env, &root);
    }

    pub fn set_verifying_key(env: Env, admin: Address, vk: PrivacyPoolVk) {
        admin.require_auth();
        Self::assert_admin(&env, &admin);
        env.storage().instance().set(&DataKey::VerifyingKey, &vk);
        env.events().publish((symbol_short!("set_vk"),), true);
    }

    pub fn deposit(env: Env, depositor: Address, commitment: BytesN<32>) -> u32 {
        depositor.require_auth();
        let key = DataKey::Deposit(commitment.clone());
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, Error::DuplicateDeposit);
        }

        let mut deposits = Self::deposits(&env);
        if deposits.len() >= TREE_CAPACITY {
            panic_with_error!(&env, Error::TreeFull);
        }
        let index = Self::next_index(env.clone());
        deposits.push_back(commitment.clone());
        let root = Self::compute_root_from(&env, &deposits);

        let record = DepositRecord {
            depositor,
            commitment: commitment.clone(),
            index,
            timestamp: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&key, &record);
        env.storage().instance().set(&DataKey::Deposits, &deposits);
        env.storage().instance().set(&DataKey::Root, &root);
        env.storage().instance().set(&DataKey::NextIndex, &(index + 1));
        env.storage()
            .instance()
            .set(&DataKey::DepositCount, &(index + 1));
        Self::push_root_history(&env, &root);
        let balance = Self::pool_balance(env.clone()) + 1;
        env.storage()
            .instance()
            .set(&DataKey::PoolBalance, &balance);
        env.events()
            .publish((symbol_short!("deposit"), commitment), (index, root));
        index
    }

    pub fn withdraw(
        env: Env,
        proof: PrivacyPoolProof,
        pub_signals: Vec<Bn254Fr>,
        recipient: BytesN<32>,
        context: BytesN<32>,
        nullifier_hash: BytesN<32>,
    ) -> u32 {
        if pub_signals.len() != 4 {
            panic_with_error!(&env, Error::BadSignals);
        }

        let root = pub_signals.get(0).unwrap().to_bytes();
        if !Self::is_known_root_internal(&env, &root) {
            panic_with_error!(&env, Error::RootMismatch);
        }
        if pub_signals.get(1).unwrap().to_bytes() != nullifier_hash {
            panic_with_error!(&env, Error::NullifierMismatch);
        }
        if pub_signals.get(2).unwrap().to_bytes() != recipient {
            panic_with_error!(&env, Error::RecipientMismatch);
        }
        if pub_signals.get(3).unwrap().to_bytes() != context {
            panic_with_error!(&env, Error::ContextMismatch);
        }

        let nullifier_key = DataKey::Nullifier(nullifier_hash.clone());
        if env.storage().persistent().has(&nullifier_key) {
            panic_with_error!(&env, Error::NullifierSpent);
        }
        if Self::pool_balance(env.clone()) <= 0 {
            panic_with_error!(&env, Error::EmptyPool);
        }

        let vk: PrivacyPoolVk = match env.storage().instance().get(&DataKey::VerifyingKey) {
            Some(v) => v,
            None => panic_with_error!(&env, Error::VerifyingKeyNotSet),
        };
        if !Self::verify_groth16(env.clone(), vk, proof, pub_signals) {
            panic_with_error!(&env, Error::ZkVerifyFailed);
        }

        let withdraw_count = Self::withdraw_count(env.clone()) + 1;
        let balance = Self::pool_balance(env.clone()) - 1;
        let record = WithdrawRecord {
            recipient: recipient.clone(),
            context,
            nullifier_hash: nullifier_hash.clone(),
            root: root.clone(),
            timestamp: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&nullifier_key, &record);
        env.storage()
            .instance()
            .set(&DataKey::WithdrawCount, &withdraw_count);
        env.storage()
            .instance()
            .set(&DataKey::PoolBalance, &balance);
        env.events().publish(
            (symbol_short!("withdraw"), nullifier_hash),
            (recipient, root),
        );
        withdraw_count
    }

    pub fn current_root(env: Env) -> BytesN<32> {
        env.storage()
            .instance()
            .get(&DataKey::Root)
            .unwrap_or_else(|| Self::compute_root_from(&env, &Vec::new(&env)))
    }

    pub fn deposit_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::DepositCount)
            .unwrap_or(0)
    }

    pub fn next_index(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::NextIndex).unwrap_or(0)
    }

    pub fn withdraw_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::WithdrawCount)
            .unwrap_or(0)
    }

    pub fn pool_balance(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::PoolBalance)
            .unwrap_or(0)
    }

    pub fn get_deposit(env: Env, commitment: BytesN<32>) -> Option<DepositRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Deposit(commitment))
    }

    pub fn nullifier_spent(env: Env, nullifier_hash: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Nullifier(nullifier_hash))
    }

    pub fn get_withdraw(env: Env, nullifier_hash: BytesN<32>) -> Option<WithdrawRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Nullifier(nullifier_hash))
    }

    pub fn is_known_root(env: Env, root: BytesN<32>) -> bool {
        Self::is_known_root_internal(&env, &root)
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized")
    }

    fn verify_groth16(
        env: Env,
        vk: PrivacyPoolVk,
        proof: PrivacyPoolProof,
        pub_signals: Vec<Bn254Fr>,
    ) -> bool {
        if pub_signals.len() + 1 != vk.ic.len() {
            return false;
        }
        let bn = env.crypto().bn254();
        let ic0 = vk.ic.get(0).unwrap();
        let mut ic_rest: Vec<Bn254G1Affine> = Vec::new(&env);
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
        let neg_a = -proof.a;
        let vp1 = soroban_sdk::vec![&env, neg_a, vk.alpha, vk_x, proof.c];
        let vp2 = soroban_sdk::vec![&env, proof.b, vk.beta, vk.gamma, vk.delta];
        bn.pairing_check(vp1, vp2)
    }

    fn deposits(env: &Env) -> Vec<BytesN<32>> {
        env.storage()
            .instance()
            .get(&DataKey::Deposits)
            .unwrap_or_else(|| Vec::new(env))
    }

    fn push_root_history(env: &Env, root: &BytesN<32>) {
        let head: u32 = env.storage().instance().get(&DataKey::RootHistoryHead).unwrap_or(0);
        let count: u32 = env.storage().instance().get(&DataKey::RootHistoryCount).unwrap_or(0);
        let slot = head % ROOT_HISTORY_SIZE;
        env.storage().instance().set(&DataKey::RootHistory(slot), root);
        env.storage().instance().set(&DataKey::RootHistoryHead, &(head + 1));
        let next_count = if count < ROOT_HISTORY_SIZE { count + 1 } else { count };
        env.storage()
            .instance()
            .set(&DataKey::RootHistoryCount, &next_count);
    }

    fn is_known_root_internal(env: &Env, root: &BytesN<32>) -> bool {
        let count: u32 = env.storage().instance().get(&DataKey::RootHistoryCount).unwrap_or(0);
        let head: u32 = env.storage().instance().get(&DataKey::RootHistoryHead).unwrap_or(0);
        if count == 0 {
            return false;
        }

        let mut seen = 0;
        while seen < count {
            let slot = (head + ROOT_HISTORY_SIZE - 1 - seen) % ROOT_HISTORY_SIZE;
            if let Some(candidate) = env
                .storage()
                .instance()
                .get::<DataKey, BytesN<32>>(&DataKey::RootHistory(slot))
            {
                if &candidate == root {
                    return true;
                }
            }
            seen += 1;
        }
        false
    }

    fn compute_root_from(env: &Env, deposits: &Vec<BytesN<32>>) -> BytesN<32> {
        let mut level: Vec<BytesN<32>> = Vec::new(env);
        let zero = BytesN::from_array(env, &[0u8; 32]);
        let mut i = 0;
        while i < TREE_CAPACITY {
            let leaf = if i < deposits.len() {
                deposits.get(i).unwrap()
            } else {
                zero.clone()
            };
            level.push_back(leaf);
            i += 1;
        }

        let mut width = TREE_CAPACITY;
        while width > 1 {
            let mut next: Vec<BytesN<32>> = Vec::new(env);
            let mut j = 0;
            while j < width {
                let left = level.get(j).unwrap();
                let right = level.get(j + 1).unwrap();
                next.push_back(Self::hash_node_trunc248(env, &left, &right));
                j += 2;
            }
            level = next;
            width /= 2;
        }
        level.get(0).unwrap()
    }

    fn hash_node_trunc248(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
        let mut buf = Bytes::new(env);
        buf.extend_from_array(&left.to_array());
        buf.extend_from_array(&right.to_array());
        let digest = env.crypto().sha256(&buf).to_bytes();
        let mut out = digest.to_array();
        out[0] = 0;
        BytesN::from_array(env, &out)
    }

    fn assert_admin(env: &Env, claimed_admin: &Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if claimed_admin != &admin {
            panic_with_error!(env, Error::AdminOnly);
        }
    }
}

#[cfg(test)]
mod test;
