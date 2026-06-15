// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {Groth16Verifier} from "./Verifier.sol";

/// DPO2U cross-chain BN254 (#6-C) — EVM-side origin of a relayed proof.
///
/// A prover posts a Groth16/BN254 proof here; the contract verifies it ON the EVM
/// chain (via the snarkjs-exported Groth16Verifier) and emits `ProofPosted`. A DPO2U
/// relayer watches that event, carries the proof bytes to Stellar, and the Soroban
/// `xchain-attest` contract RE-VERIFIES it on-chain (trustless verification; the
/// relayer is only trusted to transport, not to assert validity).
contract ProofRegistry {
    Groth16Verifier public immutable verifier;
    uint256 public count;

    struct PostedProof {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
        uint256[3] pub; // [compliant, threshold, context]
        address poster;
        bool evmVerified;
    }

    mapping(uint256 => PostedProof) private proofs;

    event ProofPosted(uint256 indexed id, address indexed poster, uint256 context, bool evmVerified);

    constructor(address _verifier) {
        verifier = Groth16Verifier(_verifier);
    }

    /// Verify the proof on the EVM side and register it for relay. Reverts if invalid.
    function postProof(
        uint256[2] calldata pA,
        uint256[2][2] calldata pB,
        uint256[2] calldata pC,
        uint256[3] calldata pub
    ) external returns (uint256 id) {
        bool ok = verifier.verifyProof(pA, pB, pC, pub);
        require(ok, "ProofRegistry: invalid proof on EVM");
        id = count++;
        proofs[id] = PostedProof(pA, pB, pC, pub, msg.sender, ok);
        emit ProofPosted(id, msg.sender, pub[2], ok);
    }

    /// Read a posted proof so the relayer can carry it to Stellar.
    function getProof(uint256 id)
        external
        view
        returns (
            uint256[2] memory pA,
            uint256[2][2] memory pB,
            uint256[2] memory pC,
            uint256[3] memory pub
        )
    {
        PostedProof storage p = proofs[id];
        return (p.pA, p.pB, p.pC, p.pub);
    }
}
