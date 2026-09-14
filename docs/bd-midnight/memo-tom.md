# DPO2U × Midnight — Brazil

**To:** Tom
**Re:** Tasks 3 and 4 — regulation and licensing, and product fit
**Date:** September 2026

---

## The short version

On **30 October 2026 — six weeks away** — Brazilian financial and payment
institutions become prohibited from carrying out or enabling virtual asset
operations with counterparties that provide virtual asset services and are not
authorised by the Banco Central.

Every such operation will require establishing the counterparty's authorisation
status. That is a mandatory control with a fixed date, and it is a control we
already have running in code.

Brazil's virtual asset framework (Resolutions BCB 519, 520 and 521) has been in
force since 2 February 2026. The travel rule's domestic phase is live now;
cross-border begins February 2027. Institutions are inside the compliance window
already, not approaching it.

## Task 3 — What regulation and licensing do banks need?

**Licensing is less of a barrier than it appears, and structure is more.** An
institution already authorised by the Central Bank does not need a new licence to
provide intermediation or custody of virtual assets. It must notify the BCB at
least 90 days in advance and **adapt its policies and structures** to the new
regime. The obstacle for an incumbent bank is demonstrating adapted controls, on
a calendar that has already started — not obtaining a licence.

**One obligation already binds every supervised institution and is widely
underused.** Circular BCB 3.978, articles 62 to 65, requires an annual report on
the **effectiveness** of AML controls — methodology, tests applied, assessor
qualification, deficiencies — with a base date of 31 December and submission by
31 March. Effectiveness, not existence. The global shift from documented policy
to demonstrated effectiveness that FATF describes as a direction of travel has
been dated Brazilian law since 2020.

That report is the artefact our product generates as a by-product rather than as
a feature.

## Task 4 — Does the product fit, and stay compliant?

**Inside a bank:** the layer installs in the institution's own environment.
Evidence never leaves it; keys stay in the bank's HSM; nothing in the existing
stack is replaced. Only a hash, a commitment and a proof cross the boundary.

The question a data protection officer always asks — chain immutability versus
the right to erasure — has a structural answer rather than a mitigation: erasing
the evidence does not break the anchor, because the anchor never held the data.

**On Midnight:** we built the compliance core network-independent and enforce
that in CI before choosing where to anchor. Midnight generates proofs on a local
proof server on the user's own machine, which is our perimeter requirement
written into the network's architecture. On a transparent chain, publishing a
verdict means publishing the underlying score. On Midnight an auditor verifies
that an authorised issuer asserted a verdict under a stated policy against a
stated threshold, at a given block — without ever seeing the score.

## What we are asking for

**An hour with Chris.** We have eight specific technical questions about Compact
and the Midnight ledger. The first one determines whether we can honestly claim
attestation validity windows, and we would rather ask it than guess.

**A conversation with Cliff.** Brazil has a dated regulatory event in six weeks
that creates a mandatory counterparty control across the entire banking system,
and we have the regulatory work already compiled and running.

---

*Attached: regulation and licensing scope; fit within a bank's architecture; fit
within Midnight's architecture. Regulatory claims are triangulated from
specialist secondary sources and carry a verification annex; confirm against
official text before external circulation.*
