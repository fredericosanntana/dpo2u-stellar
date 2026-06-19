#![cfg(test)]

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger as _},
    Address, BytesN, Env, Symbol,
};

struct Ctx {
    env: Env,
    admin: Address,
    issuer: Address,
    client: ProtocolRegistryClient<'static>,
}

fn setup() -> Ctx {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(ProtocolRegistry, (admin.clone(),));
    let client = ProtocolRegistryClient::new(&env, &contract_id);
    let issuer = Address::generate(&env);
    Ctx {
        env,
        admin,
        issuer,
        client,
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

fn root(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[9u8; 32])
}

fn arm_legacy(ctx: &Ctx) {
    ctx.client.authorize_issuer(&ctx.admin, &ctx.issuer, &true);
    ctx.client
        .set_claim_policy(&ctx.admin, &claim(), &juris(), &true);
}

fn arm_structured(ctx: &Ctx, trust_tier: u32) {
    ctx.client
        .configure_issuer_profile(&ctx.admin, &ctx.issuer, &true, &trust_tier, &0);
    ctx.client
        .set_issuer_claim_scope(&ctx.admin, &ctx.issuer, &claim(), &true);
    ctx.client
        .set_issuer_jurisdiction_scope(&ctx.admin, &ctx.issuer, &juris(), &true);
    ctx.client
        .set_claim_policy_requirements(&ctx.admin, &claim(), &juris(), &true, &trust_tier);
}

fn arm_staked(ctx: &Ctx, trust_tier: u32, min_stake: i128, credited_stake: i128) {
    ctx.client
        .configure_issuer_profile(&ctx.admin, &ctx.issuer, &true, &trust_tier, &0);
    ctx.client
        .credit_issuer_stake(&ctx.admin, &ctx.issuer, &credited_stake);
    ctx.client.set_policy_stake(
        &ctx.admin,
        &claim(),
        &juris(),
        &true,
        &trust_tier,
        &min_stake,
    );
}

fn register(ctx: &Ctx) {
    ctx.client.register_attestation(
        &ctx.issuer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &0,
        &root(&ctx.env),
    );
}

#[test]
fn constructor_sets_admin() {
    let ctx = setup();
    assert_eq!(ctx.client.admin(), ctx.admin);
}

#[test]
fn verify_false_for_missing_claim() {
    let ctx = setup();
    assert!(!ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
    assert!(!ctx
        .client
        .is_attestation_active(&subject(&ctx.env), &claim(), &juris()));
}

#[test]
fn get_attestation_none_until_registered() {
    let ctx = setup();
    assert!(ctx
        .client
        .get_attestation(&subject(&ctx.env), &claim(), &juris())
        .is_none());
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn authorize_issuer_admin_only() {
    let ctx = setup();
    let fake_admin = Address::generate(&ctx.env);
    ctx.client.authorize_issuer(&fake_admin, &ctx.issuer, &true);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn set_claim_policy_admin_only() {
    let ctx = setup();
    let fake_admin = Address::generate(&ctx.env);
    ctx.client
        .set_claim_policy(&fake_admin, &claim(), &juris(), &true);
}

#[test]
fn authorize_and_policy_getters_reflect_state() {
    let ctx = setup();
    assert!(!ctx.client.is_authorized_issuer(&ctx.issuer));
    assert!(!ctx.client.claim_policy_active(&claim(), &juris()));
    arm_legacy(&ctx);
    assert!(ctx.client.is_authorized_issuer(&ctx.issuer));
    assert!(ctx.client.claim_policy_active(&claim(), &juris()));
    let profile = ctx.client.get_issuer_profile(&ctx.issuer).unwrap();
    assert!(profile.active);
    assert_eq!(profile.trust_tier, 1);
}

#[test]
fn register_with_active_policy_then_verify_true() {
    let ctx = setup();
    arm_legacy(&ctx);
    register(&ctx);

    let rec = ctx
        .client
        .get_attestation(&subject(&ctx.env), &claim(), &juris())
        .unwrap();
    assert_eq!(rec.issuer, ctx.issuer);
    assert_eq!(rec.claim_type, claim());
    assert_eq!(rec.jurisdiction, juris());
    assert_eq!(rec.attestation_root, root(&ctx.env));

    assert!(ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
    assert!(ctx
        .client
        .is_attestation_active(&subject(&ctx.env), &claim(), &juris()));
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn register_blocked_when_policy_inactive() {
    let ctx = setup();
    ctx.client.authorize_issuer(&ctx.admin, &ctx.issuer, &true);
    register(&ctx);
}

#[test]
fn verify_false_on_wrong_root() {
    let ctx = setup();
    arm_legacy(&ctx);
    register(&ctx);
    let wrong = BytesN::from_array(&ctx.env, &[1u8; 32]);
    assert!(!ctx
        .client
        .verify_attestation_proof(&subject(&ctx.env), &claim(), &juris(), &wrong,));
}

#[test]
fn verify_false_when_policy_later_deactivated() {
    let ctx = setup();
    arm_legacy(&ctx);
    register(&ctx);
    assert!(ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
    ctx.client
        .set_claim_policy(&ctx.admin, &claim(), &juris(), &false);
    assert!(!ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
    assert!(!ctx
        .client
        .is_attestation_active(&subject(&ctx.env), &claim(), &juris()));
}

#[test]
fn verify_false_when_expired() {
    let ctx = setup();
    arm_legacy(&ctx);
    ctx.env.ledger().with_mut(|li| li.timestamp = 100);
    ctx.client.register_attestation(
        &ctx.issuer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &500,
        &root(&ctx.env),
    );
    assert!(ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
    ctx.env.ledger().with_mut(|li| li.timestamp = 1000);
    assert!(!ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn duplicate_registration_rejected_insert_only() {
    let ctx = setup();
    arm_legacy(&ctx);
    register(&ctx);
    register(&ctx);
}

#[test]
fn revoke_by_admin_turns_active_false_and_verify_false() {
    let ctx = setup();
    arm_legacy(&ctx);
    register(&ctx);

    ctx.client
        .revoke_attestation(&ctx.admin, &subject(&ctx.env), &claim(), &juris());

    assert!(!ctx
        .client
        .is_attestation_active(&subject(&ctx.env), &claim(), &juris()));
    assert!(!ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
    assert!(ctx
        .client
        .get_attestation(&subject(&ctx.env), &claim(), &juris())
        .is_some());
}

#[test]
fn revoke_by_issuing_issuer_is_allowed() {
    let ctx = setup();
    arm_legacy(&ctx);
    register(&ctx);

    ctx.client
        .revoke_attestation(&ctx.issuer, &subject(&ctx.env), &claim(), &juris());

    assert!(!ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn unauthorized_revoke_rejected() {
    let ctx = setup();
    arm_legacy(&ctx);
    register(&ctx);
    let stranger = Address::generate(&ctx.env);
    ctx.client
        .revoke_attestation(&stranger, &subject(&ctx.env), &claim(), &juris());
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn double_revoke_rejected() {
    let ctx = setup();
    arm_legacy(&ctx);
    register(&ctx);
    ctx.client
        .revoke_attestation(&ctx.admin, &subject(&ctx.env), &claim(), &juris());
    ctx.client
        .revoke_attestation(&ctx.admin, &subject(&ctx.env), &claim(), &juris());
}

#[test]
fn issuer_profile_tier_enforced() {
    let ctx = setup();
    ctx.client
        .configure_issuer_profile(&ctx.admin, &ctx.issuer, &true, &1, &0);
    ctx.client
        .set_claim_policy_requirements(&ctx.admin, &claim(), &juris(), &true, &2);

    let res = ctx.client.try_register_attestation(
        &ctx.issuer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &0,
        &root(&ctx.env),
    );
    assert!(res.is_err());

    ctx.client
        .configure_issuer_profile(&ctx.admin, &ctx.issuer, &true, &2, &0);
    register(&ctx);
    assert!(ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
}

#[test]
fn issuer_claim_scope_enforced() {
    let ctx = setup();
    arm_structured(&ctx, 2);
    ctx.client
        .set_issuer_claim_scope(&ctx.admin, &ctx.issuer, &claim(), &false);

    let res = ctx.client.try_register_attestation(
        &ctx.issuer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &0,
        &root(&ctx.env),
    );
    assert!(res.is_err());

    ctx.client
        .set_issuer_claim_scope(&ctx.admin, &ctx.issuer, &claim(), &true);
    register(&ctx);
    assert!(ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
}

#[test]
fn issuer_jurisdiction_scope_enforced() {
    let ctx = setup();
    arm_structured(&ctx, 2);
    ctx.client
        .set_issuer_jurisdiction_scope(&ctx.admin, &ctx.issuer, &juris(), &false);

    let res = ctx.client.try_register_attestation(
        &ctx.issuer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &0,
        &root(&ctx.env),
    );
    assert!(res.is_err());

    ctx.client
        .set_issuer_jurisdiction_scope(&ctx.admin, &ctx.issuer, &juris(), &true);
    register(&ctx);
    assert!(ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
}

#[test]
fn issuer_stake_required_for_registration_and_verify() {
    let ctx = setup();
    ctx.client
        .configure_issuer_profile(&ctx.admin, &ctx.issuer, &true, &2, &0);
    ctx.client
        .set_policy_stake(&ctx.admin, &claim(), &juris(), &true, &2, &1_000);

    let res = ctx.client.try_register_attestation(
        &ctx.issuer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &0,
        &root(&ctx.env),
    );
    assert!(res.is_err());

    assert_eq!(
        ctx.client
            .credit_issuer_stake(&ctx.admin, &ctx.issuer, &1_000),
        1_000
    );
    register(&ctx);
    assert!(ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
}

#[test]
fn slashing_below_policy_threshold_breaks_canonical_verify() {
    let ctx = setup();
    arm_staked(&ctx, 2, 1_000, 1_500);
    register(&ctx);
    assert!(ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));

    assert_eq!(ctx.client.slash_issuer(&ctx.admin, &ctx.issuer, &600), 900);
    assert_eq!(ctx.client.issuer_stake(&ctx.issuer), 900);
    assert!(!ctx.client.verify_attestation_proof(
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
    ));
}
