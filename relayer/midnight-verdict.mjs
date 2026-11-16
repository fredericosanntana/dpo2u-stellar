#!/usr/bin/env node
// DPO2U relayer: Midnight TravelRuleGate verdict -> Soroban travel-rule-gate (dpo2u-stellar).
//
// OPERATOR TRUST, NOT A PROOF (see docs/TRAVEL-RULE-MIDNIGHT-RELAY.md). This relayer reads the public
// verdict from Midnight and submits it to Stellar. Stellar re-checks the form and digest but cannot
// check the verdict against Midnight; the relayer (or a quorum of them) is trusted for that.
//
// Input, one of:
//   --in export.json                 output of dpo2u-midnight `scripts/export-verdict.ts` ({ verdict, digest })
//   --transfer <id> --tx <txId>      runs export-verdict.ts in $MIDNIGHT_REPO (read-only, indexer only)
// Env: TRG_ID (Soroban gate id), STELLAR_SRC (stellar-cli key alias), STELLAR_NETWORK (default testnet),
//      MIDNIGHT_NETWORK (default preview), MIDNIGHT_REPO, EVIDENCE_DIR (default ./evidence), STELLAR_BIN.
// --plan prints what would be sent and touches no network.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { canonicalJson, verdictDigest, checkVerdict, checkForStellar, toSorobanArg, evidenceRecord } from "./midnight-verdict-lib.mjs";

const { values } = parseArgs({ options: { in: { type: "string" }, transfer: { type: "string" }, tx: { type: "string" }, contract: { type: "string" }, plan: { type: "boolean", default: false } } });
const STELLAR = process.env.STELLAR_BIN || `${process.env.HOME}/.cargo/bin/stellar`;
const NET = process.env.STELLAR_NETWORK || "testnet";
const die = (m) => { console.error(m); process.exit(1); };

function readExport() {
  if (values.in) return JSON.parse(fs.readFileSync(values.in, "utf8"));
  if (!values.transfer || !values.tx) die("pass --in <export.json>, or --transfer <id> --tx <txId> with MIDNIGHT_REPO set");
  const repo = process.env.MIDNIGHT_REPO || die("MIDNIGHT_REPO is not set");
  const args = ["tsx", "scripts/export-verdict.ts", "--transfer", values.transfer, "--tx", values.tx, ...(values.contract ? ["--contract", values.contract] : [])];
  const out = execFileSync("npx", args, { cwd: repo, encoding: "utf8", env: { ...process.env, MIDNIGHT_NETWORK: process.env.MIDNIGHT_NETWORK || "preview" } });
  return JSON.parse(out.slice(out.indexOf("{")));
}

function stellar(args, send) {
  return execFileSync(STELLAR, ["contract", "invoke", "--id", process.env.TRG_ID, "--source", process.env.STELLAR_SRC, "--network", NET, `--send=${send}`, "--", ...args], { encoding: "utf8" }).trim();
}

const { verdict, digest } = readExport();
const problems = [...checkVerdict(verdict), ...checkForStellar(verdict)];
if (problems.length) die("refused: " + problems.join("; "));
if (verdictDigest(verdict) !== digest) die(`refused: digest ${digest} != sha256(canonical) ${verdictDigest(verdict)}`);
const arg = JSON.stringify(toSorobanArg(verdict));

if (values.plan) {
  console.log(JSON.stringify({ plan: { network: NET, contract: process.env.TRG_ID ?? "<TRG_ID>", digest, canonical: canonicalJson(verdict),
    submit: `stellar contract invoke --id <TRG_ID> --source <STELLAR_SRC> --network ${NET} --send=yes -- submit --relayer <relayer> --v '${arg}'` } }, null, 2));
  process.exit(0);
}
if (!process.env.TRG_ID || !process.env.STELLAR_SRC) die("TRG_ID and STELLAR_SRC are required");

const relayer = execFileSync(STELLAR, ["keys", "address", process.env.STELLAR_SRC], { encoding: "utf8" }).trim();
const onchainDigest = JSON.parse(stellar(["digest", "--v", arg], "no"));
if (onchainDigest !== digest) die(`refused: Soroban gate computes ${onchainDigest}, Midnight export says ${digest}`);
const confirmations = Number(stellar(["submit", "--relayer", relayer, "--v", arg], "yes"));
const rec = JSON.parse(stellar(["get", "--transfer_id", verdict.transfer_id], "no") || "null");
const recorded = rec !== null && rec.digest === digest;

const ev = evidenceRecord({ verdict, digest, relayedAt: new Date().toISOString(),
  stellar: { network: NET, contract: process.env.TRG_ID, relayer, confirmations, recorded, record: rec } });
const dir = process.env.EVIDENCE_DIR || "evidence";
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${verdict.transfer_id.slice(0, 16)}-${digest.slice(0, 8)}.json`);
fs.writeFileSync(file, JSON.stringify(ev, null, 2) + "\n");
console.log(JSON.stringify({ digest, confirmations, recorded, evidence: file }));
