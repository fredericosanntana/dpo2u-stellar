# Fit within a bank's existing architecture

How the DPO2U compliance layer deploys inside a supervised institution, and why
it does not create new compliance exposure.

---

## Summary

The layer installs **inside the institution's own perimeter**. Evidence never
leaves it. Keys never leave it. Nothing in the existing stack is replaced. What
crosses the boundary is a hash, a commitment and a proof — never a fact about a
customer.

That is the design, not a mitigation applied to a design that wanted the data.

---

## The four questions, in the order institutions ask them

### 1. Where does the data live?

In the institution. The layer is installed in the client environment. The
collector that gathers evidence runs inside the perimeter and hands the
evaluation engine an opaque view: references minted locally, never names, never
tax numbers.

The rules are built for this. The beneficial ownership rule counts and checks
parties; it has no need to know who they are, and its interface gives it no way
to find out. That is verifiable by reading one file — which is the kind of claim
that survives a vendor security review rather than merely passing a questionnaire.

### 2. Where do the keys live?

In the institution's HSM.

The signing interface is **asynchronous by design**, even though the default
Ed25519 implementation is synchronous. An HSM or a remote KMS is not, and a
signer that cannot be swapped for one has to be rewritten the first time a real
client asks. The file-based implementation shipped in the box is a default, not a
requirement.

*`core/src/signing.ts`*

### 3. How does it interoperate?

It subscribes; it does not replace.

| Existing system | Role |
| --- | --- |
| Core banking | Evidence source |
| KYC / KYB provider | Evidence source |
| SIEM | Consumes the exported audit trail |
| Case management | Receives review outcomes for human handling |

Nothing is decommissioned. The layer sits above what the institution already
operates and turns its outputs into versioned, attestable decisions.

The engine returns **three** outcomes rather than two. Review routes to the
analysts the institution already employs. A product returning only pass and fail
would be asking an institution to delegate judgement calls it will not delegate.

### 4. Does this create compliance exposure?

No. The question raised first by every data protection officer:

> **Chain immutability versus the right to erasure.**

Under LGPD a data subject may require erasure. A blockchain anchor cannot be
erased. Most products in this category answer with a mitigation narrative.

This one does not require a narrative. Only a hash and a commitment are anchored.
**Erasing the evidence does not break the anchor, because the anchor never held
the data.** The attestation continues to prove that an authorised issuer reached
a given verdict under a given policy version at a given time. The underlying
personal data lives in the institution's systems, under its retention policy, and
is deleted on its schedule without disturbing any of that.

---

## What the institution gains

### The effectiveness report

Circular BCB 3.978 articles 62 to 65 require an annual report on the
**effectiveness** of the AML framework — methodology, tests applied, assessor
qualification, deficiencies — with a base date of 31 December and submission by
31 March. Article 65 requires an action plan for the deficiencies found.

Today that is assembled by hand. Here it is a by-product:

- Every evaluation is an entry, hash-linked to the one before it. Any alteration
  breaks every subsequent link, and verification reports where.
- **Signed checkpoints** close the gap that chaining alone leaves. Chaining proves
  nothing was *altered*; it does not prove nothing was *omitted* — truncating the
  tail leaves a chain that verifies perfectly. A checkpoint asserts "at sequence N
  the head was H", signed. A trail later presenting fewer than N entries
  contradicts a signature nobody can forge.

| Attack | Caught by |
| --- | --- |
| Edit content without redoing the hash | the chain |
| Edit content and redo every hash | the checkpoint |
| Omit the tail | the checkpoint |
| Forge a checkpoint | signature verification |

The interval between checkpoints is the exposure — the most a silent truncation
could conceal. Stating that number is more useful to an internal audit function
than a claim of tamper-proofing.

### An export the supervisor verifies independently

The export bundle is checked without our software, our servers, or our continued
existence. It carries verifying keys in PEM, the entries, the checkpoints, and a
plain-text statement of what verification proves and what it does not. Period
exports preserve original entry numbering, so a window cannot be renumbered to
appear to start at genesis.

*`core/src/trail.ts`, `core/src/export.ts`*

### Updates the institution verifies before running

Installing in the client environment inverts the trust question. The institution
is not asking us to protect its data — the data never reaches us. It is asking
why it should run our rules inside its perimeter.

Install planning **decides without acting**, so the decision can be shown to an
operator, written to the trail, and — on a rollback — put before a second
approver before anything changes. It refuses a silent downgrade; it refuses the
same version arriving with a different hash. Rollback remains possible, because
sometimes the new policy set is the problem, but never silently.

*`core/src/distribution.ts`*

---

## Roadmap

Stated plainly, with dates. These are known gaps, not discovered ones.

| Capability | Status | Target |
| --- | --- | --- |
| Segregation of duties | Not enforced by the product | Q1 |
| Dual custody of privileged actions | Not implemented | Q1 |
| Effectiveness report generator | Trail and export exist; formatting manual | Q1 |
| Packaged installer | Deployment is engineering-assisted | Q2 |
| Asset segregation controls (Res. 520) | Not addressed | Q2 |
| Midnight deployment | Contract semantics specified and tested in Rust; Compact port in progress | Q1 |

Segregation of duties and dual custody are what a bank's security review raises
first. They are near-term work, not shipped capability, and we would rather say
so here than be found out in the review.

---

## Verification

- Core: 73 tests passing, **zero runtime dependencies**.
- Network independence is enforced in CI rather than asserted: the build fails if
  a chain SDK, a chain-native type, or any runtime dependency enters the core.
- Regulatory claims carry a verification annex in the accompanying regulation and
  licensing document. Confirm against official text before external circulation.
