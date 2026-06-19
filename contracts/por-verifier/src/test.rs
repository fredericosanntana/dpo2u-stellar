#![cfg(test)]
//! Teste E2E do verificador PoR/BN254: uma prova Groth16 REAL — gerada por
//! `zk-prover/por/build.sh` para o enunciado "Σ reservas ≥ Σ obrigações"
//! (reservas/obrigações por ativo PRIVADAS; sumR=4.25M ≥ sumL=3.98M) — é
//! verificada on-chain pelo contrato. Os hex são a saída literal do conversor
//! `snarkjs2soroban-bn254.js` (formato Ethereum-compatible).
//!
//! Public signals (ordem snarkjs = [outputs, public inputs]): [solvent, commit, context].
extern crate std;

use soroban_sdk::{
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    vec, Bytes, Env, Vec, U256,
};

use crate::{PorVerifier, PorVerifierClient, Proof, VerificationKey};

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

// public signals (32-byte big-endian)
const PUB_SOLVENT: &str = "0000000000000000000000000000000000000000000000000000000000000001";
const PUB_COMMIT: &str = "2e1015154eccba498ea60399e4a1f8fc264f0f1ca41643e359eb74fb12c39125";
const PUB_CONTEXT: &str = "00000000000000000000000000000000000000000000000000000000075bcd15";

fn g1(env: &Env, h: &str) -> Bn254G1Affine {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 64] = bytes.try_into().expect("G1 = 64 bytes (be(X)||be(Y))");
    Bn254G1Affine::from_array(env, &arr)
}

fn g2(env: &Env, h: &str) -> Bn254G2Affine {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 128] = bytes
        .try_into()
        .expect("G2 = 128 bytes (Fp2 = be(c1)||be(c0))");
    Bn254G2Affine::from_array(env, &arr)
}

fn fr(env: &Env, h: &str) -> Bn254Fr {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 32] = bytes.try_into().expect("Fr = 32 bytes big-endian");
    Bn254Fr::from_u256(U256::from_be_bytes(env, &Bytes::from_array(env, &arr)))
}

fn vk(env: &Env) -> VerificationKey {
    VerificationKey {
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

fn proof(env: &Env) -> Proof {
    Proof {
        a: g1(env, PROOF_A),
        b: g2(env, PROOF_B),
        c: g1(env, PROOF_C),
    }
}

fn signals(env: &Env, solvent: &str, commit: &str, context: &str) -> Vec<Bn254Fr> {
    vec![env, fr(env, solvent), fr(env, commit), fr(env, context)]
}

#[test]
fn verifies_real_por_proof() {
    let env = Env::default();
    let client = PorVerifierClient::new(&env, &env.register(PorVerifier {}, ()));
    // Σ reservas (4.25M) ≥ Σ obrigações (3.98M); saldos nunca aparecem.
    let res = client.verify_proof(
        &vk(&env),
        &proof(&env),
        &signals(&env, PUB_SOLVENT, PUB_COMMIT, PUB_CONTEXT),
    );
    assert_eq!(res, true, "prova PoR válida deveria verificar");
}

#[test]
fn rejects_tampered_context() {
    let env = Env::default();
    let client = PorVerifierClient::new(&env, &env.register(PorVerifier {}, ()));
    // Mesmo proof, context público adulterado (replay em outra data-base) — deve falhar.
    let tampered = "00000000000000000000000000000000000000000000000000000000075bcd16";
    let res = client.verify_proof(
        &vk(&env),
        &proof(&env),
        &signals(&env, PUB_SOLVENT, PUB_COMMIT, tampered),
    );
    assert_eq!(
        res, false,
        "context adulterado deveria ser rejeitado (anti-replay)"
    );
}

#[test]
fn rejects_tampered_commit() {
    let env = Env::default();
    let client = PorVerifierClient::new(&env, &env.register(PorVerifier {}, ()));
    let tampered = "2e1015154eccba498ea60399e4a1f8fc264f0f1ca41643e359eb74fb12c39126";
    let res = client.verify_proof(
        &vk(&env),
        &proof(&env),
        &signals(&env, PUB_SOLVENT, tampered, PUB_CONTEXT),
    );
    assert_eq!(res, false, "commitment adulterado deveria ser rejeitado");
}

#[test]
fn rejects_malformed_vk_signal_count_mismatch() {
    let env = Env::default();
    let client = PorVerifierClient::new(&env, &env.register(PorVerifier {}, ()));
    // ic.len()=4 ⇒ espera 3 sinais; passar 2 dispara Err, nunca panic.
    let two = vec![&env, fr(&env, PUB_SOLVENT), fr(&env, PUB_COMMIT)];
    let res = client.try_verify_proof(&vk(&env), &proof(&env), &two);
    assert!(
        res.is_err(),
        "contagem de sinais desalinhada deveria retornar Err"
    );
}
