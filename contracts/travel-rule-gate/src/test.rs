#![cfg(test)]
extern crate std;

use super::*;
use serde_json::Value;
use soroban_sdk::testutils::Address as _;

/// Copied verbatim from dpo2u-midnight `test/vectors/verdict-v1-crosschain.json` (six vectors from
/// the compiled Compact gate in the simulator + anchored / no-sanctions shapes derived from them).
const VECTORS: &str = include_str!("../vectors/verdict-v1-crosschain.json");

fn b32(env: &Env, h: &str) -> BytesN<32> {
    let v = hex::decode(h).unwrap();
    BytesN::from_array(env, &v.try_into().unwrap())
}
fn bytes(env: &Env, h: &str) -> Bytes {
    Bytes::from_slice(env, &hex::decode(h).unwrap())
}

/// Format v1 JSON object -> contract struct.
fn from_json(env: &Env, j: &Value) -> VerdictV1 {
    let block = match &j["block"] {
        Value::Null => Block::Unanchored,
        b => Block::Anchored(Anchor {
            height: b["height"].as_u64().unwrap(),
            hash: bytes(env, b["hash"].as_str().unwrap()),
            tx: bytes(env, j["tx"].as_str().unwrap()),
        }),
    };
    let sanctions = match j.get("sanctions") {
        None => Sanctions::NotRecorded,
        Some(s) => Sanctions::Signed(SanctionsRef {
            list_root: b32(env, s["list_root"].as_str().unwrap()),
            provider_id: b32(env, s["provider_id"].as_str().unwrap()),
            valid_until: s["valid_until"].as_u64().unwrap(),
        }),
    };
    VerdictV1 {
        transfer_id: b32(env, j["transfer_id"].as_str().unwrap()),
        pass: j["verdict"] == "PASS",
        released: j["released"].as_bool().unwrap(),
        reason_code: j["reason"]["code"].as_u64().unwrap() as u32,
        policy_hash: b32(env, j["policy_hash"].as_str().unwrap()),
        originator_root: b32(env, j["originator_root"].as_str().unwrap()),
        beneficiary_root: b32(env, j["beneficiary_root"].as_str().unwrap()),
        source_chain: String::from_str(env, j["source_chain"].as_str().unwrap()),
        source_contract: bytes(env, j["source_contract"].as_str().unwrap()),
        block,
        sanctions,
    }
}

fn vectors() -> std::vec::Vec<Value> {
    let v: Value = serde_json::from_str(VECTORS).unwrap();
    assert_eq!(v["format"], FORMAT);
    v["vectors"].as_array().unwrap().clone()
}

fn vector(env: &Env, name: &str) -> VerdictV1 {
    let x = vectors().into_iter().find(|x| x["name"] == name).unwrap();
    from_json(env, &x["verdict"])
}

struct Setup<'a> {
    env: Env,
    gate: TravelRuleGateClient<'a>,
    r1: Address,
    r2: Address,
}

fn setup(threshold: u32) -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let id = env.register(TravelRuleGate, (admin, threshold));
    let gate = TravelRuleGateClient::new(&env, &id);
    let r1 = Address::generate(&env);
    let r2 = Address::generate(&env);
    gate.set_relayer(&r1, &true);
    gate.set_relayer(&r2, &true);
    // Pin the (fictitious) source of the anchored vectors and their policy.
    let v = vector(&env, "pass-released-anchored");
    gate.set_source(&v.source_chain, &v.source_contract, &true);
    gate.set_policy(&v.policy_hash, &true);
    Setup { env, gate, r1, r2 }
}

#[test]
fn canonical_and_digest_match_every_vector() {
    let env = Env::default();
    let id = env.register(TravelRuleGate, (Address::generate(&env), 1u32));
    let gate = TravelRuleGateClient::new(&env, &id);
    let all = vectors();
    assert_eq!(all.len(), 11);
    for x in all {
        let v = from_json(&env, &x["verdict"]);
        let canon = gate.canonical(&v);
        let mut got = std::vec![0u8; canon.len() as usize];
        canon.copy_into_slice(&mut got);
        assert_eq!(
            std::string::String::from_utf8(got).unwrap(),
            x["canonical"].as_str().unwrap(),
            "{}",
            x["name"]
        );
        let d = gate.digest(&v);
        assert_eq!(
            hex::encode(d.to_array()),
            x["digest"].as_str().unwrap(),
            "{}",
            x["name"]
        );
    }
}

#[test]
fn one_relayer_records_a_pass() {
    let s = setup(1);
    let v = vector(&s.env, "pass-released-anchored");
    assert!(!s.gate.is_pass(&v.transfer_id));
    assert_eq!(s.gate.submit(&s.r1, &v), 1);
    let rec = s.gate.get(&v.transfer_id).unwrap();
    assert_eq!(rec.verdict, v);
    assert_eq!(rec.digest, s.gate.digest(&v));
    assert_eq!(rec.relayed_by.len(), 1);
    assert_eq!(rec.relayed_by.get(0).unwrap(), s.r1);
    assert!(s.gate.is_pass(&v.transfer_id));
    assert!(s.gate.is_released(&v.transfer_id));
    assert_eq!(s.gate.require_pass(&v.transfer_id), rec.digest);
}

#[test]
fn two_of_two_relayers() {
    let s = setup(2);
    let v = vector(&s.env, "pass-released-anchored");
    assert_eq!(s.gate.submit(&s.r1, &v), 1);
    assert!(s.gate.get(&v.transfer_id).is_none());
    assert_eq!(s.gate.pending(&s.gate.digest(&v)).len(), 1);
    assert_eq!(
        s.gate.try_submit(&s.r1, &v),
        Err(Ok(ce(Error::AlreadyConfirmed)))
    );
    assert_eq!(s.gate.submit(&s.r2, &v), 2);
    assert!(s.gate.is_pass(&v.transfer_id));
    assert_eq!(s.gate.get(&v.transfer_id).unwrap().relayed_by.len(), 2);
    assert_eq!(s.gate.pending(&s.gate.digest(&v)).len(), 0);
}

#[test]
fn deauthorized_relayer_confirmation_no_longer_counts() {
    let s = setup(2);
    let v = vector(&s.env, "pass-released-anchored");
    s.gate.submit(&s.r1, &v);
    s.gate.set_relayer(&s.r1, &false);
    assert_eq!(s.gate.submit(&s.r2, &v), 1);
    assert!(s.gate.get(&v.transfer_id).is_none());
}

#[test]
fn fail_is_recorded_and_does_not_clear() {
    let s = setup(1);
    let v = vector(&s.env, "fail-4-sanctions-hit-anchored");
    s.gate.submit(&s.r1, &v);
    assert!(s.gate.get(&v.transfer_id).is_some());
    assert!(!s.gate.is_pass(&v.transfer_id));
    assert_eq!(
        s.gate.try_require_pass(&v.transfer_id),
        Err(Ok(ce(Error::NotCleared)))
    );
}

#[test]
fn pass_can_later_become_released_but_not_fail() {
    let s = setup(1);
    let v = vector(&s.env, "pass-not-released-anchored");
    s.gate.submit(&s.r1, &v);
    assert!(s.gate.is_pass(&v.transfer_id) && !s.gate.is_released(&v.transfer_id));
    assert_eq!(
        s.gate.try_submit(&s.r1, &v),
        Err(Ok(ce(Error::AlreadyRecorded)))
    );

    // The release tx on Midnight: same verdict, released, new anchor.
    let mut rel = v.clone();
    rel.released = true;
    rel.block = Block::Anchored(Anchor {
        height: 81_010,
        hash: bytes(&s.env, &"ab".repeat(32)),
        tx: bytes(&s.env, &"cd".repeat(32)),
    });
    s.gate.submit(&s.r1, &rel);
    assert!(s.gate.is_released(&v.transfer_id));

    // Released -> anything else is a conflict.
    let mut back = rel.clone();
    back.released = false;
    assert_eq!(
        s.gate.try_submit(&s.r2, &back),
        Err(Ok(ce(Error::Conflict)))
    );
    let mut fail = rel.clone();
    fail.pass = false;
    fail.released = false;
    fail.reason_code = 4;
    assert_eq!(
        s.gate.try_submit(&s.r2, &fail),
        Err(Ok(ce(Error::Conflict)))
    );
}

#[test]
fn release_must_keep_the_same_roots() {
    let s = setup(1);
    let v = vector(&s.env, "pass-not-released-anchored");
    s.gate.submit(&s.r1, &v);
    let mut rel = v.clone();
    rel.released = true;
    rel.originator_root = BytesN::from_array(&s.env, &[7u8; 32]);
    assert_eq!(s.gate.try_submit(&s.r1, &rel), Err(Ok(ce(Error::Conflict))));
}

#[test]
fn fail_closed_checks() {
    let s = setup(1);
    let v = vector(&s.env, "pass-released-anchored");

    let stranger = Address::generate(&s.env);
    assert_eq!(
        s.gate.try_submit(&stranger, &v),
        Err(Ok(ce(Error::NotRelayer)))
    );

    // Unanchored (simulator) verdicts are not mirrored.
    let un = vector(&s.env, "pass-released");
    assert_eq!(
        s.gate.try_submit(&s.r1, &un),
        Err(Ok(ce(Error::Unanchored)))
    );

    let mut other_src = v.clone();
    other_src.source_contract = bytes(&s.env, "ff");
    assert_eq!(
        s.gate.try_submit(&s.r1, &other_src),
        Err(Ok(ce(Error::SourceNotPinned)))
    );

    let mut other_net = v.clone();
    other_net.source_chain = String::from_str(&s.env, "midnight:mainnet");
    assert_eq!(
        s.gate.try_submit(&s.r1, &other_net),
        Err(Ok(ce(Error::SourceNotPinned)))
    );

    let mut pol = v.clone();
    pol.policy_hash = BytesN::from_array(&s.env, &[1u8; 32]);
    assert_eq!(
        s.gate.try_submit(&s.r1, &pol),
        Err(Ok(ce(Error::PolicyNotAllowed)))
    );

    let mut zero = v.clone();
    zero.policy_hash = BytesN::from_array(&s.env, &[0u8; 32]);
    assert_eq!(
        s.gate.try_submit(&s.r1, &zero),
        Err(Ok(ce(Error::ZeroPolicy)))
    );
}

#[test]
fn format_rules() {
    let s = setup(1);
    let v = vector(&s.env, "pass-released-anchored");
    let bad = |f: &dyn Fn(&mut VerdictV1)| {
        let mut x = v.clone();
        f(&mut x);
        s.gate.try_digest(&x).err().unwrap().unwrap()
    };
    assert_eq!(bad(&|x| x.reason_code = 3), ce(Error::BadVerdict)); // PASS with a reason
    assert_eq!(
        bad(&|x| {
            x.pass = false;
            x.reason_code = 0;
            x.released = false
        }),
        ce(Error::BadVerdict)
    ); // FAIL without one
    assert_eq!(
        bad(&|x| {
            x.pass = false;
            x.reason_code = 2
        }),
        ce(Error::BadVerdict)
    ); // released FAIL
    assert_eq!(
        bad(&|x| {
            x.pass = false;
            x.released = false;
            x.reason_code = 9
        }),
        ce(Error::BadVerdict)
    );
    assert_eq!(
        bad(&|x| x.source_chain = String::from_str(&s.env, "midnight")),
        ce(Error::BadSourceChain)
    );
    assert_eq!(
        bad(&|x| x.source_chain = String::from_str(&s.env, "Midnight:preview")),
        ce(Error::BadSourceChain)
    );
    assert_eq!(
        bad(&|x| x.source_chain = String::from_str(&s.env, "midnight:pre\"view")),
        ce(Error::BadSourceChain)
    );
    assert_eq!(
        bad(&|x| x.source_chain = String::from_str(&s.env, ":preview")),
        ce(Error::BadSourceChain)
    );
    assert_eq!(
        bad(&|x| x.source_contract = Bytes::new(&s.env)),
        ce(Error::BadLength)
    );
    assert_eq!(
        bad(&|x| x.source_contract = Bytes::from_slice(&s.env, &[1u8; 65])),
        ce(Error::BadLength)
    );
    assert_eq!(
        bad(&|x| x.block = Block::Anchored(Anchor {
            height: 1,
            hash: Bytes::new(&s.env),
            tx: bytes(&s.env, "aa")
        })),
        ce(Error::BadLength)
    );
    // Max lengths are fine.
    let mut ok = v.clone();
    ok.source_contract = Bytes::from_slice(&s.env, &[0xabu8; 64]);
    let c = s.gate.canonical(&ok);
    assert!(c.len() > 0);
}

#[test]
fn only_admin_configures() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let id = env.register(TravelRuleGate, (admin, 1u32));
    let gate = TravelRuleGateClient::new(&env, &id);
    // No auth mocked: admin-only calls fail.
    assert!(gate
        .try_set_relayer(&Address::generate(&env), &true)
        .is_err());
    assert!(gate.try_set_threshold(&2).is_err());
}

#[test]
fn zero_threshold_refused() {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(TravelRuleGate, (Address::generate(&env), 1u32));
    let gate = TravelRuleGateClient::new(&env, &id);
    assert_eq!(gate.try_set_threshold(&0), Err(Ok(ce(Error::BadThreshold))));
}

fn ce(e: Error) -> soroban_sdk::Error {
    soroban_sdk::Error::from_contract_error(e as u32)
}
