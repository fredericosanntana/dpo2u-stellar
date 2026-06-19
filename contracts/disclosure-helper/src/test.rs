#![cfg(test)]

use super::*;
use protocol_registry::{ProtocolRegistry, ProtocolRegistryClient};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger as _},
    Address, BytesN, Env, Symbol,
};

struct Ctx {
    env: Env,
    admin: Address,
    issuer: Address,
    operator: Address,
    reviewer: Address,
    other_reviewer: Address,
    registry: ProtocolRegistryClient<'static>,
    helper: DisclosureHelperClient<'static>,
}

fn setup() -> Ctx {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let operator = Address::generate(&env);
    let reviewer = Address::generate(&env);
    let other_reviewer = Address::generate(&env);

    let registry_id = env.register(ProtocolRegistry, (admin.clone(),));
    let registry = ProtocolRegistryClient::new(&env, &registry_id);
    let helper_id = env.register(DisclosureHelper, (admin.clone(), registry_id.clone()));
    let helper = DisclosureHelperClient::new(&env, &helper_id);

    registry.configure_issuer_profile(&admin, &issuer, &true, &2, &0);
    registry.set_issuer_claim_scope(&admin, &issuer, &claim(), &true);
    registry.set_issuer_jurisdiction_scope(&admin, &issuer, &juris(), &true);
    registry.set_claim_policy_requirements(&admin, &claim(), &juris(), &true, &2);
    registry.register_attestation(&issuer, &subject(&env), &claim(), &juris(), &0, &root(&env));

    helper.authorize_operator(&admin, &operator, &true);

    Ctx {
        env,
        admin,
        issuer,
        operator,
        reviewer,
        other_reviewer,
        registry,
        helper,
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

fn payload_hash(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[3u8; 32])
}

fn grant_id(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[4u8; 32])
}

#[test]
fn constructor_sets_admin_and_registry() {
    let ctx = setup();
    assert_eq!(ctx.helper.admin(), ctx.admin);
}

#[test]
fn issue_grant_happy_path_and_can_review_true() {
    let ctx = setup();
    let seq = ctx.helper.issue_grant(
        &ctx.operator,
        &grant_id(&ctx.env),
        &ctx.reviewer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
        &payload_hash(&ctx.env),
        &0,
    );
    assert_eq!(seq, ctx.env.ledger().sequence());

    let grant = ctx.helper.get_grant(&grant_id(&ctx.env)).unwrap();
    assert_eq!(grant.reviewer, ctx.reviewer);
    assert_eq!(grant.disclosed_payload_hash, payload_hash(&ctx.env));
    assert!(ctx.helper.can_review(&grant_id(&ctx.env), &ctx.reviewer));
    assert!(!ctx.helper.can_review(&grant_id(&ctx.env), &ctx.other_reviewer));
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn issue_grant_fails_closed_when_registry_verify_false() {
    let ctx = setup();
    let wrong_root = BytesN::from_array(&ctx.env, &[1u8; 32]);
    ctx.helper.issue_grant(
        &ctx.operator,
        &grant_id(&ctx.env),
        &ctx.reviewer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &wrong_root,
        &payload_hash(&ctx.env),
        &0,
    );
}

#[test]
fn can_review_turns_false_after_registry_revocation() {
    let ctx = setup();
    ctx.helper.issue_grant(
        &ctx.operator,
        &grant_id(&ctx.env),
        &ctx.reviewer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
        &payload_hash(&ctx.env),
        &0,
    );
    assert!(ctx.helper.can_review(&grant_id(&ctx.env), &ctx.reviewer));

    ctx.registry
        .revoke_attestation(&ctx.issuer, &subject(&ctx.env), &claim(), &juris());
    assert!(!ctx.helper.can_review(&grant_id(&ctx.env), &ctx.reviewer));
}

#[test]
fn can_review_turns_false_after_expiry() {
    let ctx = setup();
    ctx.env.ledger().with_mut(|li| li.timestamp = 100);
    ctx.helper.issue_grant(
        &ctx.operator,
        &grant_id(&ctx.env),
        &ctx.reviewer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
        &payload_hash(&ctx.env),
        &120,
    );
    assert!(ctx.helper.can_review(&grant_id(&ctx.env), &ctx.reviewer));

    ctx.env.ledger().with_mut(|li| li.timestamp = 121);
    assert!(!ctx.helper.can_review(&grant_id(&ctx.env), &ctx.reviewer));
}

#[test]
fn revoke_grant_turns_active_false() {
    let ctx = setup();
    ctx.helper.issue_grant(
        &ctx.operator,
        &grant_id(&ctx.env),
        &ctx.reviewer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
        &payload_hash(&ctx.env),
        &0,
    );
    assert!(ctx.helper.can_review(&grant_id(&ctx.env), &ctx.reviewer));

    ctx.helper.revoke_grant(&ctx.operator, &grant_id(&ctx.env));
    let grant = ctx.helper.get_grant(&grant_id(&ctx.env)).unwrap();
    assert!(!grant.active);
    assert!(!ctx.helper.can_review(&grant_id(&ctx.env), &ctx.reviewer));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn unauthorized_operator_cannot_issue() {
    let ctx = setup();
    let rogue = Address::generate(&ctx.env);
    ctx.helper.issue_grant(
        &rogue,
        &grant_id(&ctx.env),
        &ctx.reviewer,
        &subject(&ctx.env),
        &claim(),
        &juris(),
        &root(&ctx.env),
        &payload_hash(&ctx.env),
        &0,
    );
}
