# What Brazilian banks and institutions actually need

**Piece A — regulatory scope for the Midnight BD conversation**
Prepared for Tom, to forward to Chris (Nethermind) and Cliff (Banks &
Institutions). Audience: business development qualifying a bank conversation,
not legal counsel.

> **Read this first.** Sources for this document were secondary. The research
> environment blocked `bcb.gov.br`, `planalto.gov.br` and `in.gov.br`. Every
> article number and every date below is marked **[VERIFY]** and must be checked
> against the official text before this document leaves the building. In a
> document whose entire argument is regulatory command, one wrong article
> number destroys exactly the thing being sold.

---

## The one-paragraph version

A Brazilian bank does not need a new licence to use a compliance layer. It
needs to prove, on a fixed annual date, that its anti-money-laundering controls
are **effective** — not that they exist. That obligation is already in force and
already has a deadline. Separately, the moment that bank touches virtual
assets, its banking licence stops covering it and a second authorisation is
required, with a hard cut-off in October 2026 and a travel-rule obligation
following in February 2027. We have the first obligation compiled as running
code, and the second one mapped.

---

## 1. What the institution already is

A Brazilian bank arrives at this conversation further along than it looks. Its
existing licence already carries, as continuing obligations:

- anti-money-laundering and counter-terrorist-financing controls
- cybersecurity policy and incident response
- business continuity
- auditable record-keeping and retention

None of that has to be sold. It is the baseline the next three sections build
on, and naming it early is what stops the conversation from sounding like a
pitch for something the bank believes it already has.

## 2. What changes the moment it touches virtual assets

**This is the point that surprises bank executives, and it is the best opening
line in the whole document:**

> **A banking licence does not cover virtual asset service provision.** It is a
> separate authorisation.

The framework is **Resoluções BCB 519, 520 and 521**, in force since
**02/02/2026 [VERIFY]**. What it establishes:

| Element | What it means commercially |
| --- | --- |
| Three modalities — intermediary, custodian, brokerage **[VERIFY]** | The bank must declare which it is; the obligations differ |
| Mandatory asset segregation | Customer virtual assets cannot sit on the institution's own balance sheet |
| Authorisation regime | Providers already operating have until **30/10/2026 [VERIFY]** to be authorised |

**Resolução BCB 580 [VERIFY]**, effective **01/07/2026 [VERIFY]**, then
classified virtual asset service providers as **Type 3** institutions, which
pulls in a formal operational and cyber risk structure with **named designated
officers**. That last detail matters more than it reads: a named officer is a
person whose signature is on the line, and people in that position buy evidence,
not assurances.

## 3. What already binds today, and almost nobody cites

**Circular BCB 3.978/2020, articles 62 to 65 [VERIFY].** This is the most
underused fact in the entire Brazilian compliance market, and it is the centre
of our commercial argument.

The institution must produce an annual report on the **effectiveness** of its
AML/CFT framework — not on its existence. The report must state:

- the methodology used
- **the tests applied**
- the qualification of whoever performed the assessment
- the deficiencies found, and a remediation plan

| Deadline | Obligation |
| --- | --- |
| **31 March [VERIFY]** | Effectiveness report delivered |
| **30 June [VERIFY]** | Action plan for the deficiencies found |

Two consequences, and both belong in the BD conversation:

**First — this is exactly the artefact our product generates.** A hash-linked
audit trail of every evaluation, with signed checkpoints and a self-verifiable
export, *is* a record of tests applied. We are not proposing a new obligation to
a bank; we are automating one it already has and currently satisfies by hand.

**Second — the global "paper to operational" shift is already law here.** FATF
announces the move from documented policy to demonstrated effectiveness as a
direction of travel. In Brazil it has been a dated obligation since 2020. That
inverts the usual emerging-market framing: on this specific control, Brazil is
ahead of the jurisdictions Midnight is currently selling into, and a product
built to satisfy it satisfies the others by construction.

## 4. The threshold that is a parameter, not a number

Still in **Circular BCB 3.978 [VERIFY]**, and this is the clearest single
example of why compiled-in compliance logic does not work.

The Circular **does not set** a beneficial-ownership threshold. It requires each
institution to set **its own, on a documented risk basis**, capped at 25%, and
it counts a representative, attorney or agent exercising **actual control** as a
beneficial owner regardless of percentage.

Across Latin America the cap itself moves — 5% in Colombia and Bolivia, 10% in
Argentina, Chile and Costa Rica, 15% in Uruguay and El Salvador, 25% in Brazil,
Mexico and Peru — and several jurisdictions publish a control test with no
single number at all.

**A threshold compiled in as a constant cannot satisfy the norm in any of
them.** That is not a design preference. It is the norm, read literally.

## 5. The travel rule, with a date and an opening

**Article 89 of Resolução BCB 520 [VERIFY]** phases in counterparty information
requirements:

| Phase | When | Scope |
| --- | --- | --- |
| Domestic | **February 2027 [VERIFY]** | Between providers in Brazil |
| Cross-border | **February 2028 [VERIFY]** | International transfers |

And the detail that defines the commercial opportunity:

> **In both phases the norm permits the provider to rely on a documented
> customer self-declaration** to identify the parties, kept accessible to the
> BCB. **[VERIFY]**

Self-declaration is the weakest control that exists. It is what will govern
unhosted-wallet transfers from 2027 — unless someone offers something better in
time. That is a dated, named, addressable gap, and it is roughly eighteen months
wide.

## 6. What the bank demands of a vendor inside its perimeter

No standard regulatory map covers this layer, and it is where most vendor
conversations actually die:

- segregation of duties
- dual custody of keys and of privileged actions
- evidentiary audit trail
- signed, verifiable software updates
- business continuity and exit plan
- demonstrable effectiveness of the control itself

---

## The column that makes this a moat and not a legal opinion

Everything above is available to anyone who hires a law firm. What follows is
not.

| Obligation | Predicate | Status |
| --- | --- | --- |
| 3.978 — beneficial owner, risk-based threshold capped at 25%, actual control counted | `ubo_threshold` | **In code.** Refuses a threshold above the cap and refuses one with no risk-basis reference |
| Art. 89 Res. 520 — counterparty classification | `vasp_classification` | **In code.** Returns `REVIEW` on self-declaration rather than passing silently |
| Supplier payment redirection fraud | `bank_change_holder`, `_origin`, `_history`, `_payment`, `_destination` | **In code.** Five predicates |
| 3.978 arts. 62–65 — effectiveness report | Audit trail + export | **In code.** Report generator still to build |
| Res. 520 — asset segregation | — | **To build** |
| Dual custody and segregation of duties | — | **To build** |

Declaring what is missing is what makes the rest credible.

### What "in code" means concretely

The beneficial-ownership case, because it is the one that proves the model:

```ts
brazilUboParams({
  institutionThresholdPct: 10,   // the institution's own choice, below the cap
  riskBasisRef: 'ARC-2026-004',  // where that choice is justified
});
```

The predicate **will not construct** if the threshold exceeds the jurisdiction
cap:

```
RangeError: institutionThresholdPct 30% exceeds the jurisdiction cap of 25%
```

…or if the risk basis is absent:

```
TypeError: riskBasisRef is required: the threshold must be justified on a risk basis
```

An illegal configuration is not a runtime warning to be triaged later. **The
policy pack cannot be built.** Non-compliance is a compile-time failure.

And the same predicate at 10% and at 25% produces a **different predicate
hash** — so the attestation records *which rule was in force*, not merely that a
rule by that name existed. A supervisor asking "what was your threshold on the
date of this decision?" gets an answer bound to the decision itself.

Beyond the threshold, the predicate also separates the three outcomes a
supervisor actually distinguishes: it fails on unverified or unscreened owners,
and returns `REVIEW` — not `PASS` — when the ownership chain is incomplete
enough to hide a holder above the threshold. Unattributable ownership is the
case a human has to look at. Silently passing it is the failure mode that
regulatory technology is usually caught doing.

*Source: `core/src/predicates/ubo-threshold.ts`*

---

## Calendar

| When | What |
| --- | --- |
| In force | Circular 3.978 arts. 62–65 — effectiveness report, 31/03 and 30/06, annually **[VERIFY]** |
| Since 01/03/2026 | Res. CMN 4.893 as amended by 5.274 — cybersecurity **[VERIFY]** |
| Since 03/08/2026 | IN COAF 1/2026 **[VERIFY]** |
| **30 Oct 2026** | **Authorisation deadline for providers already operating [VERIFY]** |
| Feb 2027 | Travel rule, domestic phase **[VERIFY]** |
| Feb 2028 | Travel rule, cross-border phase **[VERIFY]** |

Underlying statute: **Lei 9.613/1998**, as amended by **Lei 12.683/2012
[VERIFY]**. COAF reporting obligations: **Resolução COAF 36/2021 [VERIFY]**.

---

## Why this is defensible

"We know Brazilian regulation" is not a moat. A competitor hires a law firm and
copies it in three months.

What does not get copied in three months is the norm **compiled, versioned,
tested, and refusing illegal configuration at construction time**. A competitor
with lawyers gets an opinion. We have an artefact that runs, fails when it
should fail, and proves afterwards what ran.

Three components, and the point is that they only work together:

1. **Norm as code** — hard to copy, and the part Midnight's own engineers can
   evaluate without taking our word for anything.
2. **Brazilian market and relationships** — 722 fintechs, Pix at 42 billion
   transactions a year. Not purchasable.
3. **The window** — provider authorisation October 2026, travel rule February
   2027. Arriving later means arriving late.

Separately, each is replicable. Together, they are not.

---

## Open items before this document circulates

1. **Verify every [VERIFY] marker against official text.** One afternoon. Not
   skippable.
2. Confirm the three virtual-asset modality names and their exact obligations.
3. Confirm whether the Res. 580 Type 3 classification captures banks providing
   virtual asset services, or only standalone providers — this changes who the
   addressable buyer is.
4. Confirm the Monument Bank reference (press-sourced) before citing it in any
   Midnight-facing material.
