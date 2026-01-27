# Hardhat vs Foundry: Development Tooling Comparison

## Overview

Both Hardhat and Foundry are industry-standard Ethereum development frameworks, but they take different approaches.

```
┌─────────────────────────────────────────────────────────────────┐
│ QUICK COMPARISON                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ HARDHAT                      │ FOUNDRY                         │
│ • JavaScript/TypeScript      │ • Solidity (tests & scripts)    │
│ • Rich plugin ecosystem      │ • Blazing fast compilation      │
│ • Flexible, customizable     │ • Built-in fuzzing              │
│ • More beginner-friendly     │ • Better for Solidity experts   │
│ • Slower compilation         │ • Less JS tooling               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Hardhat

### Installation
```bash
npm init -y
npm install --save-dev hardhat
npx hardhat init
```

### Project Structure
```
my-project/
├── contracts/
│   └── MyContract.sol
├── scripts/
│   └── deploy.js
├── test/
│   └── MyContract.test.js
├── hardhat.config.js
└── package.json
```

### Configuration
```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL,
      },
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

### Testing (JavaScript)
```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyToken", function () {
  let token;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MyToken");
    token = await Token.deploy(1000000);
  });

  it("Should assign total supply to owner", async function () {
    const ownerBalance = await token.balanceOf(owner.address);
    expect(await token.totalSupply()).to.equal(ownerBalance);
  });

  it("Should transfer tokens between accounts", async function () {
    await token.transfer(addr1.address, 50);
    expect(await token.balanceOf(addr1.address)).to.equal(50);
  });
});
```

### Deployment Script
```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const Token = await hre.ethers.getContractFactory("MyToken");
  const token = await Token.deploy(1000000);
  await token.waitForDeployment();
  
  console.log("Token deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Commands
```bash
npx hardhat compile          # Compile contracts
npx hardhat test             # Run tests
npx hardhat run scripts/deploy.js --network sepolia  # Deploy
npx hardhat node             # Local blockchain
npx hardhat console          # Interactive console
npx hardhat verify           # Verify on Etherscan
```

## Foundry

### Installation
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge init my-project
```

### Project Structure
```
my-project/
├── src/
│   └── MyContract.sol
├── script/
│   └── Deploy.s.sol
├── test/
│   └── MyContract.t.sol
├── lib/                     # Dependencies (git submodules)
├── foundry.toml
└── remappings.txt
```

### Configuration
```toml
# foundry.toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.20"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
mainnet = "${MAINNET_RPC_URL}"
sepolia = "${SEPOLIA_RPC_URL}"

[etherscan]
mainnet = { key = "${ETHERSCAN_API_KEY}" }
```

### Testing (Solidity)
```solidity
// test/MyToken.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MyToken.sol";

contract MyTokenTest is Test {
    MyToken public token;
    address public owner;
    address public addr1;

    function setUp() public {
        owner = address(this);
        addr1 = makeAddr("addr1");
        token = new MyToken(1000000);
    }

    function test_TotalSupplyAssignedToOwner() public {
        assertEq(token.totalSupply(), token.balanceOf(owner));
    }

    function test_Transfer() public {
        token.transfer(addr1, 50);
        assertEq(token.balanceOf(addr1), 50);
    }

    // Fuzz testing - automatically generates random inputs
    function testFuzz_Transfer(uint256 amount) public {
        vm.assume(amount <= token.balanceOf(owner));
        token.transfer(addr1, amount);
        assertEq(token.balanceOf(addr1), amount);
    }

    // Expect revert
    function test_RevertWhen_InsufficientBalance() public {
        vm.prank(addr1); // Next call from addr1
        vm.expectRevert("Insufficient balance");
        token.transfer(owner, 100);
    }
}
```

### Deployment Script
```solidity
// script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MyToken.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        MyToken token = new MyToken(1000000);
        
        vm.stopBroadcast();
        
        console.log("Token deployed to:", address(token));
    }
}
```

### Commands
```bash
forge build                  # Compile contracts
forge test                   # Run tests
forge test -vvv              # Verbose output
forge test --match-test testTransfer  # Run specific test
forge script script/Deploy.s.sol --rpc-url $RPC --broadcast  # Deploy
anvil                        # Local blockchain
cast                         # CLI for contract interaction
forge verify-contract        # Verify on Etherscan
```

### Foundry Cheatcodes
```solidity
// Powerful testing utilities
contract CheatcodeExamples is Test {
    function test_Pranking() public {
        vm.prank(address(0x1234));  // Next call from this address
        vm.startPrank(address(0x1234));  // All calls until stopPrank
        vm.stopPrank();
    }

    function test_Dealing() public {
        vm.deal(address(0x1234), 100 ether);  // Set ETH balance
        deal(address(token), address(0x1234), 1000);  // Set token balance
    }

    function test_TimeWarp() public {
        vm.warp(block.timestamp + 1 days);  // Set timestamp
        vm.roll(block.number + 100);         // Set block number
    }

    function test_Fork() public {
        uint256 forkId = vm.createFork("mainnet");
        vm.selectFork(forkId);
        // Now testing against mainnet state
    }

    function test_Expect() public {
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(this), addr1, 100);
        token.transfer(addr1, 100);
    }

    function test_Snapshot() public {
        uint256 snapshot = vm.snapshot();
        // Make changes
        vm.revertTo(snapshot);  // Revert to snapshot
    }
}
```

## Feature Comparison

| Feature | Hardhat | Foundry |
|---------|---------|---------|
| Language | JS/TS | Solidity |
| Compilation Speed | Slower | Very Fast |
| Testing Speed | Slower | Very Fast |
| Fuzzing | Plugin required | Built-in |
| Forking | Good | Excellent |
| Plugin Ecosystem | Large | Growing |
| Console Logging | `console.log` in Solidity | `console.log` via forge-std |
| Gas Reports | Via plugin | Built-in |
| Coverage | Via plugin | Built-in |
| Debug Traces | Via plugin | Built-in |

## When to Use Which

### Choose Hardhat When:
- Team familiar with JavaScript/TypeScript
- Need extensive JS tooling integration
- Want mature plugin ecosystem
- Building with React/Next.js frontends

### Choose Foundry When:
- Want fastest possible compile/test cycles
- Need built-in fuzzing
- Prefer writing tests in Solidity
- Complex forking scenarios
- Maximum control over EVM state in tests

## Hybrid Approach

Many projects use both:
```
project/
├── contracts/        # Shared contracts
├── hardhat/          # JS deployment scripts, frontend integration
├── foundry/          # Solidity tests, fuzzing
└── shared/
```

## Scaffold-ETH 2

Scaffold-ETH 2 supports both and provides:
- Local blockchain (Anvil or Hardhat node)
- Hot-reloading contract development
- Pre-built React hooks
- Debug UI
- Fork mode for mainnet testing

```bash
# With Hardhat
npx create-eth@latest

# With Foundry
npx create-eth@latest --foundry
```
