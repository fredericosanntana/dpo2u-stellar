use soroban_sdk::{Bytes, BytesN, Env, Vec};

pub(crate) fn zero_root(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[0u8; 32])
}

pub(crate) fn hash_leaf(env: &Env, commitment: &BytesN<32>) -> BytesN<32> {
    let mut buf = Bytes::new(env);
    buf.push_back(0u8);
    buf.extend_from_array(&commitment.to_array());
    env.crypto().sha256(&buf).to_bytes()
}

pub(crate) fn hash_node(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
    let mut buf = Bytes::new(env);
    buf.push_back(1u8);
    buf.extend_from_array(&left.to_array());
    buf.extend_from_array(&right.to_array());
    env.crypto().sha256(&buf).to_bytes()
}

pub(crate) fn build_root(env: &Env, commitments: &Vec<BytesN<32>>) -> BytesN<32> {
    if commitments.is_empty() {
        return zero_root(env);
    }

    let mut level: Vec<BytesN<32>> = Vec::new(env);
    for commitment in commitments.iter() {
        level.push_back(hash_leaf(env, &commitment));
    }

    while level.len() > 1 {
        let mut next: Vec<BytesN<32>> = Vec::new(env);
        let len = level.len();
        let mut i = 0;
        while i < len {
            let left = level.get(i).unwrap();
            let right = if i + 1 < len {
                level.get(i + 1).unwrap()
            } else {
                left.clone()
            };
            next.push_back(hash_node(env, &left, &right));
            i += 2;
        }
        level = next;
    }

    level.get(0).unwrap()
}
