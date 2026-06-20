# Three Tracks — anti-overengineering plan

> **For Hermes:** keep execution narrow. Do not open a fourth front. Close one proof-bearing artifact per track.

**Goal:** Freeze the next-step operating model across the three active DPO2U/Stellar fronts: Pulso hackathon, ZK Stellar hackathon, and GTM.

**Architecture:** Reuse the live proof-bound execution slice as the common primitive, but package it differently for each audience. Pulso gets SPP/admission framing, ZK Stellar gets proof-bound execution framing, GTM gets institutional compliance-gated execution framing. No new protocol surface unless it directly unlocks one of those deliverables.

**Tech/asset base already grounded:**
- Pulso roadmap: `docs/PULSO-DPO2U-ASP-SPP-roadmap-executivo.md`
- Pulso PRD: `docs/PULSO-DPO2U-ASP-PRD-v1.1-reviewed.md`
- ZK thesis: `docs/PROOF-BOUND-EXECUTION-COMPLIANCE-REFRAME.md`
- GTM: `docs/GTM_PLAN.md`
- Live rollforward proof lane: `.hermes/reports/2026-06-20_policy-vault-rollforward-live.md`
- Submission pack status: `docs/submissions/HACKATHON-SUBMISSION-CHECKLIST.md`, `docs/submissions/PULSO-SUBMISSION-LINKS.md`

---

## Executive operating rule

1. **One primitive, three narratives.**
   - Primitive: privileged DeFindex execution gated by a proof bound to the exact live intent.
2. **No maximalist expansion.**
   - No multi-jurisdiction circuit expansion.
   - No second control plane.
   - No governance/staking/slashing detour.
3. **Every track must end in a concrete artifact.**
   - Pulso → judge-facing demo/submission artifact.
   - ZK Stellar → technical proof artifact with txs/runbook.
   - GTM → founder/institution-facing narrative + outreach artifact.

---

## Track 1 — Pulso hackathon

**Goal:** position DPO2U as the compliance/admission primitive for SPP-style private finance, without pretending the whole universe is already integrated.

**What is already true:**
- `docs/PULSO-DPO2U-ASP-SPP-roadmap-executivo.md` says the ask is the landing of the primitive into SPP, not reinvention.
- `docs/PULSO-DPO2U-ASP-PRD-v1.1-reviewed.md` already freezes simplification rules: one credential type, one primary jurisdiction, narrow gateway.
- `docs/submissions/PULSO-SUBMISSION-LINKS.md` and `docs/submissions/HACKATHON-SUBMISSION-CHECKLIST.md` already exist.

**Correct scope now:**
- Treat Pulso as the **admission/compliance primitive story**.
- Reuse the live proof-bound DeFindex slice as evidence that DPO2U can sit in the path of privileged financial action.
- Do **not** turn Pulso into a second giant integration sprint.

**Next deliverable:**
- Update the Pulso submission narrative so the new live DeFindex proof-bound slice is referenced as supporting evidence for institutional gating on Stellar.

**Backlog (strict order):**
1. Patch `docs/submissions/HACKATHON-SUBMISSION-CHECKLIST.md` with the new live status.
2. Patch `docs/submissions/PULSO-SUBMISSION-LINKS.md` to include `.hermes/reports/2026-06-20_policy-vault-rollforward-live.md` or a public equivalent if needed.
3. Patch `docs/submissions/PULSO-VIDEO-SCRIPT.md` / deck copy to say:
   - DPO2U = admission/compliance primitive
   - proof-bound execution already validated on Stellar via DeFindex vault control
   - SPP landing remains the specific application layer
4. Freeze the judge claim set: no privacy-pool finality, no governance overclaim, no “full SPP integration done” claim.

**Done when:**
- a judge can read the submission pack and understand exactly what is live, what is the primitive, and what is the SPP-specific target.

---

## Track 2 — ZK Stellar hackathon

**Goal:** present the smallest non-symbolic ZK/Stellar thesis: a Soroban-controlled financial action that only executes when a live proof tied to the exact intent passes.

**What is already true:**
- `docs/PROOF-BOUND-EXECUTION-COMPLIANCE-REFRAME.md` already gives the right framing.
- `.hermes/reports/2026-06-20_policy-vault-rollforward-live.md` proves the lane live:
  - gate wired to new vault
  - proof regenerated against gate-derived context
  - rebalance executed live
- `scripts/rollforward-defindex-policy-vault-testnet.sh` provides the reproducible runbook.

**Correct scope now:**
- Sell **proof-bound execution**, not “generic ZK on Soroban,” not “solvency product,” not “regulation engine.”
- Keep the public statement minimal: `[policy_pass, policy_commit, context]` bound to live intent.

**Next deliverable:**
- A single canonical technical note / demo runbook for external readers, distilled from the live report.

**Backlog (strict order):**
1. Promote the live report into a public-facing doc under `docs/` (or patch an existing demo/report doc) with:
   - thesis
   - contracts
   - tx hashes
   - exact live result
2. Ensure the wording matches `docs/PROOF-BOUND-EXECUTION-COMPLIANCE-REFRAME.md`.
3. Keep one replayable script only: `scripts/rollforward-defindex-policy-vault-testnet.sh`.
4. Do not add new circuit features unless they directly improve judge legibility.

**Done when:**
- an external technical reader can verify the claim “Stellar contracts can require a proof tied to one exact live execution intent.”

---

## Track 3 — GTM

**Goal:** turn the technical primitive into a crisp buyer story for institutional operators and Web3 founders.

**What is already true:**
- `docs/GTM_PLAN.md` already defines ICPs and the demo protocol.
- The new live slice strengthens the message from “compliance as protocol” to **compliance-gated execution**.

**Correct scope now:**
- GTM is not “sell every possible use case.”
- GTM is: one institutional sentence, one founder sentence, one demo protocol.

**Recommended core message:**
- **Institutional:** DPO2U puts verifiable policy in the path of privileged financial actions.
- **Founder/Web3:** DPO2U lets you prove a sensitive action was allowed by policy without exposing the private policy inputs.

**Next deliverable:**
- Patch `docs/GTM_PLAN.md` and one outward-facing sales artifact so the live proof-bound execution becomes part of the value proposition.

**Backlog (strict order):**
1. Update `docs/GTM_PLAN.md` positioning language from generic verifiable compliance to **compliance-gated execution** where appropriate.
2. Patch one sales-pack artifact (`docs/sales-pack/overview.md` first choice) with the new framing.
3. Define one demo storyline for prospects:
   - policy evaluated privately
   - proof bound to intent
   - action executes on-chain only if proof passes
4. Resist creating CRM/process overhead beyond the existing lightweight plan.

**Done when:**
- a prospect can understand the commercial value in one sentence and see a concrete live proof artifact behind it.

---

## Priority order across tracks

1. **Pulso packaging first** — because submission timing is externally constrained.
2. **ZK canonical write-up second** — because it stabilizes the honest technical thesis.
3. **GTM wording third** — because it should inherit the now-frozen technical truth.

---

## What not to do next

- Do not start a fresh repo-wide architecture redesign.
- Do not open a new DeFindex API escalation thread unless the objective becomes specifically API/operator access.
- Do not generalize the circuit to many jurisdictions now.
- Do not chase a second live vault lane in parallel.
- Do not create separate narratives that contradict each other.

---

## Immediate next step recommendation

**Next step predicted:** patch the Pulso submission/checklist/docs so the new live proof-bound DeFindex slice becomes explicit evidence, then freeze the ZK public note, then reflect that framing into GTM.

That sequence gives one closed artifact per track without reopening engineering risk.