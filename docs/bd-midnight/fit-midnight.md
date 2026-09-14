# Fit within Midnight's architecture

Technical scope for Midnight engineering: what exists, what we intend to build,
what we do not yet know, and what we are not claiming.

---

## Why Midnight

**The network fits the product rather than the other way round.**

Our hard constraint is that customer evidence never leaves the institution's
perimeter. We built the compliance core network-independent and enforced that in
CI before selecting where to anchor. Midnight then turned out to generate proofs
on a **local proof server, on the user's own machine** — our perimeter
requirement expressed in the network's architecture rather than bolted onto it.

That order matters. A vendor claiming "we chose you because you are the best
chain" is guessing. We had a constraint first and found one network that
satisfies it structurally.

---

## What exists today

Every number below is reproducible from the repository.

| Component | State | Location |
| --- | --- | --- |
| Network-independent compliance core | 73 tests, **zero runtime dependencies** | `core/src/` |
| CI gate enforcing that independence | Build fails on any chain SDK, chain-native type, or runtime dependency | `core/scripts/no-chain-deps.mjs` |
| Adapter contract with declared capabilities | In code | `core/src/adapter.ts` |
| Hash-linked trail with signed checkpoints | In code | `core/src/trail.ts` |
| Self-verifiable supervisor export | In code | `core/src/export.ts` |
| Signed policy distribution | In code | `core/src/distribution.ts` |
| Attestation registry v2 — validity and revocation | 25 tests | `contracts/attestation-registry/` |
| First adapter implementation | 12 tests | `adapters/stellar/` |

The core declares **no runtime dependencies at all**. That is what makes it
extractable, auditable in an afternoon, and installable inside an institution
that will read every transitive dependency before approving it.

---

## The claim, stated precisely

On a transparent chain, publishing the verdict means publishing the score.

On Midnight, an auditor verifies:

> *this authorised issuer asserted PASS under policy pack X against threshold T,
> at block N*

— without ever seeing the score.

---

## An architectural finding worth discussing

Writing the first adapter, we found the deployed contract preserved **less** than
our interface assumed: no validity window, no revocation, while our attestation
type carried both. Silently anchoring an attestation whose meaning the chain
cannot hold is a failure nobody notices until a supervisor asks.

So we added declared network capabilities, a fidelity check that separates loss
which **changes meaning** from loss which is merely **recoverable detail**, and an
assertion that refuses the write rather than performing it quietly.

**Midnight is the mirror image.** It is the first network that preserves *more*
than the core asks for, and our adapter vocabulary has words only for loss, not
for gain.

Two networks, two opposite discoveries, one interface surviving both. That is our
evidence that portability is a property of the code rather than a posture — and
it is why committing to a single network does not trap us in it.

---

## The limit we state before being asked

The proof demonstrates that the issuer **knows** a score which, against the
recorded threshold, yields that verdict, and which matches the published
commitment.

**It does not prove the score is true.** An authorised issuer can witness a false
number.

What binds it to reality sits outside the circuit: issuer authorisation, the
score commitment enabling selective disclosure later, and the signed audit trail
inside the institution. Anyone who knows ZK asks this within ten minutes.

---

## Build plan

### Phase 0 — Build reproducibility *(blocking)*

Pinned compiler version, closed pragma (the current one is open-ended), and
verification that committed build artefacts derive from committed source.

**Today nobody can verify that the prover keys in the repository came from the
source in the repository.** It is a supply-chain gap, and we are naming it rather
than waiting for it to be found.

### Phase 1 — Attestation registry in Compact

Mirrors `contracts/attestation-registry/src/lib.rs` — the v2 contract, already
written, with 25 passing tests. The Rust contract is the executable
specification; Compact is the translation. Semantic parity is the acceptance
criterion, and divergence is a regression rather than a simplification.

**The three genuinely private inputs.** The correction is not to apply `witness`
broadly; it is to identify what is actually secret:

- the issuer's secret key — currently a **public** circuit argument
- the score — currently public, and written to the ledger in full
- a score salt — **without it, hashing a score over a 0–100 range falls to brute
  force in microseconds**

The circuit reads the public threshold from configuration, computes whether the
score meets it, and discloses that single bit plus the score commitment. It leaks
exactly one bit, and that bit is what the product exists to publish.

Authorisation follows the pattern in `OpenZeppelin/compact-contracts`: an
identity commitment derived from a secret witness, with an instance salt to
prevent replay across deployments. Registry keys are hashed from the use case and
evidence commitment, so there is no subject-dependent scalar ledger entry.

### Phase 2 — Midnight adapter

Three injected interfaces rather than two: ledger reader, circuit invoker, and
witness source.

The third exists because the adapter's register call does not carry the score —
and should not. The witness source is injected at construction rather than
widening the adapter interface.

We keep **two capability constants**: one describing the deployed contract, one
describing the target. While nothing is deployed, the active one describes
nothing. Declaring capabilities for an undeployed contract was our first-version
mistake; repeating it here with the sign reversed would be the same error.

### Phase 3 — Local infrastructure and first real proof

Proof server in the compose file (absent today), compile, deploy locally, run
register and revoke end to end.

**Deliverable: measured constraint count and proof time.** That number exists
nowhere today, and it is the one that could change the product's shape — if a
proof takes minutes on an analyst's laptop, the deployment model is different.

### Phase 4 — Preprod

Deploy, transact, read back through the indexer **from a machine with no wallet**
— which is what makes public verifiability a fact rather than a field.

One caveat: decoding ledger state requires the build artefacts. **Publishing the
build with a verifiable hash is therefore a requirement, not a distribution
detail** — otherwise an auditor still depends on the institution to interpret what
they read.

---

## Questions for Nethermind

Numbered, because this is what we would like an hour of an engineer's time for.

1. **Where is `kernel.blockTimeGreaterThan` evaluated?** Inside the circuit — in
   which case it is useless, since the prover supplies the value — or as a ledger
   assertion at transaction application, making it a trusted clock? This single
   answer decides whether we can honestly declare attestation validity windows.
2. Exact constructor syntax and initialisation semantics in current Compact.
3. Witness callback signature and lifecycle from TypeScript.
4. Injection API in `compact-js` for supplying witnesses at proving time.
5. Is `disclose()` permitted inside `assert`?
6. Semantics of `remove` on a `Set` ledger type.
7. Recommended pattern for key rotation of an authorised issuer.
8. Typical constraint count and proof time for a circuit of this shape.

**A defence that does not depend on question 1**, which we will implement
regardless: the adapter reads block timestamp from the indexer and treats that as
authoritative issuance, using the record's own timestamp only as a declaration.

Items 2–6 would resolve in an afternoon with accessible documentation.
Item 8 resolves only by running.

---

## Disclosure

`dpo2u-midnight` is a public prototype and does **not** represent this
architecture. We audited it ourselves and found: no `witness` in any contract; 35
`disclose()` calls publishing already-public arguments; missing authorisation on
treasury and staking circuits; and a paper describing a registry and eighteen
rules that do not exist in the code — the only compliance logic present is an
assertion that a score is at most 100.

We are saying this rather than letting you find it, because you would, and
because the audit is itself evidence that we check our own work. The contract
described in Phase 1 is the real one, and its semantics are already proven by 25
passing tests in Rust.

---

## Verification

```bash
cd core && npm run typecheck && npm run test:run && npm run no-chain-deps
cargo test --workspace && cargo clippy --workspace --all-targets -- -D warnings
```

Current: 73 core tests, 12 adapter tests, 35 Rust tests (25 in the v2 registry).
CI green.
