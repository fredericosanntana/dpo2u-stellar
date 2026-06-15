pragma circom 2.1.6;

// DPO2U — STRUCTURAL AI-governance predicate (moonshot #5/#6 study #2), curve BN254.
//
// Frameworks that do NOT reduce to "score >= threshold" — proven WITHOUT revealing the
// private attestation/classification inputs. One circuit, selected by public framework_id:
//   framework_id = 1 → HIROSHIMA ICOC: N-of-M — at least K of M=11 principles attested.
//   framework_id = 2 → EU-AIA: risk-tier membership — tier <= MAXTIER, red-line clear,
//                       and (if high-risk) impact-assessment + red-teaming done.
//
// Same PUBLIC shape as jurisdiction_compliance: [compliant, framework_id, context]
// (IC = 4) ⇒ verifies on the SAME generic por-verifier with ZERO contract change, just a
// new pinned vk. context = anti-replay binding.
//
// Template params: M principles, K required, MAXTIER allowed (HIGH tier = 2).

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template GovernancePredicate(M, K, MAXTIER) {
    signal input framework_id;     // PUBLIC — 1=Hiroshima, 2=EU-AIA
    signal input context;          // PUBLIC — anti-replay binding
    signal input attested[M];      // PRIVATE — Hiroshima principle attestations (bits)
    signal input tier;             // PRIVATE — EU-AIA risk tier 0..3
    signal input redline_clear;    // PRIVATE — bit: no prohibited use (1=ok)
    signal input hr_met;           // PRIVATE — bit: high-risk obligations (IA+red-team) done

    signal output compliant;       // PUBLIC — 1 iff the active predicate holds

    // ── Hiroshima: each attested[i] ∈ {0,1}; Σ attested >= K ──
    component ab[M];
    var acc = 0;
    for (var i = 0; i < M; i++) {
        ab[i] = Num2Bits(1);
        ab[i].in <== attested[i];
        acc += attested[i];
    }
    signal sumA;
    sumA <== acc;
    component geK = GreaterEqThan(8); // M <= 255
    geK.in[0] <== sumA;
    geK.in[1] <== K;
    signal okH;
    okH <== geK.out;

    // ── EU-AIA: tier in 0..3; tier <= MAXTIER; redline_clear; (tier<HIGH OR hr_met) ──
    component tb = Num2Bits(2);
    tb.in <== tier;
    component rb = Num2Bits(1);
    rb.in <== redline_clear;
    component hb = Num2Bits(1);
    hb.in <== hr_met;

    component leT = LessEqThan(3);
    leT.in[0] <== tier;
    leT.in[1] <== MAXTIER;

    component geHigh = GreaterEqThan(3); // isHigh = tier >= 2 (HIGH)
    geHigh.in[0] <== tier;
    geHigh.in[1] <== 2;
    signal notMet;
    notMet <== 1 - hr_met;
    signal highAndNotMet;
    highAndNotMet <== geHigh.out * notMet;   // quadratic
    signal hrOk;
    hrOk <== 1 - highAndNotMet;               // 1 unless high-risk AND obligations unmet

    signal e1;
    e1 <== leT.out * redline_clear;           // quadratic
    signal okE;
    okE <== e1 * hrOk;                          // quadratic

    // ── selector by framework_id ──
    component is1 = IsEqual();
    is1.in[0] <== framework_id;
    is1.in[1] <== 1;
    component is2 = IsEqual();
    is2.in[0] <== framework_id;
    is2.in[1] <== 2;
    signal c1;
    c1 <== is1.out * okH;                        // quadratic
    signal c2;
    c2 <== is2.out * okE;                        // quadratic
    compliant <== c1 + c2;
    compliant === 1;                             // proof exists only if active predicate holds

    // context binding (anti-replay; binding comes from context being public)
    signal ctxBind;
    ctxBind <== context * context;
}

component main {public [framework_id, context]} = GovernancePredicate(11, 11, 2);
