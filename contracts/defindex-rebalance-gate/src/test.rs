#![cfg(test)]

use super::*;
use anticorruption_attestation::{
    AntiCorruptionAttestation, AntiCorruptionAttestationClient,
    UseCaseConfig as AttestationUseCaseConfig, Verdict as AttestationVerdict,
};
use por_verifier::PorVerifier;
use soroban_sdk::{
    contract, contractimpl,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    symbol_short,
    testutils::{Address as _, Ledger as _},
    vec, Address, BytesN, Env, Symbol, U256, Vec,
};

#[contract]
struct MockDefindexVault;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
enum VaultDataKey {
    Role,
    Count,
    LastCaller,
    LastInstructions,
}

#[contractimpl]
impl MockDefindexVault {
    pub fn __constructor(env: Env, role: Address) {
        env.storage().instance().set(&VaultDataKey::Role, &role);
        env.storage().instance().set(&VaultDataKey::Count, &0u32);
    }

    pub fn rebalance(env: Env, caller: Address, instructions: Vec<DefindexInstruction>) {
        let role: Address = env.storage().instance().get(&VaultDataKey::Role).unwrap();
        if caller != role {
            panic_with_error!(&env, GateError::Unauthorized);
        }
        caller.require_auth();
        let count: u32 = env
            .storage()
            .instance()
            .get(&VaultDataKey::Count)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&VaultDataKey::Count, &(count + 1));
        env.storage()
            .instance()
            .set(&VaultDataKey::LastCaller, &caller);
        env.storage()
            .instance()
            .set(&VaultDataKey::LastInstructions, &instructions);
    }

    pub fn call_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&VaultDataKey::Count)
            .unwrap_or(0)
    }

    pub fn last_caller(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&VaultDataKey::LastCaller)
            .unwrap()
    }

    pub fn last_instructions(env: Env) -> Vec<DefindexInstruction> {
        env.storage()
            .instance()
            .get(&VaultDataKey::LastInstructions)
            .unwrap()
    }
}

fn attestation_cfg() -> AttestationUseCaseConfig {
    AttestationUseCaseConfig {
        active: true,
        predicate_set: symbol_short!("pulso"),
        predicate_version: 1,
    }
}

fn setup() -> (
    Env,
    Address,
    Address,
    Address,
    AntiCorruptionAttestationClient<'static>,
    MockDefindexVaultClient<'static>,
    DefindexRebalanceGateClient<'static>,
    Symbol,
    Symbol,
    u64,
    u64,
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let submitter = Address::generate(&env);
    let operator = Address::generate(&env);
    let use_case = symbol_short!("pulso_df");
    let scope = symbol_short!("invest");
    let nonce = 7u64;
    let expires_at = 1_000u64;

    env.ledger().set_timestamp(100);

    let attestation_id = env.register(AntiCorruptionAttestation, (admin.clone(),));
    let attestation = AntiCorruptionAttestationClient::new(&env, &attestation_id);

    let gate_id = env.register(
        DefindexRebalanceGate,
        (
            admin.clone(),
            attestation_id.clone(),
            Address::generate(&env),
            use_case.clone(),
        ),
    );
    let gate = DefindexRebalanceGateClient::new(&env, &gate_id);

    let vault_id = env.register(MockDefindexVault, (gate_id.clone(),));
    let vault = MockDefindexVaultClient::new(&env, &vault_id);
    gate.set_vault_contract(&admin, &vault_id);

    attestation.authorize_submitter(&admin, &submitter, &true);
    attestation.configure_use_case(&admin, &use_case, &attestation_cfg());
    gate.authorize_operator(&admin, &operator, &true);

    (
        env,
        admin,
        submitter,
        operator,
        attestation,
        vault,
        gate,
        use_case,
        scope,
        nonce,
        expires_at,
    )
}

fn register_pass_attestation(
    submitter: &Address,
    attestation: &AntiCorruptionAttestationClient<'static>,
    use_case: &Symbol,
    evidence: &BytesN<32>,
) {
    let metadata = evidence.clone();
    attestation.register_attestation(
        submitter,
        use_case,
        &AttestationVerdict::Pass,
        evidence,
        &metadata,
    );
}

const VK_ALPHA: &str = "2cec5151e2fdedfcdbe288e824373bca017c15e0c956ad7e2ae1a19c71e55ddb1919755f45dc0e9e1b8d741fe603415a48bbd6ddaf4e47d840b3407b7750517e";
const VK_BETA: &str = "0220b010d35eb26a60fe065ced7ea45d133f805f597fc9e69b3c3e2db266ebd316da8a35d9e89bf0df1ae6fe83197f832a70929d5f995f391cca8a778ec333472d04f6cec34536982004c719aff2f6fe7ecb2d538fc6dcf227beaf4b755f4cc110ea7bf90ae597d25684de7fa7b0e0451635eaaf03420ed7afe43b8f5f0544b3";
const VK_GAMMA: &str = "198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa";
const VK_DELTA: &str = "1dc73e4d393b47d61fc6cd3492b68c4f6d143050f9ecf7c452df42e3e03f44db129b4023d9ab2a2d7b1507e847390a372b9efe9379441b7d5b6162c455d58b200e07518b96e69a9faa1f984ca2bebd3741bf39d18b555975bb95e37be1c4929e214cbef78ce932ee804b4956805d5ba7572b810fa097751aeab1467b0e7b0041";
const VK_IC0: &str = "02a0e2865fa13db1115575f90d9ab27bd507e75b08bd4491ddc711ecf33cf2331fc4866cab4d7dbb3def3061e29852306f4d5c459bc21501d3361eb8bde7abc9";
const VK_IC1: &str = "2797d0d429e5ad9ea9a67b08878921e71a19f4e3e5c563ceec4fc7ad23f15a6d24489c6f318cb2085dc608830ff60e1a1e7c28bfce2fecb5e1aa6eb41eaefbe2";
const VK_IC2: &str = "2fa62a941ec345e793ac934d6a6a4227f94c3e81880fa2d03a1ecacd7f5f695e085134d9279694ed1adda33e5a7f3505649d43548951f97d7b7e56c692de8821";
const VK_IC3: &str = "136d4cdb127c973a4c333c1d8706748355ae2e6341af682e677142f561f644c71bf98dadd9cb1d95a43607bcaa1e3eb7e4c0b1497c53317bea3d7680ed849b78";
const PROOF_A: &str = "17fb939eb38db0c10a7e0b5a085693e60d6102139a84daba52327fa0f46cc7f811300a82bfeea13a2643159fc1e4c2693c0a579653aa4e13712504f971e0d8c9";
const PROOF_B: &str = "065335e9ea6a003bf476c041851497fa7f38c347f5657811184afcd45ff749271d7ecce72791de0bf4c4f1d8e1c1ebd5713cfbdd9817c48c632c76e20f6f7de01bd4ce978bed8ed420a36af6236bc3198f0b04ecfb88c8e1e8dd01cf057b95d02447d67f948e31b4fe86726d9516926b1a82946d84d360fb1891d593b9a594e0";
const PROOF_C: &str = "09b2d0f5bf320034b9e2166073d02961b503aeda5579bde14848f190b254479c1d1d07635544bdaab4511732162f4d3ae33c1fc1fe4e0e52fc2ffcc023ea666d";
const PUB_SOLVENT_ONE: &str = "0000000000000000000000000000000000000000000000000000000000000001";
const PUB_SOLVENT_ZERO: &str = "0000000000000000000000000000000000000000000000000000000000000000";
const PUB_COMMIT: &str = "2e1015154eccba498ea60399e4a1f8fc264f0f1ca41643e359eb74fb12c39125";
const PUB_CONTEXT_SAMPLE: &str = "00a07a7e7f20e6f06d9692a8785fe7dc837f6094e817b3bbbe735be0c1db8ba0";

fn g1(env: &Env, h: &str) -> Bn254G1Affine {
    let arr: [u8; 64] = hex::decode(h).unwrap().try_into().unwrap();
    Bn254G1Affine::from_array(env, &arr)
}

fn g2(env: &Env, h: &str) -> Bn254G2Affine {
    let arr: [u8; 128] = hex::decode(h).unwrap().try_into().unwrap();
    Bn254G2Affine::from_array(env, &arr)
}

fn fr(env: &Env, h: &str) -> Bn254Fr {
    let arr: [u8; 32] = hex::decode(h).unwrap().try_into().unwrap();
    Bn254Fr::from_u256(U256::from_be_bytes(
        env,
        &soroban_sdk::Bytes::from_array(env, &arr),
    ))
}

fn por_vk(env: &Env) -> PorVk {
    PorVk {
        alpha: g1(env, VK_ALPHA),
        beta: g2(env, VK_BETA),
        gamma: g2(env, VK_GAMMA),
        delta: g2(env, VK_DELTA),
        ic: Vec::from_array(
            env,
            [
                g1(env, VK_IC0),
                g1(env, VK_IC1),
                g1(env, VK_IC2),
                g1(env, VK_IC3),
            ],
        ),
    }
}

fn por_proof(env: &Env) -> PorProof {
    PorProof {
        a: g1(env, PROOF_A),
        b: g2(env, PROOF_B),
        c: g1(env, PROOF_C),
    }
}

fn signals_for_context(env: &Env, context_hex: &str) -> Vec<Bn254Fr> {
    vec![
        env,
        fr(env, PUB_SOLVENT_ONE),
        fr(env, PUB_COMMIT),
        fr(env, context_hex),
    ]
}

fn wire_verifier(env: &Env, admin: &Address, gate: &DefindexRebalanceGateClient<'static>) {
    let verifier = env.register(PorVerifier, ());
    gate.set_verifier(admin, &verifier, &por_vk(env));
}

#[test]
fn constructor_sets_core_fields() {
    let (_env, admin, _submitter, _operator, attestation, _vault, gate, use_case, _scope, _nonce, _expires_at) = setup();
    assert_eq!(gate.admin(), admin);
    assert_eq!(gate.attestation_contract(), attestation.address);
    assert_eq!(gate.use_case_id(), use_case);
}

#[test]
fn execute_rebalance_happy_path_forwards_to_vault() {
    let (env, _admin, submitter, operator, attestation, vault, gate, use_case, scope, nonce, expires_at) = setup();
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy.clone(), 42)]);
    let evidence = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &instructions);
    register_pass_attestation(&submitter, &attestation, &use_case, &evidence);

    gate.execute_rebalance(&operator, &scope, &nonce, &expires_at, &evidence, &instructions);

    assert_eq!(vault.call_count(), 1);
    assert_eq!(vault.last_caller(), gate.address.clone());
    assert_eq!(vault.last_instructions(), instructions);
}

#[test]
fn derive_evidence_hash_changes_when_payload_changes() {
    let (env, _admin, _submitter, operator, _attestation, _vault, gate, _use_case, scope, nonce, expires_at) = setup();
    let strategy = Address::generate(&env);
    let a = Vec::from_array(&env, [DefindexInstruction::Invest(strategy.clone(), 42)]);
    let b = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 43)]);

    let hash_a = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &a);
    let hash_b = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &b);

    assert_ne!(hash_a, hash_b);
}

#[test]
fn derive_zk_context_is_deterministic_and_field_safe() {
    let (env, _admin, _submitter, operator, _attestation, _vault, gate, _use_case, scope, nonce, expires_at) = setup();
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 42)]);
    let evidence = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &instructions);
    let ctx_a = gate.derive_zk_context(&evidence);
    let ctx_b = gate.derive_zk_context(&evidence);
    assert_eq!(ctx_a, ctx_b);
    assert_eq!(ctx_a.to_array()[0], 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn execute_rebalance_rejects_unknown_operator() {
    let (env, _admin, _submitter, _operator, _attestation, _vault, gate, _use_case, scope, nonce, expires_at) = setup();
    let rogue = Address::generate(&env);
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 42)]);
    let evidence = gate.derive_evidence_hash(&rogue, &scope, &nonce, &expires_at, &instructions);
    gate.execute_rebalance(&rogue, &scope, &nonce, &expires_at, &evidence, &instructions);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn execute_rebalance_rejects_missing_attestation() {
    let (env, _admin, _submitter, operator, _attestation, _vault, gate, _use_case, scope, nonce, expires_at) = setup();
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 42)]);
    let evidence = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &instructions);
    gate.execute_rebalance(&operator, &scope, &nonce, &expires_at, &evidence, &instructions);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn execute_rebalance_rejects_attestation_for_different_payload() {
    let (env, _admin, submitter, operator, attestation, _vault, gate, use_case, scope, nonce, expires_at) = setup();
    let strategy = Address::generate(&env);
    let live_instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy.clone(), 42)]);
    let mismatched_instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 99)]);
    let evidence_for_other_payload = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &mismatched_instructions);
    register_pass_attestation(&submitter, &attestation, &use_case, &evidence_for_other_payload);
    gate.execute_rebalance(&operator, &scope, &nonce, &expires_at, &evidence_for_other_payload, &live_instructions);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn execute_rebalance_rejects_non_pass_verdict() {
    let (env, _admin, submitter, operator, attestation, _vault, gate, use_case, scope, nonce, expires_at) = setup();
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 42)]);
    let alt = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &instructions);
    let metadata = BytesN::from_array(&env, &[8u8; 32]);
    attestation.register_attestation(
        &submitter,
        &use_case,
        &AttestationVerdict::Fail,
        &alt,
        &metadata,
    );
    gate.execute_rebalance(&operator, &scope, &nonce, &expires_at, &alt, &instructions);
}

#[test]
fn admin_can_rotate_vault_and_use_case() {
    let (env, admin, _submitter, operator, _attestation, _vault, gate, _use_case, _scope, _nonce, _expires_at) = setup();
    let new_use_case = symbol_short!("next_df");
    gate.set_use_case_id(&admin, &new_use_case);
    assert_eq!(gate.use_case_id(), new_use_case);

    let new_vault_id = env.register(MockDefindexVault, (gate.address.clone(),));
    gate.set_vault_contract(&admin, &new_vault_id);
    assert_eq!(gate.vault_contract(), new_vault_id);

    assert!(gate.is_operator(&operator));
    assert_eq!(gate.admin(), admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn execute_rebalance_rejects_expired_evidence() {
    let (env, _admin, submitter, operator, attestation, _vault, gate, use_case, scope, nonce, _expires_at) = setup();
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 42)]);
    let expires_at = 90u64;
    let evidence = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &instructions);
    register_pass_attestation(&submitter, &attestation, &use_case, &evidence);
    env.ledger().set_timestamp(100);
    gate.execute_rebalance(&operator, &scope, &nonce, &expires_at, &evidence, &instructions);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn execute_rebalance_rejects_replay() {
    let (env, _admin, submitter, operator, attestation, vault, gate, use_case, scope, nonce, expires_at) = setup();
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 42)]);
    let evidence = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &instructions);
    register_pass_attestation(&submitter, &attestation, &use_case, &evidence);

    gate.execute_rebalance(&operator, &scope, &nonce, &expires_at, &evidence, &instructions);
    assert_eq!(vault.call_count(), 1);
    gate.execute_rebalance(&operator, &scope, &nonce, &expires_at, &evidence, &instructions);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn execute_rebalance_with_proof_fails_closed_without_verifier() {
    let (env, _admin, _submitter, operator, _attestation, _vault, gate, _use_case, scope, nonce, expires_at) = setup();
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 42)]);
    let evidence = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &instructions);
    let expected_ctx = gate.derive_zk_context(&evidence);
    let signals = vec![
        &env,
        fr(&env, PUB_SOLVENT_ONE),
        fr(&env, PUB_COMMIT),
        Bn254Fr::from_u256(U256::from_be_bytes(
            &env,
            &soroban_sdk::Bytes::from_array(&env, &expected_ctx.to_array()),
        )),
    ];
    gate.execute_rebalance_with_proof(
        &operator,
        &scope,
        &nonce,
        &expires_at,
        &evidence,
        &instructions,
        &por_proof(&env),
        &signals,
    );
}

#[test]
fn execute_rebalance_with_proof_happy_path_forwards_to_vault() {
    let (env, admin, _submitter, operator, _attestation, vault, gate, _use_case, scope, nonce, expires_at) = setup();
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 42)]);
    let evidence = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &instructions);
    let expected_ctx = gate.derive_zk_context(&evidence);
    assert_eq!(hex::encode(expected_ctx.to_array()), PUB_CONTEXT_SAMPLE);
    wire_verifier(&env, &admin, &gate);

    gate.execute_rebalance_with_proof(
        &operator,
        &scope,
        &nonce,
        &expires_at,
        &evidence,
        &instructions,
        &por_proof(&env),
        &signals_for_context(&env, PUB_CONTEXT_SAMPLE),
    );

    assert_eq!(vault.call_count(), 1);
    assert_eq!(vault.last_caller(), gate.address.clone());
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn execute_rebalance_with_proof_rejects_wrong_context() {
    let (env, admin, _submitter, operator, _attestation, _vault, gate, _use_case, scope, nonce, expires_at) = setup();
    wire_verifier(&env, &admin, &gate);
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 42)]);
    let evidence = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &instructions);
    gate.execute_rebalance_with_proof(
        &operator,
        &scope,
        &nonce,
        &expires_at,
        &evidence,
        &instructions,
        &por_proof(&env),
        &signals_for_context(&env, PUB_CONTEXT_SAMPLE),
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn execute_rebalance_with_proof_rejects_non_pass_signal() {
    let (env, admin, _submitter, operator, _attestation, _vault, gate, _use_case, scope, nonce, expires_at) = setup();
    wire_verifier(&env, &admin, &gate);
    let strategy = Address::generate(&env);
    let instructions = Vec::from_array(&env, [DefindexInstruction::Invest(strategy, 42)]);
    let evidence = gate.derive_evidence_hash(&operator, &scope, &nonce, &expires_at, &instructions);
    let expected_ctx = gate.derive_zk_context(&evidence);
    let signals = vec![
        &env,
        fr(&env, PUB_SOLVENT_ZERO),
        fr(&env, PUB_COMMIT),
        Bn254Fr::from_u256(U256::from_be_bytes(
            &env,
            &soroban_sdk::Bytes::from_array(&env, &expected_ctx.to_array()),
        )),
    ];
    gate.execute_rebalance_with_proof(
        &operator,
        &scope,
        &nonce,
        &expires_at,
        &evidence,
        &instructions,
        &por_proof(&env),
        &signals,
    );
}
