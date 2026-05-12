#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

fn setup() -> (
    Env,
    Address,
    Address,
    AntiCorruptionAttestationClient<'static>,
) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(AntiCorruptionAttestation, (admin.clone(),));
    let client = AntiCorruptionAttestationClient::new(&env, &contract_id);
    let submitter = Address::generate(&env);
    (env, admin, submitter, client)
}

fn sample_config(_env: &Env) -> UseCaseConfig {
    UseCaseConfig {
        active: true,
        predicate_set: symbol_short!("bank_chg"),
        predicate_version: 1,
    }
}

#[test]
fn constructor_sets_admin() {
    let (_env, admin, _submitter, client) = setup();
    assert_eq!(client.admin(), admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn authorize_submitter_admin_only() {
    let (env, _admin, submitter, client) = setup();
    let fake_admin = Address::generate(&env);
    client.authorize_submitter(&fake_admin, &submitter, &true);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn configure_use_case_admin_only() {
    let (env, _admin, _submitter, client) = setup();
    let fake_admin = Address::generate(&env);
    let cfg = sample_config(&env);
    client.configure_use_case(&fake_admin, &symbol_short!("uc1"), &cfg);
}

#[test]
fn register_attestation_happy_path() {
    let (env, admin, submitter, client) = setup();
    let use_case = symbol_short!("uc1");
    let evidence = BytesN::from_array(&env, &[1u8; 32]);
    let metadata = BytesN::from_array(&env, &[2u8; 32]);

    client.authorize_submitter(&admin, &submitter, &true);
    client.configure_use_case(&admin, &use_case, &sample_config(&env));

    // Returned u32 is the ledger sequence; in test Env it can be 0. We only
    // assert the call succeeded and the record persisted.
    let _seq =
        client.register_attestation(&submitter, &use_case, &Verdict::Pass, &evidence, &metadata);

    let record = client.verify_attestation(&use_case, &evidence).unwrap();
    assert_eq!(record.verdict, Verdict::Pass);
    assert_eq!(record.predicate_set, symbol_short!("bank_chg"));
    assert_eq!(record.predicate_version, 1);
    assert_eq!(record.submitted_by, submitter);
    assert_eq!(record.metadata_hash, metadata);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn register_blocked_when_submitter_not_authorized() {
    let (env, admin, submitter, client) = setup();
    let use_case = symbol_short!("uc1");
    client.configure_use_case(&admin, &use_case, &sample_config(&env));
    let h = BytesN::from_array(&env, &[7u8; 32]);
    client.register_attestation(&submitter, &use_case, &Verdict::Pass, &h, &h);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn register_blocked_when_use_case_unknown() {
    let (env, admin, submitter, client) = setup();
    client.authorize_submitter(&admin, &submitter, &true);
    let h = BytesN::from_array(&env, &[7u8; 32]);
    client.register_attestation(&submitter, &symbol_short!("ghost"), &Verdict::Pass, &h, &h);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn register_blocked_when_use_case_inactive() {
    let (env, admin, submitter, client) = setup();
    let use_case = symbol_short!("uc1");
    client.authorize_submitter(&admin, &submitter, &true);
    let mut cfg = sample_config(&env);
    cfg.active = false;
    client.configure_use_case(&admin, &use_case, &cfg);
    let h = BytesN::from_array(&env, &[7u8; 32]);
    client.register_attestation(&submitter, &use_case, &Verdict::Pass, &h, &h);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn register_idempotent_revert_on_duplicate() {
    let (env, admin, submitter, client) = setup();
    let use_case = symbol_short!("uc1");
    client.authorize_submitter(&admin, &submitter, &true);
    client.configure_use_case(&admin, &use_case, &sample_config(&env));
    let h = BytesN::from_array(&env, &[1u8; 32]);
    client.register_attestation(&submitter, &use_case, &Verdict::Pass, &h, &h);
    client.register_attestation(&submitter, &use_case, &Verdict::Fail, &h, &h);
}

#[test]
fn verify_returns_none_for_unknown() {
    let (env, _admin, _submitter, client) = setup();
    let h = BytesN::from_array(&env, &[9u8; 32]);
    let r = client.verify_attestation(&symbol_short!("uc1"), &h);
    assert!(r.is_none());
}

#[test]
fn authorize_can_revoke() {
    let (env, admin, submitter, client) = setup();
    let use_case = symbol_short!("uc1");
    client.authorize_submitter(&admin, &submitter, &true);
    client.configure_use_case(&admin, &use_case, &sample_config(&env));
    let h = BytesN::from_array(&env, &[1u8; 32]);
    client.register_attestation(&submitter, &use_case, &Verdict::Pass, &h, &h);

    client.authorize_submitter(&admin, &submitter, &false);
    let h2 = BytesN::from_array(&env, &[2u8; 32]);
    let result = client.try_register_attestation(&submitter, &use_case, &Verdict::Pass, &h2, &h2);
    assert!(result.is_err());
}
