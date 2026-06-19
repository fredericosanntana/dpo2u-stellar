# Real-World ZK on Stellar — Video Script (2–3 min)

## Goal
Win on **ZK depth**.

## 0–15s — Hook
"At DPO2U, we're building positive compliance credentials for private finance on Stellar. And the real question here isn't whether privacy wins or compliance wins. It's how you prove you're compliant — without ever revealing who you are."

## 15–35s — Problem framing
"So here's the problem. Most compliance systems still run on disclosure — you prove you qualify by handing over your data. We want the opposite. We want a user to prove they belong to a compliant set, without putting any personal data on-chain."

## 35–65s — What is real in this repo
"So what's actually in this repo? A stateful privacy-pool slice — with real membership proofs, built on BN254 and Groth16. It keeps a history of Merkle roots, it tracks a real nullifier, and the proof verification itself runs on-chain, in Soroban. This isn't a mockup."

## 65–110s — Demo flow
On screen:
1. `privacy-pool` contract/tests;
2. deposits create Merkle state;
3. verifying key configured;
4. valid proof withdraw succeeds;
5. repeated nullifier fails;
6. tampered public root fails.

Narration:
"And this is not cosmetic ZK. The proof path actually carries weight. Watch what happens: a valid proof changes the contract state. A stale or tampered proof gets rejected. And once a nullifier has been used, it can never be used again."

## 110–145s — Why Stellar matters
"So why Stellar? Because Stellar is becoming a serious home for real-world privacy primitives. And we're using that surface for something specific — a credential lane that preserves compliance. Not a generic toy circuit."

## 145–170s — Honest boundary
"Now, let me be honest about the boundary. Right now, this pool is symbolic — it moves state, not custody or value. And that's enough to prove the mechanism honestly for the hackathon. We're not claiming production-grade anonymity at scale, and we won't pretend otherwise."

## 170–180s — Closing
"So here's the takeaway. DPO2U shows that Stellar can carry private, compliance-aware flows — where you qualify by proving it cryptographically, instead of getting re-checked, by hand, every single time."

## Recording notes
- Show `cargo test -p privacy-pool -p zk-verifier` output if helpful.
- Highlight `valid_zk_membership_proof_withdraws_and_marks_nullifier` and `ceremony_proof_verifies_onchain`.
- Keep the framing on real-world compliance, not generic ZK infrastructure.

## Delivery notes (narration)
- Read it like you're explaining it to one smart person, not presenting to a room.
- Land the em-dashes as short beats; pause a touch before each "But", "So", and "Now".
- Stress the contrasts: *without* revealing who you are / the *opposite* / never used *again* / not a *toy* circuit.
- The "what's actually in this repo" line is the credibility beat — slow down and let each item land: roots, nullifier, on-chain.
- The honest-boundary line should slow slightly — it reads as candor, not a caveat.
