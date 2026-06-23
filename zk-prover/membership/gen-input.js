#!/usr/bin/env node
/**
 * DPO2U — deterministic witness generator for depth-N Merkle membership_withdraw.circom.
 *
 * Current dev slice:
 *   commitment      = trunc248(Poseidon(nullifier, secret))
 *   root            = fold_trunc248(SHA256(left || right)) across a depth-N Merkle path
 *   nullifierHash   = Poseidon(nullifier)
 *
 * It emits:
 *   - build/input.json for witness generation
 *   - fixtures.json for Rust tests
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { buildPoseidon } = require("circomlibjs");

const TWO_248 = 1n << 248n;
const TREE_DEPTH = 4;
const WITNESS_NOTE = {
  nullifier: 0x2222222222222222222222222222222222222222222222222222222222n,
  secret: 0x43434343434343434343434343434343434343434343434343434343n,
};
const DECOY_NOTE = {
  nullifier: 0x3333333333333333333333333333333333333333333333333333333333n,
  secret: 0x54545454545454545454545454545454545454545454545454545454n,
};
const RECIPIENT = 0x00a11ce0000000000000000000000000000000000000000000000000beef01n;
// Bound to the gate's derive_zk_context(evidence_hash) for the test payload —
// this is PUB_CONTEXT_SAMPLE in the defindex-rebalance-gate tests. Setting the
// membership proof's context to the on-chain-derived value is what binds the
// admission proof to the exact live intent (host↔circuit parity).
const CONTEXT = 0x00a07a7e7f20e6f06d9692a8785fe7dc837f6094e817b3bbbe735be0c1db8ba0n;
const WITNESS_INDEX = 0;
const ZERO_LEAF = 0n;

function toBE32(x) {
  let h = BigInt(x).toString(16);
  if (h.length > 64) throw new Error("value > 32 bytes");
  return Buffer.from(h.padStart(64, "0"), "hex");
}

function trunc248Sha256Pair(left, right) {
  const digest = crypto
    .createHash("sha256")
    .update(Buffer.concat([toBE32(left), toBE32(right)]))
    .digest();
  digest[0] = 0;
  return BigInt(`0x${digest.toString("hex")}`);
}

function buildZeroCache(depth) {
  const zeros = [ZERO_LEAF];
  for (let level = 0; level < depth; level += 1) {
    zeros.push(trunc248Sha256Pair(zeros[level], zeros[level]));
  }
  return zeros;
}

function buildProof(nonZeroLeaves, targetIndex, depth, zeroCache) {
  const capacity = 1 << depth;
  const leaves = Array.from({ length: capacity }, (_, i) => nonZeroLeaves[i] ?? zeroCache[0]);

  let level = leaves.slice();
  let index = targetIndex;
  const siblings = [];
  const pathIndices = [];

  for (let d = 0; d < depth; d += 1) {
    const isRight = index % 2;
    const siblingIndex = isRight ? index - 1 : index + 1;
    siblings.push(level[siblingIndex]);
    pathIndices.push(isRight);

    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(trunc248Sha256Pair(level[i], level[i + 1]));
    }
    level = next;
    index = Math.floor(index / 2);
  }

  return { root: level[0], siblings, pathIndices };
}

(async () => {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const pos = (arr) => F.toObject(poseidon(arr.map((x) => F.e(x))));

  const witnessCommitment = pos([WITNESS_NOTE.nullifier, WITNESS_NOTE.secret]) % TWO_248;
  const decoyCommitment = pos([DECOY_NOTE.nullifier, DECOY_NOTE.secret]) % TWO_248;
  const nullifierHash = pos([WITNESS_NOTE.nullifier]);
  const commitments = [witnessCommitment, decoyCommitment];
  const zeroCache = buildZeroCache(TREE_DEPTH);
  const { root, siblings, pathIndices } = buildProof(
    commitments,
    WITNESS_INDEX,
    TREE_DEPTH,
    zeroCache,
  );

  const input = {
    nullifier: WITNESS_NOTE.nullifier.toString(),
    secret: WITNESS_NOTE.secret.toString(),
    siblings: siblings.map((x) => x.toString()),
    pathIndices: pathIndices.map((x) => x.toString()),
    root: root.toString(),
    nullifierHash: nullifierHash.toString(),
    recipient: RECIPIENT.toString(),
    context: CONTEXT.toString(),
  };
  const hex32 = (x) => toBE32(x).toString("hex");
  const fixtures = {
    depth: TREE_DEPTH,
    witness_index: WITNESS_INDEX,
    commitments: commitments.map(hex32),
    siblings: siblings.map(hex32),
    path_indices: pathIndices,
    root: hex32(root),
    nullifier_hash: hex32(nullifierHash),
    recipient: hex32(RECIPIENT),
    context: hex32(CONTEXT),
  };

  fs.mkdirSync(path.join(__dirname, "build"), { recursive: true });
  fs.writeFileSync(
    path.join(__dirname, "build", "input.json"),
    JSON.stringify(input, null, 2) + "\n",
  );
  fs.writeFileSync(path.join(__dirname, "fixtures.json"), JSON.stringify(fixtures, null, 2) + "\n");

  console.log("root          =", fixtures.root);
  console.log("nullifierHash =", fixtures.nullifier_hash);
  console.log("recipient     =", fixtures.recipient);
  console.log("context       =", fixtures.context);
  console.log("commitment[0] =", fixtures.commitments[0]);
  console.log("commitment[1] =", fixtures.commitments[1]);
  console.log("siblings      =", fixtures.siblings.join(","));
})();
