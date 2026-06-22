# Nethermind adjacent validation — outreach pack

## 1. Short GitHub-side comment / follow-up message

Use this after opening the issue, if a maintainer engages.

```text
Thanks — our intent is not to propose a replacement for SPP, but to document a complementary layer.

We believe the current ASP membership model already provides a clean landing zone for external compliance/admission tooling, especially in the current admin-mediated operating mode.

If useful, we can open a docs-only PR that keeps the trust boundary explicit and avoids any production overclaim.
```

## 2. Direct outreach message (X/Telegram/Discord/DM)

```text
Hi — we’ve been working on an attestation-driven compliance admission layer around Stellar privacy flows, and while auditing `stellar-private-payments` we found a very clear compatibility path with the current ASP model.

We are not pitching a replacement for SPP. Quite the opposite: the point is that SPP already provides the privacy rail and ASP root consumption path, while an external layer can supply positive-set admission logic in a compliance-first way.

We drafted a small docs-first framing around that boundary. If useful, we can share the issue/PR once posted.
```

## 3. Internal positioning line

```text
Nethermind is not the dependency that makes Pulso real.
Nethermind is the adjacent validator that makes the architecture harder to dismiss.
```

## 4. Rules of engagement
- Lead with technical compatibility, not commercial asks.
- Ask for acknowledgment of the integration pattern, not endorsement of the company.
- Keep the first contribution docs-first.
- Avoid words like `partnership`, `joint launch`, `production-ready integration`.
- Repeat the honest boundary: current convergence with external instances is governance-dependent.

## 5. What success looks like
### Minimum success
- issue remains open and is engaged seriously
- no pushback on the core architectural framing

### Good success
- maintainer says docs-first PR is welcome
- public acknowledgment that external compliance tooling is a valid pattern for SPP

### Great success
- PR merged or referenced
- DPO2U can cite Nethermind/Spp compatibility publicly without overclaim
