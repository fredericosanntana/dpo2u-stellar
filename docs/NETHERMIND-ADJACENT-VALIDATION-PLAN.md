# Nethermind adjacent validation plan

**Goal:** turn Nethermind / SPP into architectural validation for DPO2U without making Pulso depend on external authority.

---

## 1. Why this move is useful

The current repo evidence supports a narrow, honest claim:

- SPP already has a clear admission surface through `asp-membership.insert_leaf`
- the default model is admin-mediated
- the pool already consumes ASP roots, not high-level compliance objects
- our remaining gap with the external audited instance is governance/admin authority, not missing technical understanding

So the correct move is not "integrate deeply now".
It is to create **public technical evidence of compatibility**.

---

## 2. Strategic objective

Use Nethermind as:
- **adjacent validation** of the DPO2U architecture
- **public reference rail** for ASP/SPP compatibility
- **ecosystem credibility amplifier** for SDF / SCF / later Arcane conversations

Do **not** use Nethermind as:
- a blocker for Pulso
- a substitute for our own lane
- a source of borrowed authority we do not actually have

---

## 3. Recommended sequence

### Step 1 — open a technical issue
Use `docs/NETHERMIND-ISSUE-DRAFT.md`.

**Intent:** frame the pattern publicly:
- SPP = privacy rail + root consumer
- DPO2U-like external layer = attestation-driven ASP admission

### Step 2 — wait for reaction
Possible outcomes:
- no response yet → still useful as public evidence
- positive response → move to docs-first PR
- negative response → we still learned the boundary publicly

### Step 3 — open a docs-first PR
Use `docs/NETHERMIND-PR-DOCS-FIRST-OUTLINE.md`.

**Intent:** minimize ask, maximize legitimacy.
No code change, no pool/circuit rewrite, no governance overclaim.

### Step 4 — amplify carefully
Only after issue/PR exists:
- cite it in SDF / Stellar Hacks conversations
- cite it in SCF framing
- optionally use in later Arcane outreach

---

## 4. Messaging discipline

### Say this
- `SPP already exposes a clean landing zone for external compliance tooling.`
- `We complement the ASP model; we do not replace SPP.`
- `The first credible pattern is admin-mediated, attestation-driven admission.`

### Do not say this
- `We integrated Nethermind.`
- `Nethermind is using DPO2U.`
- `This is production-ready.`
- `We have authority over the external ASP instance.`

---

## 5. Evidence base to cite

### In our repo
- `docs/SPP-INTEGRATION-LANDING-ZONE.md`
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
- `docs/PULSO-OFFICIAL-DEMO-PATH.md`

### Main points from evidence
- `insert_leaf` is the admission function
- default operation is admin-signed insertion
- pool compares proof roots to ASP contract roots
- external audited instance is readable but not mutable without admin key
- therefore the remaining gap is governance, not basic integration understanding

---

## 6. What this does for the 3 vertentes

### Pulso hackathon
Improves credibility without creating dependency.

### Hackathon ZK Stellar
Supports the claim that the admission primitive belongs in a real privacy rail, not just in a local demo.

### GTM
Gives a credible external anchor for the phrase:
`DPO2U provides the compliance/admission layer; the pool rail can remain local to each protocol.`

---

## 7. Decision rule

If a next step increases public compatibility evidence **without** making us depend on their authority, do it.

If a next step makes Pulso wait for external governance, do not do it now.
