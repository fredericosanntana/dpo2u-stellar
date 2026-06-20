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

const VK_ALPHA: &str = "25c0a9f50b8be4b19c6b63d8dd2a423c857d564afaf019e83564a3cbf09ff19d17e5cb6a2c2fbcb435b8b6e7ff78d84331b54902b6e8ae51610a9b83d6e16cea";
const VK_BETA: &str = "2d376addea28e1bf7bf5a35017f1fc1c9cbfcc52759ea2e0ed6c7ebc15707d8f2c790120a05bb3e252f9a9e893a0d701c40eb1ea9b2ee0ade3ef591e7ff140550b516ffd50fd69eed72dc2b29c52c3a21aa67bdbd62e99d9eafabf792ba3a323218b4dab5dd7144d28f7e59fe2160d8e89e69155e077b2f140687e30421fcd9a";
const VK_GAMMA: &str = "198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa";
const VK_DELTA: &str = "0ceaf61f02a75d9dd8186621803066f0fd6d5d2d3fbe951ec79759f21a1a8ede13d47c30dd2d768f9542a61391c8db3dd3d92f081579b01037c8ef60abd6420820034f2c714ac8e35836a769f6820d2a3ea2cb80470283a641c5d7a4675be4d9255c557b13f31579756faa749b884b1f437caf18ce674953973951f68b05604c";
const VK_IC0: &str = "01915bad62d407ad87907b0e7324f609e6e2ccea293244a6935393df069f8c9a1f1c51ddccb60d55a253f35fe798ac0d6cab9670c24b2cb3ca27dbb366ca185d";
const VK_IC1: &str = "2a1455a07384ee30b8a6c08edc77465ace7523dbdbe8ba047e3e624f56fce7e9149480295950f11995a083be9ab46dad51f7d2d8b3dfc0438227efd6f427d6fe";
const VK_IC2: &str = "2b6cde630f48341360966fe560d22af3343782885828ce1b53e085b4acfab1e322c932d41f51f79f83a133a10cd7a6619ce0712fb89a88ebfccb3e2df6f041d8";
const VK_IC3: &str = "0cd610b8d45cb7522c59f004bf9e12208f1caaaf2c963220f4f1c25e656f31d125438e1c2e92f8de5fc567840ae20cb783248ab5a0332f6bb76d95889462f02f";
const PROOF_A: &str = "0cacc8ea440d8d9ddfb4f8d5788420953047ce8aaa699bd06eaf9aefb7c475b11420227ef463449fbb5f6c8b26fb56a7988fcd63e841ce179605b2740ba4854a";
const PROOF_B: &str = "2433cf1e541cb4a41535854059e9d6292fe9b232822642d9935d189c71becd6b13e6fc207aa4d91d746ee85d0c4e6835c14fe338f5bf82cefd6fc909061b7cf50a257752493c802dbd68db031d549add247fd773c93df9dc2d3cfaaa677f61b5059dac60d0634636e6b912458406804915b1fc66185b5b37f69d0e0f349ad2a4";
const PROOF_C: &str = "21e612c87e3fc27a9db8abdfa2e0543aaee3065a3e20b0ba2314a27372e42b27180845f2b8f2aa128f2ece44430a919d5b3c5fba1e002069737a743a5fc66cfa";
const PUB_POLICY_PASS_ONE: &str = "0000000000000000000000000000000000000000000000000000000000000001";
const PUB_POLICY_PASS_ZERO: &str = "0000000000000000000000000000000000000000000000000000000000000000";
const PUB_POLICY_COMMIT: &str = "0ad8765d851bf1d46866debe73a7ceb6b6cbef879d28d36da82c9c0c2c65ef32";
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

fn policy_vk(env: &Env) -> PorVk {
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

fn policy_proof(env: &Env) -> PorProof {
    PorProof {
        a: g1(env, PROOF_A),
        b: g2(env, PROOF_B),
        c: g1(env, PROOF_C),
    }
}

fn signals_for_context(env: &Env, context_hex: &str) -> Vec<Bn254Fr> {
    vec![
        env,
        fr(env, PUB_POLICY_PASS_ONE),
        fr(env, PUB_POLICY_COMMIT),
        fr(env, context_hex),
    ]
}

fn wire_verifier(env: &Env, admin: &Address, gate: &DefindexRebalanceGateClient<'static>) {
    let verifier = env.register(PorVerifier, ());
    gate.set_verifier(admin, &verifier, &policy_vk(env));
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
        fr(&env, PUB_POLICY_PASS_ONE),
        fr(&env, PUB_POLICY_COMMIT),
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
        &policy_proof(&env),
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
        &policy_proof(&env),
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
        &policy_proof(&env),
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
        fr(&env, PUB_POLICY_PASS_ZERO),
        fr(&env, PUB_POLICY_COMMIT),
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
        &policy_proof(&env),
        &signals,
    );
}
