// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import "../contracts/ClawdPFPMarket.sol";

contract DeployClawdPFPMarket is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // $CLAWD token on Base
        address clawdToken = 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07;

        // Duration: configurable via env, default 10 minutes for testing
        uint256 duration = vm.envOr("ROUND_DURATION", uint256(10 minutes));

        // Admin: configurable via env, default to deployer for testing
        address admin = vm.envOr("ADMIN_ADDRESS", deployer);

        ClawdPFPMarket market = new ClawdPFPMarket(clawdToken, duration, admin);
        console.log("ClawdPFPMarket deployed at:", address(market));
        console.log("  Admin:", admin);
        console.log("  Duration:", duration, "seconds");
        console.log("  CLAWD token:", clawdToken);
    }
}
