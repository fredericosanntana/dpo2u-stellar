// Unit test (no network): the EVM->Soroban conversion must reproduce the known-good
// PoR proof hex used by por-verifier/por-filing tests. Run: `node --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { evmProofToSoroban, be32 } from "./convert.mjs";

// PoR proof as snarkjs `export soliditycalldata` (EVM uint256 arrays).
const pA = [
  "0x0fe600771466e1ed961c66c31837b7033a9e702007cf6135d0d5c7bdd4f248b1",
  "0x1b08dcd66196d5fca6de458c11cb135019735d8b6ac14b1e8644f64e5183a845",
];
const pB = [
  [
    "0x10384e6b4f2b14ce9159987cd3d1e736dcc6867ddff53cca6469c1b4f10a0efd",
    "0x1b9e1da8e4ed87b679f4a3e6606ee76d3e1b98e4bb182f6a51459a8c37ef55bb",
  ],
  [
    "0x2cd22148dea491ff37a54b6c856a21d648bcc93d6b8e0863594202aac9e950f2",
    "0x29357b08c510dfafa0d197a22a778874ed0313a70abeff7a6c294261840dc8b5",
  ],
];
const pC = [
  "0x205ea7e4fb9703300bdb7093054f287f4c2ddf862315bcfbfb6608a6c37a26c1",
  "0x201992a74d98e0c3fef492c27fda23e9fcd6ef9bbacc89ee34a57a0ae0054e0d",
];
const pub = [
  "0x0000000000000000000000000000000000000000000000000000000000000001",
  "0x2e1015154eccba498ea60399e4a1f8fc264f0f1ca41643e359eb74fb12c39125",
  "0x00000000000000000000000000000000000000000000000000000000075bcd15",
];

// Expected Soroban hex (== por-verifier/src/test.rs fixtures).
const PROOF_A =
  "0fe600771466e1ed961c66c31837b7033a9e702007cf6135d0d5c7bdd4f248b11b08dcd66196d5fca6de458c11cb135019735d8b6ac14b1e8644f64e5183a845";
const PROOF_B =
  "10384e6b4f2b14ce9159987cd3d1e736dcc6867ddff53cca6469c1b4f10a0efd1b9e1da8e4ed87b679f4a3e6606ee76d3e1b98e4bb182f6a51459a8c37ef55bb2cd22148dea491ff37a54b6c856a21d648bcc93d6b8e0863594202aac9e950f229357b08c510dfafa0d197a22a778874ed0313a70abeff7a6c294261840dc8b5";
const PROOF_C =
  "205ea7e4fb9703300bdb7093054f287f4c2ddf862315bcfbfb6608a6c37a26c1201992a74d98e0c3fef492c27fda23e9fcd6ef9bbacc89ee34a57a0ae0054e0d";

test("evmProofToSoroban reproduces known-good PoR hex", () => {
  const { proof, signals } = evmProofToSoroban(pA, pB, pC, pub);
  assert.equal(proof.a, PROOF_A);
  assert.equal(proof.b, PROOF_B);
  assert.equal(proof.c, PROOF_C);
  assert.equal(signals[0], "1");
  assert.equal(signals[2], "123456789"); // 0x075bcd15
});

test("be32 left-pads to 32 bytes", () => {
  assert.equal(be32("0x1").length, 64);
  assert.equal(be32(1n), "0".repeat(63) + "1");
});
