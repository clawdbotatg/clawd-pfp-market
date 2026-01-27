//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import { DeployClawdPFPMarket } from "./DeployClawdPFPMarket.s.sol";

contract DeployScript is ScaffoldETHDeploy {
  function run() external {
    DeployClawdPFPMarket deployPFPMarket = new DeployClawdPFPMarket();
    deployPFPMarket.run();
  }
}
