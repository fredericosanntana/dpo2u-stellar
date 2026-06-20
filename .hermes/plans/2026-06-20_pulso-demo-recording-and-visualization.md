# Pulso demo recording and visualization plan

> **For Hermes:** keep this narrow. The Pulso video must explain the mechanism visually in one pass, not add new product surface.

**Goal:** Record a 90–120s Pulso demo that makes the proposal easy to visualize: DPO2U as the positive-credential / admission primitive for private finance on Stellar.

**Architecture:** Use a terminal-first evidence walkthrough with 3 synchronized surfaces: (1) the canonical registry/policy source, (2) the bridge/admission artifacts, and (3) the on-chain execution proof. No new frontend is required. The video should visualize the protocol flow, not simulate a polished consumer app.

**Grounding docs:**
- `docs/submissions/PULSO-VIDEO-SCRIPT.md`
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
- `docs/submissions/PULSO-PITCH-DECK-SLIDES.md`
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`

---

## Core answer

We record the demo as a **protocol evidence story**, not as a UI story.

The viewer must see one thing clearly:

`attestation/policy -> decision -> admission -> revocation -> blocked re-entry`

That is enough to visualize the proposal.

---

## Visual model for the video

### Layout
Use a single desktop with 3 zones:

1. **Left pane — canonical truth**
   - `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
   - highlight policy lane, attestation, revocation

2. **Center pane — generated artifacts / bridge**
   - `integration/spp-adapter/examples/live-registry-decision.json`
   - `integration/spp-adapter/examples/live-registry-admission.json`
   - if needed, `...executed.record.json`

3. **Right pane — on-chain/public proof**
   - either terminal readback of txs/results
   - or Stellar Expert / explorer page already opened on the relevant contract/tx if stable enough

### Why this works
It makes the proposal legible without pretending we have a full product UI. The judges see the flow and the evidence chain directly.

---

## Canonical demo sequence

### Scene 1 — Hook (0–10s)
Show one slide or one markdown heading from `docs/submissions/PULSO-PITCH-DECK-SLIDES.md`:
- "Credencial positiva para private finance na Stellar"

Then immediately move to the live surfaces.

### Scene 2 — What DPO2U is (10–25s)
Keep the left pane on the registry/policy report.
Narrate: DPO2U does not put PII on-chain; it turns an upstream compliance decision into a verifiable credential.

### Scene 3 — The mechanism (25–50s)
Walk left-to-center:
1. show policy lane active in `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
2. show live attestation registered
3. show extracted decision JSON
4. show admission payload JSON

The key visual is: **a canonical decision became an operational payload**.

### Scene 4 — Load-bearing proof (50–80s)
Walk center-to-right:
1. show insert/admission evidence
2. show revocation tx/evidence
3. show failed second attempt / blocked re-entry

This is the most important visual section.

### Scene 5 — Honest boundary (80–100s)
Briefly show `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`.
Say plainly: the external audited instance is publicly readable but not mutable without admin authorization.

### Scene 6 — Supporting proof slice (90–110s, very brief)
Show `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md` for a few seconds only.
Purpose: reinforce that policy/compliance is already proven in the path of a privileged financial action elsewhere on Stellar.
Do not let this replace the Pulso story.

### Scene 7 — Close (110–120s)
Return to the one-sentence thesis:
- DPO2U is the admission/compliance primitive for private finance on Stellar.

---

## What to show on screen, exactly

### Minimal set (recommended)
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
- `integration/spp-adapter/examples/live-registry-decision.json`
- `integration/spp-adapter/examples/live-registry-admission.json`
- one public tx/hash or terminal readback proving insert + revoke + blocked re-entry
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

### Optional supporting insert
- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`

### Do NOT show
- too many terminals at once
- code internals
- giant test output walls
- speculative UI mockups presented as live product

---

## The easiest way to visualize the proposal

If someone asks “what am I looking at?”, the answer should be this:

1. **Policy exists**
2. **A subject qualifies**
3. **That qualification becomes an admission payload**
4. **The system admits the subject into the positive lane**
5. **Revocation removes the ability to re-enter**

That is the product visualization.

Not a dashboard. Not a polished app. The mechanism itself.

---

## Recording setup

### Recommended setup
- Screen recording: one monitor, 1440p or 1080p
- Zoom level increased in terminal/editor/browser
- Dark theme, large font
- All files/tabs pre-opened in the exact order of the script
- No live typing except maybe one or two short terminal commands

### Before recording
Prepare these in advance:
- one browser tab per public proof page if using explorer
- editor tabs pinned in sequence
- terminal history cleaned
- hashes/contract IDs pasted into a scratchpad if needed
- notifications disabled

### Recording style
- one take if possible
- cursor moves slowly and deliberately
- highlight, do not scroll wildly
- cut dead time

---

## Narration rule

The voiceover should explain **causality**:
- this policy exists
- this attestation qualifies
- this payload is derived from that decision
- this lane admits or blocks because of that

If the narration becomes “we also built X/Y/Z”, the demo is drifting.

---

## Why we do NOT need a new frontend now

A new frontend would create exactly the wrong pressure:
- more surface to maintain
- more room for fake-live impressions
- less trust if it looks polished but thin

For Pulso, the winning visualization is **evidence with clear causality**, not extra UI.

---

## Optional fast enhancement after recording

If later needed, create one static overview graphic or one single HTML explainer for the website. But this is secondary to the recorded protocol walkthrough.

---

## Immediate next action

Record the Pulso video using the existing script and the 3-zone evidence layout above. Keep the DeFindex slice as supporting evidence only.
