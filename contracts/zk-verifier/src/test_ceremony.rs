#![cfg(test)]
//! Teste de PARIDADE da cerimônia REAL de trusted setup → verificador Soroban.
//!
//! VK final da cerimônia (Circom + snarkjs Phase 1+2 bls12381, **3 contribuições
//! multi-operador** + **beacon público drand round 6153120**), convertida por
//! `zk-prover/src/bin/snarkjs2soroban.rs`, é verificada pelo `verify_proof` on-chain.
//! Ver scripts/zk-ceremony/TRANSCRIPT.md. circuit_final sha 5ee14f05b0ea006b8d77…53324.
//!
//! Circuito: 2 sinais públicos [threshold, context]. threshold=70, context=1; score=85 PRIVADO.
extern crate std;

use soroban_sdk::{
    crypto::bls12_381::{Fr, G1Affine, G2Affine},
    vec, Env, U256, Vec,
};

use crate::{Proof, VerificationKey, ZkVerifier, ZkVerifierClient};

const VK_ALPHA: &str = "118ffb0ef4cedcd8480861e2ec33baade31979ba0677e426ca15554071cb02d58e018e08de332d73505965c1917c180e17ccfe0fe3c765913afc87fdf8c9f26d1205faddc8e03265c4c58de1867df5dbc481c038c4d0ffe545ce762766555b58";
const VK_BETA: &str = "08057c16d1d58a85a0a4205cd89605f8125b9bf1fcc6f3d05bd082e009341137b03db4a63c780ba213afa406541c68d7045367d3aad076a6d03b0b1f561d18969b265a29906d57cae5e9d522e189f0baf7d4946a7b77609c64d2e638308096f216fe01ada3b4b9efbbfd240cfb394ef97d9cc31cac91332d38b4ce3794513f1b9bed857117e7c424fcb320030202c42b15c5d227b8922d55387e77b557bd290f71bcef645fd1bf3ff52752176d781f239b98bb08f2763fddb609dd4cf6108856";
const VK_GAMMA: &str = "13e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb80606c4a02ea734cc32acd2b02bc28b99cb3e287e85a763af267492ab572e99ab3f370d275cec1da1aaa9075ff05f79be0ce5d527727d6e118cc9cdc6da2e351aadfd9baa8cbdd3a76d429a695160d12c923ac9cc3baca289e193548608b82801";
const VK_DELTA: &str = "0fe72958b6af19d106187f3d4d7b2da204ac68228ceda00b467dc4e1b3c222fa29db327cfc4ea5555888673ccb206e8902bd28708be3b2f1e3900bba8fb12cf2fbd9f57eb7314e0a01a36305fff583b29e71b4f2e5fc3108939caf781e6eefe517a842cd56dc3db5a498f73cb7c142076c6f5e966c19f9cf141e7cabbb5eba0fc76398c62699bc254964b80aaad186ca118c13cd8f9b5a3515260de74d0a573cd91ac39df969d631d1b45a0c49a341a8ef8a728128398faa55ef17d0238d031a";
const VK_IC0: &str = "166a0ce32a633ed1de85d3c4aaa41c8b9ea7734d281a76b2e2e1fb24256656a414ea8a0c0d59399175a72d6b1ce4feec094a77373e7ede450abf044e1be3f0d650b14c39890c2773c8f3b3a2b39826ee7dfe59b99f76059143a06b0cd4408027";
const VK_IC1: &str = "16fe8df8c2cab5e04b9b44c05a7bb27074a51c2aff046c17429848b558310c3a798b688a77e94edfef6932510eba587708127cfea23c5970894299539d10a5143907692bc25bc1ad4226e5d9d31215d5c82b03e9923c4c4671cb137fe7d9160a";
const VK_IC2: &str = "0d8fb49b99d5eb044cacce05a6adad475ec5caf6cb44de9fdae033a447ef11c4155c973910508c9d97bd22ce8555aa0f0672911b1da8aed3c4747c7cc2096005fe9690289277ca527947b9716c283f60ca4a6fc40cde35a45621db801d8da971";
const PROOF_A: &str = "06581a566aaa13c17b621df45a5e6cc098f099d097858408cd37549e6283c3c3c819a8937fba28f4b8e7ca785fa199a2072fed2b22aad1a548778b95326efb9bbd40f3957c3af3cd056d73ad351656227609933273c7cbe45fc945dc95435038";
const PROOF_B: &str = "018acd32cd89edee87c303de579a362ad2488125cdd15553e5111f8587d3f378e835f91a9452df6b751ff74fb4725c1e16337c44c03b8cffb915031599d5342a9bef3850626facabc17b7d320e46b848065cbf30a2e8b7d925062bb4bab9bee003e1de7c1099231512b0ae63471f35d28e24679a398c559a2a51e568af38106873e43d06be2dbddfd746c3fe537517f71086918f9bd79124c33cdff01aba72e24fc125d42441b1b6d8e544e69eedae1fb289b8943ec89b598e2b3db420677c38";
const PROOF_C: &str = "0f6b15b6079a84a4b2673ae3ca18902b8e00680f5b1f1a9cbb0a650d66472f3fe05d0d26fbf7031ccc42e839b5f5021f07031a534a3d422084f0fc1d92e5ffb6e4016dff6a10ffe4eb0f76b413c6af0a760513a58ede50e565be027b4bbb4db5";

fn g1(env: &Env, h: &str) -> G1Affine {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 96] = bytes.try_into().expect("G1 = 96 bytes uncompressed");
    G1Affine::from_array(env, &arr)
}

fn g2(env: &Env, h: &str) -> G2Affine {
    let bytes = hex::decode(h).unwrap();
    let arr: [u8; 192] = bytes.try_into().expect("G2 = 192 bytes uncompressed");
    G2Affine::from_array(env, &arr)
}

fn vk(env: &Env) -> VerificationKey {
    VerificationKey {
        alpha: g1(env, VK_ALPHA),
        beta: g2(env, VK_BETA),
        gamma: g2(env, VK_GAMMA),
        delta: g2(env, VK_DELTA),
        ic: Vec::from_array(env, [g1(env, VK_IC0), g1(env, VK_IC1), g1(env, VK_IC2)]),
    }
}

fn proof(env: &Env) -> Proof {
    Proof {
        a: g1(env, PROOF_A),
        b: g2(env, PROOF_B),
        c: g1(env, PROOF_C),
    }
}

/// Sinais públicos [threshold, context].
fn public_signals(env: &Env, threshold: u32, context: u32) -> Vec<Fr> {
    vec![
        env,
        Fr::from_u256(U256::from_u32(env, threshold)),
        Fr::from_u256(U256::from_u32(env, context)),
    ]
}

#[test]
fn ceremony_proof_verifies_onchain() {
    let env = Env::default();
    let client = ZkVerifierClient::new(&env, &env.register(ZkVerifier {}, ()));
    let res = client.verify_proof(&vk(&env), &proof(&env), &public_signals(&env, 70, 1));
    assert_eq!(res, true, "prova da cerimônia real deveria verificar on-chain");
}

#[test]
fn ceremony_proof_rejects_wrong_threshold() {
    let env = Env::default();
    let client = ZkVerifierClient::new(&env, &env.register(ZkVerifier {}, ()));
    let res = client.verify_proof(&vk(&env), &proof(&env), &public_signals(&env, 71, 1));
    assert_eq!(res, false, "threshold adulterado deveria ser rejeitado");
}

#[test]
fn ceremony_proof_rejects_wrong_context() {
    let env = Env::default();
    let client = ZkVerifierClient::new(&env, &env.register(ZkVerifier {}, ()));
    let res = client.verify_proof(&vk(&env), &proof(&env), &public_signals(&env, 70, 2));
    assert_eq!(res, false, "context adulterado deveria ser rejeitado (anti-replay)");
}
