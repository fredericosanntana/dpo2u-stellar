# Pulso Hackathon — Video Script (90–120s)

## Goal
Win on **integration**.

## 0–10s — Hook
"Privacy without compliance doesn't scale. But compliance that re-exposes user data defeats the whole point. At DPO2U, we solve that on Stellar — with positive credentials."

## 10–25s — What DPO2U is
"So what is DPO2U? Think of it as compliance turned into a protocol. We don't run KYC on-chain, and we never put personal data on-chain. Instead, we take a compliance decision that already happened upstream, and we turn it into a credential anyone can verify."

## 25–50s — What the integration does
"Here's how it works in this build. A canonical attestation registry decides whether a user qualifies — whether they belong to a positive set. If that attestation checks out, the ASP lane lets them in. And if the attestation gets revoked, they can't get back in."

## 50–80s — Show the flow
On screen:
1. live registry policy and attestation;
2. extracted decision JSON;
3. generated admission payload;
4. leaf inserted into lane;
5. revocation executed;
6. second attempt blocked.

Narration:
"And this integration is load-bearing — it actually carries weight. The attestation result directly changes what a user can do inside the Stellar lane. This isn't decoration."

## 80–100s — Honest boundary
"Now, let me be honest about the boundary. On the external, audited instance, we can read the state publicly — but we can't change it without the admin key. That's a governance boundary by design. It's not a gap in the integration."

## 100–120s — Close
"So that's DPO2U. We make private flows on Stellar credibly compliant, composable, and auditable — without ever putting personal data on-chain."

## Recording notes
- Prefer terminal + highlighted docs/tx hashes.
- Show `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md` and `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`.
- Avoid overclaiming production readiness.

## Delivery notes (narration)
- Read it like you're explaining it to one smart person, not presenting to a room.
- Land the em-dashes as short beats; pause a touch before each "But", "So", and "Now".
- Stress the contrasts: *without* compliance / *re-exposes* / *never* on-chain / *can't* get back in.
- Keep an even, confident pace; the honest-boundary line should slow down slightly — it reads as candor, not a caveat.
