pragma circom 2.1.6;

// DPO2U — proof-bound execution policy predicate, BN254.
//
// Statement: the prover knows compact policy descriptors plus a private
// policy_score such that:
//   1. policy_score >= threshold
//   2. policy_commit = Poseidon(jurisdiction_code, policy_version,
//      mandate_class, risk_bucket, counterparty_class, threshold)
//   3. the proof is bound to the public `context`
//
// Public signals (snarkjs order = [outputs, public inputs]):
//   [policy_pass, policy_commit, context]

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

template ComplianceIntentPolicy() {
    signal input jurisdiction_code;   // private compact descriptor
    signal input policy_version;      // private compact descriptor
    signal input mandate_class;       // private compact descriptor
    signal input risk_bucket;         // private compact descriptor
    signal input counterparty_class;  // private compact descriptor
    signal input threshold;           // private policy threshold
    signal input policy_score;        // private measured score
    signal input context;             // public intent binding

    signal output policy_pass;        // public pass bit (must be 1)
    signal output policy_commit;      // public compact policy commitment

    // Range checks to prevent field wrap-around semantics.
    component jurisdiction_bits = Num2Bits(16);
    jurisdiction_bits.in <== jurisdiction_code;

    component version_bits = Num2Bits(16);
    version_bits.in <== policy_version;

    component mandate_bits = Num2Bits(16);
    mandate_bits.in <== mandate_class;

    component risk_bits = Num2Bits(8);
    risk_bits.in <== risk_bucket;

    component counterparty_bits = Num2Bits(8);
    counterparty_bits.in <== counterparty_class;

    component threshold_bits = Num2Bits(16);
    threshold_bits.in <== threshold;

    component score_bits = Num2Bits(16);
    score_bits.in <== policy_score;

    // Enforce policy_score >= threshold.
    component ge = GreaterEqThan(16);
    ge.in[0] <== policy_score;
    ge.in[1] <== threshold;
    ge.out === 1;
    policy_pass <== ge.out;

    // Commitment over the compact policy descriptors.
    component commit_hash = Poseidon(6);
    commit_hash.inputs[0] <== jurisdiction_code;
    commit_hash.inputs[1] <== policy_version;
    commit_hash.inputs[2] <== mandate_class;
    commit_hash.inputs[3] <== risk_bucket;
    commit_hash.inputs[4] <== counterparty_class;
    commit_hash.inputs[5] <== threshold;
    policy_commit <== commit_hash.out;

    // Bind the exact public context into the constraint system.
    signal ctx_bind;
    ctx_bind <== context * context;
}

component main {public [context]} = ComplianceIntentPolicy();
