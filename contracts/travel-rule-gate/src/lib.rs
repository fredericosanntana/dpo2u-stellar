#![no_std]
#![allow(deprecated)] // events.publish() works; #[contractevent] migration is later
//! DPO2U — `travel_rule_gate` on Soroban: mirror of the Midnight `TravelRuleGate` verdict.
//!
//! The Travel Rule is evaluated on Midnight (private inputs, ZK circuit, public verdict). This
//! contract receives that public verdict in the common format `dpo2u.travel-rule-verdict/1`
//! (dpo2u-midnight `docs/VERDICT-FORMAT.md`), recomputes its canonical JSON and SHA-256 digest
//! on-chain, and records it per `transfer_id` once `threshold` distinct authorized relayers have
//! submitted the same digest. Stellar contracts (x402 settlement, escrow, vault) read it with
//! `is_pass` / `require_pass`.
//!
//! TRUST MODEL — OPERATOR TRUST, NOT A PROOF. There is no Midnight light client and no state proof
//! here. Stellar checks the verdict's FORM (format rules, pinned source gate, allowed policy,
//! digest, M-of-N relayers) but cannot check that the verdict exists on Midnight. A dishonest
//! quorum of relayers could record a PASS that Midnight never produced. Anyone can audit it: the
//! record carries the Midnight block + tx, and re-exporting the verdict from Midnight at that tx
//! must give the same digest. The relayers are on-chain in `relayed_by`.
//! When native cross-chain messaging exists, the transport changes; the format and digest do not.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    Bytes, BytesN, Env, String, Vec,
};

pub const FORMAT: &str = "dpo2u.travel-rule-verdict/1";
const MAX_VAR: u32 = 64; // max bytes of source_contract, block hash, tx

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotRelayer = 1,
    AlreadyInitialized = 2,
    BadThreshold = 3,
    BadVerdict = 4, // violates the format rules (reason vs verdict, released only on PASS...)
    BadSourceChain = 5, // not "<chain>:<network>" in [a-z0-9-]
    BadLength = 6,  // source_contract / block hash / tx empty or > 64 bytes
    SourceNotPinned = 7, // (source_chain, source_contract) not accepted by the admin
    PolicyNotAllowed = 8,
    ZeroPolicy = 9,
    AlreadyRecorded = 10,
    Conflict = 11, // differs from the recorded verdict other than PASS -> released
    AlreadyConfirmed = 12,
    NotCleared = 13, // require_pass on a transfer without a recorded PASS
    Unanchored = 14, // block/tx missing: a mirrored verdict must point at the Midnight tx
}

/// Block + tx of the Midnight transaction that produced the verdict (`block` and `tx` of the format).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Anchor {
    pub height: u64,
    pub hash: Bytes, // raw bytes; hex-encoded in the canonical JSON
    pub tx: Bytes,
}

/// `Option<Anchor>` (a contracttype struct field cannot be a Rust `Option` of a struct).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Block {
    Unanchored,
    Anchored(Anchor),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SanctionsRef {
    pub list_root: BytesN<32>,
    pub provider_id: BytesN<32>,
    pub valid_until: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Sanctions {
    NotRecorded,
    Signed(SanctionsRef),
}

/// One verdict in the common format v1. `pass` = `verdict == "PASS"`; the reason label is derived
/// from `reason_code`; `block` carries both `block` and `tx` of the format (both set or both null).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerdictV1 {
    pub transfer_id: BytesN<32>,
    pub pass: bool,
    pub released: bool,
    pub reason_code: u32,
    pub policy_hash: BytesN<32>,
    pub originator_root: BytesN<32>,
    pub beneficiary_root: BytesN<32>,
    pub source_chain: String,
    pub source_contract: Bytes,
    pub block: Block,
    pub sanctions: Sanctions,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Record {
    pub verdict: VerdictV1,
    pub digest: BytesN<32>,
    pub relayed_by: Vec<Address>, // the relayers whose confirmations recorded it (operator trust)
    pub ledger: u32,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Threshold,
    Relayer(Address),
    Source(String, Bytes),
    Policy(BytesN<32>),
    Pending(BytesN<32>), // digest -> relayers that confirmed it
    Verdict(BytesN<32>), // transfer_id -> Record
}

#[contract]
pub struct TravelRuleGate;

#[contractimpl]
impl TravelRuleGate {
    pub fn __constructor(env: Env, admin: Address, threshold: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        if threshold == 0 {
            panic_with_error!(&env, Error::BadThreshold);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &threshold);
    }

    // ---------------------------------------------------------------- admin

    pub fn set_relayer(env: Env, relayer: Address, allowed: bool) {
        Self::admin_auth(&env);
        env.storage()
            .instance()
            .set(&DataKey::Relayer(relayer.clone()), &allowed);
        env.events()
            .publish((symbol_short!("relayer"), relayer), allowed);
    }

    pub fn set_threshold(env: Env, threshold: u32) {
        Self::admin_auth(&env);
        if threshold == 0 {
            panic_with_error!(&env, Error::BadThreshold);
        }
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &threshold);
        env.events().publish((symbol_short!("thresh"),), threshold);
    }

    /// Pin a source gate, e.g. ("midnight:preview", <TravelRuleGate address>). Fail-closed: verdicts
    /// from any other source are refused.
    pub fn set_source(env: Env, source_chain: String, source_contract: Bytes, allowed: bool) {
        Self::admin_auth(&env);
        check_source_chain(&env, &source_chain);
        check_var(&env, &source_contract);
        env.storage().instance().set(
            &DataKey::Source(source_chain.clone(), source_contract.clone()),
            &allowed,
        );
        env.events().publish(
            (symbol_short!("source"), source_chain, source_contract),
            allowed,
        );
    }

    /// Allow a policy version (`policy_hash` = rules + sanctions-list version). Fail-closed.
    pub fn set_policy(env: Env, policy_hash: BytesN<32>, allowed: bool) {
        Self::admin_auth(&env);
        env.storage()
            .instance()
            .set(&DataKey::Policy(policy_hash.clone()), &allowed);
        env.events()
            .publish((symbol_short!("policy"), policy_hash), allowed);
    }

    // ---------------------------------------------------------------- relay

    /// A relayer submits a verdict it read from the source chain. Returns the number of valid
    /// confirmations of this exact digest; at `threshold` the verdict is recorded.
    pub fn submit(env: Env, relayer: Address, v: VerdictV1) -> u32 {
        relayer.require_auth();
        if !Self::is_relayer(env.clone(), relayer.clone()) {
            panic_with_error!(&env, Error::NotRelayer);
        }
        check_verdict(&env, &v);
        if v.block == Block::Unanchored {
            panic_with_error!(&env, Error::Unanchored);
        }
        if !flag(
            &env,
            &DataKey::Source(v.source_chain.clone(), v.source_contract.clone()),
        ) {
            panic_with_error!(&env, Error::SourceNotPinned);
        }
        if !flag(&env, &DataKey::Policy(v.policy_hash.clone())) {
            panic_with_error!(&env, Error::PolicyNotAllowed);
        }
        let digest = verdict_digest(&env, &v);
        if let Some(prev) = Self::get(env.clone(), v.transfer_id.clone()) {
            if prev.digest == digest {
                panic_with_error!(&env, Error::AlreadyRecorded);
            }
            if !is_release_of(&prev.verdict, &v) {
                panic_with_error!(&env, Error::Conflict);
            }
        }

        let pkey = DataKey::Pending(digest.clone());
        let mut pending: Vec<Address> = env
            .storage()
            .persistent()
            .get(&pkey)
            .unwrap_or(Vec::new(&env));
        if pending.contains(&relayer) {
            panic_with_error!(&env, Error::AlreadyConfirmed);
        }
        pending.push_back(relayer.clone());
        // Only relayers that are still authorized count.
        let mut valid: Vec<Address> = Vec::new(&env);
        for r in pending.iter() {
            if Self::is_relayer(env.clone(), r.clone()) {
                valid.push_back(r);
            }
        }
        let n = valid.len();
        env.events().publish(
            (symbol_short!("tr_conf"), v.transfer_id.clone(), relayer),
            (digest.clone(), n),
        );

        if n >= Self::threshold(env.clone()) {
            let rec = Record {
                verdict: v.clone(),
                digest: digest.clone(),
                relayed_by: valid,
                ledger: env.ledger().sequence(),
                timestamp: env.ledger().timestamp(),
            };
            env.storage()
                .persistent()
                .set(&DataKey::Verdict(v.transfer_id.clone()), &rec);
            env.storage().persistent().remove(&pkey);
            env.events().publish(
                (symbol_short!("tr_rec"), v.transfer_id.clone()),
                (digest, v.pass, v.released),
            );
        } else {
            env.storage().persistent().set(&pkey, &pending);
        }
        n
    }

    // ---------------------------------------------------------------- read

    pub fn get(env: Env, transfer_id: BytesN<32>) -> Option<Record> {
        env.storage()
            .persistent()
            .get(&DataKey::Verdict(transfer_id))
    }

    /// True when a PASS is recorded for the transfer (released or not).
    pub fn is_pass(env: Env, transfer_id: BytesN<32>) -> bool {
        Self::get(env, transfer_id)
            .map(|r| r.verdict.pass)
            .unwrap_or(false)
    }

    /// True when the PASS was also released by the VASP on the source chain.
    pub fn is_released(env: Env, transfer_id: BytesN<32>) -> bool {
        Self::get(env, transfer_id)
            .map(|r| r.verdict.released)
            .unwrap_or(false)
    }

    /// For other Stellar contracts: panics unless a PASS is recorded. Returns its digest.
    pub fn require_pass(env: Env, transfer_id: BytesN<32>) -> BytesN<32> {
        match Self::get(env.clone(), transfer_id) {
            Some(r) if r.verdict.pass => r.digest,
            _ => panic_with_error!(&env, Error::NotCleared),
        }
    }

    pub fn pending(env: Env, digest: BytesN<32>) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Pending(digest))
            .unwrap_or(Vec::new(&env))
    }

    /// Canonical JSON of a verdict (validated), exactly as `canonicalJson` in dpo2u-midnight.
    pub fn canonical(env: Env, v: VerdictV1) -> Bytes {
        check_verdict(&env, &v);
        canonical_json(&env, &v)
    }

    /// `sha256(canonical JSON)`: the digest every chain stores and compares.
    pub fn digest(env: Env, v: VerdictV1) -> BytesN<32> {
        check_verdict(&env, &v);
        verdict_digest(&env, &v)
    }

    pub fn is_relayer(env: Env, relayer: Address) -> bool {
        flag(&env, &DataKey::Relayer(relayer))
    }

    pub fn threshold(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Threshold).unwrap()
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    fn admin_auth(env: &Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
    }
}

fn flag(env: &Env, k: &DataKey) -> bool {
    env.storage().instance().get(k).unwrap_or(false)
}

/// PASS not released -> the same PASS released (the VASP released it on the source chain later).
/// Everything but `released` and the anchor must be identical. A FAIL is final.
fn is_release_of(prev: &VerdictV1, v: &VerdictV1) -> bool {
    prev.pass
        && !prev.released
        && v.pass
        && v.released
        && prev.transfer_id == v.transfer_id
        && prev.reason_code == v.reason_code
        && prev.policy_hash == v.policy_hash
        && prev.originator_root == v.originator_root
        && prev.beneficiary_root == v.beneficiary_root
        && prev.source_chain == v.source_chain
        && prev.source_contract == v.source_contract
        && prev.sanctions == v.sanctions
}

// -------------------------------------------------------------------- format rules

pub fn reason_label(code: u32) -> Option<&'static str> {
    match code {
        0 => Some("none"),
        1 => Some("missing_party_info"),
        2 => Some("missing_originator_document_above_threshold"),
        3 => Some("counterparty_vasp_not_attested"),
        4 => Some("sanctions_hit"),
        _ => None,
    }
}

/// Same rules as `checkVerdict` in dpo2u-midnight, plus a non-zero policy (the v10 gate refuses zero).
fn check_verdict(env: &Env, v: &VerdictV1) {
    if reason_label(v.reason_code).is_none()
        || v.pass != (v.reason_code == 0)
        || (v.released && !v.pass)
    {
        panic_with_error!(env, Error::BadVerdict);
    }
    if v.policy_hash.to_array() == [0u8; 32] {
        panic_with_error!(env, Error::ZeroPolicy);
    }
    check_source_chain(env, &v.source_chain);
    check_var(env, &v.source_contract);
    if let Block::Anchored(a) = &v.block {
        check_var(env, &a.hash);
        check_var(env, &a.tx);
    }
}

fn check_var(env: &Env, b: &Bytes) {
    if b.is_empty() || b.len() > MAX_VAR {
        panic_with_error!(env, Error::BadLength);
    }
}

/// `^[a-z0-9-]+:[a-z0-9-]+$`, at most 64 bytes.
fn check_source_chain(env: &Env, s: &String) {
    let n = s.len();
    if !(3..=64).contains(&n) {
        panic_with_error!(env, Error::BadSourceChain);
    }
    let mut buf = [0u8; 64];
    s.copy_into_slice(&mut buf[..n as usize]);
    let mut colons = 0;
    let mut colon_at = 0;
    for (i, c) in buf[..n as usize].iter().enumerate() {
        match c {
            b'a'..=b'z' | b'0'..=b'9' | b'-' => {}
            b':' => {
                colons += 1;
                colon_at = i;
            }
            _ => panic_with_error!(env, Error::BadSourceChain),
        }
    }
    if colons != 1 || colon_at == 0 || colon_at == n as usize - 1 {
        panic_with_error!(env, Error::BadSourceChain);
    }
}

// -------------------------------------------------------------------- canonical JSON + digest

fn verdict_digest(env: &Env, v: &VerdictV1) -> BytesN<32> {
    env.crypto().sha256(&canonical_json(env, v)).to_bytes()
}

/// Keys sorted, no whitespace, absent optional fields omitted. Every string in the format is
/// lowercase hex, a fixed label, or `[a-z0-9-:]`, so no JSON escaping is ever needed.
fn canonical_json(env: &Env, v: &VerdictV1) -> Bytes {
    let mut o = Bytes::new(env);
    raw(&mut o, b"{\"beneficiary_root\":");
    hex32(&mut o, &v.beneficiary_root);
    raw(&mut o, b",\"block\":");
    match &v.block {
        Block::Unanchored => raw(&mut o, b"null"),
        Block::Anchored(a) => {
            raw(&mut o, b"{\"hash\":");
            hex_var(&mut o, &a.hash);
            raw(&mut o, b",\"height\":");
            dec(&mut o, a.height);
            raw(&mut o, b"}");
        }
    }
    raw(&mut o, b",\"format\":\"");
    raw(&mut o, FORMAT.as_bytes());
    raw(&mut o, b"\",\"originator_root\":");
    hex32(&mut o, &v.originator_root);
    raw(&mut o, b",\"policy_hash\":");
    hex32(&mut o, &v.policy_hash);
    raw(&mut o, b",\"reason\":{\"code\":");
    dec(&mut o, v.reason_code as u64);
    raw(&mut o, b",\"label\":\"");
    raw(
        &mut o,
        reason_label(v.reason_code).unwrap_or("unknown").as_bytes(),
    );
    raw(&mut o, b"\"},\"released\":");
    raw(&mut o, if v.released { b"true" } else { b"false" });
    if let Sanctions::Signed(s) = &v.sanctions {
        raw(&mut o, b",\"sanctions\":{\"list_root\":");
        hex32(&mut o, &s.list_root);
        raw(&mut o, b",\"provider_id\":");
        hex32(&mut o, &s.provider_id);
        raw(&mut o, b",\"valid_until\":");
        dec(&mut o, s.valid_until);
        raw(&mut o, b"}");
    }
    raw(&mut o, b",\"source_chain\":\"");
    let n = v.source_chain.len() as usize;
    let mut buf = [0u8; 64];
    v.source_chain.copy_into_slice(&mut buf[..n]);
    raw(&mut o, &buf[..n]);
    raw(&mut o, b"\",\"source_contract\":");
    hex_var(&mut o, &v.source_contract);
    raw(&mut o, b",\"transfer_id\":");
    hex32(&mut o, &v.transfer_id);
    raw(&mut o, b",\"tx\":");
    match &v.block {
        Block::Unanchored => raw(&mut o, b"null"),
        Block::Anchored(a) => hex_var(&mut o, &a.tx),
    }
    raw(&mut o, b",\"verdict\":\"");
    raw(&mut o, if v.pass { b"PASS" } else { b"FAIL" });
    raw(&mut o, b"\"}");
    o
}

fn raw(o: &mut Bytes, s: &[u8]) {
    o.extend_from_slice(s);
}

const HEX: &[u8; 16] = b"0123456789abcdef";

fn hex_slice(o: &mut Bytes, b: &[u8]) {
    let mut buf = [0u8; 2 * MAX_VAR as usize];
    for (i, x) in b.iter().enumerate() {
        buf[2 * i] = HEX[(x >> 4) as usize];
        buf[2 * i + 1] = HEX[(x & 0x0f) as usize];
    }
    o.push_back(b'"');
    o.extend_from_slice(&buf[..2 * b.len()]);
    o.push_back(b'"');
}

fn hex32(o: &mut Bytes, b: &BytesN<32>) {
    hex_slice(o, &b.to_array());
}

fn hex_var(o: &mut Bytes, b: &Bytes) {
    let n = b.len() as usize; // <= MAX_VAR, checked before
    let mut buf = [0u8; MAX_VAR as usize];
    b.copy_into_slice(&mut buf[..n]);
    hex_slice(o, &buf[..n]);
}

fn dec(o: &mut Bytes, mut x: u64) {
    let mut buf = [0u8; 20];
    let mut i = buf.len();
    loop {
        i -= 1;
        buf[i] = b'0' + (x % 10) as u8;
        x /= 10;
        if x == 0 {
            break;
        }
    }
    o.extend_from_slice(&buf[i..]);
}

mod test;
