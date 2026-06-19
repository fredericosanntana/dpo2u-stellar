# S2 — DPO2U ASP Adapter (admin-mediated v1) Implementation Plan

> **For Hermes:** use this as the execution contract for the next sprint. The goal is not to rebuild SPP or re-spec the protocol. The goal is to connect the existing DPO2U registry/policy lane to the existing SPP ASP admission lane with the smallest honest adapter.

**Goal:** turn a DPO2U compliance decision into a real ASP admission action against the SPP landing zone, with auditable state and a reversible operational path.

**Architecture:** keep `protocol-registry` as the canonical policy/attestation plane, keep SPP ASP contracts as the destination admission plane, and introduce a thin adapter/orchestrator that maps DPO2U decisions into SPP-compatible membership insertions. Do not invent a new pool, new proof system, or new membership schema in S2.

**Tech Stack:** Soroban contracts already in repo (`protocol-registry`, `asp-mvp`), SPP external repo (`_external/spp`), markdown specs/ops docs, optional Claude Code execution for implementation.

---

## Objective

Build the first real bridge between:
- **DPO2U canonical truth** = `protocol-registry`
- **DPO2U operational ASP semantics** = `asp-mvp`
- **SPP admission surface** = `asp-membership.insert_leaf(...)`

S2 is complete when the team can show:

`policy/attestation decision -> adapter input -> SPP membership leaf derivation -> insert_leaf -> root changed -> user can proceed in SPP lane`

---

## Current reusable components

### Control-plane seeds
- `contracts/protocol-registry/src/lib.rs`
  - issuer authorization
  - issuer profile / trust tier
  - claim/jurisdiction scope
  - symbolic stake / slash
  - `register_attestation(...)`
  - `revoke_attestation(...)`
  - `verify_attestation_proof(...)`
- `contracts/asp-mvp/src/lib.rs`
  - fail-closed admission against `protocol-registry`
  - operational active-set root
  - removal only when backing claim no longer verifies

### Data-plane dependency
- `_external/spp/contracts/asp-membership/src/lib.rs`
  - target function `insert_leaf(leaf)`
- `_external/spp/contracts/asp-non-membership/src/lib.rs`
  - blocked-list destination
- `_external/spp/contracts/pool/src/pool.rs`
  - pool consumes ASP roots and rejects proof if roots diverge

### Compatibility façade / operator surfaces
- `_external/spp/app/admin.html`
- `_external/spp/app/js/admin.js`
- `_external/spp/deployments/scripts/deploy.sh`
- `_external/spp/deployments/testnet/deployments.json`

### Leave as-is in S2
- SPP pool logic
- SPP proof circuits
- `privacy-pool` prototype in this repo
- xchain bridge surfaces

---

## Plane separation

### Control Plane (DPO2U-owned)
Responsible for:
- issuer/policy administration
- attestation registration/revocation
- stake/scope gating
- decision logging
- mapping subject + note key + policy lane to an admission action
- operational audit trail

### Admission Adapter Plane (new in S2)
Responsible for:
- accepting a canonical DPO2U decision package
- producing SPP-compatible membership leaf material
- invoking or preparing `insert_leaf`
- recording what root/leaf/contract was touched

### Data Plane (SPP-owned)
Responsible for:
- holding the ASP trees
- enforcing roots during proof verification
- private transaction execution

---

## Canonical domain model for S2

Minimum entities to formalize in docs and code:

1. **IssuerDecision**
   - issuer address
   - subject commitment
   - claim type
   - jurisdiction
   - attestation root
   - decision timestamp

2. **AdmissionRequest**
   - subject commitment
   - note public key
   - target network
   - target SPP membership contract id
   - optional target non-membership contract id

3. **MembershipMaterial**
   - note public key
   - membership blinding
   - membership leaf

4. **AdmissionExecutionRecord**
   - request id
   - status (`prepared|submitted|confirmed|failed|revoked`)
   - membership contract id
   - leaf
   - tx hash / invocation handle
   - observed root before
   - observed root after
   - executed by
   - executed at

5. **RevocationExecutionRecord**
   - source revocation reason
   - non-membership key/value inserted or member removal action taken
   - tx handle

---

## State machine

### Admission flow
1. `draft`
2. `policy_verified`
3. `material_prepared`
4. `submission_ready`
5. `submitted`
6. `confirmed`
7. `root_observed`
8. `handoff_complete`

### Failure states
- `policy_denied`
- `material_invalid`
- `submission_failed`
- `root_not_observed`
- `operator_abort`

### Revocation / exclusion flow
1. `revocation_detected`
2. `membership_lane_closed`
3. `block_action_prepared`
4. `block_submitted`
5. `block_confirmed`

---

## Proposed approach

### Principle
Do **not** make S2 depend on a new generalized gateway contract first.

### Instead
Ship an **adapter-first** implementation with two boundaries:

1. **Decision boundary**: prove that DPO2U can deterministically say “this subject qualifies for lane X under policy Y now”.
2. **Execution boundary**: prove that the decision can be transformed into the exact SPP membership leaf and inserted into the destination contract.

This yields a real demo, real ops path, and a stable contract for the next sprint.

---

## Files likely to change / create

### Create docs/specs
- `docs/S2-DPO2U-ASP-ADAPTER-SPEC.md`
- `docs/S2-DPO2U-ASP-ADAPTER-OPS-RUNBOOK.md`

### Create implementation workspace (suggested)
- `integration/spp-adapter/README.md`
- `integration/spp-adapter/spec/schema.json` or `schema.md`
- `integration/spp-adapter/scripts/` (if shell/python helpers are chosen)

### Possible contract-facing integration docs
- `docs/asp-protocol-mvp.md` (only additive references if needed)
- `docs/PULSO-DPO2U-ASP-SPP-roadmap-executivo.md` (optional cross-link only)

### Possible tests / proof artefacts
- `integration/spp-adapter/examples/`
- `integration/spp-adapter/tests/`

---

## Step-by-step plan

### Task 1: Freeze the adapter contract
**Objective:** define the exact input/output contract of S2.

**Deliverable:** a schema/table with:
- subject commitment
- claim type
- jurisdiction
- attestation root
- note public key
- membership blinding
- membership leaf
- membership contract id
- operator/admin identity

**Verification:** reviewer can answer “what exact data enters the adapter, and what exact on-chain action exits it?” without opening code.

---

### Task 2: Map DPO2U registry truth to admission eligibility
**Objective:** state precisely what must already be true in `protocol-registry` before an SPP admission is allowed.

**Use existing surfaces:**
- `configure_issuer_profile(...)`
- `set_policy_stake(...)`
- `credit_issuer_stake(...)`
- `register_attestation(...)`
- `verify_attestation_proof(...)`

**Verification:** one table: registry condition -> adapter admission consequence.

---

### Task 3: Freeze the SPP membership material format
**Objective:** codify the membership material without interpretation drift.

**Use audited evidence from S1:**
- membership leaf = `Poseidon2(note_public_key, membership_blinding, domain=0x01)`
- target action = `asp-membership.insert_leaf(leaf)`

**Verification:** examples section with one sample payload and one resulting leaf field placeholder.

---

### Task 4: Define the execution modes
**Objective:** avoid hidden assumptions about how insertion happens.

Define exactly two supported execution modes:
1. **prepared mode** — adapter emits leaf + invocation payload for operator/manual submission
2. **executed mode** — adapter actually submits insertion with admin credentials

**Verification:** every downstream user can see whether the artifact is advisory or already acted on-chain.

---

### Task 5: Define the audit record
**Objective:** make every admission reconstructable later.

Each admission record must capture:
- request id
- decision inputs
- derived leaf
- membership contract id
- root before
- root after
- tx hash / invocation handle
- operator identity
- status

**Verification:** an auditor can reconstruct “why was this user admitted?” from one record.

---

### Task 6: Define the revocation mapping
**Objective:** avoid building only the happy path.

Decide and document:
- when DPO2U revocation means **future denial only**
- when DPO2U revocation must also trigger **non-membership insertion** in SPP
- whether active-set removal uses `asp-mvp.remove_from_set(...)`, SPP blocklist, or both depending on lane

**Verification:** at least 3 revocation scenarios mapped to concrete actions.

---

### Task 7: Prepare the implementation repo slice
**Objective:** create the minimal folder layout for S2 implementation.

Suggested structure:
- `integration/spp-adapter/README.md`
- `integration/spp-adapter/spec/adapter-schema.md`
- `integration/spp-adapter/examples/admission-request.example.json`
- `integration/spp-adapter/examples/admission-record.example.json`
- `integration/spp-adapter/scripts/derive_membership_leaf.(py|js)`
- `integration/spp-adapter/scripts/prepare_insert_leaf.(py|sh)`

**Verification:** structure exists and is understandable without tribal knowledge.

---

### Task 8: Define demo acceptance criteria
**Objective:** make “done” falsifiable.

S2 demo is only done if it shows:
1. valid registry state
2. successful derivation of membership material
3. prepared or executed `insert_leaf`
4. changed root or confirmed invocation handle
5. final human-readable admission record

**Verification:** checklist in the runbook.

---

## Tests / validation

### Documentary validation
- read the S2 spec and ensure no field is ambiguous
- confirm every state transition has an owner and artifact

### Technical validation
- confirm the adapter uses the exact SPP membership formula from S1
- confirm the action target is `asp-membership.insert_leaf`
- confirm the registry prerequisites reflect current `protocol-registry`
- if scripts are added, run them on one example payload and inspect output

### Demo validation
- prepared mode: emitted payload must be sufficient for operator submission
- executed mode: root before/after or tx handle must be captured

---

## Risks / tradeoffs

### Risk 1
Overbuilding a gateway before freezing the adapter contract.

**Mitigation:** no new generalized gateway in S2.

### Risk 2
Treating revocation as an afterthought.

**Mitigation:** include blocklist/removal mapping in the initial spec.

### Risk 3
Losing auditability around who inserted what.

**Mitigation:** admission record is first-class, not optional logging.

### Risk 4
Conflating DPO2U `asp-mvp` semantics with SPP ASP semantics.

**Mitigation:** document both roles explicitly; S2 is an adapter, not a merge.

---

## Open questions

1. Should DPO2U own `membership_blinding`, or should it be user-derived then vouched/approved by DPO2U?
2. Should the first executed mode be manual-admin or bot-admin?
3. For revocation, does v1 require immediate non-membership insertion or only stop future admissions?
4. Is the first live lane testnet-only with the sample SPP deployment, or new deployment under DPO2U control?

---

## Execution recommendation

Implement S2 in this order:
1. spec
2. runbook
3. examples
4. derivation helper
5. payload-prep helper
6. optional on-chain execution helper
7. demo artifact

This keeps the sprint honest and demoable without pretending the whole protocol stack is already unified.
