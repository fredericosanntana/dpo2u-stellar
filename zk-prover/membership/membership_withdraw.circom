pragma circom 2.1.6;

// DPO2U — depth-N Merkle ZK membership withdrawal proof, curva BN254 (bn128).
//
// Current dev slice:
// - private witness: (nullifier, secret, siblings[TREE_DEPTH], pathIndices[TREE_DEPTH])
// - public signals: [root, nullifierHash, recipient, context]
// - commitment = trunc248(Poseidon(nullifier, secret))
// - root = fold_trunc248(SHA256(left || right)) across a depth-N Merkle path
// - nullifierHash prevents double-withdrawal on-chain
// - recipient/context bind the proof to the withdraw target and replay domain
//
// Honest limitation: this is a symbolic dev/test circuit with a fixed depth parameter and
// deterministic fixtures. It is not yet a production-scale privacy pool.

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/sha256/sha256.circom";

template FieldToSha256Bits248() {
    signal input value;
    signal output bits[256];

    component decomp = Num2Bits(248);
    decomp.in <== value;

    for (var i = 0; i < 8; i++) {
        bits[i] <== 0;
    }

    for (var byte = 0; byte < 31; byte++) {
        for (var bit = 0; bit < 8; bit++) {
            bits[8 + byte * 8 + bit] <== decomp.out[247 - (byte * 8 + bit)];
        }
    }
}

template Trunc248Sha256Pair() {
    signal input left;
    signal input right;
    signal output out;

    component leftBits = FieldToSha256Bits248();
    component rightBits = FieldToSha256Bits248();
    leftBits.value <== left;
    rightBits.value <== right;

    component sha = Sha256(512);
    for (var i = 0; i < 256; i++) {
        sha.in[i] <== leftBits.bits[i];
        sha.in[256 + i] <== rightBits.bits[i];
    }

    component trunc = Bits2Num(248);
    for (var j = 0; j < 248; j++) {
        trunc.in[j] <== sha.out[255 - j];
    }
    out <== trunc.out;
}

template MembershipWithdraw(treeDepth) {
    // private note witness
    signal input nullifier;
    signal input secret;
    signal input siblings[treeDepth];
    signal input pathIndices[treeDepth];

    // public signals
    signal input root;
    signal input nullifierHash;
    signal input recipient;
    signal input context;

    // commitment = trunc248(Poseidon(nullifier, secret)).
    component ph = Poseidon(2);
    ph.inputs[0] <== nullifier;
    ph.inputs[1] <== secret;
    component pbits = Num2Bits(254);
    pbits.in <== ph.out;
    component leafTrunc = Bits2Num(248);
    for (var i = 0; i < 248; i++) {
        leafTrunc.in[i] <== pbits.out[i];
    }

    signal level[treeDepth + 1];
    signal leftNodes[treeDepth];
    signal rightNodes[treeDepth];
    component hashes[treeDepth];

    level[0] <== leafTrunc.out;
    for (var d = 0; d < treeDepth; d++) {
        pathIndices[d] * (pathIndices[d] - 1) === 0;
        leftNodes[d] <== level[d] + pathIndices[d] * (siblings[d] - level[d]);
        rightNodes[d] <== siblings[d] + pathIndices[d] * (level[d] - siblings[d]);
        hashes[d] = Trunc248Sha256Pair();
        hashes[d].left <== leftNodes[d];
        hashes[d].right <== rightNodes[d];
        level[d + 1] <== hashes[d].out;
    }
    root === level[treeDepth];

    component nh = Poseidon(1);
    nh.inputs[0] <== nullifier;
    nullifierHash === nh.out;

    // Anchor recipient/context into constraints. Binding comes from public signals.
    signal recipientSq;
    recipientSq <== recipient * recipient;
    signal contextSq;
    contextSq <== context * context;
}

component main {public [root, nullifierHash, recipient, context]} = MembershipWithdraw(4);
