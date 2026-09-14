# Does DPO2U fit a bank's existing architecture and stay compliant?

**Piece C — task 4, read from the bank's side**
Prepared for Tom, to forward to Cliff (Banks & Institutions).

Task 4 asks whether the product fits "existing architecture". That phrase means
two different things depending on who is asking. For Midnight's engineers it
means Midnight's architecture — that is Piece B. For a bank it means the core
banking system, the HSM, the SIEM, and the data protection officer. This
document answers the bank's version.

---

## The short answer

The bank installs the compliance layer **inside its own perimeter**. Evidence
never leaves. Keys never leave. Nothing in the existing stack is replaced. What
crosses the boundary is a hash, a commitment and a proof — never a fact about a
customer.

That is not a mitigation bolted onto a design that wanted the data. It is the
design.

---

## The four questions, in the order banks actually ask them

### 1. Where does the data live?

In the bank. The compliance layer is installed in the client environment. The
collector that gathers evidence runs inside the perimeter and hands the
evaluation engine an opaque view: references minted locally, never names, never
tax numbers.

The predicates are built for this. `ubo_threshold` counts and checks parties; it
has no need to know who they are, and its interface gives it no way to find out.
That is verifiable by reading one file, which is the kind of claim that survives
a vendor security review.

### 2. Where do the keys live?

In the bank's HSM.

`Signer` is an interface, and it is **asynchronous on purpose** even though
Node's Ed25519 is synchronous. An HSM or a remote KMS is not synchronous, and a
signer that cannot be swapped for one has to be rewritten the first time a real
client asks. The file-based Ed25519 implementation shipped in the box is the
default, not the requirement.

*Source: `core/src/signing.ts`*

This is worth stating plainly in the meeting because the usual vendor answer —
"we can support HSM on the roadmap" — is the answer that ends the conversation
with a bank's security architect.

### 3. How does it talk to what we already have?

It subscribes, it does not replace.

| Existing system | Role |
| --- | --- |
| Core banking | Evidence source |
| KYC / KYB provider | Evidence source |
| SIEM | Consumes the exported audit trail |
| Case management | Receives `REVIEW` outcomes for human handling |

Nothing is decommissioned. The layer sits above what the bank already bought and
turns its outputs into versioned, attestable decisions.

The `REVIEW` verdict matters here more than it looks. The engine returns three
outcomes, not two, and `REVIEW` routes to the humans the bank already employs.
A product that returned only pass and fail would be asking the bank to trust it
with judgement calls it will not delegate.

### 4. Does this put us out of compliance?

No — and the specific question the data protection officer always asks deserves
a prepared answer, because it is asked in the first ten minutes and a fumbled
answer is fatal:

> **Chain immutability versus the right to erasure.**

Under LGPD, a data subject can require erasure. A blockchain anchor cannot be
erased. Most blockchain compliance products meet this with a mitigation
narrative.

Ours does not need one. Only a hash and a commitment are anchored. **Erasing the
evidence does not break the anchor, because the anchor never held the data.** The
attestation continues to prove that an authorised issuer reached a given verdict
under a given policy version at a given time. The underlying personal data lives
in the bank's systems, under the bank's retention policy, and is deleted on the
bank's schedule without any of that being disturbed.

It is a property of the design, not a mitigation of it. That distinction is the
whole answer, and it is the difference between a DPO signing off and a DPO
escalating.

---

## What the bank gets that it did not have

**The effectiveness report.** Circular BCB 3.978 arts. 62–65 **[VERIFY]** require
an annual report on the *effectiveness* of the AML framework — methodology,
tests applied, assessor qualification, deficiencies — delivered 31 March, with a
remediation plan by 30 June.

Today that is assembled by hand. The audit trail generates it as a by-product:

- Every evaluation is an entry, hash-linked to the one before it. Any alteration
  breaks every subsequent link and `verify()` reports where.
- **Signed checkpoints** close the gap that chaining alone leaves. Chaining
  proves nothing was *altered*; it does not prove nothing was *omitted* —
  truncating the tail leaves a chain that verifies perfectly. A checkpoint
  asserts "at sequence N the head was H", signed. A trail later presenting fewer
  than N entries contradicts a signature nobody can forge.

| Attack | Caught by |
| --- | --- |
| Edit content without redoing the hash | the chain |
| Edit content and redo every hash | the checkpoint |
| Omit the tail | the checkpoint |
| Forge a checkpoint | signature verification |

The interval between checkpoints is the exposure: it is the most a silent
truncation could hide. Naming that number, rather than claiming tamper-proofing,
is the kind of precision a bank's internal audit function responds to.

**An export the supervisor verifies without us.** `buildExport` produces a bundle
the recipient checks without our software, our servers, or our continued
existence — it carries the verifying keys in PEM, the entries, the checkpoints,
and a plain-text statement of what verification proves and what it does not.
Period exports preserve original entry numbering, so a window cannot be
renumbered to look like it starts at genesis.

*Sources: `core/src/trail.ts`, `core/src/export.ts`*

**Software updates the bank can verify before running.** Installing in the client
environment inverts the trust question. The bank is not asking us to protect its
data — the data never reaches us. It is asking why it should run our rules
inside its perimeter. `planInstall` decides without acting, so the decision can
be shown to an operator, written to the trail, and — on a rollback — put in
front of a second approver before anything changes. It refuses a silent
downgrade; it refuses the same version arriving with a different hash; rollback
stays possible, because sometimes the new pack is the problem, but never
silently.

*Source: `core/src/distribution.ts`*

---

## What we have not built

Declaring the gaps is what makes the rest credible. A vendor with no gaps is a
vendor who has not been audited.

| Gap | Consequence for a bank deployment |
| --- | --- |
| Segregation of duties | Not enforced by the product; the bank's own controls must cover it |
| Dual custody | Not implemented; required for privileged actions in most bank environments |
| Installable package | No packaged installer yet; deployment is engineering-assisted |
| Effectiveness report generator | Trail and export exist; the formatted report is manual |
| Midnight deployment | Nothing deployed. Contract semantics specified and tested; the Compact port is in progress |
| Asset segregation (Res. 520) | Not addressed by any predicate |

The first two are the ones a bank's security review will raise first, and the
honest position is that they are near-term work, not shipped capability.

---

## Verification status

- Core: 73 tests passing, zero runtime dependencies.
- Network independence is enforced in CI, not asserted: `npm run no-chain-deps`
  fails the build if a chain SDK, a chain-native type, or any runtime dependency
  appears in the core. The promise is a build gate because a code review does
  not reliably catch it on the tenth pull request.
- Regulatory citations in this document are **secondary-sourced and marked
  [VERIFY]**. See Piece A.
