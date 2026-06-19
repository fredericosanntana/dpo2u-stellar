# Production Readiness Gates — Public Base to Production Target

**Status:** gate checklist draft  
**Data:** 2026-06-19

## 1. Purpose

This document defines the explicit gates between the current DPO2U public-base slice and any future production-target claim.

It is intentionally conservative.

## 2. Current position

Current honest state:
- public-base protocol spine is being hardened,
- testnet/devnet evidence exists,
- B-first own-lane enforcement exists,
- prototype-real ZK pool exists,
- production-target is **not yet claimed**.

## 3. Gate groups

## A. Audit gates

### Required before production-target claim
- external review of contract surfaces that define canonical verification,
- external review of ZK verifier integration and VK handling,
- external review of watcher/enforcement logic where it affects funds, access or critical operations,
- published issue triage / remediation path.

### Current status
- not yet closed in this repo as a formal external audit package.

## B. MPC / ceremony gates

### Required
- mature multi-party ceremony or equivalent trusted setup provenance where applicable,
- artifact lineage proving which VKs correspond to which ceremony and circuit version,
- operational custody and publication process for ceremony outputs.

### Current status
- current docs explicitly describe DEV / coordinator setup, not mature MPC.

## C. Custody / value-movement gates

### Required
- if a pool claims private value movement, token custody must be real rather than symbolic,
- denomination, withdrawal, accounting and failure behavior must be specified and tested,
- asset movement invariants must be audited and operationally monitored.

### Current status
- `privacy-pool` is symbolic-stateful, not token custody.
- therefore any production private-pool claim is blocked.

## D. Governance / authority gates

### Required
- explicit authority model for writable production lanes,
- key custody / multisig / rotation process,
- incident-response authority chain,
- clear distinction between own lane, delegated lane, and shared-governance lane.

### Current status
- B-first own lane is operational,
- external audited lane remains read/audit boundary unless governance/admin changes,
- shared-governance production claim is blocked until authority is actually granted and documented.

## E. Cross-chain / bridge trust gates

### Required
- explicit trust model per origin chain,
- documented relayer assumptions,
- if marketed as trustless bridging, corresponding state-proof/light-client machinery must exist,
- if only couriered re-verification exists, it must be disclosed as such.

### Current status
- current relayer story is a trusted courier + trustless on-chain proof verification at destination,
- universal trustless bridge claim is blocked.

## F. Disclosure gates

### Required
- authorized disclosure model implemented, not merely described,
- disclosure grants / expiry / revocation / rotation behavior defined,
- payload-to-verdict binding tested,
- disclosure logs / audit trail available where required.

### Current status
- bounded disclosure spec can be public-base,
- institution-grade disclosure operations are not yet closed.

## G. Monitoring and incident gates

### Required
- health checks for critical services and watchers,
- persistent run records,
- idempotency guarantees where repeated actions are possible,
- incident runbook and escalation chain,
- rollback/disable procedure for unsafe automation.

### Current status
- watcher idempotency and run records are already part of the B-first story,
- broader production monitoring package still needs closure per deployment.

## H. Mainnet/public rollout gates

### Required
- final wording review so public materials match real scope,
- deployment inventory with contract IDs, VK versions, and authority owners,
- release checklist for contracts/scripts/operators,
- go/no-go signoff after tests and operational checks.

### Current status
- current public surfaces remain testnet/devnet honest,
- production rollout checklist not yet fully closed.

## 4. Minimum go/no-go checklist

Before any production-target statement, all answers below must be “yes”:

- [ ] Contracts governing canonical verification reviewed externally
- [ ] VK/circuit provenance documented with production-grade ceremony story
- [ ] Any claimed value-moving private pool uses real custody logic
- [ ] Writable production lane authority is explicit and institutionally controlled
- [ ] Bridge/relayer trust model is documented without inflation
- [ ] Disclosure path is implemented and auditable if claimed
- [ ] Monitoring, incident response and rollback paths are in place
- [ ] Public wording matches the real deployed scope

## 5. Public-base claim that is safe now

> DPO2U can credibly harden a public-base compliance protocol spine now. Production-target claims remain gated on audit, MPC, custody, governance and operations that are intentionally documented here as not yet closed.
