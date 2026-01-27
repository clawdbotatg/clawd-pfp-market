# Ethereum Fundamentals

## What is Ethereum?

Ethereum is a decentralized, programmable blockchain that enables smart contracts - self-executing code that runs exactly as programmed without intermediaries. Unlike Bitcoin (primarily a currency), Ethereum is a platform for building decentralized applications (dApps).

## Core Components

### Accounts

```
┌─────────────────────────────────────────────────────────────────┐
│ TWO TYPES OF ACCOUNTS                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Externally Owned Account (EOA)                                  │
│ • Controlled by private key                                     │
│ • Can initiate transactions                                     │
│ • Has ETH balance                                               │
│ • Example: Your MetaMask wallet                                 │
│                                                                 │
│ Contract Account                                                │
│ • Controlled by code                                            │
│ • Cannot initiate transactions (only respond)                   │
│ • Has ETH balance AND code storage                              │
│ • Example: Uniswap, Aave, your deployed contract                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Transactions

```solidity
// Transaction fields:
{
    from: "0x...",        // Sender (EOA only)
    to: "0x...",          // Recipient (EOA or contract)
    value: 1000000000000000000,  // ETH in wei (1 ETH)
    data: "0x...",        // Input data (function call)
    nonce: 42,            // Transaction count from sender
    gasLimit: 21000,      // Max gas willing to use
    // EIP-1559 (current standard):
    maxFeePerGas: 1000000000,        // 1 gwei max (varies!)
    maxPriorityFeePerGas: 100000000  // 0.1 gwei tip
}
// Note: Gas prices fluctuate constantly - check current rates
```

### Gas

```
Gas = Computational cost of operations (measured in gas units)

┌────────────────────────────────────────────────────────────────┐
│ COMMON OPERATIONS                                              │
├────────────────────┬─────────────┬─────────────────────────────┤
│ Operation          │ Gas Units   │ Typical Cost (low gas)      │
├────────────────────┼─────────────┼─────────────────────────────┤
│ ETH transfer       │ 21,000      │ ~$0.01                      │
│ ERC-20 transfer    │ ~65,000     │ ~$0.01                      │
│ Uniswap V3 swap    │ ~185,000    │ ~$0.03                      │
│ Complex DeFi       │ 300,000+    │ ~$0.05+                     │
│ NFT sale           │ ~600,000    │ ~$0.09                      │
└────────────────────┴─────────────┴─────────────────────────────┘

Transaction Cost = Gas Used × Gas Price (in gwei)

⚠️  GAS PRICES ARE HIGHLY VARIABLE:
• Low demand: <1 gwei    → Transactions cost CENTS
• Normal:     1-10 gwei  → Transactions cost $0.10-$1
• High demand: 50+ gwei  → Transactions cost $5-$50+
• NFT mints:   100+ gwei → Can spike much higher

Always check current gas: https://etherscan.io/gastracker
```

### Gas Price Mechanics (EIP-1559)

```
Base Fee: Network-determined, burned
Priority Fee (Tip): Goes to validator

Total Fee = Base Fee + Priority Fee

If block is >50% full: Base fee increases
If block is <50% full: Base fee decreases

This creates a self-regulating fee market
```

## The EVM (Ethereum Virtual Machine)

The EVM is a stack-based virtual machine that executes smart contract bytecode.

```
┌─────────────────────────────────────────────────────────────────┐
│ EVM ARCHITECTURE                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Stack: 256-bit words, max 1024 items deep                       │
│ Memory: Byte-addressable, volatile (per call)                   │
│ Storage: 256-bit slots, persistent (on-chain)                   │
│ Calldata: Read-only input data                                  │
│                                                                 │
│ Storage is ~20,000 gas to write (EXPENSIVE)                     │
│ Memory is ~3 gas per word (CHEAP)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Costs

| Operation | Gas Cost |
|-----------|----------|
| SSTORE (new value) | 20,000 |
| SSTORE (update) | 5,000 |
| SSTORE (zero → non-zero) | 20,000 |
| SSTORE (non-zero → zero) | Refund 4,800 |
| SLOAD | 2,100 |
| Memory expansion | 3 per word |

## Block Structure

```
Block:
├── Header
│   ├── Parent Hash
│   ├── State Root (Merkle root of all account states)
│   ├── Transactions Root
│   ├── Receipts Root
│   ├── Block Number
│   ├── Gas Limit
│   ├── Gas Used
│   ├── Timestamp
│   └── Base Fee (EIP-1559)
└── Transactions
```

## Consensus: Proof of Stake

After "The Merge" (Sept 2022), Ethereum uses Proof of Stake:

```
Validators:
• Stake 32 ETH to become validator
• Propose and attest to blocks
• Earn rewards (~2.4-3.5% APY) - verified via DefiLlama Jan 2026
• Risk slashing for misbehavior

Block Time: ~12 seconds
Finality: ~15 minutes (2 epochs)
```

## Layer 2 Solutions

```
┌─────────────────────────────────────────────────────────────────┐
│ SCALING ETHEREUM                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Layer 1: Ethereum mainnet (~15 TPS, expensive)                  │
│                                                                 │
│ Layer 2: Built on top of L1, inherits security                  │
│                                                                 │
│ Optimistic Rollups (Optimism, Arbitrum, Base)                   │
│ • Assume valid, fraud proofs if challenged                      │
│ • 7-day withdrawal period                                       │
│ • EVM compatible                                                │
│                                                                 │
│ ZK Rollups (zkSync, Starknet, Polygon zkEVM)                    │
│ • Validity proofs for every batch                               │
│ • Fast withdrawals                                              │
│ • Some EVM differences                                          │
│                                                                 │
│ L2s: ~1000+ TPS, 10-100x cheaper                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts for Developers

### Immutability
```
Once deployed, contract code CANNOT be changed
• Bugs are permanent
• Requires proxy patterns for upgrades
• Test extensively before mainnet
```

### Determinism
```
Same input → Same output, always
• No true randomness
• No external API calls
• No floating point math
```

### Atomicity
```
Transactions are all-or-nothing
• If any part fails, everything reverts
• No partial execution
• Enables flash loans
```

### Composability
```
Contracts can call other contracts
• "Money Legos" - combine protocols
• Flash loans leverage this
• Also creates attack surfaces
```

## Network IDs

| Network | Chain ID | Use |
|---------|----------|-----|
| Mainnet | 1 | Production |
| Sepolia | 11155111 | Testing |
| Base | 8453 | L2 Production |
| Arbitrum | 42161 | L2 Production |
| Optimism | 10 | L2 Production |
| Local (Anvil) | 31337 | Development |

## Resources

- [Ethereum Whitepaper](https://ethereum.org/whitepaper)
- [Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf)
- [EVM Opcodes](https://www.evm.codes/)
- [Etherscan](https://etherscan.io)
- [Etherscan Gas Tracker](https://etherscan.io/gastracker) - Live gas prices
