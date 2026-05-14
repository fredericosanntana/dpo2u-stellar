#!/usr/bin/env node
/**
 * dpo2u-attest — trustless CLI verifier for DPO2U Anti-corruption Pilot
 * attestations on Stellar Soroban.
 *
 * Usage:
 *   dpo2u-attest verify <use_case_id> <evidence_hash_hex>
 *     [--contract <C...>] [--rpc <url>] [--passphrase <str>]
 *     [--viewer <G...>] [--json]
 *
 *   dpo2u-attest --help
 *   dpo2u-attest --version
 *
 * No wallet, no fee, no DPO2U cooperation required — just public Stellar
 * RPC. Designed for external auditors (TCE/TCU/CGU), journalists, and
 * citizens who want to independently verify a published attestation.
 */

import { AttestationClient, testnetClient } from './AttestationClient.js';
import { SdkError } from './types.js';

const VERSION = '0.1.0';

interface Args {
  command: 'verify' | 'help' | 'version';
  useCaseId?: string;
  evidenceHashHex?: string;
  overrides: {
    contractId?: string;
    rpcUrl?: string;
    networkPassphrase?: string;
    viewerAccount?: string;
  };
  json: boolean;
}

export function parseArgs(argv: readonly string[]): Args {
  const out: Args = { command: 'help', overrides: {}, json: false };
  if (argv.length === 0) return out;

  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out.command = 'help';
      return out;
    }
    if (a === '--version' || a === '-V') {
      out.command = 'version';
      return out;
    }
    if (a === '--json') {
      out.json = true;
      continue;
    }
    if (a === '--contract') {
      out.overrides.contractId = argv[++i];
      continue;
    }
    if (a === '--rpc') {
      out.overrides.rpcUrl = argv[++i];
      continue;
    }
    if (a === '--passphrase') {
      out.overrides.networkPassphrase = argv[++i];
      continue;
    }
    if (a === '--viewer') {
      out.overrides.viewerAccount = argv[++i];
      continue;
    }
    if (a.startsWith('-')) {
      throw new SdkError(`unknown flag: ${a}`, 'INVALID_INPUT');
    }
    positional.push(a);
  }

  if (positional[0] === 'verify') {
    out.command = 'verify';
    out.useCaseId = positional[1];
    out.evidenceHashHex = positional[2];
  } else if (positional[0]) {
    throw new SdkError(`unknown command: ${positional[0]}`, 'INVALID_INPUT');
  }

  return out;
}

export const HELP_TEXT = `dpo2u-attest — trustless verifier for DPO2U Anti-corruption Pilot

USAGE
  dpo2u-attest verify <use_case_id> <evidence_hash_hex> [options]
  dpo2u-attest --help
  dpo2u-attest --version

ARGUMENTS
  use_case_id          Soroban Symbol (e.g. "bank_change_v1").
  evidence_hash_hex    SHA-256 of the evidence payload (64 hex chars).

OPTIONS
  --contract <C...>    Override contract id (default: testnet deploy).
  --rpc <url>          Override Soroban RPC URL.
  --passphrase <str>   Override network passphrase.
  --viewer <G...>      Override simulation source account.
  --json               Emit JSON instead of human-readable output.

EXAMPLES
  dpo2u-attest verify bank_change_v1 aaaa...aaaa
  dpo2u-attest verify payment_doc_v1 bbbb...bbbb --json

  Look up the contract id and submission tx hash in scripts/deploy.json
  or at the project README.
`;

export interface CliOutputs {
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
}

export interface CliDeps {
  readonly buildClient: (cfg: ReturnType<typeof testnetClient>) => AttestationClient;
}

const defaultDeps: CliDeps = {
  buildClient: (cfg) => new AttestationClient(cfg),
};

/**
 * Run the CLI. Returns the exit code; the caller is responsible for
 * actually calling `process.exit()` — this keeps the function pure and
 * fully testable without throwing sentinels through user code.
 */
export async function runCli(
  argv: readonly string[],
  outputs: CliOutputs,
  deps: CliDeps = defaultDeps,
): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    outputs.stderr(`error: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }

  if (args.command === 'help') {
    outputs.stdout(HELP_TEXT);
    return 0;
  }
  if (args.command === 'version') {
    outputs.stdout(VERSION);
    return 0;
  }

  // verify
  if (!args.useCaseId || !args.evidenceHashHex) {
    outputs.stderr('error: verify requires <use_case_id> and <evidence_hash_hex>');
    outputs.stderr('');
    outputs.stderr('Run `dpo2u-attest --help` for usage.');
    return 2;
  }

  const cfg = testnetClient(args.overrides);
  const client = deps.buildClient(cfg);

  let result: Awaited<ReturnType<AttestationClient['verify']>>;
  try {
    result = await client.verify({
      useCaseId: args.useCaseId,
      evidenceHashHex: args.evidenceHashHex,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    outputs.stderr(`error: ${msg}`);
    return 5;
  }

  if (args.json) {
    outputs.stdout(JSON.stringify(result, null, 2));
  } else {
    renderHuman(result, outputs.stdout);
  }

  // Exit code reflects what the auditor saw on-chain:
  //   0  PASS               attestation found, verdict PASS
  //   1  NOT FOUND          no record for the (use_case, evidence_hash) pair
  //   3  FAIL               attestation found, verdict FAIL
  //   4  REVIEW             attestation found, verdict REVIEW
  //   5  client error       network / decode / config problem
  //   2  usage error        bad CLI args
  if (!result.found) return 1;
  if (result.record!.verdict === 'FAIL') return 3;
  if (result.record!.verdict === 'REVIEW') return 4;
  return 0;
}

function renderHuman(
  result: {
    found: boolean;
    record: import('./types.js').AttestationRecord | null;
    explorer_url: string;
    contract_id: string;
    network_passphrase: string;
  },
  print: (line: string) => void,
): void {
  print('');
  print('  DPO2U Anti-corruption Pilot — attestation verification');
  print('  ' + '─'.repeat(56));
  print(`  Contract:    ${result.contract_id}`);
  print(`  Network:     ${result.network_passphrase}`);
  print('');
  if (!result.found) {
    print('  NOT FOUND  — no attestation registered for that pair.');
    print(`  Explorer:    ${result.explorer_url}`);
    print('');
    return;
  }
  const r = result.record!;
  const tag =
    r.verdict === 'PASS' ? '✅ PASS' : r.verdict === 'FAIL' ? '❌ FAIL' : '⚠️  REVIEW';
  print(`  Verdict:     ${tag}`);
  print(`  Predicate:   ${r.predicate_set}@v${r.predicate_version}`);
  print(`  Submitter:   ${r.submitted_by}`);
  print(`  Timestamp:   ${new Date(r.timestamp * 1000).toISOString()}`);
  print(`  Meta hash:   ${r.metadata_hash_hex}`);
  print(`  Explorer:    ${result.explorer_url}`);
  print('');
}

// CLI entry — only runs when invoked as a script, not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
  void runCli(process.argv.slice(2), {
    stdout: (l) => console.log(l),
    stderr: (l) => console.error(l),
  }).then((code) => process.exit(code));
}
