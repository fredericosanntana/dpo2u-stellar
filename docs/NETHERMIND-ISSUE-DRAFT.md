# Draft — GitHub Issue for `NethermindEth/stellar-private-payments`

## Suggested title
`Proposal: attestation-driven ASP admission layer for SPP positive membership`

## Suggested issue body

```md
## Summary

We have been exploring how a compliance-first attestation layer can integrate with the current SPP ASP model without changing the pool core.

Our conclusion is that the current SPP architecture already exposes a clear landing zone for an external admission/compliance layer:

- membership admission happens via `asp-membership.insert_leaf`
- the pool consumes ASP roots, rather than high-level regulatory state
- the current default operating model is admin-mediated, not self-service

This makes SPP a strong fit for an external, attestation-driven ASP admission layer.

## Why this matters

Today, SPP already has the core privacy/pool machinery and the ASP membership/non-membership model.

What appears missing at the product/policy layer is a portable way to decide **who should enter the positive set** based on an external compliance primitive that is:

- verifiable
- replayable
- revocable
- not just an off-chain dashboard decision

The model we are testing is:

1. a compliance decision is anchored in a registry / attestation layer
2. that decision authorizes ASP membership admission
3. revocation changes the operational state of the lane
4. the pool continues to consume the resulting ASP roots exactly as it does today

## What we found in the current SPP reference

From auditing the current reference implementation:

- `insert_leaf` is the exact admission function for `asp-membership`
- `AdminInsertOnly = true` is the default operating model
- the admin UI and README both assume admin-signed insertion
- the pool compares proof-carried roots against the current membership and non-membership roots

This suggests that a first integration does **not** need to modify the pool or circuits.
It can be modeled as an external compliance/admission layer feeding the existing ASP contracts.

## Concrete integration framing

A minimal external compliance layer for SPP could:

- validate a positive attestation / policy decision
- derive the membership leaf expected by SPP
- hand off insertion to the ASP admin flow
- preserve the current trust boundary and operating model

In other words:

> SPP remains the privacy/payment rail; the external layer supplies compliance-driven admission into the existing ASP set.

## Honest boundary

We are **not** claiming this is already a trustless, fully autonomous public admission flow.

The integration we believe is most credible for v1 is:

- external attestation-driven decisioning
- SPP-compatible leaf derivation
- admin-mediated insertion into `asp-membership`

That preserves the current SPP architecture while making the compliance/admission layer explicit.

## Open questions for discussion

1. Would the maintainers consider a docs-first contribution describing this external compliance / ASP admission pattern?
2. Is there interest in documenting an officially supported path for external compliance tooling to feed `asp-membership`?
3. Would a small integration note / example be welcome if it does not overclaim production readiness?

## Why we are opening this

The intent here is not to compete with SPP, but to clarify a complementary layer:

- SPP: privacy rail + membership root consumption
- external compliance tooling: positive-set admission logic

If useful, we can follow up with a docs-first PR describing the integration boundary and the minimal flow.
```

## Notes for posting
- Tone: technical, non-salesy, complementary.
- Do **not** mention partnership.
- Do **not** claim production integration with Nethermind.
- Keep the ask small: docs-first discussion + compatibility acknowledgment.
