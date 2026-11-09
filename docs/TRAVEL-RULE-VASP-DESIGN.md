---
type: design
title: "Travel Rule Gate + VASP Passport — design"
version: 0.1
status: draft
date: 2026-11-09
related: ["../README.md", "THREAT-MODEL-Piloto-v0.1.md", "RUNBOOK.md"]
---

# Travel Rule Gate + VASP Passport — design

Scope of the 30-day Instawards sprint. Two new Soroban contracts on top of the
existing `anticorruption-attestation` registry
(`CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`, testnet). The
registry is not redeployed and its trust model does not change.

## 1. Principles

1. **No personal data on-chain.** Originator, beneficiary and payload appear only as hashes.
2. **Deterministic contracts.** No oracles; the gate only reads the registry.
3. **The registry stays the single source of verdicts.** The gate never stores a verdict of its own.

## 2. Flow

```
VASP A ──(originator + beneficiary data, off-chain)──▶ DPO2U gateway
                                                         │ evaluates rules TR1–TR5
                                                         ▼
                              registry.register_attestation("travel_rule", verdict, intent_hash, metadata_hash)
VASP A ──▶ gate.transfer(token, from, to, amount, nonce)
              │ recomputes intent_hash
              │ registry.verify_attestation("travel_rule", intent_hash)
              ├─ PASS and not yet used ──▶ token.transfer(from, to, amount)
              └─ anything else ──────────▶ revert
```

## 3. Registry configuration (no redeploy)

A new use case is added by the admin:

```
configure_use_case(admin, "travel_rule", { active: true, predicate_set: "tr_bcb520", predicate_version: 1 })
```

`evidence_hash` carries the **intent hash** of the transfer, so one attestation
is bound to one exact transfer.

## 4. Intent hash

```
intent_hash = sha256( network_id || token || from || to || amount || nonce )
```

Computed off-chain by the gateway and recomputed on-chain by the gate, in the
same canonical encoding. Changing any field changes the hash, so a `PASS`
cannot be reused for a different amount, token or counterparty.

## 5. `travel-rule-gate`

| Function | Caller | Behaviour |
| --- | --- | --- |
| `__constructor(admin, registry)` | deployer | Stores admin and registry address. |
| `transfer(token, from, to, amount, nonce)` | `from` | `from.require_auth()`; recomputes the intent hash; requires a `Pass` record in the registry; requires the intent not to be consumed; marks it consumed; calls the SEP-41 `transfer`. |
| `is_released(intent_hash)` | anyone | Read-only: whether the intent was already consumed. |

Errors: `NoAttestation`, `VerdictNotPass`, `IntentAlreadyUsed`.

- **Single use.** Each intent is marked consumed before the token call, so one `PASS` releases one transfer.
- **TTL.** Consumed-intent entries are `persistent` and extended on write; the instance TTL is extended on every call.

## 6. `vasp-passport`

| Function | Caller | Behaviour |
| --- | --- | --- |
| `__constructor(admin)` | deployer | Admin is a Stellar multisig account. |
| `set_issuer(admin, issuer, allowed)` | admin | Maintains the issuer allowlist. |
| `issue(issuer, vasp, expires_at, metadata_hash)` | issuer | Issues or renews a passport. |
| `suspend(issuer, vasp)` / `reinstate(issuer, vasp)` | issuer | Changes the status. |
| `is_valid(vasp)` | anyone | Read-only: `Valid`, `Expired`, `Suspended` or `None`. |

Expiry is evaluated against `env.ledger().timestamp()` at read time. Passport
entries are `persistent` and extended on write and on read.

## 7. Tests and evidence

- Unit tests for every error path of both contracts.
- Testnet: contract IDs, deploy transactions, one reverted transfer (`FAIL` or missing attestation) and one released transfer (`PASS`).
- `scripts/demo-travel-rule.sh`: end-to-end script, same pattern as the existing demo scripts.

## 8. Out of scope

Mainnet deployment, third-party audit, onboarding of real VASPs and any
processing of real personal data.
