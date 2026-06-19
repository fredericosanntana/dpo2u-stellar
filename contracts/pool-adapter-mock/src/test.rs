#![cfg(test)]

use super::*;
use asp_mvp::{AspMvp, AspMvpClient};
use protocol_registry::{ProtocolRegistry, ProtocolRegistryClient};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger as _},
    Address, Bytes, BytesN, Env, Symbol, Vec,
};

struct Ctx {
    env: Env,
    admin: Address,
    submitter: Address,
    user: Address,
    issuer: Address,
    registry: ProtocolRegistryClient<'static>,
    asp: AspMvpClient<'static>,
    pool: PoolAdapterMockClient<'static>,
}

fn setup() -> Ctx {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 1);
    let admin = Address::generate(&env);

    let registry_id = env.register(ProtocolRegistry, (admin.clone(),));
    let registry = ProtocolRegistryClient::new(&env, &registry_id);

    let asp_id = env.register(AspMvp, (admin.clone(), registry_id.clone()));
    let asp = AspMvpClient::new(&env, &asp_id);

    let pool_id = env.register(PoolAdapterMock, (admin.clone(), asp_id.clone()));
    let pool = PoolAdapterMockClient::new(&env, &pool_id);

    let submitter = Address::generate(&env);
    let user = Address::generate(&env);
    let issuer = Address::generate(&env);
    Ctx {
        env,
        admin,
        submitter,
        user,
        issuer,
        registry,
        asp,
        pool,
    }
}

fn claim() -> Symbol {
    symbol_short!("kyc")
}
fn juris() -> Symbol {
    symbol_short!("BR")
}
fn subject(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[7u8; 32])
}
fn att_root(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[9u8; 32])
}
fn deposit_a(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[42u8; 32])
}
fn deposit_b(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[44u8; 32])
}

fn arm_registry(ctx: &Ctx) {
    ctx.registry
        .authorize_issuer(&ctx.admin, &ctx.issuer, &true);
    ctx.registry
        .set_claim_policy(&ctx.admin, &claim(), &juris(), &true);
    ctx.registry.register_attestation(
        &ctx.issuer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &0,
        &att_root(&ctx.env),
    );
}

fn admit(ctx: &Ctx, dep: &BytesN<32>) {
    ctx.asp.add_to_set(
        &ctx.submitter,
        dep,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &att_root(&ctx.env),
    );
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

fn merkle_proof(
    env: &Env,
    commitments: &[BytesN<32>],
    target_index: u32,
) -> (Vec<BytesN<32>>, u32) {
    let mut level: Vec<BytesN<32>> = Vec::new(env);
    for commitment in commitments.iter() {
        level.push_back(hash_leaf(env, commitment));
    }

    let mut siblings: Vec<BytesN<32>> = Vec::new(env);
    let mut index = target_index;
    while level.len() > 1 {
        let len = level.len();
        let sibling_index = if index % 2 == 0 {
            if index + 1 < len {
                index + 1
            } else {
                index
            }
        } else {
            index - 1
        };
        siblings.push_back(level.get(sibling_index).unwrap());

        let mut next: Vec<BytesN<32>> = Vec::new(env);
        let mut i = 0;
        while i < len {
            let left = level.get(i).unwrap();
            let right = if i + 1 < len {
                level.get(i + 1).unwrap()
            } else {
                left.clone()
            };
            next.push_back(hash_node(env, &left, &right));
            i += 2;
        }
        level = next;
        index /= 2;
    }

    (siblings, target_index)
}

#[test]
fn constructor_sets_admin_and_asp() {
    let ctx = setup();
    assert_eq!(ctx.pool.admin(), ctx.admin);
    assert_eq!(ctx.pool.asp(), ctx.asp.address);
    assert_eq!(ctx.pool.exec_count(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn execute_blocked_without_membership() {
    let ctx = setup();
    ctx.pool.execute_if_member(&ctx.user, &deposit_a(&ctx.env));
}

#[test]
fn blocked_action_leaves_pool_state_untouched() {
    let ctx = setup();
    let res = ctx
        .pool
        .try_execute_if_member(&ctx.user, &deposit_a(&ctx.env));
    assert!(res.is_err());
    assert_eq!(ctx.pool.exec_count(), 0);
    assert!(!ctx.pool.has_executed(&deposit_a(&ctx.env)));
}

#[test]
fn can_execute_is_false_without_membership() {
    let ctx = setup();
    assert!(!ctx.pool.can_execute(&deposit_a(&ctx.env)));
}

#[test]
fn execute_released_with_membership() {
    let ctx = setup();
    arm_registry(&ctx);
    let dep = deposit_a(&ctx.env);
    admit(&ctx, &dep);

    let count = ctx.pool.execute_if_member(&ctx.user, &dep);
    assert_eq!(count, 1);
    assert!(ctx.pool.has_executed(&dep));
    assert_eq!(ctx.pool.exec_count(), 1);
}

#[test]
fn can_execute_tracks_membership_and_revocation() {
    let ctx = setup();
    let dep = deposit_a(&ctx.env);
    assert!(!ctx.pool.can_execute(&dep));

    arm_registry(&ctx);
    admit(&ctx, &dep);
    assert!(ctx.pool.can_execute(&dep));

    ctx.registry
        .revoke_attestation(&ctx.admin, &subject(&ctx.env), &claim(), &juris());
    ctx.asp.remove_from_set(&ctx.admin, &dep);
    assert!(!ctx.pool.can_execute(&dep));
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn double_execute_rejected() {
    let ctx = setup();
    arm_registry(&ctx);
    let dep = deposit_a(&ctx.env);
    admit(&ctx, &dep);
    ctx.pool.execute_if_member(&ctx.user, &dep);
    ctx.pool.execute_if_member(&ctx.user, &dep);
}

#[test]
fn execute_with_membership_proof_released_against_current_root() {
    let ctx = setup();
    arm_registry(&ctx);
    let dep_a = deposit_a(&ctx.env);
    let dep_b = deposit_b(&ctx.env);
    admit(&ctx, &dep_a);
    admit(&ctx, &dep_b);

    let (siblings, index) = merkle_proof(&ctx.env, &[dep_a.clone(), dep_b.clone()], 0);
    assert!(ctx.pool.can_execute_with_proof(&dep_a, &siblings, &index));

    let count = ctx
        .pool
        .execute_with_membership_proof(&ctx.user, &dep_a, &siblings, &index);
    assert_eq!(count, 1);
    assert!(ctx.pool.has_executed(&dep_a));
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn invalid_membership_proof_is_blocked() {
    let ctx = setup();
    arm_registry(&ctx);
    let dep_a = deposit_a(&ctx.env);
    let dep_b = deposit_b(&ctx.env);
    admit(&ctx, &dep_a);
    admit(&ctx, &dep_b);

    let wrong_sibling = BytesN::from_array(&ctx.env, &[1u8; 32]);
    let siblings = Vec::from_array(&ctx.env, [wrong_sibling]);
    ctx.pool
        .execute_with_membership_proof(&ctx.user, &dep_a, &siblings, &0);
}

#[test]
fn stale_proof_fails_after_revocation_changes_root() {
    let ctx = setup();
    arm_registry(&ctx);
    let dep_a = deposit_a(&ctx.env);
    let dep_b = deposit_b(&ctx.env);
    admit(&ctx, &dep_a);
    admit(&ctx, &dep_b);

    let (siblings, index) = merkle_proof(&ctx.env, &[dep_a.clone(), dep_b.clone()], 0);
    assert!(ctx.pool.can_execute_with_proof(&dep_a, &siblings, &index));

    ctx.registry
        .revoke_attestation(&ctx.admin, &subject(&ctx.env), &claim(), &juris());
    ctx.asp.remove_from_set(&ctx.admin, &dep_a);

    assert!(!ctx.pool.can_execute(&dep_a));
    assert!(!ctx.pool.can_execute_with_proof(&dep_a, &siblings, &index));
    assert!(ctx
        .pool
        .try_execute_with_membership_proof(&ctx.user, &dep_a, &siblings, &index)
        .is_err());
}

#[test]
fn end_to_end_registry_asp_pool_gating_and_proof_path() {
    let ctx = setup();
    let unbacked = BytesN::from_array(&ctx.env, &[99u8; 32]);
    assert!(!ctx.pool.can_execute(&unbacked));
    assert!(ctx
        .pool
        .try_execute_if_member(&ctx.user, &unbacked)
        .is_err());

    arm_registry(&ctx);
    let dep_a = deposit_a(&ctx.env);
    let dep_b = deposit_b(&ctx.env);
    admit(&ctx, &dep_a);
    admit(&ctx, &dep_b);
    assert!(ctx.asp.contains(&dep_a));

    let count_membership = ctx.pool.execute_if_member(&ctx.user, &dep_a);
    assert_eq!(count_membership, 1);

    let (siblings, index) = merkle_proof(&ctx.env, &[dep_a.clone(), dep_b.clone()], 1);
    let count_proof = ctx
        .pool
        .execute_with_membership_proof(&ctx.user, &dep_b, &siblings, &index);
    assert_eq!(count_proof, 2);
    assert_eq!(ctx.pool.exec_count(), 2);
}
