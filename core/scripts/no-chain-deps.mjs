#!/usr/bin/env node
// Makes the central architectural promise enforceable instead of aspirational.
//
// Network independence survives exactly as long as no network type leaks into
// planes 1 to 3. That is not something a code review reliably catches on the
// tenth pull request, so it is a build gate: the core declares no runtime
// dependency, and no source file names a chain SDK or a chain-native type.
//
// When an adapter needs something the contract in `adapter.ts` does not offer,
// the answer is to widen that contract in terms the core already speaks —
// strings and hex hashes — never to import the SDK here.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(root, 'src');

const FORBIDDEN_IMPORTS = [
  '@stellar/stellar-sdk',
  'stellar-sdk',
  '@solana/web3.js',
  '@coral-xyz/anchor',
  '@midnight-ntwrk',
  'ethers',
  'web3',
  'viem',
];

// Chain-native vocabulary, kept deliberately narrow.
//
// The import ban above is the real protection; this list only catches a type
// copied in by hand. So it holds names that mean nothing outside a chain SDK,
// and excludes anything a compliance core might legitimately say. `Transaction`
// and `PublicKey` were here and were removed: transaction monitoring is core
// vocabulary in this domain, and signing code has honest reasons to name a
// public key. A gate that cries wolf gets switched off.
//
// `Symbol` is absent for the same reason — it is a JavaScript builtin.
const FORBIDDEN_TOKENS = [
  'Keypair',
  'SorobanRpc',
  'contractId',
  'networkPassphrase',
  'BytesN',
  'Pubkey',
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const violations = [];

for (const file of walk(srcDir)) {
  const rel = relative(root, file);
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Comments explain the rule; they must not trip it.
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

    for (const dep of FORBIDDEN_IMPORTS) {
      if (line.includes(`'${dep}`) || line.includes(`"${dep}`)) {
        violations.push(`${rel}:${i + 1} imports "${dep}"`);
      }
    }
    for (const token of FORBIDDEN_TOKENS) {
      if (new RegExp(`\\b${token}\\b`).test(line)) {
        violations.push(`${rel}:${i + 1} names chain-native type "${token}"`);
      }
    }
  });
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const runtimeDeps = Object.keys(pkg.dependencies ?? {});
if (runtimeDeps.length > 0) {
  violations.push(
    `package.json declares runtime dependencies (${runtimeDeps.join(', ')}); the core must have none`,
  );
}

if (violations.length > 0) {
  console.error('✗ core is no longer network-independent:\n');
  for (const v of violations) console.error(`  ${v}`);
  console.error('\nMove it behind the ChainAdapter contract in src/adapter.ts.');
  process.exit(1);
}

console.log('✓ core is network-independent: no chain SDK, no chain-native types, no runtime deps');
