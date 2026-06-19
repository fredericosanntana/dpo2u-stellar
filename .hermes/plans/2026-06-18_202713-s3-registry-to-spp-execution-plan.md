# S3 — Protocol Registry → SPP Execution Plan

> **For Hermes:** use this as the execution contract for the next sprint. The goal is to connect a real DPO2U attestation decision lane to the already-validated SPP adapter path, not to redesign the protocol.

**Goal:** make one canonical DPO2U decision travel end-to-end from `protocol-registry` verification into a real `asp-membership.insert_leaf` execution record.

**Architecture:** keep `protocol-registry` as the policy truth source, keep `integration/spp-adapter/` as the execution adapter, and add only the smallest orchestration layer needed to transform a verified attestation into an executed admission record. Use `asp-mvp` as semantic reference for fail-closed admission/removal, not as the final SPP execution lane.

**Tech Stack:** Soroban contracts in `contracts/protocol-registry` and `contracts/asp-mvp`, adapter artifacts in `integration/spp-adapter`, Stellar CLI, external audited SPP deployment metadata in `_external/spp/deployments/testnet/deployments.json`.

---

## Current proven baseline

Already proven in S2:
- membership leaf derivation compatible with SPP;
- payload preparation for `insert_leaf`;
- real testnet execution against `asp-membership`;
- real `tx_handle` capture;
- real `root_before` / `root_after` capture.

Already proven in the local protocol layer:
- `protocol-registry` supports canonical verification via `verify_attestation_proof(...)`;
- policy lane gating exists (`configure_issuer_profile`, claim/jurisdiction scopes, stake thresholds, revocation);
- `asp-mvp` already encodes fail-closed operational semantics and removal on invalidation.

S3 should not re-prove these primitives. It should connect them.

---

## Target outcome

S3 is complete only when the repo can show:

1. one canonical `AdmissionDecisionInput` derived from a registry-verified attestation lane;
2. one deterministic mapping from that decision into adapter payload;
3. one executed `AdmissionExecutionRecord` tied to that decision;
4. one explicit revocation mapping document for the same lane.

---

## Deliverables

### Docs/specs
- `docs/S3-REGISTRY-TO-SPP-EXECUTION-SPEC.md`
- `docs/S3-REGISTRY-TO-SPP-REVOCATION-MAPPING.md`
- `docs/S3-REGISTRY-TO-SPP-DEMO-RUNBOOK.md`

### Adapter additions
- `integration/spp-adapter/spec/decision-to-admission-mapping.md`
- `integration/spp-adapter/examples/registry-verified-admission.example.json`
- `integration/spp-adapter/examples/revocation-decision.example.json`
- `integration/spp-adapter/scripts/build_admission_from_registry.py`

### Optional test/demo artifacts
- `integration/spp-adapter/examples/executed-from-registry.record.json`
- `integration/spp-adapter/examples/revocation-action.record.json`

---

## Step-by-step plan

### Task 1: Freeze the canonical lane
**Objective:** choose one concrete `(claim_type, jurisdiction)` lane for the first real end-to-end execution.

**Output:** one short table in `docs/S3-REGISTRY-TO-SPP-EXECUTION-SPEC.md` with:
- claim type
- jurisdiction
- minimum trust tier
- minimum stake
- issuer scope requirements
- revocation consequence

**Verification:** a reviewer can answer “which lane are we demonstrating?” in one glance.

---

### Task 2: Freeze the decision contract
**Objective:** define the exact registry facts required before the adapter may act.

**Use existing surfaces:**
- `configure_issuer_profile(...)`
- `set_issuer_claim_scope(...)`
- `set_issuer_jurisdiction_scope(...)`
- `set_policy_stake(...)`
- `register_attestation(...)`
- `verify_attestation_proof(...)`
- `revoke_attestation(...)`

**Output:** `integration/spp-adapter/spec/decision-to-admission-mapping.md`

**Verification:** it must map each required registry fact to one adapter field or one go/no-go condition.

---

### Task 3: Materialize registry-shaped input
**Objective:** create an example input that looks like a real canonical decision instead of a generic placeholder.

**Output:** `integration/spp-adapter/examples/registry-verified-admission.example.json`

It should include:
- subject commitment
- claim type
- jurisdiction
- attestation root
- issuer identity
- note public key
- membership blinding
- target network and contract ids

**Verification:** the example validates against the existing adapter input schema with no ambiguous fields.

---

### Task 4: Build the registry → adapter transformer
**Objective:** add a helper that turns a registry-verified decision package into an `AdmissionDecisionInput`.

**Output:** `integration/spp-adapter/scripts/build_admission_from_registry.py`

Minimum behavior:
- read canonical decision JSON;
- assert required fields exist;
- emit normalized adapter JSON;
- preserve provenance fields for audit.

**Verification:** run it on the example decision and inspect deterministic output.

---

### Task 5: Chain the transformer into the existing executed path
**Objective:** prove that a registry-shaped decision can flow through the existing leaf derivation and execution pipeline.

**Reuse existing artifacts:**
- `integration/spp-adapter/scripts/prepare_insert_leaf.py`
- `integration/spp-adapter/tools/leaf-derive/`

**Output:** `integration/spp-adapter/examples/executed-from-registry.record.json`

**Verification:**
- transform registry decision -> adapter input;
- prepare leaf;
- if safe target remains available, execute `insert_leaf` again on testnet or produce a prepared-only variant with explicit status;
- capture tx/root data if executed.

---

### Task 6: Define revocation mapping by lane
**Objective:** close the biggest remaining honesty gap.

**Output:** `docs/S3-REGISTRY-TO-SPP-REVOCATION-MAPPING.md`

At minimum cover three cases:
1. revoke before admission;
2. revoke after admission with deny-future-only semantics;
3. revoke after admission requiring explicit blocked-lane action.

**Verification:** each case must name the exact artifact and action expected (`no-op`, `prepared non-membership action`, `executed non-membership action`, `asp-mvp removal`, etc.).

---

### Task 7: Write the demo runbook
**Objective:** make the S3 demo reproducible by an operator.

**Output:** `docs/S3-REGISTRY-TO-SPP-DEMO-RUNBOOK.md`

The runbook must show:
1. canonical lane setup assumptions;
2. source decision file;
3. transform command;
4. prepare command;
5. execute command;
6. post-execution verification;
7. rollback/revocation branch.

**Verification:** another operator should be able to follow the runbook without tribal knowledge.

---

## Files likely to change

### Create
- `docs/S3-REGISTRY-TO-SPP-EXECUTION-SPEC.md`
- `docs/S3-REGISTRY-TO-SPP-REVOCATION-MAPPING.md`
- `docs/S3-REGISTRY-TO-SPP-DEMO-RUNBOOK.md`
- `integration/spp-adapter/spec/decision-to-admission-mapping.md`
- `integration/spp-adapter/examples/registry-verified-admission.example.json`
- `integration/spp-adapter/examples/revocation-decision.example.json`
- `integration/spp-adapter/scripts/build_admission_from_registry.py`
- `integration/spp-adapter/examples/executed-from-registry.record.json`

### Reference/read-only
- `contracts/protocol-registry/src/lib.rs`
- `contracts/asp-mvp/src/lib.rs`
- `docs/S2-DPO2U-ASP-ADAPTER-IMPLEMENTATION-REPORT.md`
- `_external/spp/deployments/testnet/deployments.json`

---

## Validation

### Documentary validation
- confirm every required registry fact has a corresponding adapter mapping;
- confirm the selected lane is explicit and bounded;
- confirm revocation behavior is documented without overclaim.

### Technical validation
- run the registry → adapter transformer on the example decision;
- run `prepare_insert_leaf.py` on the normalized output;
- ensure the derived leaf remains deterministic;
- if executed, capture tx hash and roots.

### Acceptance criteria
S3 is done only if there is at least one file-based path showing:

`registry-shaped decision -> normalized adapter input -> execution/preparation record -> explicit revocation mapping`

---

## Risks / tradeoffs

### Risk 1
Creating a fake “registry integration” that is just a renamed static JSON.

**Mitigation:** preserve provenance fields and document exactly what was asserted versus what was executed.

### Risk 2
Pulling `protocol-registry` too deep into SPP-specific semantics.

**Mitigation:** keep the transformation in the adapter layer, not inside the registry contract.

### Risk 3
Hiding the revocation gap.

**Mitigation:** make `docs/S3-REGISTRY-TO-SPP-REVOCATION-MAPPING.md` mandatory before calling the sprint complete.

---

## Recommendation

The next correct build is not a bigger protocol. It is a **decision-to-execution bridge**.

S3 should stay small, explicit, and falsifiable: one lane, one decision contract, one executed path, one revocation map.
