# Study — ZK predicate circuit for STRUCTURAL AI-governance frameworks (#2)

> 2026-06-15. Companion to `2026-06-15-moonshots-zk-5-6.md`.
> Goal: bring the AI-governance frameworks that do **not** reduce to "score ≥ threshold"
> into the same on-chain ZK attestation pipeline as the scored ones (#1, already live).
>
> **STATUS: IMPLEMENTED 2026-06-15** (this study was greenlit and built). Live evidence:
> circuit `zk-prover/agg/governance_predicate.circom` (Hiroshima N-of-M + EU-AIA tier);
> Hiroshima proof verifies on-chain on `por-verifier` (`true`); structural SnarkPack batch
> of 4 verifies off-chain; sealed on a 2nd `agg-filing` instance
> `CBA3UVX754G62R4BPA5PZ43ZNR3OSWULQL54GUIZHKR56I57O45T3MJD` (scope `AIGOV`, count 4,
> `member_zk_verified=true`), seal tx
> `786285655171608fc26c0ff92618d6ba7c9b7eca988847d6d77b0f8030d170af`. Tests: 6 new
> (constraint satisfaction: Hiroshima ok / missing-principle fail / EU-AIA high-risk ok /
> prohibited-tier fail / high-risk-unmet fail / structural aggregate). The sections below
> are the design that was implemented.

## 1. Why a second circuit

The shipped circuit `zk-prover/agg/jurisdiction_compliance.circom` proves **`private score ≥
public threshold`, bound to `context`**. The 24 data jurisdictions + 5 scored AI frameworks
(CAIDP, UNESCO-RAM, MGF, Japan, Korea) all reduce to that, so they share ONE vk and
aggregate in a single SnarkPack batch (live: 29 sealed).

Three AI frameworks do **not** reduce to a single score:

| Framework | Shape (from `kb/ai-governance/`) | Predicate type |
|---|---|---|
| **Hiroshima ICOC** | 11 voluntary principles, attested (pass) | **N-of-M attestation** (count ≥ K) |
| **EU-AIA** | 4 risk tiers (minimal/limited/high/**prohibited**) + `redLines`, `requiresImpactAssessment`, `requiresRedTeaming` | **tier membership + conditional booleans** |
| **AI-Governance-Stack** | 5 maturity layers L1–L5, `scored:false` | **ordinal threshold** |

Key realization: **AI-Gov-Stack is actually ordinal** — "attained layer ≥ required layer"
*is* `score ≥ threshold` with score = layer (1–5). So it can join the EXISTING scored
batch with no new circuit. That leaves **two genuinely new predicates**: Hiroshima
(N-of-M) and EU-AIA (tier + booleans).

SnarkPack folds one vk per batch, so a different predicate ⇒ a different circuit ⇒ a
different vk ⇒ it cannot join the scored batch — but the structural frameworks can form
their **own** batch (one structural vk).

## 2. Circuit design — `governance_predicate.circom` (one vk for the structural set)

Keep the **same public-signal shape** as the scored circuit: `[compliant, framework_id,
context]` (IC length 4). That is the load-bearing trick: the deployed generic
`por-verifier` only checks `pub_signals.len()+1 == vk.ic.len()` (`contracts/por-verifier/
src/lib.rs:72`), so a 3-public-signal structural circuit **verifies on-chain with zero
contract change** — only a new pinned vk. `framework_id` selects which predicate is active.

```
template GovernancePredicate(M, MAXTIER) {
    // PUBLIC: compliant (output, forced 1), framework_id, context
    // PRIVATE witnesses (only the relevant ones are constrained per framework_id):
    signal input framework_id;        // public: 1 = Hiroshima(N-of-M), 2 = EU-AIA(tier)
    signal input context;             // public: anti-replay binding
    signal input attested[M];         // PRIVATE: Hiroshima principle attestations (bits)
    signal input k_required;          // PRIVATE-or-const: min principles (e.g. 11)
    signal input tier;                // PRIVATE: EU-AIA tier 0=minimal..3=prohibited
    signal input max_tier;            // const/public: highest allowed tier for the use
    signal input redline_clear;       // PRIVATE bit: no prohibited use (1=ok)
    signal input hr_obligations_met;  // PRIVATE bit: if high-risk, IA + red-teaming done
    signal output compliant;

    // (A) Hiroshima N-of-M: each attested[i] ∈ {0,1}; sum ≥ k_required.
    //     ok_hiroshima = (Σ attested[i] >= k_required)
    // (B) EU-AIA: tier ≤ max_tier (ordinal, GreaterEqThan) AND redline_clear == 1
    //     AND (tier < HIGH  OR  hr_obligations_met == 1).   ok_euaia = AND of those.
    // Select by framework_id: compliant = (fid==1)*ok_hiroshima + (fid==2)*ok_euaia
    // Enforce compliant === 1 (proof only exists if the active predicate holds).
    // Bind context: ctxBind <== context*context.
}
component main {public [framework_id, context]} = GovernancePredicate(11, 3);
```

Primitives are all standard circomlib (`Num2Bits` for bit/range, `GreaterEqThan`,
`IsEqual`/`IsZero` for the selector and tier comparisons) — same toolbox as
`por_solvency.circom`/`jurisdiction_compliance.circom`. No exotic gadgets.

**Soundness notes:** `attested[i]` constrained to bits (`b*(b-1)===0`); `tier` and
`max_tier` range-checked (`Num2Bits(2)`, tiers 0–3); the `framework_id` selector uses
`IsEqual` so exactly one branch drives `compliant`. The unused branch's witnesses are
free but cannot make `compliant=1` for the wrong framework.

## 3. Aggregation — a second SnarkPack batch

Structural proofs share the structural vk ⇒ aggregate in a **second** batch in
`zk-prover-agg` (e.g. Hiroshima + EU-AIA + AI-Gov-Stack-as-ordinal → padded to 4). Result:
two aggregates — **scored batch (29)** and **structural batch (N)** — each verified
off-chain, each sealed.

Merging the two batches into ONE proof would require **recursion across different vks**
(Nova/folding or a SNARK-verifying-SNARK), which is a heavier roadmap item (no GT on
Soroban for on-chain verify anyway — see #5 gap). Recommendation: **two sealed aggregates**,
not forced into one. A single top-level commitment `H(scored_commitment ‖ structural_commitment)`
can bind both on-chain cheaply if a unified "compliance posture" seal is wanted.

## 4. On-chain — minimal change

- **`por-verifier`**: no change (generic in public-input count; verifies any BN254 Groth16
  given the right vk).
- **Seal**: the structural-batch member proof needs its vk pinned. Two options:
  1. **Deploy a second `agg-filing` instance** with the structural vk pinned (zero code
     change — just another deploy + `set_verifier`). Cleanest.
  2. **Extend `agg-filing`** to hold a vk *per predicate-type* (`set_verifier(kind, vk)` +
     `seal_aggregate(kind, …)`). Small change; one contract holds both verticals.
  Recommend (1) for the demo, (2) if one contract should own the whole posture.
- **Cross-chain**: identical — the structural proof verifies on Solana (`alt_bn128`) and
  EVM (`Verifier.sol`) too; the relayer is framework-agnostic.

## 5. Implementation plan (when greenlit)

1. `zk-prover/agg/governance_predicate.circom` + `build-governance.sh` (coordinator
   ceremony, shared structural vk) — mirrors `build-jurisdictions.sh`.
2. `zk-prover-agg`: add a `StructuralStatement` + a second `aggregate_and_verify` call for
   the structural batch; emit `structural-aggregate.json`.
3. Encode the policy: Hiroshima `k_required` (11), EU-AIA `max_tier` per use-case + red-line
   set. **Requires DPO/legal review** — these encode legal classifications, not just math.
4. Seal: deploy a 2nd `agg-filing` (or extend) + pin structural vk + live `seal_aggregate`.
5. Tests: circuit off-chain (each predicate true + tampered false), Soroban seal (happy +
   fail-closed), reuse the proven harness.

## 6. Honest caveats

- **The circuit attests the *encoded* predicate, not the full legal judgment.** "tier ≤
  max_tier", "≥K principles", "red-line clear" are faithful encodings only if the policy
  constants match the legal text — same guardrail as all DPO2U attestation: the chain seals
  the verdict of an off-chain engine, it does not adjudicate the law.
- **AI-Gov-Stack folds into the scored batch** (ordinal); only Hiroshima + EU-AIA truly need
  this circuit. Scope the new work to those two.
- **Two batches, not one** — cross-vk merge = recursion, deferred (and unverifiable on
  Soroban today regardless, per the GT gap).
- Testnet/devnet, DEV coordinator vk; never present as production. Never fabricate the
  attestation inputs (`feedback_compliance_no_synthetic_data`).

## 7. Bottom line

The structural frameworks are **tractable** with one extra circuit reusing the entire
existing rig (same 3-public-signal shape ⇒ same on-chain verifier, same aggregator harness,
same relayer, same chains). The only genuinely new work is the `governance_predicate`
circuit (N-of-M + tier) and a policy-encoding pass with legal review. Estimated: small
circuit + one ceremony + a second sealed batch — days, not weeks.
