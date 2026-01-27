# eth-mcp Reference: Scaffold-ETH MCP Capabilities

## Overview

The eth-mcp provides AI agents with powerful capabilities for Ethereum development, including project scaffolding, network forking, contract deployment, and DeFi data access.

## Stack Management

### Initialize Project
```
mcp_eth-mcp_stack_init
- template: "scaffold-eth"
- chain: "base" | "mainnet" | "optimism" | "arbitrum" | "polygon"
- workspacePath: "/path/to/project"
```

Creates a new Scaffold-ETH 2 project configured for the specified chain.

### Install Dependencies
```
mcp_eth-mcp_stack_install
```

Runs `yarn install` in the initialized project.

### Start Components
```
mcp_eth-mcp_stack_start
- components: ["fork", "deploy", "frontend"]
```

- **fork**: Start local Anvil fork of configured chain
- **deploy**: Deploy contracts to local fork
- **frontend**: Start Next.js dev server

### Stop Components
```
mcp_eth-mcp_stack_stop
- components: ["fork", "frontend"]
```

### Check Status
```
mcp_eth-mcp_stack_status
```

Returns current state of all components, URLs, and deployed contracts.

## Address Registry

### Get Token Address
```
mcp_eth-mcp_addresses_getToken
- chain: "base"
- symbol: "USDC"
```

Returns the canonical address for tokens across supported chains.

**Common tokens**: WETH, USDC, USDT, DAI, WBTC, wstETH, rETH, cbETH

### Get Protocol Addresses
```
mcp_eth-mcp_addresses_getProtocol
- chain: "base"
- protocol: "uniswapV3"
```

**Supported protocols**:
- All chains: uniswapV3, uniswapV4, aaveV3, chainlink, permit2, multicall
- Base: aerodrome, moonwell, morpho
- Arbitrum: gmx, camelot, pendle
- Mainnet: uniswapV2, curve, lido, compoundV3

### Get Whale Addresses
```
mcp_eth-mcp_addresses_getWhale
- chain: "base"
- token: "USDC"
- recipient: "0x..." (optional)
- amount: "10000000000" (optional)
```

Returns whale addresses for funding test wallets on forks.

## External Contracts

### Configure External Contracts
```
mcp_eth-mcp_stack_configureExternalContracts
- contracts: [
    {
      name: "USDC",
      type: "ERC20"
    },
    {
      name: "AavePool",
      type: "AaveV3Pool"
    }
  ]
- chain: "base" (optional)
```

**Bundled ABI types**:
- ERC20, ERC721, ERC4626
- AaveV3Pool, AaveV3PoolDataProvider
- UniswapV3Router, UniswapV3Quoter
- UniswapV2Router

## DeFi Data

### Get Yields
```
mcp_eth-mcp_defi_getYields
- chain: "base" (optional)
- protocol: "aave-v3" (optional)
- asset: "USDC" (optional)
- minTvl: 100000 (optional)
- limit: 20 (optional)
```

### Compare Yields
```
mcp_eth-mcp_defi_compareYields
- chain: "base"
- asset: "USDC"
- minTvl: 500000 (optional)
```

### Get Protocol TVL
```
mcp_eth-mcp_defi_getProtocolTVL
- protocol: "aave"
```

### Get Top Protocols
```
mcp_eth-mcp_defi_getTopProtocols
- chain: "base"
- category: "lending" (optional)
- limit: 10 (optional)
```

## Education System

### Get Checklist
```
mcp_eth-mcp_education_getChecklist
- category: "tokens" | "math" | "automation" | "security" | "vaults" | "defi" | "all"
```

### Explain Lesson
```
mcp_eth-mcp_education_explainLesson
- lessonId: "decimals-vary"
```

### Suggest Lessons
```
mcp_eth-mcp_education_suggestLessons
- description: "Build a USDC vault with 5% APY"
- limit: 5 (optional)
```

### Get Critical Lessons
```
mcp_eth-mcp_education_getCriticalLessons
```

Returns the 12 most critical gotchas that cause major bugs.

## Frontend Validation

### Lint Design
```
mcp_eth-mcp_frontend_lintDesign
- path: "packages/nextjs/app/page.tsx"
```

Scans for banned design patterns (purple gradients, glassmorphism, etc.).

### Validate All
```
mcp_eth-mcp_frontend_validateAll
- path: "packages/nextjs" (optional)
- includeWarnings: true (optional)
```

Scans for:
- Hardcoded contract addresses
- Raw wagmi hooks (should use scaffold-eth hooks)
- Infinite token approvals
- Deprecated hook names
- Dangerous config changes

## Production Readiness

### Check Production Readiness
```
mcp_eth-mcp_stack_checkProductionReadiness
```

Verifies:
- RPC configuration
- Environment variables
- Chain compatibility

## Process Management

### List Processes
```
mcp_eth-mcp_process_list
```

### Get Process Logs
```
mcp_eth-mcp_process_logs
- id: "fork"
- tail: 50 (optional)
```

### Stop Process
```
mcp_eth-mcp_process_stop
- id: "fork"
```

## Project File Operations

### Read File
```
mcp_eth-mcp_project_readFile
- path: "packages/foundry/contracts/YourContract.sol"
```

### Write File
```
mcp_eth-mcp_project_writeFile
- path: "packages/foundry/contracts/NewContract.sol"
- content: "// SPDX-License-Identifier..."
```

### List Files
```
mcp_eth-mcp_project_listFiles
- path: "packages/foundry/contracts" (optional)
- recursive: false (optional)
```

## Common Workflows

### Start New DeFi Project
1. `stack_init` with target chain
2. `stack_install` dependencies
3. `stack_start(["fork"])` local fork
4. `configureExternalContracts` for needed protocols
5. `stack_start(["deploy"])` your contracts
6. `stack_start(["frontend"])` dev server

### Test Against Real Protocols
1. `stack_start(["fork"])` to fork mainnet/L2
2. `addresses_getWhale` to find token sources
3. Use cast commands to fund test wallets
4. Test against real protocol state

### Pre-Production Audit
1. `frontend_validateAll` check for issues
2. `education_suggestLessons` based on project
3. `checkProductionReadiness` for deployment
