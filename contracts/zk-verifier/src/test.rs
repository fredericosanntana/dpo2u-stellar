#![cfg(test)]
//! Teste E2E do verificador ZK: uma prova Groth16/BLS12-381 REAL — gerada pelo
//! `zk-prover/` para o enunciado "score >= threshold" (score=85 PRIVADO,
//! threshold=70 PÚBLICO) — é verificada on-chain-logic pelo contrato.
//!
//! Os hex abaixo são a saída literal de `cargo run` em zk-prover (uncompressed).
extern crate std;

use soroban_sdk::{
    crypto::bls12_381::{Bls12381Fr, Bls12381G1Affine, Bls12381G2Affine},
    vec, Env, Vec, U256,
};

use crate::{Proof, VerificationKey, ZkVerifier, ZkVerifierClient};

const VK_ALPHA: &str = "11c95928f9f7e176f14db362f497f575ee81cca2557adb441a9e5b0c6dd73f8e41ca153ac7223fc66cef7cd4ade3aef206dfea96412873901f92fb7fbcf310cd7e7e1780bb36bd58aa5b68025350e5894dadd21185a1ab19a22d645bd03ef1a9";
const VK_BETA: &str = "0b9fc11b24f79a2fc0014d1e776e3bf2fad2f3d2ecfafb0f218e79d1c185f5475de37bd00c65e8a655ff20b52459874f015060d19fb32f307b07252bc4a1109ff48dc5e8d81b0149d78872fcece70daef960b31269fa739d5a828a5fd5d334be07844ab0153ad4fe9cbeb332c849b600d90ea183685d1bc296b753805c0c925c46e4b6456463efa37c61d0ff328838520c1dcce97e5392f151609fd4640be60b85bb5df0a2a733f3f6bbb9aaa1f4e314f5bb62736a0ea2746a9e187aa6d6254c";
const VK_GAMMA: &str = "03459a9683c64f9461b507873a44a71dab2ef9b330414045cf3663d3b364526976ecf83e1ac0251125efb0eb09d88a0a093db221294356f8481692201d436062f10d23058b9836262357636e494a971421af1c55e6548bf50d14c28c10c179ec01ebb9c75e3ef868f8f533536aadee00aa455491c5e14bee2e3b82f5abe67ee48faca33d0ae4f8c6f9609586b0264daa0db16c60f1385077e26c01bdb3407c037250954b153e82072ef7c5ec6667e0d21e206bf427a3d0b66a5f7f088b932ac3";
const VK_DELTA: &str = "02eb56d6b4b2d6a57c50f62be8ba087dfa697c059d39bec29d7458b360fbf06514db0e0fa18fa269b5dc0e51574ad55900b63e59e2b84da4ed3625affcb2f43381ccf08fa6ae5faa7ae78e781c4146818c377a5d211a11a16dbc7762b2674fd600b3ae5fac1284704330f12247ce2f6a4f034340f51b64e814898d85ee8ebe1f34ce1bcb373b64950183ab00e43b25b6130e8779ee83a18672e24a541dbdda7ee6f1c27c71381f1e031d73c7c1876d431ff25017c8e298626f6a42121b684a3b";
const VK_IC0: &str = "0fbb5cde401aeef0ff264795104494a31f9f552d38b4a838e518d54bf59832057eca2b3e29fa4b1e647c023d3a91cfa3159e6188b434522a8d83a7c48d9a1ffd9dbfcda9474d1980cac9a95e9c540b7157ba6a2d16c5ac5344d67d3ddb68d63d";
const VK_IC1: &str = "14052cf708efd382ab7bfe1bd3b870913e45de153959177ac6e79b3b58966a6412605f95876afbf4bbec8af72ddd0af31645ab43a6644f425d89dc724bc54604f555970448c336d4d226e2f583c1820a64c3b6c7a3ee1f4fa4569ac8637b083d";
const PROOF_A: &str = "172a30d59fe091addd32226a3a84edcdcd6330a22f16e46049329d6008287dc731d31d27d1193733d337f05af1ebd58802fd313d2147cfe83971046e741226e9020dc4728f0624608d4b622f243b3df5d01d6bb811843df3259cd50291d99ef2";
const PROOF_B: &str = "196a98c4a094d05be21b348a0e7350c6260433637ba8d6b2856f1b283bad28849792685e7dac938b8ba9a0df2ab9a63a11f7ade506c16d5ce2b64b2903ff06d1fb4f064a8caf4f3b021b9e01e97acdca6c93a126ce960bfd8504737269fe88f912c1aadfed042442226bf85bd2da52fc1336bee5b0609c19f3dc68cf358fcf977e122aab406ef4c60e29020e7c4c07ce0e583568321d332e6df45c7195420f092af37d0827df169e6d17e3cc1735dd9c9427a8ebf564a6ef06f96b440db5873e";
const PROOF_C: &str = "17e831b5f18ae032b9ee4c5dd3b33f5e76cebf327098107e683b10894b0c15f5039459f6c1f678b04d69c98994690f060c112764ea9d84d73b7e368fd6aa2e218a679ccc9556d7f6bbbda267483a563cf17b8a38db38d66728f5136bfe465e02";

fn g1(env: &Env, h: &str) -> Bls12381G1Affine {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 96] = bytes.try_into().expect("G1 = 96 bytes uncompressed");
    Bls12381G1Affine::from_array(env, &arr)
}

fn g2(env: &Env, h: &str) -> Bls12381G2Affine {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 192] = bytes.try_into().expect("G2 = 192 bytes uncompressed");
    Bls12381G2Affine::from_array(env, &arr)
}

fn vk(env: &Env) -> VerificationKey {
    VerificationKey {
        alpha: g1(env, VK_ALPHA),
        beta: g2(env, VK_BETA),
        gamma: g2(env, VK_GAMMA),
        delta: g2(env, VK_DELTA),
        ic: Vec::from_array(env, [g1(env, VK_IC0), g1(env, VK_IC1)]),
    }
}

fn proof(env: &Env) -> Proof {
    Proof {
        a: g1(env, PROOF_A),
        b: g2(env, PROOF_B),
        c: g1(env, PROOF_C),
    }
}

fn threshold_signal(env: &Env, t: u32) -> Vec<Bls12381Fr> {
    vec![env, Bls12381Fr::from_u256(U256::from_u32(env, t))]
}

#[test]
fn verifies_real_proof_for_correct_threshold() {
    let env = Env::default();
    let client = ZkVerifierClient::new(&env, &env.register(ZkVerifier {}, ()));
    // A prova foi gerada para threshold PÚBLICO = 70; score=85 nunca aparece.
    let res = client.verify_proof(&vk(&env), &proof(&env), &threshold_signal(&env, 70));
    assert_eq!(res, true, "prova válida deveria verificar");
}

#[test]
fn rejects_proof_for_wrong_threshold() {
    let env = Env::default();
    let client = ZkVerifierClient::new(&env, &env.register(ZkVerifier {}, ()));
    // Mesmo proof, sinal público adulterado (71) — deve falhar.
    let res = client.verify_proof(&vk(&env), &proof(&env), &threshold_signal(&env, 71));
    assert_eq!(res, false, "sinal público adulterado deveria ser rejeitado");
}

// Defensivo (shake-down): contagem de sinais ≠ |ic|-1 ⇒ Err(MalformedVerifyingKey),
// nunca panic. A vk de teste tem ic.len()=2 (1 sinal esperado); passar 2 sinais dispara o erro.
#[test]
fn rejects_malformed_vk_signal_count_mismatch() {
    let env = Env::default();
    let client = ZkVerifierClient::new(&env, &env.register(ZkVerifier {}, ()));
    let two = vec![
        &env,
        Bls12381Fr::from_u256(U256::from_u32(&env, 70)),
        Bls12381Fr::from_u256(U256::from_u32(&env, 1)),
    ];
    let res = client.try_verify_proof(&vk(&env), &proof(&env), &two);
    assert!(
        res.is_err(),
        "contagem de sinais desalinhada deveria retornar Err, não panic"
    );
}
