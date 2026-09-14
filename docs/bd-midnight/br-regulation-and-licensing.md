# Brazil: what banks and institutions need to operate with virtual assets

Regulatory and licensing scope for institutions supervised by the Banco Central
do Brasil (BCB). Written for business development qualifying an institutional
conversation — not legal advice.

> Sources are secondary: law firm and specialist analyses, triangulated across
> multiple independent publications. Primary texts were not directly consulted.
> The verification annex at the end states the status of every claim. Confirm
> against official text before relying on any specific article or date.

---

## 1. The deadline that moves first

**30 October 2026.**

From that date, financial institutions and payment institutions are prohibited
from carrying out or enabling virtual asset market operations with counterparties
that provide virtual asset services and are **not authorised or in the
authorisation process**.

The practical consequence for a bank:

> Every virtual asset operation requires knowing whether the counterparty is an
> authorised provider. Not as good practice — as a condition for the operation to
> be permitted at all.

The same date is the authorisation deadline for providers already operating:
Resolution BCB 520 entered into force on 2 February 2026, and existing providers
have 270 days from that date to apply.

So two populations face the same date from opposite sides. Providers must be
authorised. Banks must verify that they are.

---

## 2. Licensing: what an institution actually needs

Three resolutions, all published November 2025 and in force since **2 February
2026**:

| Resolution | Governs |
| --- | --- |
| **BCB 519** | Authorisation processes |
| **BCB 520** | Operation and conduct of virtual asset service providers |
| **BCB 521** | Virtual asset services in the foreign exchange market and international capital |

### The entity: SPSAV

The regulated entity is the **Sociedade Prestadora de Serviços de Ativos
Virtuais (SPSAV)**. Three modalities, by service provided:

| Modality | Scope |
| --- | --- |
| **Intermediária** | Intermediation of trading and distribution of virtual assets |
| **Custodiante** | Custody and control of assets |
| **Corretora** | Both of the above |

Authorisation requirements cover the economic and financial capacity of
controllers, lawful origin of funds, business viability, IT structure,
governance, and the reputation of administrators. Directors must be **resident in
Brazil**.

### For a bank that is already authorised — the important nuance

An institution already authorised by the BCB **does not need a new licence** to
provide intermediation and custody of virtual assets. It must:

1. **Formally notify the BCB at least 90 days in advance**, and
2. **Adapt its policies and structures** to the specific regulation.

This is the part most commonly misstated, including by vendors. The barrier for
an incumbent bank is not obtaining a licence. It is **demonstrating that its
policies, controls and structures meet the new regime** — and doing so on a
calendar that has already started.

### Asset segregation

Resolution 520 makes segregation mandatory between customer funds and virtual
assets and the institution's own assets. Alongside it: governance, asset
selection and listing (including stablecoins), custody including abroad, internal
controls, cybersecurity, AML/CFT, and transparency.

---

## 3. What already binds every supervised institution today

**Circular BCB 3.978/2020, articles 62 to 65.**

An annual report evaluating the **effectiveness** of AML/CFT policies, procedures
and internal controls — effectiveness, not existence.

| Element | Requirement |
| --- | --- |
| Base date | 31 December |
| Submission | By 31 March of the following year |
| Content | Methodology, tests applied, qualification of the assessor, deficiencies identified |
| Article 64 | A single report is permitted across a prudential conglomerate or cooperative credit system |
| Article 65 | An action plan to remedy the deficiencies identified |

Two observations that matter commercially.

**This report is the artefact our product generates as a by-product.** A
hash-linked, signed audit trail of every compliance evaluation is, literally, a
record of tests applied. We are not adding an obligation; we are automating one
that already exists and is largely assembled by hand today.

**The global shift from documented policy to demonstrated effectiveness is
already law here.** FATF describes it as a direction of travel. In Brazil it has
been a dated annual obligation since 2020.

---

## 4. Beneficial ownership: a parameter, not a number

Circular BCB 3.978 does **not** fix a beneficial ownership threshold. It requires
that:

- the minimum reference percentage of ownership is set **on a risk basis**;
- it **may not exceed 25%** — a ceiling, not a fixed value;
- the choice is **justified and documented** according to the institution's risk
  profile;
- **direct and indirect** holdings are counted together;
- a representative, attorney-in-fact or agent exercising **actual control** is
  also a beneficial owner, regardless of percentage.

Across Latin America the ceiling itself varies — 5% in Colombia and Bolivia, 10%
in Argentina, Chile and Costa Rica, 15% in Uruguay and El Salvador, 25% in
Brazil, Mexico and Peru — and several jurisdictions publish a control test with
no single number.

A threshold compiled in as a constant therefore cannot satisfy the norm in any of
them.

### How this is implemented

```ts
brazilUboParams({
  institutionThresholdPct: 10,   // the institution's own choice, below the ceiling
  riskBasisRef: 'ARC-2026-004',  // where that choice is documented
});
```

The configuration **will not construct** if the threshold exceeds the ceiling:

```
RangeError: institutionThresholdPct 30% exceeds the jurisdiction cap of 25%
```

…or if the risk basis is missing:

```
TypeError: riskBasisRef is required: the threshold must be justified on a risk basis
```

An illegal configuration is not a warning to triage later — the policy set cannot
be built at all.

The same rule at 10% and at 25% produces a different rule identity, so an
attestation records **which rule was in force** rather than merely that a rule by
that name existed. When a supervisor asks what threshold applied on the date of a
given decision, the answer is bound to the decision.

The rule also separates the outcomes a supervisor distinguishes: it fails on
unverified or unscreened owners, and returns **review** rather than pass when the
ownership chain is incomplete enough to conceal a holder above the threshold.
Unattributable ownership is the case a human must examine.

*Implementation: `core/src/predicates/ubo-threshold.ts`*

---

## 5. The travel rule: already in force, phase II next February

Article 89 of Resolution BCB 520 phases counterparty information requirements
over two years:

| Phase | Period | Scope |
| --- | --- | --- |
| **I — domestic** | 2 Feb 2026 → 2 Feb 2027 | Transfers between institutions operating in Brazil |
| **II — cross-border** | 2 Feb 2027 → 2 Feb 2028 | Extends to foreign institutions |
| Full compliance | From 2 Feb 2028 | — |

**Phase I is in force now.** Phase II begins in February 2027.

And the detail that defines where the control is weakest:

> Across **both** phases, providers may rely on a **documented self-declaration
> from the customer** to identify the transacting parties and the purpose of the
> transaction, provided it is documented and made available to the BCB on
> request.

Self-declaration is the weakest control available. It is what governs
non-custodial wallet transfers throughout both phases. An institution that can
distinguish, across its book, which counterparties rest on a customer's word and
which rest on proof of control holds information the norm does not require it to
have — and that its supervisor will eventually ask for.

Our counterparty rule returns **review**, not pass, on the self-declaration
branch: permitted by the norm, never silently.

*Implementation: `core/src/predicates/vasp-classification.ts`*

---

## 6. What an institution requires of a vendor inside its perimeter

No standard regulatory map covers this layer, and it is where most vendor
conversations end:

- segregation of duties
- dual custody of keys and privileged actions
- evidentiary audit trail
- signed, verifiable software updates
- business continuity and exit plan
- demonstrable effectiveness of the control itself

---

## 7. Obligation to implementation

| Obligation | Rule | Status |
| --- | --- | --- |
| Beneficial owner — risk-based threshold, 25% ceiling, actual control | `ubo_threshold` | **Implemented.** Refuses a threshold above the ceiling and one without documented risk basis |
| Counterparty classification (art. 89 Res. 520; 30 Oct prohibition) | `vasp_classification` | **Implemented.** Returns review on self-declaration |
| Supplier payment redirection fraud | `bank_change_*` (5 rules) | **Implemented** |
| Effectiveness report (arts. 62–65) | Audit trail + supervisor export | **Implemented.** Formatted report generator scheduled Q1 |
| Asset segregation (Res. 520) | — | Scheduled Q2 |
| Dual custody, segregation of duties | — | Scheduled Q1 |

---

## 8. Calendar

| Date | Event |
| --- | --- |
| Annually, 31 Mar | Effectiveness report (base date 31 Dec) — in force since 2020 |
| 2 Feb 2026 | Res. BCB 519/520/521 in force; travel rule phase I begins |
| **30 Oct 2026** | **Authorisation deadline; prohibition on unauthorised counterparties begins** |
| 2 Feb 2027 | Travel rule phase II — cross-border |
| 2 Feb 2028 | Travel rule full compliance |

---

## Verification annex

Every factual claim, what it supports, and its status.

| Claim | Supports | Status |
| --- | --- | --- |
| Beneficial owner: risk basis, 25% ceiling, documented, direct+indirect, actual control | §4 — the entire parameterised design | ✅ Triangulated, multiple independent sources |
| Arts. 62–65: effectiveness report, base 31 Dec, submit by 31 Mar | §3 — the core commercial argument | ✅ Triangulated |
| Art. 64 single report for conglomerate; art. 65 action plan | §3 | ✅ Triangulated |
| Res. 519/520/521 published Nov 2025, in force 2 Feb 2026 | §2 | ✅ Triangulated |
| Authorisation deadline 30 Oct 2026 (270 days from entry into force) | §1, §2 | ✅ Triangulated |
| Prohibition on transacting with unauthorised VASP counterparties from 30 Oct 2026 | §1 — the lead argument | ✅ Triangulated |
| Three SPSAV modalities and their scope | §2 | ✅ Triangulated |
| Authorised institutions may provide services via 90-day prior notification | §2 — replaces the common misstatement | ✅ Triangulated, single strong source — **confirm first** |
| Travel rule phases: I domestic 2026→2027, II cross-border 2027→2028 | §5 | ✅ Triangulated |
| Self-declaration permitted in both phases, documented, available to BCB | §5 — the control gap | ✅ Triangulated |
| Mandatory asset segregation | §2 | ✅ Triangulated |
| Directors resident in Brazil | §2 | ⬜ Single source |
| Action plan deadline (30 June) | — | ⬜ **Removed from text.** Article 65 requires the plan; the deadline is unconfirmed |
| Res. BCB 580 / Type 3 classification | — | ⬜ **Removed from text.** Unconfirmed |
| IN COAF 1/2026; Res. CMN 4.893 as amended by 5.274 | — | ⬜ **Removed from text.** Unconfirmed |
| LatAm beneficial ownership ceilings by country | §4 — supporting illustration | ⬜ Not re-verified this round |
| Brazilian market statistics (fintech count, Pix volumes) | — | ⬜ **Removed from text.** No source |

**To close:** confirm the ✅ rows against official text at `bcb.gov.br` and
resolve the ⬜ rows. The 90-day notification row is the highest priority: it
carries §2 and rests on a single source.
