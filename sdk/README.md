# @dpo2u/stellar-sdk

Trustless TypeScript verifier + CLI for **DPO2U Anti-corruption Pilot** attestations on Stellar Soroban.

> **No wallet. No fee. No DPO2U cooperation required.** Anyone with Node ≥ 20 and public RPC access can independently verify any attestation.

This is the auditor's tool. PRD personas P4 (TCE/TCU/CGU) and P5 (citizen / investigative journalist) can use it to confirm the on-chain verdict for a given evidence hash without involving the municipality or DPO2U.

## Install

```bash
npm i -g @dpo2u/stellar-sdk           # global, gives you the `dpo2u-attest` CLI
# or
npm i @dpo2u/stellar-sdk              # local, programmatic use
```

## CLI

```bash
dpo2u-attest verify <use_case_id> <evidence_hash_hex>
dpo2u-attest --help
dpo2u-attest --version
```

Example — verify a known PASS attestation:

```bash
$ dpo2u-attest verify bank_change_v1 a1b2c3d4...

  DPO2U Anti-corruption Pilot — attestation verification
  ────────────────────────────────────────────────────────
  Contract:    CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5
  Network:     Test SDF Network ; September 2015

  Verdict:     ✅ PASS
  Predicate:   bank_change_v1@v1
  Submitter:   GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN
  Timestamp:   2026-05-12T18:30:00.000Z
  Meta hash:   ...
  Explorer:    https://stellar.expert/explorer/testnet/contract/CC4TJ...

$ echo $?
0
```

### Exit codes

| code | meaning |
|------|---------|
| 0    | PASS — attestation found, verdict PASS |
| 1    | NOT FOUND — no record for that pair |
| 3    | FAIL — attestation found, verdict FAIL |
| 4    | REVIEW — attestation found, verdict REVIEW |
| 5    | client error (network / decode / config) |
| 2    | usage error (bad CLI args) |

Useful for CI: `dpo2u-attest verify $UC $HASH || exit 1` flags any non-PASS state.

### Flags

| flag | default |
|------|---------|
| `--contract <C…>` | testnet deploy `CC4TJGDR…QRRZHM5` |
| `--rpc <url>` | `https://soroban-testnet.stellar.org` |
| `--passphrase <str>` | `Test SDF Network ; September 2015` |
| `--viewer <G…>` | public testnet deployer |
| `--json` | (off) emit machine-readable JSON instead of formatted output |

## Programmatic

```ts
import { AttestationClient, testnetClient } from '@dpo2u/stellar-sdk';

const client = new AttestationClient(testnetClient());
const result = await client.verify({
  useCaseId: 'bank_change_v1',
  evidenceHashHex: 'a1b2c3...64-hex-chars',
});

if (!result.found) {
  console.error('no attestation registered');
  process.exit(1);
}
console.log(result.record);
// { verdict: 'PASS', predicate_set: 'bank_change_v1', predicate_version: 1,
//   submitted_by: 'G...', timestamp: 1748..., metadata_hash_hex: '...' }
```

### Custom RPC / mainnet (when L Sprint ships)

```ts
import { AttestationClient } from '@dpo2u/stellar-sdk';

const client = new AttestationClient({
  rpcUrl: 'https://your-soroban-rpc.example.com',
  networkPassphrase: 'Public Global Stellar Network ; September 2015',
  contractId: 'C…mainnet…',
  viewerAccount: 'G…funded…',
  explorerBaseUrl: 'https://stellar.expert/explorer/public',
});
```

## What's verified

1. The `(use_case_id, evidence_hash)` pair was registered on-chain.
2. The on-chain `AttestationRecord` decodes cleanly — i.e., schema match.
3. The `verdict`, `predicate_set@version`, `submitted_by`, `timestamp`, and `metadata_hash` are reported verbatim from on-chain state.

What's NOT verified (out of scope by design):
- That the predicates that produced the verdict were sound. (That's the audit of the predicate set itself, off-chain.)
- That the submitter was honest. (The submitter's identity is on-chain; revoking malicious submitters is `authorize_submitter(allowed=false)`.)
- That the underlying evidence was real. (The contract intentionally stores only a hash — the evidence lives off-chain and is the responsibility of the operator.)

## License

Apache-2.0.

## Companion repos

- [`dpo2u-stellar`](https://github.com/fredericosanntana/dpo2u-stellar) — the Soroban contract (this repo's parent).
- DPO2U platform — closed-source today, opening in phases through Sprint L.
