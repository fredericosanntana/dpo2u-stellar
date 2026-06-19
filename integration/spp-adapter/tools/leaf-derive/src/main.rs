use num_bigint::BigUint;
use std::env;
use zkhash::{
    ark_ff::{BigInteger, PrimeField},
    fields::bn256::FpBN256 as Scalar,
    poseidon2::{
        poseidon2::Poseidon2,
        poseidon2_instance_bn256::POSEIDON2_BN256_PARAMS_3,
    },
};

fn normalize_hex32(input: &str) -> Result<String, String> {
    let raw = input.trim().trim_start_matches("0x");
    if raw.len() != 64 || !raw.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("pubkey must be exactly 32 bytes / 64 hex chars".to_string());
    }
    Ok(format!("0x{}", raw.to_lowercase()))
}

fn parse_biguint_any(input: &str) -> Result<BigUint, String> {
    let s = input.trim();
    if let Some(hex) = s.strip_prefix("0x") {
        BigUint::parse_bytes(hex.as_bytes(), 16).ok_or_else(|| "invalid hex integer".to_string())
    } else {
        BigUint::parse_bytes(s.as_bytes(), 10).ok_or_else(|| "invalid decimal integer".to_string())
    }
}

fn scalar_from_biguint(n: &BigUint) -> Scalar {
    Scalar::from_be_bytes_mod_order(&n.to_bytes_be())
}

fn scalar_from_hex32(hex32: &str) -> Result<Scalar, String> {
    let normalized = normalize_hex32(hex32)?;
    let bytes = hex::decode(normalized.trim_start_matches("0x")).map_err(|e| e.to_string())?;
    Ok(Scalar::from_be_bytes_mod_order(&bytes))
}

fn poseidon2_hash2(a: Scalar, b: Scalar, dom_sep: Option<Scalar>) -> Scalar {
    let h = Poseidon2::new(&POSEIDON2_BN256_PARAMS_3);
    let perm = h.permutation(&[a, b, dom_sep.unwrap_or_else(|| Scalar::from(0u64))]);
    perm[0]
}

fn scalar_to_biguint(s: Scalar) -> BigUint {
    let bi = s.into_bigint();
    BigUint::from_bytes_le(&bi.to_bytes_le())
}

fn usage() -> String {
    "usage: leaf-derive --pubkey 0x<64hex> --blinding <decimal-or-0xhex>".to_string()
}

fn main() -> Result<(), String> {
    let mut args = env::args().skip(1);
    let mut pubkey: Option<String> = None;
    let mut blinding: Option<String> = None;

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--pubkey" => pubkey = args.next(),
            "--blinding" => blinding = args.next(),
            _ => return Err(format!("unknown arg: {arg}; {}", usage())),
        }
    }

    let pubkey_str = pubkey.ok_or_else(usage)?;
    let blinding_str = blinding.ok_or_else(usage)?;

    let pubkey_scalar = scalar_from_hex32(&pubkey_str)?;
    let blinding_big = parse_biguint_any(&blinding_str)?;
    let blinding_scalar = scalar_from_biguint(&blinding_big);
    let leaf = poseidon2_hash2(pubkey_scalar, blinding_scalar, Some(Scalar::from(1u64)));
    let leaf_big = scalar_to_biguint(leaf);
    let mut leaf_hex = leaf_big.to_str_radix(16);
    while leaf_hex.len() < 64 {
        leaf_hex = format!("0{}", leaf_hex);
    }

    let normalized_pubkey = normalize_hex32(&pubkey_str)?;
    println!("{{");
    println!("  \"note_public_key\": \"{}\",", normalized_pubkey);
    println!("  \"membership_blinding\": \"{}\",", blinding_big.to_str_radix(10));
    println!("  \"membership_leaf_hex\": \"0x{}\",", leaf_hex);
    println!("  \"membership_leaf_dec\": \"{}\"", leaf_big.to_str_radix(10));
    println!("}}");
    Ok(())
}
