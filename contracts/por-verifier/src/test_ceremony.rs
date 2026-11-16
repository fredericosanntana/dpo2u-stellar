#![cfg(test)]
//! ENSAIO da cerimônia PoR (BN254) → verificador on-chain. **NÃO é cerimônia de produção.**
//!
//! VK e prova abaixo saíram de `scripts/zk-ceremony-por/rehearsal.sh` (2026-10-02):
//! Phase 1 pública Hermez `powersOfTau28_hez_final_12.ptau` (blake2b publicado pelo snarkjs),
//! Phase 2 com 3 contribuições SIMULADAS na mesma máquina + beacon drand quicknet
//! round 32713294 (commit-reveal). Transcrição: `scripts/zk-ceremony-por/ensaio/`.
//! sha256(por_final.zkey)=a59add52…6940 · sha256(verification_key.json)=4b68403d…3da6.
//! Constantes geradas por `node scripts/zk-ceremony-por/06-rust-fixture.js ensaio/soroban-bn254.json`.
//!
//! Enunciado provado: Σ reservas (4.25M) ≥ Σ obrigações (3.98M), 4 ativos privados,
//! context=123456789. Sinais públicos [solvent, commit, context].
//!
//! Prova que o contrato (1) ACEITA a prova da nova zkey, (2) REJEITA prova adulterada,
//! (3) REJEITA a VK antiga (dev, `test.rs`) com a prova nova e vice-versa.
extern crate std;

use soroban_sdk::{vec, Env, Vec};

use crate::test::{fr, g1, g2};
use crate::{PorVerifier, PorVerifierClient, Proof, VerificationKey};

const CER_VK_ALPHA: &str = "2d4d9aa7e302d9df41749d5507949d05dbea33fbb16c643b22f599a2be6df2e214bedd503c37ceb061d8ec60209fe345ce89830a19230301f076caff004d1926";
const CER_VK_BETA: &str = "0967032fcbf776d1afc985f88877f182d38480a653f2decaa9794cbc3bf3060c0e187847ad4c798374d0d6732bf501847dd68bc0e071241e0213bc7fc13db7ab304cfbd1e08a704a99f5e847d93f8c3caafddec46b7a0d379da69a4d112346a71739c1b1a457a8c7313123d24d2f9192f896b7c63eea05a9d57f06547ad0cec8";
const CER_VK_GAMMA: &str = "198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c21800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa";
const CER_VK_DELTA: &str = "06c4dabb094fd21ef6f7c98316c04307cbe3eec1818f11150013fe9d6ce740f42abcf9672de09821160c491edbe4015faa7b48da92033068e1fe456afcab7bbc0fc54c8eea20cd7b1f450ab998abb19d5fe6ecab6cd5ff028d54963b6bce5c3e221476877d83abfb506f9454678329e84015191305e2ccfe6ba17d18ced19230";
const CER_VK_IC0: &str = "13b808198d617298c59c0715ef7df6f72a81f07b2a2f8eb627addd9401707836213f2ed8e116806872c161acaafc8ece2b309d34a08ce3255324f8f950afe622";
const CER_VK_IC1: &str = "18f00930a02b62849d6dddd66d9818637b5fbc489b7b2b6d93e7a8d12b21d4d82d7302f28e6a92b042dbcd053624246e4fdab7c960ea217d95b40c51163c8a75";
const CER_VK_IC2: &str = "1ec4f4a7ea808315981607470c87af29806d5c0f0c5ad34fdd4992c47895d969127e8b112be60b5b193b9fa0c7958b238e9d1af86570f48f19da04435f6bdfa3";
const CER_VK_IC3: &str = "0a8eb92b6c606d1fed060660b60a13532689361dab42f2ddcc94122b39112d160433a277b11da0e5ce78ff20b3c6c700e6e894f292f2e18ee2bed0aeb5572f99";
const CER_PROOF_A: &str = "03c27e675c9050b4f9e6368a902eccb3f37a3717888901e1ad9eb473eb49507b0e387944f3dfd3aabfa61d5c923d3dcdb2140242b753af1723afeed997b18793";
const CER_PROOF_B: &str = "20901c9bb8074bf77cfb1cabcf2f4450004e2e67fbf073bff1adf7c9b3cc5291236a21a9970cf835c1d75fc59d39587d52e50bd126a27808bf0563be57663fc32810e4f1e972e8d4b7235201dd14382c7c39538541b1199c7127d3f8f2eff5362ca2931a08dbcf45362135e513edb8e66d941a968f377e753d7c24734fbbfe91";
const CER_PROOF_C: &str = "153ef9c20eca29eb6eb7aad343148ba3eca1395d01188a18855bf9189ec35af1213da2aaf3d8b6d916092fcdcf3fdff2b5693efb1769d2e694f50a36e4258910";
const CER_PUB_SOLVENT: &str = "0000000000000000000000000000000000000000000000000000000000000001";
const CER_PUB_COMMIT: &str = "2e1015154eccba498ea60399e4a1f8fc264f0f1ca41643e359eb74fb12c39125";
const CER_PUB_CONTEXT: &str = "00000000000000000000000000000000000000000000000000000000075bcd15";

fn cer_vk(env: &Env) -> VerificationKey {
    VerificationKey {
        alpha: g1(env, CER_VK_ALPHA),
        beta: g2(env, CER_VK_BETA),
        gamma: g2(env, CER_VK_GAMMA),
        delta: g2(env, CER_VK_DELTA),
        ic: Vec::from_array(
            env,
            [
                g1(env, CER_VK_IC0),
                g1(env, CER_VK_IC1),
                g1(env, CER_VK_IC2),
                g1(env, CER_VK_IC3),
            ],
        ),
    }
}

fn cer_proof(env: &Env) -> Proof {
    Proof {
        a: g1(env, CER_PROOF_A),
        b: g2(env, CER_PROOF_B),
        c: g1(env, CER_PROOF_C),
    }
}

fn cer_signals(env: &Env) -> Vec<soroban_sdk::crypto::bn254::Bn254Fr> {
    vec![
        env,
        fr(env, CER_PUB_SOLVENT),
        fr(env, CER_PUB_COMMIT),
        fr(env, CER_PUB_CONTEXT),
    ]
}

fn client(env: &Env) -> PorVerifierClient<'_> {
    PorVerifierClient::new(env, &env.register(PorVerifier {}, ()))
}

#[test]
fn ceremony_vk_accepts_ceremony_proof() {
    let env = Env::default();
    let ok = client(&env).verify_proof(&cer_vk(&env), &cer_proof(&env), &cer_signals(&env));
    assert!(ok, "prova gerada com a zkey do ensaio deveria verificar on-chain");
}

#[test]
fn ceremony_vk_rejects_tampered_proof_negated_a() {
    // Adulteração "válida como ponto": A → -A (continua em G1, quebra a equação).
    let env = Env::default();
    let mut p = cer_proof(&env);
    p.a = -p.a;
    let ok = client(&env).verify_proof(&cer_vk(&env), &p, &cer_signals(&env));
    assert!(!ok, "prova com A adulterado deveria ser rejeitada");
}

#[test]
fn ceremony_vk_rejects_tampered_proof_swapped_c() {
    // C trocado por A (ponto válido, prova falsa).
    let env = Env::default();
    let mut p = cer_proof(&env);
    p.c = g1(&env, CER_PROOF_A);
    let ok = client(&env).verify_proof(&cer_vk(&env), &p, &cer_signals(&env));
    assert!(!ok, "prova com C adulterado deveria ser rejeitada");
}

#[test]
fn ceremony_vk_never_accepts_bitflipped_proof_bytes() {
    // 1 bit invertido nos bytes de C → em geral sai da curva: o host aborta (Err) ou
    // a equação falha (false). O que NUNCA pode acontecer é Ok(true).
    // Observado no ensaio (soroban-sdk 26): Err(Err(Abort)) — ponto fora da curva.
    let env = Env::default();
    let mut bytes = hex::decode(CER_PROOF_C).unwrap();
    bytes[63] ^= 0x01;
    let mut p = cer_proof(&env);
    p.c = g1(&env, &hex::encode(bytes));
    let res = client(&env).try_verify_proof(&cer_vk(&env), &p, &cer_signals(&env));
    assert!(
        !matches!(res, Ok(Ok(true))),
        "bytes adulterados nunca podem verificar: {:?}",
        res
    );
}

#[test]
fn ceremony_vk_rejects_tampered_public_signal() {
    let env = Env::default();
    let sig = vec![
        &env,
        fr(&env, CER_PUB_SOLVENT),
        fr(&env, CER_PUB_COMMIT),
        fr(&env, "00000000000000000000000000000000000000000000000000000000075bcd16"),
    ];
    let ok = client(&env).verify_proof(&cer_vk(&env), &cer_proof(&env), &sig);
    assert!(!ok, "context adulterado deveria ser rejeitado (anti-replay)");
}

#[test]
fn old_dev_vk_rejects_ceremony_proof() {
    // VK ANTIGA (setup dev de 1 parte, `test.rs`) + prova da zkey nova, MESMOS sinais
    // públicos (mesmo commit/context) → rejeita: a VK pinada decide qual setup vale.
    let env = Env::default();
    let ok = client(&env).verify_proof(&crate::test::vk(&env), &cer_proof(&env), &cer_signals(&env));
    assert!(!ok, "VK dev antiga não pode aceitar prova da cerimônia");
}

#[test]
fn ceremony_vk_rejects_old_dev_proof() {
    // E o inverso: prova antiga (zkey dev) contra a VK nova → rejeita. Trocar a VK
    // pinada invalida tudo que foi provado com o setup dev.
    let env = Env::default();
    let ok = client(&env).verify_proof(&cer_vk(&env), &crate::test::proof(&env), &cer_signals(&env));
    assert!(!ok, "prova do setup dev não pode verificar contra a VK da cerimônia");
}

#[test]
fn ceremony_vk_differs_from_dev_vk() {
    // Sanidade: gamma é fixo (gerador G2) em todo setup snarkjs; delta é o que a
    // Phase 2 randomiza — tem de ter mudado.
    assert_eq!(CER_VK_GAMMA, crate::test::VK_GAMMA);
    assert_ne!(CER_VK_DELTA, crate::test::VK_DELTA);
}
