#![cfg(test)]

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger as _},
    Address, BytesN, Env, Symbol,
};

const T0: u64 = 1_789_000_000;

fn setup() -> (Env, Address, Address, AttestationRegistryClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(T0);

    let admin = Address::generate(&env);
    let contract_id = env.register(AttestationRegistry, (admin.clone(),));
    let client = AttestationRegistryClient::new(&env, &contract_id);

    let submitter = Address::generate(&env);
    client.authorize_submitter(&admin, &submitter, &true);
    client.configure_use_case(
        &admin,
        &symbol_short!("bank_chg"),
        &UseCaseConfig {
            active: true,
            min_pack_version: 1,
        },
    );

    (env, admin, submitter, client)
}

fn h(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

/// Anchors one attestation and returns its evidence hash.
fn anchor(
    env: &Env,
    client: &AttestationRegistryClient<'static>,
    submitter: &Address,
    valid_until: &Option<u64>,
) -> BytesN<32> {
    let evidence = h(env, 1);
    client.register_attestation(
        submitter,
        &symbol_short!("bank_chg"),
        &evidence,
        &AttestationInput {
            verdict: Verdict::Pass,
            pack_hash: h(env, 2),
            pack_version: 1,
            jurisdiction: symbol_short!("BR"),
            result_hash: h(env, 3),
            valid_until: *valid_until,
        },
    );
    evidence
}

#[test]
fn constructor_sets_admin() {
    let (_env, admin, _submitter, client) = setup();
    assert_eq!(client.admin(), admin);
}

#[test]
fn register_stores_pack_identity_and_jurisdiction() {
    let (env, _admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &None);

    let record = client
        .verify_attestation(&symbol_short!("bank_chg"), &evidence)
        .unwrap();

    assert_eq!(record.verdict, Verdict::Pass);
    assert_eq!(record.pack_hash, h(&env, 2));
    assert_eq!(record.pack_version, 1);
    assert_eq!(record.jurisdiction, symbol_short!("BR"));
    assert_eq!(record.result_hash, h(&env, 3));
    assert_eq!(record.issued_at, T0);
    assert_eq!(record.valid_until, None);
}

#[test]
fn register_stores_validity_window() {
    let (env, _admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &Some(T0 + 86_400));

    let record = client
        .verify_attestation(&symbol_short!("bank_chg"), &evidence)
        .unwrap();
    assert_eq!(record.valid_until, Some(T0 + 86_400));
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn register_rejects_validity_at_or_before_issuance() {
    let (env, _admin, submitter, client) = setup();
    anchor(&env, &client, &submitter, &Some(T0));
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn register_rejects_a_superseded_pack_version() {
    let (env, admin, submitter, client) = setup();
    client.configure_use_case(
        &admin,
        &symbol_short!("bank_chg"),
        &UseCaseConfig {
            active: true,
            min_pack_version: 2,
        },
    );
    anchor(&env, &client, &submitter, &None);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn register_blocked_when_submitter_not_authorized() {
    let (env, _admin, _submitter, client) = setup();
    let stranger = Address::generate(&env);
    anchor(&env, &client, &stranger, &None);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn register_is_idempotent_by_rejecting_duplicates() {
    let (env, _admin, submitter, client) = setup();
    anchor(&env, &client, &submitter, &None);
    anchor(&env, &client, &submitter, &None);
}

// --- status: the question a relying party actually asks ---

#[test]
fn status_is_not_found_for_an_unknown_evidence_hash() {
    let (env, _admin, _submitter, client) = setup();
    assert_eq!(
        client.status(&symbol_short!("bank_chg"), &h(&env, 9)),
        AttestationStatus::NotFound
    );
}

#[test]
fn status_is_valid_within_the_window() {
    let (env, _admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &Some(T0 + 86_400));
    assert_eq!(
        client.status(&symbol_short!("bank_chg"), &evidence),
        AttestationStatus::Valid
    );
}

#[test]
fn status_turns_expired_once_the_window_closes() {
    let (env, _admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &Some(T0 + 86_400));

    env.ledger().set_timestamp(T0 + 86_401);
    assert_eq!(
        client.status(&symbol_short!("bank_chg"), &evidence),
        AttestationStatus::Expired
    );
}

#[test]
fn status_stays_valid_without_a_window() {
    let (env, _admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &None);

    env.ledger().set_timestamp(T0 + 10_000_000);
    assert_eq!(
        client.status(&symbol_short!("bank_chg"), &evidence),
        AttestationStatus::Valid
    );
}

// --- revocation: issuer or admin ---

#[test]
fn issuer_can_revoke_their_own_attestation() {
    let (env, _admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &None);

    client.revoke_attestation(
        &submitter,
        &symbol_short!("bank_chg"),
        &evidence,
        &Symbol::new(&env, "superseded"),
    );

    assert_eq!(
        client.status(&symbol_short!("bank_chg"), &evidence),
        AttestationStatus::Revoked
    );
}

#[test]
fn admin_can_revoke_someone_elses_attestation() {
    let (env, admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &None);

    client.revoke_attestation(
        &admin,
        &symbol_short!("bank_chg"),
        &evidence,
        &Symbol::new(&env, "supervisory"),
    );

    assert_eq!(
        client.status(&symbol_short!("bank_chg"), &evidence),
        AttestationStatus::Revoked
    );
}

#[test]
fn revocation_records_who_when_and_why() {
    let (env, admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &None);

    env.ledger().set_timestamp(T0 + 500);
    client.revoke_attestation(
        &admin,
        &symbol_short!("bank_chg"),
        &evidence,
        &Symbol::new(&env, "supervisory"),
    );

    let rev = client
        .get_revocation(&symbol_short!("bank_chg"), &evidence)
        .unwrap();
    assert_eq!(rev.revoked_by, admin);
    assert_eq!(rev.revoked_at, T0 + 500);
    assert_eq!(rev.reason, Symbol::new(&env, "supervisory"));
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn a_third_party_cannot_revoke() {
    let (env, _admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &None);

    let stranger = Address::generate(&env);
    client.revoke_attestation(
        &stranger,
        &symbol_short!("bank_chg"),
        &evidence,
        &Symbol::new(&env, "mischief"),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn a_deauthorized_issuer_cannot_revoke() {
    // A key removed from the whitelist — rotated, or compromised and revoked —
    // must not be able to withdraw valid attestations. That would turn a stolen
    // key into a denial-of-service against the institution's own record.
    let (env, admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &None);

    client.authorize_submitter(&admin, &submitter, &false);
    client.revoke_attestation(
        &submitter,
        &symbol_short!("bank_chg"),
        &evidence,
        &Symbol::new(&env, "superseded"),
    );
}

#[test]
fn the_admin_can_still_revoke_after_the_issuer_is_deauthorized() {
    // The counterpart to the test above: de-authorizing a submitter must not
    // strand their attestations beyond withdrawal.
    let (env, admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &None);

    client.authorize_submitter(&admin, &submitter, &false);
    client.revoke_attestation(
        &admin,
        &symbol_short!("bank_chg"),
        &evidence,
        &Symbol::new(&env, "keyrotation"),
    );

    assert_eq!(
        client.status(&symbol_short!("bank_chg"), &evidence),
        AttestationStatus::Revoked
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn an_attestation_cannot_be_revoked_twice() {
    let (env, admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &None);

    client.revoke_attestation(
        &submitter,
        &symbol_short!("bank_chg"),
        &evidence,
        &Symbol::new(&env, "superseded"),
    );
    client.revoke_attestation(
        &admin,
        &symbol_short!("bank_chg"),
        &evidence,
        &Symbol::new(&env, "supervisory"),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn revoking_an_unknown_attestation_fails() {
    let (env, admin, _submitter, client) = setup();
    client.revoke_attestation(
        &admin,
        &symbol_short!("bank_chg"),
        &h(&env, 9),
        &Symbol::new(&env, "oops"),
    );
}

#[test]
fn revocation_outranks_expiry() {
    let (env, admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &Some(T0 + 86_400));

    client.revoke_attestation(
        &admin,
        &symbol_short!("bank_chg"),
        &evidence,
        &Symbol::new(&env, "supervisory"),
    );

    // Well past expiry: still reported as revoked, because that is the fact a
    // supervisor needs first.
    env.ledger().set_timestamp(T0 + 200_000);
    assert_eq!(
        client.status(&symbol_short!("bank_chg"), &evidence),
        AttestationStatus::Revoked
    );
}

#[test]
fn verify_still_returns_the_record_after_revocation() {
    // Revocation withdraws the assertion; it does not erase the fact that it
    // was made. An auditor must still be able to read what was asserted.
    let (env, admin, submitter, client) = setup();
    let evidence = anchor(&env, &client, &submitter, &None);

    client.revoke_attestation(
        &admin,
        &symbol_short!("bank_chg"),
        &evidence,
        &Symbol::new(&env, "supervisory"),
    );

    let record = client
        .verify_attestation(&symbol_short!("bank_chg"), &evidence)
        .unwrap();
    assert_eq!(record.verdict, Verdict::Pass);
    assert_eq!(record.issued_at, T0);
}

// --- admin surface, unchanged from v1 ---

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn authorize_submitter_is_admin_only() {
    let (env, _admin, submitter, client) = setup();
    let fake_admin = Address::generate(&env);
    client.authorize_submitter(&fake_admin, &submitter, &true);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn configure_use_case_is_admin_only() {
    let (env, _admin, _submitter, client) = setup();
    let fake_admin = Address::generate(&env);
    client.configure_use_case(
        &fake_admin,
        &symbol_short!("bank_chg"),
        &UseCaseConfig {
            active: true,
            min_pack_version: 1,
        },
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn register_blocked_when_use_case_inactive() {
    let (env, admin, submitter, client) = setup();
    client.configure_use_case(
        &admin,
        &symbol_short!("bank_chg"),
        &UseCaseConfig {
            active: false,
            min_pack_version: 1,
        },
    );
    anchor(&env, &client, &submitter, &None);
}

#[test]
fn authorization_is_readable() {
    let (env, admin, submitter, client) = setup();
    assert!(client.is_submitter_authorized(&submitter));

    client.authorize_submitter(&admin, &submitter, &false);
    assert!(!client.is_submitter_authorized(&submitter));

    let stranger = Address::generate(&env);
    assert!(!client.is_submitter_authorized(&stranger));
}
