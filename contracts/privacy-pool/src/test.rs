#![cfg(test)]

extern crate std;

use super::*;
use serde::Deserialize;
use soroban_sdk::{
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    testutils::{Address as _, Ledger as _},
    vec, Address, Bytes, BytesN, Env, Vec, U256,
};

#[derive(Deserialize)]
struct MembershipFixtures {
    depth: u32,
    commitments: std::vec::Vec<std::string::String>,
    root: std::string::String,
    nullifier_hash: std::string::String,
    recipient: std::string::String,
    context: std::string::String,
}

#[derive(Deserialize)]
struct SorobanBn254Fixtures {
    #[serde(rename = "VK_ALPHA")]
    vk_alpha: std::string::String,
    #[serde(rename = "VK_BETA")]
    vk_beta: std::string::String,
    #[serde(rename = "VK_GAMMA")]
    vk_gamma: std::string::String,
    #[serde(rename = "VK_DELTA")]
    vk_delta: std::string::String,
    #[serde(rename = "VK_IC")]
    vk_ic: std::vec::Vec<std::string::String>,
    #[serde(rename = "PROOF_A")]
    proof_a: std::string::String,
    #[serde(rename = "PROOF_B")]
    proof_b: std::string::String,
    #[serde(rename = "PROOF_C")]
    proof_c: std::string::String,
}

fn membership_fixtures() -> MembershipFixtures {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../zk-prover/membership/fixtures.json"
    );
    let raw = std::fs::read_to_string(path).expect("read membership fixtures.json");
    serde_json::from_str(&raw).expect("parse membership fixtures.json")
}

fn soroban_fixtures() -> SorobanBn254Fixtures {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../zk-prover/membership/soroban-bn254.json"
    );
    let raw = std::fs::read_to_string(path).expect("read soroban-bn254.json");
    serde_json::from_str(&raw).expect("parse soroban-bn254.json")
}

struct Ctx {
    env: Env,
    admin: Address,
    user: Address,
    client: PrivacyPoolClient<'static>,
}

fn setup() -> Ctx {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 100);
    let admin = Address::generate(&env);
    let contract_id = env.register(PrivacyPool, (admin.clone(),));
    let client = PrivacyPoolClient::new(&env, &contract_id);
    let user = Address::generate(&env);
    Ctx {
        env,
        admin,
        user,
        client,
    }
}

fn b32(env: &Env, fill: u8) -> BytesN<32> {
    BytesN::from_array(env, &[fill; 32])
}

fn b32_hex(env: &Env, h: &str) -> BytesN<32> {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 32] = bytes.try_into().expect("BytesN<32>");
    BytesN::from_array(env, &arr)
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

fn expected_root_for_deposits(env: &Env, depth: u32, deposits: &[BytesN<32>]) -> BytesN<32> {
    let mut level: Vec<BytesN<32>> = Vec::new(env);
    let zero = BytesN::from_array(env, &[0u8; 32]);
    let capacity = 1u32 << depth;
    let mut i = 0;
    while i < capacity {
        let leaf = if (i as usize) < deposits.len() {
            deposits[i as usize].clone()
        } else {
            zero.clone()
        };
        level.push_back(leaf);
        i += 1;
    }

    let mut width = capacity;
    while width > 1 {
        let mut next: Vec<BytesN<32>> = Vec::new(env);
        let mut j = 0;
        while j < width {
            let left = level.get(j).unwrap();
            let right = level.get(j + 1).unwrap();
            next.push_back(hash_node_trunc248(env, &left, &right));
            j += 2;
        }
        level = next;
        width /= 2;
    }

    level.get(0).unwrap()
}

fn g1(env: &Env, h: &str) -> Bn254G1Affine {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 64] = bytes.try_into().expect("G1 = 64 bytes");
    Bn254G1Affine::from_array(env, &arr)
}

fn g2(env: &Env, h: &str) -> Bn254G2Affine {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 128] = bytes.try_into().expect("G2 = 128 bytes");
    Bn254G2Affine::from_array(env, &arr)
}

fn fr(env: &Env, h: &str) -> Bn254Fr {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 32] = bytes.try_into().expect("Fr = 32 bytes");
    Bn254Fr::from_u256(U256::from_be_bytes(env, &Bytes::from_array(env, &arr)))
}

fn vk(env: &Env) -> PrivacyPoolVk {
    let fx = soroban_fixtures();
    PrivacyPoolVk {
        alpha: g1(env, &fx.vk_alpha),
        beta: g2(env, &fx.vk_beta),
        gamma: g2(env, &fx.vk_gamma),
        delta: g2(env, &fx.vk_delta),
        ic: Vec::from_array(
            env,
            [
                g1(env, &fx.vk_ic[0]),
                g1(env, &fx.vk_ic[1]),
                g1(env, &fx.vk_ic[2]),
                g1(env, &fx.vk_ic[3]),
                g1(env, &fx.vk_ic[4]),
            ],
        ),
    }
}

fn proof(env: &Env) -> PrivacyPoolProof {
    let fx = soroban_fixtures();
    PrivacyPoolProof {
        a: g1(env, &fx.proof_a),
        b: g2(env, &fx.proof_b),
        c: g1(env, &fx.proof_c),
    }
}

fn signals(env: &Env, root: &str, nullifier: &str, recipient: &str, context: &str) -> Vec<Bn254Fr> {
    vec![
        env,
        fr(env, root),
        fr(env, nullifier),
        fr(env, recipient),
        fr(env, context),
    ]
}

fn arm_zk(ctx: &Ctx) {
    let fx = membership_fixtures();
    ctx.client.set_verifying_key(&ctx.admin, &vk(&ctx.env));
    for commitment in fx.commitments.iter() {
        ctx.client.deposit(&ctx.user, &b32_hex(&ctx.env, commitment));
    }
}

#[test]
fn deposit_records_commitment_and_pool_state() {
    let ctx = setup();
    let commitment = b32(&ctx.env, 7);
    let initial_root = ctx.client.current_root();

    assert_eq!(ctx.client.deposit(&ctx.user, &commitment), 0);

    assert_ne!(ctx.client.current_root(), initial_root);
    assert_eq!(ctx.client.deposit_count(), 1);
    assert_eq!(ctx.client.pool_balance(), 1);
    let record = ctx.client.get_deposit(&commitment).unwrap();
    assert_eq!(record.commitment, commitment);
    assert_eq!(record.index, 0);
    assert_eq!(record.depositor, ctx.user);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn duplicate_deposit_is_rejected() {
    let ctx = setup();
    let commitment = b32(&ctx.env, 8);
    ctx.client.deposit(&ctx.user, &commitment);
    ctx.client.deposit(&ctx.user, &commitment);
}

#[test]
fn fixtures_and_contract_support_multi_deposit_membership_roots() {
    let ctx = setup();
    let fx = membership_fixtures();

    assert_eq!(
        fx.depth, 4,
        "fixtures must represent the depth-N Merkle tree used by the contract"
    );
    assert_eq!(
        fx.commitments.len(),
        2,
        "fixtures must include the witness commitment plus at least one decoy deposit"
    );

    let first = b32_hex(&ctx.env, &fx.commitments[0]);
    let second = b32_hex(&ctx.env, &fx.commitments[1]);
    ctx.client.deposit(&ctx.user, &first);
    ctx.client.deposit(&ctx.user, &second);

    assert_eq!(ctx.client.deposit_count(), 2);
    assert_eq!(ctx.client.current_root(), b32_hex(&ctx.env, &fx.root));
}

#[test]
fn valid_zk_membership_proof_withdraws_and_marks_nullifier() {
    let ctx = setup();
    let fx = membership_fixtures();
    arm_zk(&ctx);
    assert_eq!(ctx.client.current_root(), b32_hex(&ctx.env, &fx.root));

    let count = ctx.client.withdraw(
        &proof(&ctx.env),
        &signals(
            &ctx.env,
            &fx.root,
            &fx.nullifier_hash,
            &fx.recipient,
            &fx.context,
        ),
        &b32_hex(&ctx.env, &fx.recipient),
        &b32_hex(&ctx.env, &fx.context),
        &b32_hex(&ctx.env, &fx.nullifier_hash),
    );

    assert_eq!(count, 1);
    assert_eq!(ctx.client.withdraw_count(), 1);
    assert_eq!(ctx.client.pool_balance(), 1);
    assert!(ctx
        .client
        .nullifier_spent(&b32_hex(&ctx.env, &fx.nullifier_hash)));
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn tampered_public_root_is_rejected_before_withdraw_state_changes() {
    let ctx = setup();
    let fx = membership_fixtures();
    arm_zk(&ctx);
    let bad_root = "005f8da17218c5ca7ab624d5fd3af7afb01016a2992f814485fac599c69225b6";

    ctx.client.withdraw(
        &proof(&ctx.env),
        &signals(
            &ctx.env,
            bad_root,
            &fx.nullifier_hash,
            &fx.recipient,
            &fx.context,
        ),
        &b32_hex(&ctx.env, &fx.recipient),
        &b32_hex(&ctx.env, &fx.context),
        &b32_hex(&ctx.env, &fx.nullifier_hash),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn repeated_withdraw_with_same_nullifier_fails() {
    let ctx = setup();
    let fx = membership_fixtures();
    arm_zk(&ctx);
    ctx.client.withdraw(
        &proof(&ctx.env),
        &signals(
            &ctx.env,
            &fx.root,
            &fx.nullifier_hash,
            &fx.recipient,
            &fx.context,
        ),
        &b32_hex(&ctx.env, &fx.recipient),
        &b32_hex(&ctx.env, &fx.context),
        &b32_hex(&ctx.env, &fx.nullifier_hash),
    );

    ctx.client.withdraw(
        &proof(&ctx.env),
        &signals(
            &ctx.env,
            &fx.root,
            &fx.nullifier_hash,
            &fx.recipient,
            &fx.context,
        ),
        &b32_hex(&ctx.env, &fx.recipient),
        &b32_hex(&ctx.env, &fx.context),
        &b32_hex(&ctx.env, &fx.nullifier_hash),
    );
}

#[test]
fn supports_more_than_two_deposits_with_depth_n_root() {
    let ctx = setup();
    let deposits = [b32(&ctx.env, 1), b32(&ctx.env, 2), b32(&ctx.env, 3), b32(&ctx.env, 4)];

    for commitment in deposits.iter() {
        ctx.client.deposit(&ctx.user, commitment);
    }

    assert_eq!(ctx.client.deposit_count(), 4);
    assert_eq!(ctx.client.next_index(), 4);
    assert_eq!(
        ctx.client.current_root(),
        expected_root_for_deposits(&ctx.env, 4, &deposits)
    );
}

#[test]
fn keeps_recent_roots_known_after_newer_deposits() {
    let ctx = setup();
    let first = b32(&ctx.env, 10);
    let second = b32(&ctx.env, 11);
    let third = b32(&ctx.env, 12);

    ctx.client.deposit(&ctx.user, &first);
    let root_after_first = ctx.client.current_root();
    ctx.client.deposit(&ctx.user, &second);
    let root_after_second = ctx.client.current_root();
    ctx.client.deposit(&ctx.user, &third);

    assert!(ctx.client.is_known_root(&root_after_first));
    assert!(ctx.client.is_known_root(&root_after_second));
    assert!(ctx.client.is_known_root(&ctx.client.current_root()));
}
