# Forking Networks with Scaffold-ETH

## What is Forking?

Forking creates a local copy of a live blockchain's state at a specific block. You can interact with real protocols (Uniswap, Aave, etc.) locally without spending real money.

```
┌─────────────────────────────────────────────────────────────────┐
│ FORK BENEFITS                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ • Test against real protocol state                              │
│ • Use real token balances (impersonate whales)                  │
│ • Free transactions (no gas costs)                              │
│ • Time travel (advance blocks/time)                             │
│ • Snapshot and revert state                                     │
│ • Debug real mainnet transactions                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Starting a Fork

**IMPORTANT: After starting a fork, you MUST enable interval mining!** See "Auto Block Mining" section below. Without it, `block.timestamp` stays frozen and time-dependent logic breaks.

### With Scaffold-ETH 2
```bash
# Fork specific network
yarn fork --network base
yarn fork --network optimism
yarn fork --network arbitrum
yarn fork --network polygon

# THEN in a new terminal, enable interval mining (REQUIRED!)
cast rpc anvil_setIntervalMining 1
```

### With Anvil (Foundry)
```bash
# Basic fork with auto block mining (recommended)
anvil --fork-url https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY --block-time 1

# Fork at specific block
anvil --fork-url $RPC_URL --fork-block-number 18500000 --block-time 1

# With custom chain ID (for local testing)
anvil --fork-url $RPC_URL --chain-id 31337 --block-time 1
```

## Auto Block Mining (Prevent Timestamp Drift)

```
┌─────────────────────────────────────────────────────────────────┐
│ WARNING: TIMESTAMP DRIFT ON FORKS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ When you fork a chain, block timestamps are FROZEN at the       │
│ fork point. New blocks only mine when transactions happen.      │
│                                                                 │
│ This breaks time-dependent logic:                               │
│ • Staking deadlines                                             │
│ • Vesting schedules                                             │
│ • Auction end times                                             │
│ • Oracle staleness checks                                       │
│ • Any block.timestamp comparison                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Solution: Use --block-time flag

The `--block-time` flag tells Anvil to automatically mine blocks at a regular interval, keeping timestamps current:

```bash
# Mine a block every second (recommended for forks)
anvil --fork-url $RPC_URL --block-time 1

# Mine every 12 seconds (mimics Ethereum mainnet)
anvil --fork-url $RPC_URL --block-time 12
```

### Enable at Runtime

If you already have a fork running, enable interval mining via RPC:

```bash
# Enable mining every 1 second
cast rpc anvil_setIntervalMining 1

# Disable interval mining (back to transaction-based)
cast rpc anvil_setIntervalMining 0
```

### Scaffold-ETH 2 Configuration (REQUIRED!)

For Scaffold-ETH 2 projects, you MUST enable interval mining after starting the fork:

```bash
# Step 1: Start the fork
yarn fork --network base

# Step 2: In a NEW terminal, enable interval mining (REQUIRED!)
cast rpc anvil_setIntervalMining 1
```

**Optional: Make it permanent** by editing `packages/foundry/package.json` to add `--block-time 1` to the fork script:

```json
{
  "scripts": {
    "fork": "anvil --fork-url ... --block-time 1"
  }
}
```

### With Hardhat
```typescript
// hardhat.config.ts
const config = {
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL,
        blockNumber: 18500000, // Pin to specific block for reproducibility
      },
    },
  },
};
```

## Impersonating Accounts

### Become a Whale
```typescript
// Get tokens from a whale account
import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";

async function getUSDC() {
  // USDC whale on mainnet
  const whaleAddress = "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503";
  
  await impersonateAccount(whaleAddress);
  const whale = await ethers.getSigner(whaleAddress);
  
  // Give whale some ETH for gas
  await setBalance(whaleAddress, ethers.parseEther("10"));
  
  // Transfer USDC to your test account
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  await usdc.connect(whale).transfer(testAccount, 1000000n * 10n**6n); // 1M USDC
}
```

### Using Foundry Cheatcodes
```solidity
// In tests
function test_WithRealTokens() public {
    address whale = 0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503;
    
    vm.startPrank(whale);
    usdc.transfer(address(this), 1000000e6);
    vm.stopPrank();
    
    // Now test with real USDC
}
```

### Using Cast (Foundry CLI)
```bash
# Impersonate and send tokens
cast rpc anvil_impersonateAccount 0xWHALE_ADDRESS

# Send USDC as whale
cast send $USDC "transfer(address,uint256)" $YOUR_ADDRESS 1000000000000 \
  --from 0xWHALE_ADDRESS \
  --rpc-url http://localhost:8545

# Stop impersonating
cast rpc anvil_stopImpersonatingAccount 0xWHALE_ADDRESS
```

## Interacting with Real Protocols

### Swap on Uniswap (Fork)
```typescript
async function swapOnUniswap() {
  const router = await ethers.getContractAt(
    "ISwapRouter",
    "0xE592427A0AEce92De3Edee1F18E0157C05861564" // Uniswap V3 Router
  );
  
  // Approve tokens
  await weth.approve(router.address, amount);
  
  // Swap WETH → USDC
  await router.exactInputSingle({
    tokenIn: WETH_ADDRESS,
    tokenOut: USDC_ADDRESS,
    fee: 3000,
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 60,
    amountIn: ethers.parseEther("1"),
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  });
}
```

### Supply to Aave (Fork)
```typescript
async function supplyToAave() {
  const pool = await ethers.getContractAt(
    "IPool",
    "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" // Aave V3 Pool
  );
  
  // Approve
  await usdc.approve(pool.address, amount);
  
  // Supply
  await pool.supply(USDC_ADDRESS, amount, signer.address, 0);
}
```

## Time Manipulation

### Advance Time
```typescript
// Hardhat
import { time } from "@nomicfoundation/hardhat-network-helpers";

await time.increase(3600); // Advance 1 hour
await time.increaseTo(timestamp); // Advance to specific timestamp

// Foundry
vm.warp(block.timestamp + 1 hours);
```

### Advance Blocks
```typescript
// Hardhat
import { mine } from "@nomicfoundation/hardhat-network-helpers";

await mine(100); // Mine 100 blocks

// Foundry
vm.roll(block.number + 100);
```

### With Cast
```bash
# Advance time by 1 day
cast rpc evm_increaseTime 86400
cast rpc evm_mine

# Set specific timestamp
cast rpc evm_setNextBlockTimestamp 1700000000
cast rpc evm_mine
```

## Snapshots and Reverts

### Save/Restore State
```typescript
// Hardhat
import { takeSnapshot, SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";

let snapshot: SnapshotRestorer;

beforeEach(async () => {
  snapshot = await takeSnapshot();
});

afterEach(async () => {
  await snapshot.restore();
});
```

### Foundry
```solidity
uint256 snapshotId;

function setUp() public {
    snapshotId = vm.snapshot();
}

function test_Something() public {
    // Make changes
    vm.revertTo(snapshotId);
    // State restored
}
```

### Cast
```bash
# Take snapshot
SNAPSHOT_ID=$(cast rpc evm_snapshot)

# Revert to snapshot
cast rpc evm_revert $SNAPSHOT_ID
```

## Best Practices

### Pin Block Numbers
```typescript
// Always pin for reproducibility
forking: {
  url: RPC_URL,
  blockNumber: 18500000, // Specific block
}
```

### Use Archive Nodes
```
Regular nodes: Only recent state
Archive nodes: Historical state (required for old blocks)

Providers with archive:
- Alchemy (archive add-on)
- QuickNode
- Infura (archive add-on)
```

### Cache Fork Data
```bash
# Anvil caches automatically, but you can specify
anvil --fork-url $RPC --fork-block-number 18500000 --block-time 1
# Creates .anvil_cache/

# Hardhat
networks: {
  hardhat: {
    forking: {
      url: RPC_URL,
      blockNumber: 18500000,
      enabled: true,
    },
  },
}
```

## Debugging Real Transactions

### Replay Mainnet Transaction
```bash
# Get transaction details
cast tx 0xTRANSACTION_HASH --rpc-url $MAINNET_RPC

# Replay on fork
cast call --trace 0xTRANSACTION_HASH --rpc-url http://localhost:8545
```

### Foundry Trace
```bash
# Full execution trace
cast run 0xTRANSACTION_HASH --rpc-url $MAINNET_RPC
```

## Common Patterns

### Test Against Multiple Networks
```typescript
const CONFIGS = {
  mainnet: {
    rpc: process.env.MAINNET_RPC,
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  },
  base: {
    rpc: process.env.BASE_RPC,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    uniswapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
  },
};
```

### Fork in CI/CD
```yaml
# GitHub Actions
- name: Run Fork Tests
  env:
    MAINNET_RPC_URL: ${{ secrets.MAINNET_RPC_URL }}
  run: |
    yarn fork &
    sleep 5
    yarn test:fork
```
