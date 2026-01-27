# Scaffold-ETH 2: Getting Started

## What is Scaffold-ETH 2?

Scaffold-ETH 2 is a modern full-stack Ethereum development toolkit that provides everything you need to build, test, and deploy dApps. It includes a local blockchain, hot-reloading contracts, React frontend with hooks, and a debug UI.

## Quick Start

### Prerequisites
- Node.js 18+
- Yarn
- Git

### Create New Project
```bash
# Create new project
npx create-eth@latest

# Options:
# - Project name
# - Solidity framework: Hardhat (default) or Foundry
# - Install dependencies

# Navigate to project
cd your-project-name

# Start all services
yarn chain    # Terminal 1: Local blockchain
yarn deploy   # Terminal 2: Deploy contracts
yarn start    # Terminal 3: React frontend
```

### Project Structure
```
my-dapp/
├── packages/
│   ├── hardhat/              # Smart contracts
│   │   ├── contracts/
│   │   │   └── YourContract.sol
│   │   ├── deploy/
│   │   │   └── 00_deploy_your_contract.ts
│   │   └── hardhat.config.ts
│   │
│   └── nextjs/               # React frontend
│       ├── app/
│       │   ├── page.tsx
│       │   └── debug/
│       ├── components/
│       ├── hooks/            # Ethereum hooks
│       └── contracts/        # Generated contract ABIs
│
├── package.json
└── yarn.lock
```

## Development Workflow

### 1. Write Smart Contract
```solidity
// packages/hardhat/contracts/YourContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract YourContract {
    string public greeting = "Hello!";
    address public owner;

    event GreetingChange(string newGreeting, address indexed setter);

    constructor(address _owner) {
        owner = _owner;
    }

    function setGreeting(string memory _newGreeting) public {
        greeting = _newGreeting;
        emit GreetingChange(_newGreeting, msg.sender);
    }
}
```

### 2. Create Deploy Script
```typescript
// packages/hardhat/deploy/00_deploy_your_contract.ts
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("YourContract", {
    from: deployer,
    args: [deployer], // Constructor arguments
    log: true,
    autoMine: true,
  });
};

export default deployYourContract;
deployYourContract.tags = ["YourContract"];
```

### 3. Use in Frontend
```typescript
// packages/nextjs/app/page.tsx
"use client";

import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function Home() {
  // Read greeting
  const { data: greeting } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "greeting",
  });

  // Write greeting
  const { writeContractAsync: setGreeting } = useScaffoldWriteContract("YourContract");

  const handleSetGreeting = async () => {
    await setGreeting({
      functionName: "setGreeting",
      args: ["New greeting!"],
    });
  };

  return (
    <div>
      <p>Current greeting: {greeting}</p>
      <button onClick={handleSetGreeting}>Change Greeting</button>
    </div>
  );
}
```

## Key Features

### Hot Reload
- Edit Solidity → Auto-compile → Auto-deploy → Frontend updates
- No manual refresh needed

### Debug Contracts Page
- Visit `/debug` to see all deployed contracts
- Read all public variables
- Call any function with form inputs
- View event logs

### Built-in Components
```typescript
import { Address, Balance, AddressInput, EtherInput } from "~~/components/scaffold-eth";

// Display address with ENS/blockie
<Address address="0x..." />

// Show ETH balance
<Balance address="0x..." />

// Input with address validation
<AddressInput value={address} onChange={setAddress} />

// ETH input with conversion
<EtherInput value={amount} onChange={setAmount} />
```

### Scaffold-ETH Hooks
```typescript
// Read contract data
const { data } = useScaffoldReadContract({
  contractName: "YourContract",
  functionName: "greeting",
});

// Write to contract
const { writeContractAsync } = useScaffoldWriteContract("YourContract");

// Watch events
useScaffoldEventHistory({
  contractName: "YourContract",
  eventName: "GreetingChange",
  fromBlock: 0n,
});

// Get deployed contract info
const { data: contract } = useDeployedContractInfo("YourContract");
```

## Network Configuration

### Local Development
```bash
yarn chain  # Starts local Hardhat node at localhost:8545
```

### Fork Mainnet/L2
```bash
# Fork mainnet
yarn fork

# Fork specific network
yarn fork --network base
yarn fork --network optimism
yarn fork --network arbitrum
```

### Auto Block Mining (Prevent Timestamp Drift)

When you fork a chain, block timestamps are FROZEN at the fork point. New blocks only mine when transactions happen, breaking time-dependent logic (deadlines, vesting, oracle staleness checks).

**Solution**: After starting the fork, enable interval mining:

```bash
# Enable auto block mining (1 block/second)
cast rpc anvil_setIntervalMining 1
```

This keeps `block.timestamp` advancing in real-time.

### Deploy to Testnet
```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY=your_private_key

# Deploy to Sepolia
yarn deploy --network sepolia
```

### Configure Networks
```typescript
// packages/hardhat/hardhat.config.ts
const config: HardhatUserConfig = {
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
    base: {
      url: "https://mainnet.base.org",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
  },
};
```

## Common Tasks

### Generate New Account
```bash
yarn generate  # Creates new deployer account
yarn account   # Shows account balance
```

### Verify Contract
```bash
yarn verify --network sepolia
```

### Run Tests
```bash
cd packages/hardhat
yarn test
```

## Frontend Scaffold-ETH Config

```typescript
// packages/nextjs/scaffold.config.ts
import { defineConfig } from "@scaffold-eth/config";

export default defineConfig({
  targetNetworks: [chains.hardhat],
  pollingInterval: 3000,  // How often to poll RPC for fresh data (ms)
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  onlyLocalBurnerWallet: true, // Disable in production!
});
```

### Fix the Polling Interval!

**IMPORTANT**: The default `pollingInterval` is 30000ms (30 seconds) - way too slow for development! Always change it to 3000ms (3 seconds) so your frontend updates quickly after transactions.

```typescript
// BAD (default): Wait 30 seconds for UI to update
pollingInterval: 30000,

// GOOD: UI updates every 3 seconds
pollingInterval: 3000,
```

## Extending Scaffold-ETH

### Add External Contracts
```typescript
// packages/nextjs/contracts/externalContracts.ts
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const externalContracts = {
  1: {
    USDC: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      abi: [...],
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
```

### Custom Hooks
```typescript
// Use wagmi directly for advanced cases
import { useContractRead, useContractWrite } from "wagmi";

const { data } = useContractRead({
  address: contractAddress,
  abi: contractAbi,
  functionName: "myFunction",
});
```

## Tips for Success

1. **Start with Debug Page**: Use `/debug` to understand contract state
2. **Check Console**: Contract events logged to browser console
3. **Use Burner Wallet**: Quick testing without MetaMask prompts
4. **Hot Reload**: Save contract file → auto-redeploy
5. **Fork Mode**: Test against real mainnet state
