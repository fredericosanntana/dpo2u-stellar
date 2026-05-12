import { describe, it, expect } from 'vitest';
import { HELP_TEXT, parseArgs, runCli, type CliDeps, type CliOutputs } from '../cli.js';
import type { AttestationClient } from '../AttestationClient.js';
import type { AttestationRecord } from '../types.js';

function makeOutputs(): {
  outputs: CliOutputs;
  stdout: string[];
  stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    outputs: {
      stdout: (l) => stdout.push(l),
      stderr: (l) => stderr.push(l),
    },
    stdout,
    stderr,
  };
}

function mockDeps(record: AttestationRecord | null): CliDeps {
  return {
    buildClient: () =>
      ({
        async verify() {
          return {
            found: record !== null,
            record,
            explorer_url: 'https://stellar.expert/explorer/testnet/contract/CC4TJGDR',
            contract_id: 'CC4TJGDR',
            network_passphrase: 'Test SDF Network ; September 2015',
          };
        },
      }) as unknown as AttestationClient,
  };
}

const SAMPLE_PASS: AttestationRecord = {
  verdict: 'PASS',
  predicate_set: 'bank_change_v1',
  predicate_version: 1,
  submitted_by: 'GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN',
  timestamp: 1_700_000_000,
  metadata_hash_hex: 'a'.repeat(64),
};

async function run(
  argv: string[],
  deps: CliDeps,
): Promise<ReturnType<typeof makeOutputs> & { exitCode: number }> {
  const h = makeOutputs();
  const exitCode = await runCli(argv, h.outputs, deps);
  return { ...h, exitCode };
}

describe('parseArgs', () => {
  it('--help', () => {
    expect(parseArgs(['--help']).command).toBe('help');
  });
  it('--version', () => {
    expect(parseArgs(['--version']).command).toBe('version');
  });
  it('verify with positional args', () => {
    const a = parseArgs(['verify', 'bank_change_v1', 'a'.repeat(64)]);
    expect(a.command).toBe('verify');
    expect(a.useCaseId).toBe('bank_change_v1');
    expect(a.evidenceHashHex).toBe('a'.repeat(64));
    expect(a.json).toBe(false);
  });
  it('verify with --json', () => {
    expect(parseArgs(['verify', 'uc1', 'a'.repeat(64), '--json']).json).toBe(true);
  });
  it('verify with --contract override', () => {
    const a = parseArgs(['verify', 'uc1', 'a'.repeat(64), '--contract', 'CCUSTOM']);
    expect(a.overrides.contractId).toBe('CCUSTOM');
  });
  it('rejects unknown flag', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/unknown flag/);
  });
  it('rejects unknown subcommand', () => {
    expect(() => parseArgs(['bogus'])).toThrow(/unknown command/);
  });
});

describe('runCli — help & version', () => {
  it('--help prints HELP_TEXT and exits 0', async () => {
    const h = await run(['--help'], mockDeps(null));
    expect(h.stdout.join('\n')).toBe(HELP_TEXT);
    expect(h.exitCode).toBe(0);
  });
  it('--version prints semver and exits 0', async () => {
    const h = await run(['--version'], mockDeps(null));
    expect(h.stdout[0]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(h.exitCode).toBe(0);
  });
  it('no args prints help and exits 0', async () => {
    const h = await run([], mockDeps(null));
    expect(h.stdout.join('\n')).toBe(HELP_TEXT);
    expect(h.exitCode).toBe(0);
  });
});

describe('runCli — verify', () => {
  it('verify with PASS exits 0', async () => {
    const h = await run(['verify', 'bank_change_v1', 'a'.repeat(64)], mockDeps(SAMPLE_PASS));
    expect(h.exitCode).toBe(0);
    expect(h.stdout.some((l) => l.includes('PASS'))).toBe(true);
    expect(h.stdout.some((l) => l.includes('bank_change_v1@v1'))).toBe(true);
  });

  it('verify with FAIL exits 3', async () => {
    const h = await run(
      ['verify', 'bank_change_v1', 'a'.repeat(64)],
      mockDeps({ ...SAMPLE_PASS, verdict: 'FAIL' }),
    );
    expect(h.exitCode).toBe(3);
    expect(h.stdout.some((l) => l.includes('FAIL'))).toBe(true);
  });

  it('verify with REVIEW exits 4', async () => {
    const h = await run(
      ['verify', 'bank_change_v1', 'a'.repeat(64)],
      mockDeps({ ...SAMPLE_PASS, verdict: 'REVIEW' }),
    );
    expect(h.exitCode).toBe(4);
    expect(h.stdout.some((l) => l.includes('REVIEW'))).toBe(true);
  });

  it('verify not-found exits 1', async () => {
    const h = await run(['verify', 'bank_change_v1', 'a'.repeat(64)], mockDeps(null));
    expect(h.exitCode).toBe(1);
    expect(h.stdout.some((l) => l.includes('NOT FOUND'))).toBe(true);
  });

  it('--json emits valid JSON of the full result', async () => {
    const h = await run(
      ['verify', 'bank_change_v1', 'a'.repeat(64), '--json'],
      mockDeps(SAMPLE_PASS),
    );
    expect(h.exitCode).toBe(0);
    const parsed = JSON.parse(h.stdout.join('\n')) as { found: boolean; record: { verdict: string } };
    expect(parsed.found).toBe(true);
    expect(parsed.record.verdict).toBe('PASS');
  });

  it('missing positional args exits 2', async () => {
    const h = await run(['verify'], mockDeps(SAMPLE_PASS));
    expect(h.exitCode).toBe(2);
    expect(h.stderr.some((l) => l.includes('requires'))).toBe(true);
  });

  it('client error exits 5', async () => {
    const failingDeps: CliDeps = {
      buildClient: () =>
        ({
          async verify() {
            throw new Error('network down');
          },
        }) as unknown as AttestationClient,
    };
    const h = await run(['verify', 'bank_change_v1', 'a'.repeat(64)], failingDeps);
    expect(h.exitCode).toBe(5);
    expect(h.stderr.some((l) => l.includes('network down'))).toBe(true);
  });
});
