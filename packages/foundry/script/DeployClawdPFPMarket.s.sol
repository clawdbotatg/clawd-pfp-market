// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import "../contracts/ClawdPFPMarket.sol";

contract DeployClawdPFPMarket is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // $CLAWD token on Base
        address clawdToken = 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07;

        // Duration: configurable via env, default 30 minutes
        uint256 duration = vm.envOr("ROUND_DURATION", uint256(30 minutes));

        // Admin: configurable via env, default to Clawd's MetaMask wallet
        address admin = vm.envOr("ADMIN_ADDRESS", address(0x11ce532845cE0eAcdA41f72FDc1C88c335981442));

        // Stake amount: configurable via env, default 500 CLAWD
        uint256 stakeAmount = vm.envOr("STAKE_AMOUNT", uint256(500e18));

        ClawdPFPMarket market = new ClawdPFPMarket(clawdToken, duration, admin, stakeAmount);
        console.log("ClawdPFPMarket deployed at:", address(market));
        console.log("  Admin:", admin);
        console.log("  Duration:", duration, "seconds");
        console.log("  Stake amount:", stakeAmount / 1e18, "CLAWD");
        console.log("  CLAWD token:", clawdToken);
    }
}
