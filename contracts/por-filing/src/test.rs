#![cfg(test)]

use super::*;
use soroban_sdk::{
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    symbol_short, testutils::Address as _, vec, Address, BytesN, Env, U256,
};
use por_verifier::PorVerifier;

fn setup() -> (Env, Address, Address, Symbol, PorFilingClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(PorFiling, (admin.clone(),));
    let client = PorFilingClient::new(&env, &contract_id);
    let submitter = Address::generate(&env);
    let psav = symbol_short!("Z1234567"); // psav_code Z+7 (público, não-PII)
    // PSAV ativa + submitter autorizado.
    client.register_psav(&admin, &psav, &true);
    client.authorize_submitter(&admin, &submitter, &true);
    (env, admin, submitter, psav, client)
}

#[test]
fn constructor_sets_admin() {
    let (_e, admin, _s, _p, client) = setup();
    assert_eq!(client.admin(), admin);
}

#[test]
fn seal_filing_happy_path() {
    let (env, _a, submitter, psav, client) = setup();
    let hash = BytesN::from_array(&env, &[7u8; 32]);
    client.seal_filing(
        &submitter,
        &psav,
        &DocType::Por5710,
        &20260228u32,
        &TipoRemessa::Inclusao,
        &hash,
    );
    let seal = client
        .get_filing(&psav, &DocType::Por5710, &20260228u32)
        .unwrap();
    assert_eq!(seal.filing_hash, hash);
    assert_eq!(seal.revision, 0);
    assert_eq!(seal.doc_type, DocType::Por5710);
    assert_eq!(seal.data_base, 20260228u32);
}

#[test]
fn substituicao_increments_revision() {
    let (env, _a, submitter, psav, client) = setup();
    let h0 = BytesN::from_array(&env, &[1u8; 32]);
    let h1 = BytesN::from_array(&env, &[2u8; 32]); // hash novo = substituição
    client.seal_filing(&submitter, &psav, &DocType::Custody5711, &20260301u32, &TipoRemessa::Inclusao, &h0);
    client.seal_filing(&submitter, &psav, &DocType::Custody5711, &20260301u32, &TipoRemessa::Substituicao, &h1);
    let seal = client
        .get_filing(&psav, &DocType::Custody5711, &20260301u32)
        .unwrap();
    assert_eq!(seal.revision, 1);
    assert_eq!(seal.filing_hash, h1);
}

#[test]
fn identical_resend_is_idempotent_noop() {
    let (env, _a, submitter, psav, client) = setup();
    let h = BytesN::from_array(&env, &[9u8; 32]);
    client.seal_filing(&submitter, &psav, &DocType::Por5710, &20260228u32, &TipoRemessa::Inclusao, &h);
    // Reenvio idêntico (mesmo hash) → não incrementa revisão.
    client.seal_filing(&submitter, &psav, &DocType::Por5710, &20260228u32, &TipoRemessa::Inclusao, &h);
    let seal = client.get_filing(&psav, &DocType::Por5710, &20260228u32).unwrap();
    assert_eq!(seal.revision, 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")] // NotAuthorized
fn unauthorized_submitter_fails() {
    let (env, _a, _s, psav, client) = setup();
    let stranger = Address::generate(&env);
    let h = BytesN::from_array(&env, &[3u8; 32]);
    client.seal_filing(&stranger, &psav, &DocType::Por5710, &20260228u32, &TipoRemessa::Inclusao, &h);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")] // PsavInactive
fn inactive_psav_fails() {
    let (env, admin, submitter, _p, client) = setup();
    let other = symbol_short!("Z7654321");
    // submitter já autorizado, mas PSAV 'other' nunca foi registrada/ativada.
    let _ = admin;
    let h = BytesN::from_array(&env, &[4u8; 32]);
    client.seal_filing(&submitter, &other, &DocType::Por5710, &20260228u32, &TipoRemessa::Inclusao, &h);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")] // AdminOnly
fn register_psav_admin_only() {
    let (env, _a, _s, _p, client) = setup();
    let fake_admin = Address::generate(&env);
    client.register_psav(&fake_admin, &symbol_short!("Z9999999"), &true);
}

#[test]
fn get_solvency_none_until_sealed() {
    let (_e, _a, _s, psav, client) = setup();
    // Sem seal_solvency ainda → reader devolve None.
    assert!(client.get_solvency(&psav, &20260228u32).is_none());
}

// ── Cunha 1-B — seal_solvency (ZK Proof-of-Reserve, BN254) ───────────────────
// Prova Groth16/BN254 REAL de zk-prover/por/build.sh (Σ reservas 4.25M ≥ Σ
// obrigações 3.98M; saldos privados). Hex = saída do snarkjs2soroban-bn254.js.

const VK_ALPHA: &str = "2cec5151e2fdedfcdbe288e824373bca017c15e0c956ad7e2ae1a19c71e55ddb1919755f45dc0e9e1b8d741fe603415a48bbd6ddaf4e47d840b3407b7750517e";
const VK_BETA: &str = "0220b010d35eb26a60fe065ced7ea45d133f805f597fc9e69b3c3e2db266ebd316da8a35d9e89bf0df1ae6fe83197f832a70929d5f995f391cca8a778ec333472d04f6cec34536982004c719aff2f6fe7ecb2d538fc6dcf227beaf4b755f4cc110ea7bf90ae597d25684de7fa7b0e0451635eaaf03420ed7afe43b8f5f0544b3";
const VK_GAMMA: &str = "198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa";
const VK_DELTA: &str = "1dc73e4d393b47d61fc6cd3492b68c4f6d143050f9ecf7c452df42e3e03f44db129b4023d9ab2a2d7b1507e847390a372b9efe9379441b7d5b6162c455d58b200e07518b96e69a9faa1f984ca2bebd3741bf39d18b555975bb95e37be1c4929e214cbef78ce932ee804b4956805d5ba7572b810fa097751aeab1467b0e7b0041";
const VK_IC0: &str = "02a0e2865fa13db1115575f90d9ab27bd507e75b08bd4491ddc711ecf33cf2331fc4866cab4d7dbb3def3061e29852306f4d5c459bc21501d3361eb8bde7abc9";
const VK_IC1: &str = "2797d0d429e5ad9ea9a67b08878921e71a19f4e3e5c563ceec4fc7ad23f15a6d24489c6f318cb2085dc608830ff60e1a1e7c28bfce2fecb5e1aa6eb41eaefbe2";
const VK_IC2: &str = "2fa62a941ec345e793ac934d6a6a4227f94c3e81880fa2d03a1ecacd7f5f695e085134d9279694ed1adda33e5a7f3505649d43548951f97d7b7e56c692de8821";
const VK_IC3: &str = "136d4cdb127c973a4c333c1d8706748355ae2e6341af682e677142f561f644c71bf98dadd9cb1d95a43607bcaa1e3eb7e4c0b1497c53317bea3d7680ed849b78";
const PROOF_A: &str = "0fe600771466e1ed961c66c31837b7033a9e702007cf6135d0d5c7bdd4f248b11b08dcd66196d5fca6de458c11cb135019735d8b6ac14b1e8644f64e5183a845";
const PROOF_B: &str = "10384e6b4f2b14ce9159987cd3d1e736dcc6867ddff53cca6469c1b4f10a0efd1b9e1da8e4ed87b679f4a3e6606ee76d3e1b98e4bb182f6a51459a8c37ef55bb2cd22148dea491ff37a54b6c856a21d648bcc93d6b8e0863594202aac9e950f229357b08c510dfafa0d197a22a778874ed0313a70abeff7a6c294261840dc8b5";
const PROOF_C: &str = "205ea7e4fb9703300bdb7093054f287f4c2ddf862315bcfbfb6608a6c37a26c1201992a74d98e0c3fef492c27fda23e9fcd6ef9bbacc89ee34a57a0ae0054e0d";
const PUB_SOLVENT: &str = "0000000000000000000000000000000000000000000000000000000000000001";
const PUB_COMMIT: &str = "2e1015154eccba498ea60399e4a1f8fc264f0f1ca41643e359eb74fb12c39125";
const PUB_CONTEXT: &str = "00000000000000000000000000000000000000000000000000000000075bcd15";

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
    Bn254Fr::from_u256(U256::from_be_bytes(env, &soroban_sdk::Bytes::from_array(env, &arr)))
}
fn por_vk(env: &Env) -> PorVk {
    PorVk {
        alpha: g1(env, VK_ALPHA),
        beta: g2(env, VK_BETA),
        gamma: g2(env, VK_GAMMA),
        delta: g2(env, VK_DELTA),
        ic: soroban_sdk::Vec::from_array(
            env,
            [g1(env, VK_IC0), g1(env, VK_IC1), g1(env, VK_IC2), g1(env, VK_IC3)],
        ),
    }
}
fn por_proof(env: &Env) -> PorProof {
    PorProof { a: g1(env, PROOF_A), b: g2(env, PROOF_B), c: g1(env, PROOF_C) }
}
fn signals(env: &Env, solvent: &str, commit: &str, context: &str) -> soroban_sdk::Vec<Bn254Fr> {
    vec![env, fr(env, solvent), fr(env, commit), fr(env, context)]
}
/// Registra o por-verifier no mesmo env e pina a vk no por-filing.
fn wire_verifier(env: &Env, admin: &Address, client: &PorFilingClient) {
    let verifier = env.register(PorVerifier, ());
    client.set_verifier(admin, &verifier, &por_vk(env));
}

#[test]
fn seal_solvency_happy_path() {
    let (env, admin, submitter, psav, client) = setup();
    wire_verifier(&env, &admin, &client);
    // ratio = 4.25M / 3.98M ≈ 1.0678 → 10678 bps (agregado disclosed).
    client.seal_solvency(
        &submitter,
        &psav,
        &20260331u32,
        &por_proof(&env),
        &signals(&env, PUB_SOLVENT, PUB_COMMIT, PUB_CONTEXT),
        &10678u32,
    );
    let claim = client.get_solvency(&psav, &20260331u32).unwrap();
    assert_eq!(claim.solvent, true);
    assert_eq!(claim.zk_verified, true);
    assert_eq!(claim.ratio_bps, 10678u32);
    // proof_context = sinal público `context` (binding anti-replay).
    let expected_ctx: BytesN<32> =
        BytesN::from_array(&env, &hex::decode(PUB_CONTEXT).unwrap().try_into().unwrap());
    assert_eq!(claim.proof_context, expected_ctx);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")] // VerifierNotSet (fail-closed)
fn seal_solvency_fails_without_verifier() {
    let (env, _a, submitter, psav, client) = setup();
    // set_verifier NUNCA chamado → fail-closed.
    client.seal_solvency(
        &submitter,
        &psav,
        &20260331u32,
        &por_proof(&env),
        &signals(&env, PUB_SOLVENT, PUB_COMMIT, PUB_CONTEXT),
        &10678u32,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")] // ZkVerifyFailed
fn seal_solvency_rejects_tampered_proof() {
    let (env, admin, submitter, psav, client) = setup();
    wire_verifier(&env, &admin, &client);
    // context público adulterado (replay) → a prova não verifica → fail-closed.
    let tampered = "00000000000000000000000000000000000000000000000000000000075bcd16";
    client.seal_solvency(
        &submitter,
        &psav,
        &20260331u32,
        &por_proof(&env),
        &signals(&env, PUB_SOLVENT, PUB_COMMIT, tampered),
        &10678u32,
    );
}
