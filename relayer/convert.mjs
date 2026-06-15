// DPO2U cross-chain relayer (#6-C) — convert an EVM Groth16/BN254 proof (uint256
// arrays, as read from ProofRegistry on the origin chain) into the byte/JSON args the
// Soroban por-verifier / xchain-attest consume.
//
// The byte conventions already match (G2 c1-first = EVM convention), so this is a pure
// re-encoding: each uint256 coordinate -> 32-byte big-endian hex; G1 = x||y (64B),
// G2 = Xc1||Xc0||Yc1||Yc0 (128B). Public signals -> decimal strings (Array<u256>).

/** big-endian 32-byte hex (no 0x) from a decimal or 0x string / bigint. */
export function be32(v) {
  let h = BigInt(v).toString(16);
  if (h.length > 64) throw new Error("value > 32 bytes: " + v);
  return h.padStart(64, "0");
}

/**
 * @param {[any,any]} pA            EVM proof.A
 * @param {[[any,any],[any,any]]} pB EVM proof.B = [[Xc1,Xc0],[Yc1,Yc0]]
 * @param {[any,any]} pC            EVM proof.C
 * @param {[any,any,any]} pub       [compliant, threshold, context]
 * @returns {{proof:{a:string,b:string,c:string}, signals:string[]}}
 */
export function evmProofToSoroban(pA, pB, pC, pub) {
  const a = be32(pA[0]) + be32(pA[1]);
  const b = be32(pB[0][0]) + be32(pB[0][1]) + be32(pB[1][0]) + be32(pB[1][1]);
  const c = be32(pC[0]) + be32(pC[1]);
  const signals = pub.map((x) => BigInt(x).toString()); // decimal Array<u256>
  return { proof: { a, b, c }, signals };
}
