// Same vectors as the Soroban contract and dpo2u-midnight: the relayer's canonical JSON, digest and
// Soroban argument must agree with them, and it must refuse what the gate would refuse.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { canonicalJson, verdictDigest, checkVerdict, checkForStellar, toSorobanArg, evidenceRecord, EVIDENCE_FORMAT } from "./midnight-verdict-lib.mjs";

const { vectors } = JSON.parse(fs.readFileSync(new URL("../contracts/travel-rule-gate/vectors/verdict-v1-crosschain.json", import.meta.url), "utf8"));
const by = (n) => structuredClone(vectors.find((x) => x.name === n).verdict);

test("canonical JSON and digest match every shared vector", () => {
  assert.equal(vectors.length, 11);
  for (const x of vectors) {
    assert.deepEqual(checkVerdict(x.verdict), [], x.name);
    assert.equal(canonicalJson(x.verdict), x.canonical, x.name);
    assert.equal(verdictDigest(x.verdict), x.digest, x.name);
  }
});

test("Soroban argument maps every field, unions included", () => {
  const a = toSorobanArg(by("pass-released-anchored"));
  assert.equal(a.pass, true);
  assert.equal(a.reason_code, 0);
  assert.deepEqual(Object.keys(a.block), ["Anchored"]);
  assert.match(a.block.Anchored.tx, /^[0-9a-f]{64}$/);
  assert.deepEqual(Object.keys(a.sanctions), ["Signed"]);
  const b = toSorobanArg(by("fail-1-missing-party-info-no-sanctions"));
  assert.equal(b.block, "Unanchored");
  assert.equal(b.sanctions, "NotRecorded");
  assert.equal(b.pass, false);
  assert.equal(b.reason_code, 1);
});

test("refuses what the Stellar gate refuses", () => {
  assert.deepEqual(checkForStellar(by("pass-released-anchored")), []);
  assert.ok(checkForStellar(by("pass-released")).some((e) => /not anchored/.test(e)));
  assert.ok(checkForStellar({ ...by("pass-released-anchored"), policy_hash: "0".repeat(64) }).some((e) => /zero/.test(e)));
  assert.ok(checkForStellar({ ...by("pass-released-anchored"), source_contract: "abc" }).some((e) => /source_contract/.test(e)));
});

test("evidence record states the operator trust model and how to reproduce", () => {
  const v = by("pass-released-anchored");
  const ev = evidenceRecord({ verdict: v, digest: verdictDigest(v), stellar: { network: "testnet" }, relayedAt: "2026-11-16T00:00:00Z" });
  assert.equal(ev.format, EVIDENCE_FORMAT);
  assert.equal(ev.trust_model, "operator");
  assert.match(ev.trust_statement, /not a proof/);
  assert.match(ev.midnight.reproduce, new RegExp(`--transfer ${v.transfer_id} --tx ${v.tx}`));
  assert.match(ev.midnight.reproduce, /^MIDNIGHT_NETWORK=preview /);
});
