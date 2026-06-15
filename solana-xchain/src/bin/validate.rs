//! Host-side format validation (off-chain): proves our snarkjs Groth16/BN254 proof
//! bytes verify with groth16-solana (the same lib used on-chain via alt_bn128). If this
//! passes on host, the on-chain Solana program verifies the same bytes. Run:
//!   cargo run --features host --bin validate
use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};
use num_bigint::BigUint;

// PoR Groth16/BN254 proof (== por-verifier/src/test.rs fixtures; verified on Stellar + EVM).
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
const PUB0: &str = "0000000000000000000000000000000000000000000000000000000000000001";
const PUB1: &str = "2e1015154eccba498ea60399e4a1f8fc264f0f1ca41643e359eb74fb12c39125";
const PUB2: &str = "00000000000000000000000000000000000000000000000000000000075bcd15";

fn h<const N: usize>(s: &str) -> [u8; N] {
    let v = hex::decode(s).expect("hex");
    assert_eq!(v.len(), N, "bad len for {}", s);
    let mut a = [0u8; N];
    a.copy_from_slice(&v);
    a
}

/// Negate a G1 point in big-endian uncompressed form: -(x,y) = (x, P - y).
fn negate_a(a: &[u8; 64]) -> [u8; 64] {
    let p = BigUint::parse_bytes(
        b"21888242871839275222246405745257275088696311157297823662689037894645226208583",
        10,
    )
    .unwrap();
    let y = BigUint::from_bytes_be(&a[32..]);
    let ny = (&p - (&y % &p)) % &p;
    let nyb = ny.to_bytes_be();
    let mut out = [0u8; 64];
    out[..32].copy_from_slice(&a[..32]);
    out[64 - nyb.len()..].copy_from_slice(&nyb);
    out
}

fn main() {
    let pa_neg = negate_a(&h::<64>(PROOF_A));
    let pb = h::<128>(PROOF_B);
    let pc = h::<64>(PROOF_C);
    let vk_ic: [[u8; 64]; 4] = [h::<64>(VK_IC0), h::<64>(VK_IC1), h::<64>(VK_IC2), h::<64>(VK_IC3)];
    let vk = Groth16Verifyingkey {
        nr_pubinputs: 3,
        vk_alpha_g1: h::<64>(VK_ALPHA),
        vk_beta_g2: h::<128>(VK_BETA),
        vk_gamme_g2: h::<128>(VK_GAMMA),
        vk_delta_g2: h::<128>(VK_DELTA),
        vk_ic: &vk_ic,
    };
    let pub_inputs: [[u8; 32]; 3] = [h::<32>(PUB0), h::<32>(PUB1), h::<32>(PUB2)];

    let mut verifier = Groth16Verifier::new(&pa_neg, &pb, &pc, &pub_inputs, &vk)
        .expect("construct verifier");
    match verifier.verify() {
        Ok(()) => println!("VERIFY OK — our snarkjs Groth16/BN254 proof verifies under groth16-solana (alt_bn128). Same bytes work on-chain."),
        Err(e) => println!("VERIFY ERROR: {:?} — byte format mismatch (e.g. try swapping G2 c1/c0 order).", e),
    }
}
