// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import "../contracts/ClawdPFPMarket.sol";

contract DeployClawdPFPMarket is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // $CLAWD token on Base
        address clawdToken = 0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07;

        // Duration: 2 minutes for testing, 5 hours for production
        uint256 duration = 2 minutes;

        // Admin: Clawd's wallet
        address admin = 0x11ce532845cE0eAcdA41f72FDc1C88c335981442;

        new ClawdPFPMarket(clawdToken, duration, admin);
    }
}
