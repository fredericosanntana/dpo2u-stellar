# Pulso Hackathon — Pitch Deck Outline

## Slide 1 — One-liner
**DPO2U turns compliance into a positive credential primitive for private flows on Stellar.**

## Slide 2 — The problem
Privacy and compliance are still treated as opposites:
- public chains expose too much;
- compliance ops re-expose user data;
- privacy pools need a credible admission layer.

## Slide 3 — Our thesis
**Prove, don’t perform.**
A user should prove they qualify for a compliant set **without revealing who they are**.

## Slide 4 — What DPO2U does
- canonical attestation registry;
- positive credential policy layer;
- ASP membership admission / revocation;
- operational bridge into a Stellar lane.

## Slide 5 — Why Stellar
- real settlement ecosystem;
- Soroban composability;
- emerging ZK primitives;
- strong fit for compliant private finance.

## Slide 6 — What is load-bearing here
This is not a cosmetic integration.
The attestation result directly controls:
- admission into the positive set;
- revocation from the positive set;
- operational block on re-entry after revocation.

## Slide 7 — Demo flow
1. configure live registry policy;
2. register live attestation;
3. extract registry decision;
4. build admission payload;
5. insert leaf / admit into lane;
6. revoke attestation;
7. prove re-entry is blocked.

## Slide 8 — Evidence
- on-chain testnet registry deployment;
- live registry txs;
- replayable runbook;
- S4 live report;
- S8 boundary report;
- contracts and tests open-source.

## Slide 9 — Honest boundary
We can publicly read the external audited instance, but cannot mutate it without the admin signing key.

**Why this matters:**
- the technical lane is proven;
- the remaining gap is governance, not feasibility.

## Slide 10 — Why we win Pulso
- real Stellar integration;
- composable policy primitive;
- strong LatAm/institutional use case;
- privacy + compliance together, not as tradeoff.

## Slide 11 — After the hackathon
Turn the lane into the canonical compliance admission primitive for:
- private payments;
- compliant stablecoin flows;
- regulated settlement and RWA movement.

## Slide 12 — Closing line
**DPO2U makes private finance on Stellar credibly compliant without putting personal data on-chain.**
