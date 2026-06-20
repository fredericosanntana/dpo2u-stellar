# Proof-Bound Execution + Compliance Predicate Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Reframe the existing DeFindex ZK lane as proof-bound execution and replace the current PoR solvency predicate with a narrow compliance/policy predicate while preserving the same live intent-bound authorization lane.

**Architecture:** Keep `defindex-rebalance-gate` stable as the canonical intent-binding and replay-control lane. Move semantic change into the circuit + verifier/VK layer: replace `[solvent, commit, context]` with `[policy_pass, policy_commit, context]` (or equivalent minimal public shape), regenerate fixtures, then replay the same local and live validation loop.

**Tech Stack:** Soroban Rust, Circom 2.x, snarkjs Groth16 BN254, Stellar CLI, existing `por-verifier` contract, DeFindex gate contract.

---

## Current grounded context

### Existing truth in repo
- Gate contract: `contracts/defindex-rebalance-gate/src/lib.rs`
- Gate tests: `contracts/defindex-rebalance-gate/src/test.rs`
- Current circuit: `zk-prover/por/por_solvency.circom`
- Prior score-threshold circuit reference: `zk-prover/circom/score_threshold.circom`
- Live report already proving the lane mechanics: `.hermes/reports/2026-06-19_defindex-role-gate-live-slice.md`
- Strategic reframe memo: `docs/PROOF-BOUND-EXECUTION-COMPLIANCE-REFRAME.md`

### Key current assumption to preserve
The gate currently only really depends on two semantic invariants from public signals:
- signal[0] is the boolean pass/fail output
- signal[2] is the gate-derived context

That means the predicate can change without redesigning the whole lane if we preserve a 3-signal public layout.

### Recommended target public signal layout
- `policy_pass`
- `policy_commit`
- `context`

### Explicit non-goals for this sprint
- generalized policy engine
- multi-jurisdiction mega-circuit
- on-chain policy DSL
- transaction-envelope/full auth-entry binding
- production ceremony hardening
- automated proof issuance pipeline

---

## Proposed circuit statement (v1)

The prover knows a private witness proving that a compliance/policy aggregate satisfies a minimum threshold for this exact rebalance intent.

### Private witness (suggested v1)
- `policy_score`
- `threshold_witness` or implicit threshold preimage inputs if needed
- `jurisdiction_code`
- `policy_version`
- `mandate_class`
- `risk_bucket`
- `counterparty_class`

### Public inputs/outputs (v1)
- output `policy_pass = 1`
- output `policy_commit = Poseidon(jurisdiction_code, policy_version, mandate_class, risk_bucket, counterparty_class, threshold)`
- public input `context`

### Why this v1 is the right cut
- institutional meaning > solvency demo
- minimal delta from current lane
- preserves the same live binding story
- enough room for future audit/reconciliation through `policy_commit`

---

## Task 1: Create the new circuit file

**Objective:** Introduce a narrow BN254 compliance predicate circuit without touching the gate yet.

**Files:**
- Create: `zk-prover/por/compliance_intent_policy.circom`
- Reference: `zk-prover/por/por_solvency.circom`
- Reference: `zk-prover/circom/score_threshold.circom`

**Step 1: Draft the circuit header and statement comments**
Document clearly:
- proof-bound execution thesis
- public signals order `[policy_pass, policy_commit, context]`
- private witness fields
- honest limits

**Step 2: Implement the minimal constraint system**
Use a minimal shape such as:
- range-check `policy_score`
- range-check `threshold`
- enforce `policy_score >= threshold`
- compute `policy_commit` with Poseidon over compact policy descriptors
- bind `context` into the R1CS exactly as the current circuit does

**Step 3: Keep public signal order stable**
At the bottom, ensure `component main {public [context]} = ...` plus outputs ordered so snarkjs public signals become:
- `[policy_pass, policy_commit, context]`

**Step 4: Add a sample input file sketch**
Create a small JSON example near the build flow later (do not yet wire live scripts here).

**Step 5: Validation**
Run the circuit compile/build flow used for `por_solvency.circom` and confirm:
- witness generation succeeds
- proof generation succeeds
- `snarkjs groth16 verify` succeeds

---

## Task 2: Freeze an explicit verifier contract compatibility decision

**Objective:** Decide whether the current gate code can remain fully unchanged or needs semantic renaming only.

**Files:**
- Modify: `contracts/defindex-rebalance-gate/src/lib.rs`
- Modify: `contracts/defindex-rebalance-gate/src/test.rs`
- Optional docs note: `.hermes/reports/2026-06-19_defindex-role-gate-live-slice.md`

**Step 1: Confirm signal assumptions in gate code**
Inspect and preserve these checks:
- `pub_signals[0] == 1`
- `pub_signals[2] == expected_context`

**Step 2: Decide naming**
If you want better readability, rename internal errors/comments from PoR-specific semantics to generic policy-proof semantics where safe.

**Step 3: Keep the gate generic**
Do not teach the gate about jurisdiction, mandate class, or policy version in this sprint.

**Step 4: Validation**
Re-run unit tests after any rename-only change.

---

## Task 3: Regenerate fixture proof/VK/public signals for tests

**Objective:** Replace the current solvency-based fixtures with policy-predicate fixtures while preserving the same context-binding test shape.

**Files:**
- Modify: `contracts/defindex-rebalance-gate/src/test.rs`
- Regenerate under ignored/build paths, then copy final constants into tests

**Step 1: Generate a test input with a known context**
Use the same fixture extraction flow already proven in this repo:
- derive gate evidence hash
- derive `zk_context`
- produce a proof for that exact context

**Step 2: Convert proof/VK/public signals to Soroban format**
Reuse:
- `zk-prover/por/snarkjs2soroban-bn254.js`

**Step 3: Replace constants in `src/test.rs`**
Update:
- VK constants
- proof constants
- `PUB_*` constants
- helper names to reflect policy semantics

**Step 4: Preserve the same test matrix**
Keep these tests conceptually intact:
- happy path forwards to vault
- fails closed without verifier
- rejects wrong context
- rejects non-pass first signal

**Step 5: Validation**
Run:
- `cargo test -p defindex-rebalance-gate`
Expected: full pass

---

## Task 4: Rename the lane narrative and reports

**Objective:** Make repo truth match the new thesis so Pulso/ZK/GTM all talk about the same real seam.

**Files:**
- Modify: `.hermes/reports/2026-06-19_defindex-role-gate-live-slice.md`
- Modify: `docs/PULSO-DPO2U-DEFINDEX-PRD-v0.1.md`
- Modify: `docs/PROOF-BOUND-EXECUTION-COMPLIANCE-REFRAME.md`

**Step 1: Replace “solvency demo” wording**
Use:
- proof-bound execution
- compliance-gated execution
- policy proof authorizes a single scoped intent

**Step 2: Add a truth/target split**
Be explicit:
- current live proof may still use a simple predicate initially
- target predicate is compliance/policy
- lane mechanics stay the same

**Step 3: Update naming**
Preferred naming:
- lane `pulso_zk_policy`
- scope `zk_policy_rebalance`
- circuit `compliance_intent_policy.circom`

**Step 4: Validation**
Read docs back and verify they no longer overclaim PoR as the product thesis.

---

## Task 5: Replay the local build/test loop end-to-end

**Objective:** Prove that the semantic swap did not break the lane locally.

**Files:**
- No new files beyond prior tasks

**Step 1: Run Rust tests**
Run: `cargo test -p defindex-rebalance-gate`
Expected: all tests pass

**Step 2: Build wasm**
Run: `stellar contract build --package defindex-rebalance-gate`
Expected: wasm produced successfully

**Step 3: Verify circuit proof flow**
Run the Circom/snarkjs proof pipeline for the new circuit
Expected: proof verifies successfully

**Step 4: Record artifacts**
Capture:
- wasm hash
- verifier contract used
- vk hash / proof fixture identity

---

## Task 6: Replay the live slice on testnet with the new policy predicate

**Objective:** Prove that the exact same institutional lane works when the predicate is policy/compliance, not solvency.

**Files:**
- Modify or create a run script under `scripts/` if needed
- Update `.hermes/reports/2026-06-19_defindex-role-gate-live-slice.md`

**Step 1: Choose whether to redeploy or rotate in place**
Default safer path:
- deploy a fresh gate contract for the policy lane
- pin verifier/VK
- authorize operator
- rotate vault `rebalance_manager` to the new gate

**Step 2: Derive live intent**
Use the same shape:
- `scope`
- `nonce`
- `expires_at`
- exact `instructions`
- derive `evidence_hash`
- derive `zk_context`

**Step 3: Generate live proof for exact context**
Produce witness/proof/public signals for the new circuit using that exact context.

**Step 4: Execute `execute_rebalance_with_proof` live**
Verify:
- tx submitted successfully
- gate event emitted
- vault state changed accordingly

**Step 5: Read back final state**
Record:
- gate contract id
- tx hashes
- live vault balances
- event fields

**Step 6: Honest limits section**
State explicitly whether the live predicate is:
- truly compliance-relevant already, or
- still a simplified policy-threshold predicate standing in for a richer policy engine

---

## Task 7: Keep the GTM/hackathon packaging narrow

**Objective:** Prevent immediate overengineering after the predicate swap.

**Files:**
- Modify: `docs/PULSO-DPO2U-DEFINDEX-PRD-v0.1.md`
- Optional: create a one-pager later

**Step 1: Package the same seam three ways**
- Pulso: institutional operator action gated by policy proof
- ZK Stellar: proof tied to a single live execution intent
- GTM: compliance-gated execution

**Step 2: Explicitly defer broader work**
Defer:
- multi-jurisdiction mega-circuit
- generalized policy registries
- governance expansion
- ceremony hardening beyond hackathon need

---

## Likely files to change
- `zk-prover/por/compliance_intent_policy.circom`
- `contracts/defindex-rebalance-gate/src/lib.rs`
- `contracts/defindex-rebalance-gate/src/test.rs`
- `.hermes/reports/2026-06-19_defindex-role-gate-live-slice.md`
- `docs/PULSO-DPO2U-DEFINDEX-PRD-v0.1.md`
- `docs/PROOF-BOUND-EXECUTION-COMPLIANCE-REFRAME.md`
- optional script under `scripts/`

---

## Validation checklist
- [ ] New circuit compiles
- [ ] New proof verifies with snarkjs
- [ ] Gate tests pass locally
- [ ] Gate wasm builds
- [ ] Live testnet rebalance executes with new predicate
- [ ] Report updated with tx hashes and honest limits
- [ ] Narrative consistently says proof-bound execution, not PoR demo

---

## Strategic note

The highest-leverage move is **not** to teach the contract more policy semantics. The highest-leverage move is to keep the lane stable and make the proof semantically stronger.

That is the cleanest path from the current live slice to a credible Pulso + ZK Stellar + GTM story.