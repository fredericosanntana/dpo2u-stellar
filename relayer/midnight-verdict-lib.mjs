// Common Travel Rule verdict format v1 (dpo2u-midnight docs/VERDICT-FORMAT.md), relayer side.
// canonicalJson / checkVerdict mirror dpo2u-midnight scripts/lib/verdict.ts line for line; the
// shared vectors (contracts/travel-rule-gate/vectors/verdict-v1-crosschain.json) pin all three
// implementations (TypeScript on Midnight, this file, the Soroban contract) to the same digests.
import { createHash } from "node:crypto";

export const VERDICT_FORMAT = "dpo2u.travel-rule-verdict/1";
export const EVIDENCE_FORMAT = "dpo2u.travel-rule-relay-evidence/1";

export const REASON_LABELS = {
  0: "none",
  1: "missing_party_info",
  2: "missing_originator_document_above_threshold",
  3: "counterparty_vasp_not_attested",
  4: "sanctions_hit",
};

export const TRUST_STATEMENT =
  "Operator trust, not a proof. The Stellar gate checks the verdict's form (format rules, pinned " +
  "Midnight gate, allowed policy, digest, M-of-N authorized relayers) but has no Midnight light " +
  "client or state proof: it cannot check that Midnight produced this verdict. Audit it by " +
  "re-exporting the verdict from Midnight at the anchored tx and comparing the digest.";

const HEX32 = /^[0-9a-f]{64}$/;

export function canonicalJson(v) {
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(",") + "]";
  if (v && typeof v === "object")
    return "{" + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ":" + canonicalJson(v[k])).join(",") + "}";
  return JSON.stringify(v);
}

export const verdictDigest = (v) => createHash("sha256").update(canonicalJson(v)).digest("hex");

export function checkVerdict(v) {
  const e = [];
  if (v?.format !== VERDICT_FORMAT) e.push(`format must be ${VERDICT_FORMAT}`);
  for (const k of ["transfer_id", "policy_hash", "originator_root", "beneficiary_root"]) if (!HEX32.test(String(v?.[k]))) e.push(`${k} must be 32 bytes lowercase hex`);
  if (!["PASS", "FAIL"].includes(v?.verdict)) e.push("verdict must be PASS or FAIL");
  if (typeof v?.released !== "boolean") e.push("released must be a boolean");
  if (v?.released && v?.verdict !== "PASS") e.push("only a PASS can be released");
  if (!Number.isInteger(v?.reason?.code) || REASON_LABELS[v.reason.code] !== v?.reason?.label) e.push("reason must be { code 0..4, label } with the matching label");
  if ((v?.verdict === "PASS") !== (v?.reason?.code === 0)) e.push("PASS has reason 0 and FAIL a non-zero reason");
  if (typeof v?.source_chain !== "string" || !/^[a-z0-9-]+:[a-z0-9-]+$/.test(v.source_chain)) e.push('source_chain must be "<chain>:<network>"');
  if (!/^[0-9a-f]+$/.test(String(v?.source_contract))) e.push("source_contract must be hex");
  if (v?.block !== null && !(Number.isInteger(v?.block?.height) && /^[0-9a-f]+$/.test(String(v?.block?.hash)))) e.push("block must be null or { height, hash }");
  if (v?.tx !== null && !/^[0-9a-f]+$/.test(String(v?.tx))) e.push("tx must be null or hex");
  if ((v?.block === null) !== (v?.tx === null)) e.push("block and tx are both set or both null");
  if (v?.sanctions !== undefined && !(HEX32.test(String(v.sanctions.list_root)) && HEX32.test(String(v.sanctions.provider_id)) && Number.isInteger(v.sanctions.valid_until))) e.push("sanctions must be { list_root, provider_id, valid_until }");
  return e;
}

/** Extra rules of the Soroban gate (beyond the format): what it would refuse anyway. */
export function checkForStellar(v) {
  const e = [];
  if (v.policy_hash === "0".repeat(64)) e.push("policy_hash is zero (pre-v10 gate); the Stellar gate refuses it");
  if (v.block === null) e.push("verdict is not anchored: export it with --tx <evaluateTransfer|releaseTransfer tx>");
  const evenHex = (s) => typeof s === "string" && s.length > 0 && s.length % 2 === 0 && s.length <= 128;
  if (!evenHex(v.source_contract)) e.push("source_contract must be 1..64 bytes of hex");
  if (v.block && (!evenHex(v.block.hash) || !evenHex(v.tx))) e.push("block hash and tx must be 1..64 bytes of hex");
  if (v.source_chain.length > 64) e.push("source_chain longer than 64");
  return e;
}

/** Format v1 object -> `VerdictV1` argument of the Soroban gate, in stellar-cli JSON. */
export function toSorobanArg(v) {
  return {
    transfer_id: v.transfer_id,
    pass: v.verdict === "PASS",
    released: v.released,
    reason_code: v.reason.code,
    policy_hash: v.policy_hash,
    originator_root: v.originator_root,
    beneficiary_root: v.beneficiary_root,
    source_chain: v.source_chain,
    source_contract: v.source_contract,
    block: v.block === null ? "Unanchored" : { Anchored: { height: v.block.height, hash: v.block.hash, tx: v.tx } },
    sanctions: v.sanctions === undefined ? "NotRecorded" : { Signed: { list_root: v.sanctions.list_root, provider_id: v.sanctions.provider_id, valid_until: v.sanctions.valid_until } },
  };
}

/** Evidence record of one relay: what was read on Midnight, what was written on Stellar, and the trust model. */
export function evidenceRecord({ verdict, digest, stellar, relayedAt }) {
  return {
    format: EVIDENCE_FORMAT,
    trust_model: "operator",
    trust_statement: TRUST_STATEMENT,
    midnight: {
      verdict,
      digest,
      reproduce: `MIDNIGHT_NETWORK=${verdict.source_chain.split(":")[1]} npx tsx scripts/export-verdict.ts --transfer ${verdict.transfer_id} --tx ${verdict.tx} --contract ${verdict.source_contract}`,
    },
    stellar,
    relayed_at: relayedAt,
  };
}
