# PRD ASP × SPP — gap analysis and execution roadmap

> **For Hermes:** use this as the execution anchor for the PULSO ASP/SPP track. Keep public truth honest: distinguish what is already real in `dpo2u-stellar` from what still depends on a Nethermind SPP integration.

**Goal:** align the PRD `STRIX Compliance como ASP de Credencial Positiva sobre Stellar Privacy Pools` with the current state of `/root/dpo2u-stellar`, then sequence the narrowest work that upgrades the repo from the current protocol proof into the claimed SPP-attestation-gated demo.

**Architecture:** treat the current repo as a proven protocol substrate (`protocol-registry → asp-mvp → privacy-pool/xchain-attest`) and the PRD as the next integration wrapper around that substrate. Do **not** present the SPP integration as already implemented in this repo until the hook, attestation schema, and end-to-end flow are live.

**Tech Stack:** Soroban/Rust, BN254/Groth16, DPO2U attestation layer, optional Nethermind SPP integration, frontend/join flow.

---

## Current verified context

### Already real in `/root/dpo2u-stellar`
- `contracts/protocol-registry`
  - canonical attestation verification
  - issuer profile / scope / trust tier / symbolic stake-slash
  - revocation path
- `contracts/asp-mvp`
  - registry-gated membership admission
  - active-set Merkle root
  - removal after registry invalidation / policy deactivation
- `contracts/privacy-pool`
  - symbolic fixed-denomination pool
  - real BN254/Groth16 membership withdraw verification
  - real nullifier spend prevention
  - active root history window
  - current validated slice is `depth=4`
- `contracts/xchain-attest`
  - on-chain re-verification of relayed BN254 proofs
- Validation already observed
  - `cargo test -p privacy-pool` green
  - `cargo test -p protocol-registry` green
  - `cargo test --workspace` green
  - `zk-prover/membership/build.sh` green for current depth-4 slice

### Not yet evidenced in this repo
- no checked-in `stellar-private-payments` / Nethermind SPP codebase
- no live `insert_leaf` integration against SPP membership contract
- no DPO2U ASP Gateway contract matching the PRD’s exact Soroban hook
- no proven mapping from DPO2U attestation schema to SPP leaf format
- no credentialed-join frontend for the SPP flow
- no end-to-end demo “attestation → SPP membership insertion → SPP private tx” verified here

---

## Founder-level conclusion

The PRD positioning is directionally strong, but it currently **mixes two truth layers**:
1. **already-proven protocol substrate in this repo**
2. **target SPP/Nethermind integration that is still roadmap work**

The right execution stance is:
- keep the **product thesis** intact;
- downgrade any wording that implies the SPP-integrated Gateway is already built;
- use the current repo as evidence that the DPO2U side already has real primitives worth integrating.

---

## Proposed execution phases

### Phase 0 — Truth alignment (P0)
**Objective:** eliminate overclaim risk before building further.

**Actions**
1. Patch the PRD / pitch wording so it says:
   - current repo proves protocol primitives and prototype-real privacy-pool slice
   - SPP/Nethermind integration is the next build target for PULSO
2. Patch `docs/asp-protocol-mvp.md` to reflect the current validated `privacy-pool` state:
   - depth-4, not older 2-leaf wording
   - root history present
   - full test status current
3. Add an explicit “Current evidence vs target build” section to the PULSO materials.

**Files likely to change**
- `docs/asp-protocol-mvp.md`
- PRD source / exported markdown
- submission/pitch docs that currently blur current-state vs target-state

**Validation**
- grep docs for outdated 2-leaf/depth claims
- rerun package/workspace tests only if code comments/docs are touched in contract packages

---

### Phase 1 — SPP landing zone audit (P0)
**Objective:** create a precise integration contract with Nethermind SPP before coding.

**Actions**
1. Clone or vendor the exact SPP repo/version to a deterministic path.
2. Inspect and document:
   - membership contract surface
   - `insert_leaf` auth model
   - leaf encoding required by `policy_tx_2_2`
   - deploy flow / addresses / frontend hook points
3. Write a short integration note mapping:
   - `protocol-registry.verify_attestation_proof(...)`
   - or DPO2U attestation verifier
   - into the SPP membership admission path
4. Decide whether v1 uses:
   - **A** on-chain Gateway calling SPP membership directly, or
   - **B** DPO2U-admin fallback doing verified off-chain insertion

**Files likely to change**
- new note under `docs/` (e.g. `docs/spp-integration-contract.md`)
- maybe `README` / plan docs only in this phase

**Validation**
- no implementation yet; deliver exact hook surface, auth assumptions, leaf schema, deploy commands

---

### Phase 2 — Minimal ASP Gateway for SPP (P0)
**Objective:** ship the smallest contract/service that turns an attestation into SPP membership.

**Actions**
1. Build `contracts/asp-gateway-spp` (or equivalent) with one narrow path:
   - receive subject + claim tuple + proof/material needed
   - verify via canonical DPO2U source of truth
   - call SPP membership `insert_leaf`
2. Start with one claim type only:
   - `compliance-cleared`
3. Keep one issuer / one jurisdiction path for the demo.
4. Prefer fail-closed semantics from day one.

**Files likely to change**
- new `contracts/asp-gateway-spp/src/lib.rs`
- tests for gateway + mocked downstream membership call
- deployment helper scripts

**Validation**
- package tests for the Gateway
- mocked cross-contract proof that invalid claim cannot insert
- valid claim inserts exactly once

---

### Phase 3 — Attestation schema and leaf binding (P0)
**Objective:** stop hand-waving the attestation payload.

**Actions**
1. Freeze a v1 schema with only required fields:
   - `subject_key`
   - `claim_type`
   - `jurisdiction`
   - `valid_until`
   - `attestation_root` or equivalent verifiable commitment
2. Define deterministic leaf derivation for SPP.
3. Add fixtures/examples for one test subject.
4. If direct on-chain verification is too heavy for deadline, document and implement the fallback explicitly.

**Files likely to change**
- schema/spec markdown under `docs/`
- gateway code/tests
- maybe helper script to generate leaf input fixtures

**Validation**
- one golden fixture roundtrip: attestation input → derived leaf → accepted insertion

---

### Phase 4 — End-to-end PULSO flow (P0)
**Objective:** prove the exact hackathon story.

**Actions**
1. Demo path must show:
   - attestation obtained
   - Gateway acceptance
   - SPP membership insertion
   - deposit
   - private withdraw/transfer proving membership
2. Record all live addresses / txs / scripts in one runbook.
3. Add a “demo happy path” script so Lionel can replay it without improvisation.

**Files likely to change**
- deployment/runbook docs
- scripts for demo orchestration
- frontend join flow if time permits

**Validation**
- one cold replay from fresh environment
- public artifacts collected: contract IDs, tx hashes, screen flow, video checklist

---

### Phase 5 — Strengtheners if time remains (P1)
**Objective:** improve judging quality without reopening the architecture.

**Candidates**
1. Revocation/removal propagation demo
2. Explorer/log view of association-set changes
3. Frontend credentialed-join polish
4. Narrow discovery evidence packaging for judges
5. Optional fallback demo using current `asp-mvp`/`privacy-pool` track when SPP setup is unstable

---

## What to add to the PRD now

### Additions with high leverage
1. **Current evidence matrix**
   - one table: implemented now / target for hackathon / out of scope
2. **Fallback architecture**
   - if SPP Gateway path slips, show admin-mediated fallback explicitly
3. **Protocol proof already available**
   - mention the repo already proves registry-gated membership + ZK pool slice, even before SPP binding
4. **Demo risk management**
   - fresh testnet deployment window
   - one claim type only
   - one issuer only
   - one happy-path jurisdiction only
5. **Positioning discipline**
   - “prototype-real”, “symbolic”, “production attestation layer” used carefully and consistently

### Wording corrections recommended
- avoid implying “Construímos a camada ASP ...” if the exact SPP integration is not yet live in this repo
- prefer “Estamos transformando a camada ASP em uma versão dirigida por atestação, ancorada em primitives já provadas no repo” until the hook is shipped
- keep “prove, don’t perform” — that thesis is strong and aligned

---

## Risks / tradeoffs

1. **Narrative drift risk**
   - strongest current repo truth is protocol proof, not full SPP integration
2. **Integration deadline risk**
   - SPP leaf/auth semantics may create last-mile complexity
3. **Overclaim risk around privacy-pool**
   - current validated slice is real, but depth-4 and symbolic-stateful
4. **Scope creep risk**
   - changing SPP circuits is out of scope for the hackathon window

---

## Recommended immediate next move

**Do next:** Phase 0 + Phase 1 only.

That means:
1. patch public truth,
2. bring the exact SPP repo/version into scope,
3. write the precise Gateway integration contract before touching new code.

This is the narrowest move that preserves credibility and turns the PRD into an executable build plan.
