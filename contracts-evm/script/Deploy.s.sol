// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {Groth16Verifier} from "../src/Verifier.sol";
import {ProofRegistry} from "../src/ProofRegistry.sol";

/// Deploys the EVM-side contracts for DPO2U cross-chain BN254 (#6).
/// - Groth16Verifier: snarkjs-exported PoR verifier (EVM half of "two chains, one proof").
/// - ProofRegistry: origin-side proof source the Stellar relayer watches (#6-C).
contract DeployScript is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        Groth16Verifier verifier = new Groth16Verifier();
        ProofRegistry registry = new ProofRegistry(address(verifier));
        vm.stopBroadcast();
        console2.log("Groth16Verifier:", address(verifier));
        console2.log("ProofRegistry:", address(registry));
    }
}
