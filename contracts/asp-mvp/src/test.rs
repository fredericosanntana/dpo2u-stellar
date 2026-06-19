#![cfg(test)]

use super::*;
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
    issuer: Address,
    registry: ProtocolRegistryClient<'static>,
    asp: AspMvpClient<'static>,
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

    let submitter = Address::generate(&env);
    let issuer = Address::generate(&env);
    Ctx {
        env,
        admin,
        submitter,
        issuer,
        registry,
        asp,
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

fn zero(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[0u8; 32])
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

fn admit(ctx: &Ctx, dep: &BytesN<32>) -> u32 {
    ctx.asp.add_to_set(
        &ctx.submitter,
        dep,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &att_root(&ctx.env),
    )
}

fn merkle_leaf(env: &Env, commitment: &BytesN<32>) -> BytesN<32> {
    let mut buf = Bytes::new(env);
    buf.push_back(0u8);
    buf.extend_from_array(&commitment.to_array());
    env.crypto().sha256(&buf).to_bytes()
}

fn merkle_node(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
    let mut buf = Bytes::new(env);
    buf.push_back(1u8);
    buf.extend_from_array(&left.to_array());
    buf.extend_from_array(&right.to_array());
    env.crypto().sha256(&buf).to_bytes()
}

fn expected_merkle_root(env: &Env, commitments: &[BytesN<32>]) -> BytesN<32> {
    if commitments.is_empty() {
        return zero(env);
    }

    let mut level: Vec<BytesN<32>> = Vec::new(env);
    for commitment in commitments.iter() {
        level.push_back(merkle_leaf(env, commitment));
    }

    while level.len() > 1 {
        let mut next: Vec<BytesN<32>> = Vec::new(env);
        let len = level.len();
        let mut i = 0;
        while i < len {
            let left = level.get(i).unwrap();
            let right = if i + 1 < len {
                level.get(i + 1).unwrap()
            } else {
                left.clone()
            };
            next.push_back(merkle_node(env, &left, &right));
            i += 2;
        }
        level = next;
    }

    level.get(0).unwrap()
}

#[test]
fn constructor_sets_admin_and_registry() {
    let ctx = setup();
    assert_eq!(ctx.asp.admin(), ctx.admin);
    assert_eq!(ctx.asp.registry(), ctx.registry.address);
}

#[test]
fn empty_set_root_is_zero_and_count_zero() {
    let ctx = setup();
    assert_eq!(ctx.asp.current_root(), zero(&ctx.env));
    assert_eq!(ctx.asp.leaf_count(), 0);
}

#[test]
fn contains_false_before_any_admission() {
    let ctx = setup();
    assert!(!ctx.asp.contains(&deposit_a(&ctx.env)));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn add_to_set_fails_closed_when_registry_unverified() {
    let ctx = setup();
    admit(&ctx, &deposit_a(&ctx.env));
}

#[test]
fn add_to_set_admits_when_registry_verifies() {
    let ctx = setup();
    arm_registry(&ctx);
    let count = admit(&ctx, &deposit_a(&ctx.env));
    assert_eq!(count, 1);
    assert!(ctx.asp.contains(&deposit_a(&ctx.env)));
    assert_eq!(ctx.asp.leaf_count(), 1);
}

#[test]
fn current_root_is_real_merkle_root_of_active_set() {
    let ctx = setup();
    arm_registry(&ctx);
    let dep_a = deposit_a(&ctx.env);
    let dep_b = deposit_b(&ctx.env);
    admit(&ctx, &dep_a);
    assert_eq!(
        ctx.asp.current_root(),
        expected_merkle_root(&ctx.env, &[dep_a.clone()])
    );

    admit(&ctx, &dep_b);
    assert_eq!(
        ctx.asp.current_root(),
        expected_merkle_root(&ctx.env, &[dep_a.clone(), dep_b.clone()])
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn duplicate_admission_rejected() {
    let ctx = setup();
    arm_registry(&ctx);
    admit(&ctx, &deposit_a(&ctx.env));
    admit(&ctx, &deposit_a(&ctx.env));
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn remove_from_set_blocked_while_backing_claim_still_verifies() {
    let ctx = setup();
    arm_registry(&ctx);
    admit(&ctx, &deposit_a(&ctx.env));
    ctx.asp.remove_from_set(&ctx.admin, &deposit_a(&ctx.env));
}

#[test]
fn remove_from_set_after_registry_revocation_updates_membership_root_and_count() {
    let ctx = setup();
    arm_registry(&ctx);
    let dep_a = deposit_a(&ctx.env);
    let dep_b = deposit_b(&ctx.env);
    admit(&ctx, &dep_a);
    admit(&ctx, &dep_b);
    assert_eq!(ctx.asp.leaf_count(), 2);

    ctx.registry
        .revoke_attestation(&ctx.admin, &subject(&ctx.env), &claim(), &juris());
    let count = ctx.asp.remove_from_set(&ctx.admin, &dep_a);

    assert_eq!(count, 1);
    assert!(!ctx.asp.contains(&dep_a));
    assert!(ctx.asp.contains(&dep_b));
    assert_eq!(ctx.asp.leaf_count(), 1);
    assert_eq!(
        ctx.asp.current_root(),
        expected_merkle_root(&ctx.env, &[dep_b.clone()])
    );

    let rec = ctx.asp.get_member(&dep_a).unwrap();
    assert!(!rec.active);
    assert!(rec.removed_at > 0);
}

#[test]
fn policy_deactivation_also_makes_member_removable() {
    let ctx = setup();
    arm_registry(&ctx);
    let dep = deposit_a(&ctx.env);
    admit(&ctx, &dep);

    ctx.registry
        .set_claim_policy(&ctx.admin, &claim(), &juris(), &false);
    let count = ctx.asp.remove_from_set(&ctx.admin, &dep);

    assert_eq!(count, 0);
    assert!(!ctx.asp.contains(&dep));
    assert_eq!(ctx.asp.current_root(), zero(&ctx.env));
}

#[test]
fn failed_admission_leaves_root_and_count_untouched() {
    let ctx = setup();
    arm_registry(&ctx);
    let dep = deposit_a(&ctx.env);
    admit(&ctx, &dep);
    let root_after_one = ctx.asp.current_root();

    let bad_subject = BytesN::from_array(&ctx.env, &[8u8; 32]);
    let bad_deposit = BytesN::from_array(&ctx.env, &[43u8; 32]);
    let res = ctx.asp.try_add_to_set(
        &ctx.submitter,
        &bad_deposit,
        &bad_subject,
        &claim(),
        &juris(),
        &att_root(&ctx.env),
    );
    assert!(res.is_err());
    assert_eq!(ctx.asp.current_root(), root_after_one);
    assert_eq!(ctx.asp.leaf_count(), 1);
}
