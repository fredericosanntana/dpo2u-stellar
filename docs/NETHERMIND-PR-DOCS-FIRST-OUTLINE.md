# Draft — Docs-first PR outline for `NethermindEth/stellar-private-payments`

## Recommended PR title
`docs: add external compliance / ASP admission integration note`

## Recommended PR goal
Add a small documentation page explaining how an external attestation/compliance layer can feed the existing SPP ASP model **without modifying the pool core**.

## Proposed file
`docs/external-compliance-asp-integration.md`

## Suggested PR body

```md
## Summary
- adds a docs-only note describing how an external compliance / attestation layer can feed SPP ASP membership
- clarifies that the current SPP operating model is admin-mediated by default
- explains the integration boundary without changing pool or circuit behavior

## Why
SPP already exposes a clear landing zone for an external admission layer through `asp-membership` / `asp-non-membership`.
This PR documents that boundary so builders can reason about external compliance tooling without overclaiming production trust assumptions.

## Scope
- documentation only
- no contract changes
- no circuit changes
- no change to pool validation behavior

## Boundary
This PR does not propose a trustless public onboarding flow.
It documents an external decisioning layer that remains compatible with the current admin-mediated SPP model.
```

## Proposed document content

### 1. Purpose
Explain that SPP can consume roots generated from an externally governed compliance/admission layer.

### 2. Current SPP operating model
State clearly:
- admission into the positive set happens via `asp-membership.insert_leaf`
- default mode is admin-signed insertion
- the pool consumes membership/non-membership roots through proofs

### 3. External compliance layer pattern
Describe the minimal flow:
1. external attestation/policy decision is evaluated
2. leaf compatible with SPP is derived
3. insertion is performed through the ASP admin path
4. user proves membership/non-membership against current roots

### 4. Trust boundary
State explicitly:
- this does not eliminate ASP admin authority
- this does not imply public permissionless admission
- it documents a compatibility path for external compliance tooling

### 5. Why this is useful
- lets builders layer policy/admission semantics on top of SPP
- avoids custom pool modifications for a first integration
- creates space for institution-facing / regulated privacy flows

## Suggested markdown skeleton for the docs page

```md
# External compliance / ASP admission integration

## Summary
SPP already exposes a minimal landing zone for external compliance tooling through its ASP membership model.

## Current operating model
- `asp-membership.insert_leaf` is the admission function
- admin-signed insertion is the default mode
- the pool consumes ASP roots from proofs

## External integration pattern
1. evaluate an external attestation or policy decision
2. derive the membership leaf expected by SPP
3. insert through the ASP admin flow
4. let the pool continue consuming the resulting roots unchanged

## Trust boundary
This pattern is compatible with the current SPP architecture, but it does not remove admin authority from ASP set insertion.

## Why this matters
It gives builders a path to connect policy/compliance decisioning to privacy-preserving pool membership without changing the pool core.
```

## Strategic reason to prefer docs-first
- smallest possible ask
- easier for maintainers to accept
- creates public acknowledgment of architectural compatibility
- avoids overengineering and avoids governance claims we cannot prove yet
