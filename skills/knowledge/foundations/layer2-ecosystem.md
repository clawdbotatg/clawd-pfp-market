# Layer 2 Ecosystem Guide

> **Verified**: Decentralization data from [L2Beat](https://l2beat.com/scaling/risk) (Jan 2026). Contract addresses verified via eth-mcp and Blockscout.

## What is Layer 2?

Layer 2 (L2) solutions are scaling technologies built **on top of Ethereum** (Layer 1) that inherit its security while dramatically reducing costs and increasing throughput.

```
┌─────────────────────────────────────────────────────────────────┐
│ WHY LAYER 2?                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ L1 Ethereum:   ~15 TPS, $1-50 per tx, full security             │
│                                                                 │
│ L2 Solutions:  ~1000+ TPS, <$0.01 per tx, inherits L1 security  │
│                                                                 │
│ Same smart contracts, same tools, cheaper execution.            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## L2 Types

### Optimistic Rollups
- **How it works**: Assume transactions are valid, challenge period for fraud proofs
- **Challenge period**: Typically 7 days for withdrawals to L1
- **Examples**: Arbitrum, Base, Optimism
- **Pros**: EVM-compatible, simpler tech
- **Cons**: Long withdrawal times without bridges

### ZK Rollups  
- **How it works**: Use zero-knowledge proofs to prove transaction validity
- **Withdrawal time**: Minutes to hours (after proof generation)
- **Examples**: ZKsync Era, Starknet, Linea, Scroll
- **Pros**: Faster finality, smaller data footprint
- **Cons**: More complex, some EVM compatibility trade-offs

---

## The Top L2s: Vibe Check

### 1. Arbitrum One
**Chain ID**: 42161 | **Type**: Optimistic Rollup | **Stage**: Stage 1

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VIBE: "DeFi Power User's Home"                              │
├─────────────────────────────────────────────────────────────────┤
│ • Largest L2 by TVL (~$17B+)                                    │
│ • Home to GMX, Pendle, Camelot - serious DeFi protocols         │
│ • DAO-governed (ARB token)                                      │
│ • Stylus: Write contracts in Rust/C++                           │
│ • Most "decentralized" optimistic rollup                        │
│ • Builder-focused, less marketing-heavy                         │
└─────────────────────────────────────────────────────────────────┘
```

**Key Ecosystem Protocols**: GMX (perps), Camelot (native DEX), Pendle (yield trading)

**Native Token**: ARB (0x912CE59144191C1204E64559FE8253a0e49E6548)

---

### 2. Base
**Chain ID**: 8453 | **Type**: Optimistic Rollup | **Stage**: Stage 1

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VIBE: "Consumer Crypto & Coinbase's Playground"             │
├─────────────────────────────────────────────────────────────────┤
│ • Built by Coinbase - massive distribution advantage            │
│ • "Onchain Summer" culture - NFTs, social, memecoins            │
│ • No native token (uses ETH)                                    │
│ • Optimism Superchain member                                    │
│ • Consumer-friendly, retail-focused                             │
│ • Farcaster ecosystem hub                                       │
│ • Highest activity by user ops (~139 daily UOPS)                │
└─────────────────────────────────────────────────────────────────┘
```

**Key Ecosystem Protocols**: Aerodrome (dominant DEX), Moonwell (lending), Friend.tech

**Native DEX**: Aerodrome - Router: 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43

---

### 3. OP Mainnet (Optimism)
**Chain ID**: 10 | **Type**: Optimistic Rollup | **Stage**: Stage 1

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VIBE: "Public Goods & Superchain Vision"                    │
├─────────────────────────────────────────────────────────────────┤
│ • RetroPGF: Funds public goods retroactively                    │
│ • Superchain vision: Network of OP Stack L2s                    │
│ • OP token governance                                           │
│ • Strong values-driven community                                │
│ • "Impact = Profit" philosophy                                  │
│ • Bedrock upgrade: shared with Base, Zora, Mode                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Ecosystem Protocols**: Velodrome (native DEX), Synthetix (synths)

**Native Token**: OP (0x4200000000000000000000000000000000000042)
**Native DEX**: Velodrome - Router: 0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858

---

### 4. Starknet
**Chain ID**: N/A (non-EVM) | **Type**: ZK Rollup (STARK proofs) | **Stage**: Stage 0

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VIBE: "ZK Research Lab Goes Production"                     │
├─────────────────────────────────────────────────────────────────┤
│ • Cairo: Purpose-built language for ZK                          │
│ • NOT EVM compatible - different paradigm                       │
│ • Account abstraction native                                    │
│ • STRK token for fees and governance                            │
│ • StarkWare-backed, research-heavy                              │
│ • Strongest ZK cryptography claims                              │
│ • Gaming focus (on-chain games)                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Note**: Starknet uses different address formats and Cairo language. Not EVM-compatible.

---

### 5. ZKsync Era
**Chain ID**: 324 | **Type**: ZK Rollup (SNARK + STARK) | **Stage**: Stage 0

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VIBE: "ZK with EVM Compatibility"                           │
├─────────────────────────────────────────────────────────────────┤
│ • EVM-compatible (with caveats)                                 │
│ • Native account abstraction                                    │
│ • ZK token (airdrop 2024)                                       │
│ • Hyperchains: Sovereign ZK L2s                                 │
│ • Matter Labs team                                              │
│ • Good developer tooling                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Caveats**: Some Solidity features behave differently. Test thoroughly!

---

### 6. Linea
**Chain ID**: 59144 | **Type**: ZK Rollup | **Stage**: Stage 0

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VIBE: "ConsenSys Enterprise ZK"                             │
├─────────────────────────────────────────────────────────────────┤
│ • Built by ConsenSys (MetaMask creators)                        │
│ • EVM-equivalent goal                                           │
│ • MetaMask native integration                                   │
│ • No token yet                                                  │
│ • Enterprise connections                                        │
│ • Conservative, careful approach                                │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. Scroll
**Chain ID**: 534352 | **Type**: ZK Rollup | **Stage**: Stage 1

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VIBE: "Community-First ZK"                                  │
├─────────────────────────────────────────────────────────────────┤
│ • Open-source, community-focused                                │
│ • True EVM equivalence goal (bytecode level)                    │
│ • Academic roots (co-founder is EF researcher)                  │
│ • Strong Chinese developer community                            │
│ • SCR token launched Oct 2024                                   │
│ • Research collaboration with Ethereum Foundation               │
│ • Very close Ethereum alignment                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Ecosystem Protocols**: SyncSwap (DEX), LayerBank (lending), Aave V3

**Native Token**: SCR

---

### 8. Abstract
**Chain ID**: 2741 | **Type**: ZK Rollup | **Stage**: Stage 0

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VIBE: "Consumer Culture Chain"                              │
├─────────────────────────────────────────────────────────────────┤
│ • Built by Igloo Inc (Pudgy Penguins team)                      │
│ • Consumer/culture-first focus                                  │
│ • ZKsync-based (uses Boojum prover)                             │
│ • Native account abstraction                                    │
│ • NFT and gaming ecosystem                                      │
│ • Emphasis on onboarding Web2 users                             │
│ • TVL: ~$107M                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Focus**: Consumer apps, gaming, NFTs, social
**Explorer**: https://abscan.org
**Docs**: https://docs.abs.xyz

---

### 9. Celo
**Chain ID**: 42220 | **Type**: Optimium (L2 migration in progress) | **Stage**: N/A

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VIBE: "Mobile-First Financial Inclusion"                    │
├─────────────────────────────────────────────────────────────────┤
│ • Originally L1, migrating to Ethereum L2                       │
│ • Mobile-first design (phone # → address)                       │
│ • Real-world impact focus (Kenya, Philippines)                  │
│ • Multiple stablecoins: cUSD, cEUR, cREAL                       │
│ • Carbon negative blockchain                                    │
│ • CELO token for gas and governance                             │
│ • Strong developing world adoption                              │
└─────────────────────────────────────────────────────────────────┘
```

**Native Token**: CELO (0x471EcE3750Da237f93B8E339c536989b8978a438)
**Stablecoins**: cUSD (0x765DE816845861e75A25fCA122bb6898B8B1282a), cEUR (0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73)

---

### 11. Polygon PoS
**Chain ID**: 137 | **Type**: Sidechain (commit chain) | **Stage**: N/A

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VIBE: "Enterprise Adoption Pioneer"                         │
├─────────────────────────────────────────────────────────────────┤
│ • NOT a true L2 (has own validator set)                         │
│ • Massive adoption: Nike, Starbucks, Reddit                     │
│ • MATIC → POL token migration                                   │
│ • Very cheap, very fast                                         │
│ • zkEVM and other products                                      │
│ • Largest gaming ecosystem                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Native Token**: MATIC/POL (0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270 - wrapped)
**Native DEX**: Quickswap - Router: 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff

---

## Key Contract Addresses by Chain

### Arbitrum One (42161)

> **Verified**: ALL addresses confirmed via [Blockscout](https://arbitrum.blockscout.com) (Jan 2026)

```solidity
// Tokens
WETH:    0x82aF49447D8a07e3bd95BD0d56f35241523fBab1
USDC:    0xaf88d065e77c8cC2239327C5EDb3A432268e5831  // Native USDC
USDC.e:  0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8  // Bridged
USDT:    0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
DAI:     0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1
WBTC:    0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f
ARB:     0x912CE59144191C1204E64559FE8253a0e49E6548
wstETH:  0x5979D7b546E38E414F7E9822514be443A4800529

// DeFi Protocols
Uniswap V3 Router:     0xE592427A0AEce92De3Edee1F18E0157C05861564
Uniswap V3 Factory:    0x1F98431c8aD98523631AE4a59f267346ea31F984
Aave V3 Pool:          0x794a61358D6845594F94dc1DB02A252b5b4814aD
Camelot Router:        0xc873fEcbd354f5A56E00E710B90EF4201db2448d
GMX Vault:             0x489ee077994B6658eAfA855C308275EAd8097C4A

// Chainlink Price Feeds
ETH/USD:  0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612
BTC/USD:  0x6ce185860a4963106506C203335A2910DCDDB8DB
ARB/USD:  0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6

// Infrastructure
Multicall3:       0xcA11bde05977b3631167028862bE2a173976CA11
Permit2:          0x000000000022D473030F116dDEE9F6B43aC78BA3
Universal Router: 0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
```

### Base (8453)

> **Verified**: ALL addresses confirmed via [Blockscout](https://base.blockscout.com) (Jan 2026)

```solidity
// Tokens
WETH:    0x4200000000000000000000000000000000000006  // Standard OP Stack address
USDC:    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  // Native USDC
USDbC:   0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA  // Bridged (deprecated)
DAI:     0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb
cbETH:   0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22
wstETH:  0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452
AERO:    0x940181a94A35A4569E4529A3CDfB74e38FD98631

// DeFi Protocols
Uniswap V3 Router:     0x2626664c2603336E57B271c5C0b26F421741e481
Uniswap V3 Factory:    0x33128a8fC17869897dcE68Ed026d694621f6FDfD
Uniswap V4 PoolManager: 0x498581fF718922c3f8e6A244956aF099B2652b2b
Aerodrome Router:      0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43
Aave V3 Pool:          0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
Moonwell Comptroller:  0xfBb21d0380beE3312B33c4353c8936a0F13EF26C
Morpho Blue:           0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb

// Chainlink Price Feeds
ETH/USD:  0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70
USDC/USD: 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B

// Infrastructure
Multicall3:       0xcA11bde05977b3631167028862bE2a173976CA11
Permit2:          0x000000000022D473030F116dDEE9F6B43aC78BA3
Universal Router: 0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
```

### OP Mainnet (10)

> **Verified**: ALL addresses confirmed via [Blockscout](https://optimism.blockscout.com) (Jan 2026)

```solidity
// Tokens
WETH:    0x4200000000000000000000000000000000000006  // Standard OP Stack address
USDC:    0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85  // Native USDC
USDC.e:  0x7F5c764cBc14f9669B88837ca1490cCa17c31607  // Bridged
USDT:    0x94b008aA00579c1307B0EF2c499aD98a8ce58e58
DAI:     0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1
WBTC:    0x68f180fcCe6836688e9084f035309E29Bf0A2095
OP:      0x4200000000000000000000000000000000000042
wstETH:  0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb
VELO:    0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db

// DeFi Protocols
Uniswap V3 Router:     0xE592427A0AEce92De3Edee1F18E0157C05861564
Uniswap V3 Factory:    0x1F98431c8aD98523631AE4a59f267346ea31F984
Velodrome Router:      0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858
Aave V3 Pool:          0x794a61358D6845594F94dc1DB02A252b5b4814aD

// Chainlink Price Feeds
ETH/USD:  0x13e3Ee699D1909E989722E753853AE30b17e08c5
OP/USD:   0x0D276FC14719f9292D5C1eA2198673d1f4269246

// Infrastructure
Multicall3:       0xcA11bde05977b3631167028862bE2a173976CA11
Permit2:          0x000000000022D473030F116dDEE9F6B43aC78BA3
```

### Scroll (534352)

> **Verified**: Addresses via [Blockscout](https://scrollscan.com) (Jan 2026)

```solidity
// Tokens
WETH:    0x5300000000000000000000000000000000000004  // WrappedEther ✓
USDC:    0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4  // Bridged USD Coin ✓
USDT:    0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df
DAI:     0xcA77eB3fEFe3725Dc33bccB54eDEFc3D9f764f97
wstETH:  0xf610A9dfB7C89644979b4A0f27063E9e7d7Cda32

// DeFi Protocols
SyncSwap Router:       0x80e38291e06339d10AAB483C65695D004dBD5C69  // ✓
Aave V3 Pool:          0x11fCfe756c05AD438e312a7fd934381537D3cFfe  // L2PoolInstance ✓

// Infrastructure
Multicall3:       0xcA11bde05977b3631167028862bE2a173976CA11
Permit2:          0x000000000022D473030F116dDEE9F6B43aC78BA3
```

### Abstract (2741)

> **Verified**: Addresses from [Abstract Docs](https://docs.abs.xyz/tooling/deployed-contracts) (Jan 2026)

```solidity
// Tokens (uses ETH for gas)
WETH9:   0x3439153EB7AF838Ad19d56E1571FBD09333C2809
USDC:    0x84A71ccD554Cc1b02749b35d22F684CC8ec987e1
USDT:    0x0709F39376dEEe2A2dfC94A58EdEb2Eb9DF012bD

// DEX - Uniswap V2
UniswapV2Factory:        0x566d7510dEE58360a64C9827257cF6D0Dc43985E
UniswapV2Router02:       0xad1eCa41E6F772bE3cb5A48A6141f9bcc1AF9F7c

// DEX - Uniswap V3
UniswapV3Factory:        0xA1160e73B63F322ae88cC2d8E700833e71D0b2a1
QuoterV2:                0x728BD3eC25D5EDBafebB84F3d67367Cd9EBC7693
PositionManager:         0xfA928D3ABc512383b8E5E77edd2d5678696084F9
Multicall2 (Uni V3):     0x9CA4dcb2505fbf536F6c54AA0a77C79f4fBC35C0

// NFT Markets
Seaport:                 0xDF3969A315e3fC15B89A2752D0915cc76A5bd82D

// Note: Abstract uses ZK Stack with native account abstraction
```

### Celo (42220)

> **Verified**: Addresses via [Blockscout](https://celo.blockscout.com) (Jan 2026)

```solidity
// Tokens
CELO:    0x471EcE3750Da237f93B8E339c536989b8978a438  // Native CELO token ✓
cUSD:    0x765DE816845861e75A25fCA122bb6898B8B1282a  // Celo Dollar (Mento) ✓
cEUR:    0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73  // Celo Euro (Mento) ✓
cREAL:   0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787  // Celo Real - Brazilian ✓
USDC:    0xcebA9300f2b948710d2653dD7B07f33A8B32118C  // Native Circle USDC ✓
WETH:    0xD221812de1BD094f35587EE8E174B07B6167D9Af  // Wrapped ETH (native bridge) ✓
WBTC:    0x8aC2901Dd8A1F17a1A4768A6bA4C3751e3995B2D  // Wrapped BTC (native bridge) ✓

// DeFi Protocols
Ubeswap Router:        0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121  // UniswapV2Router02 ✓

// Infrastructure
Multicall3:       0xcA11bde05977b3631167028862bE2a173976CA11
```

### Polygon PoS (137)

> **Verified**: Addresses via [Blockscout](https://polygon.blockscout.com) (Jan 2026)

```solidity
// Tokens (Note: MATIC rebranded to POL in 2024)
WPOL/WMATIC:  0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270  // ✓
WETH:    0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619
USDC:    0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359  // Native
USDC.e:  0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174  // Bridged
USDT:    0xc2132D05D31c914a87C6611C10748AEb04B58e8F
DAI:     0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063
WBTC:    0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6

// DeFi Protocols
Uniswap V3 Router:     0xE592427A0AEce92De3Edee1F18E0157C05861564
Quickswap Router:      0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff
Aave V3 Pool:          0x794a61358D6845594F94dc1DB02A252b5b4814aD

// Chainlink Price Feeds
MATIC/USD: 0xAB594600376Ec9fD91F8e885dADF0CE036862dE0
ETH/USD:   0xF9680D99D6C9589e2a93a78A04A279e509205945

// Infrastructure
Multicall3:       0xcA11bde05977b3631167028862bE2a173976CA11
Permit2:          0x000000000022D473030F116dDEE9F6B43aC78BA3
```

---

## L1 Bridge Contracts (Ethereum Mainnet)

These are the contracts you interact with on L1 to bridge TO the L2:

```solidity
// Arbitrum One
L1 Gateway Router:     0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef
L1 ERC20 Gateway:      0xa3A7B6F88361F48403514059F1F16C8E78d60EeC
Bridge (Core):         0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a

// Base (uses Optimism standard bridge)
L1 Standard Bridge:    0x3154Cf16ccdb4C6d922629664174b904d80F2C35
L1 Cross Domain Msgr:  0x866E82a600A1414e583f7F13623F1aC5d58b0Afa

// Optimism
L1 Standard Bridge:    0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1
L1 Cross Domain Msgr:  0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1
```

---

## Same-Address Contracts (Deploy Once, Use Everywhere)

These contracts have the **same address** across all EVM chains:

```solidity
// Infrastructure
Multicall3:            0xcA11bde05977b3631167028862bE2a173976CA11
Permit2:               0x000000000022D473030F116dDEE9F6B43aC78BA3
CREATE2 Deployer:      0x4e59b44847b379578588920cA78FbF26c0B4956C

// Account Abstraction (ERC-4337)
EntryPoint v0.6:       0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
EntryPoint v0.7:       0x0000000071727De22E5E9d8BAf0edAc6f37da032

// Gnosis Safe
Safe Singleton:        0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552
Safe Proxy Factory:    0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2

// Aggregators
1inch Router v6:       0x111111125421cA6dc452d289314280a0f8842A65
0x Exchange Proxy:     0xDef1C0ded9bec7F1a1670819833240f027b25EfF
```

---

## Choosing an L2

```
┌─────────────────────────────────────────────────────────────────┐
│ DECISION FRAMEWORK                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Building DeFi/Financial apps?                                   │
│   → Arbitrum (deepest liquidity, most protocols)                │
│                                                                 │
│ Consumer app / need Coinbase distribution?                      │
│   → Base (retail users, easy onramp)                            │
│                                                                 │
│ Care about public goods / Superchain?                           │
│   → Optimism (RetroPGF, shared vision)                          │
│                                                                 │
│ Need fast finality / ZK proofs?                                 │
│   → ZKsync Era, Linea, or Scroll                                │
│                                                                 │
│ Gaming / want Cairo language?                                   │
│   → Starknet (native AA, on-chain games)                        │
│                                                                 │
│ Enterprise / existing Polygon ecosystem?                        │
│   → Polygon PoS (established, cheap)                            │
│                                                                 │
│ Consumer/NFT culture / Pudgy Penguins ecosystem?                │
│   → Abstract (consumer-first ZK chain)                          │
│                                                                 │
│ Mobile-first / developing world / multiple stablecoins?         │
│   → Celo (phone # addresses, cUSD/cEUR/cREAL)                   │
│                                                                 │
│ True EVM equivalence with ZK + Ethereum-aligned values?         │
│   → Scroll (EF collaboration, bytecode-level EVM)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Developer Tips

### 1. Token Addresses Differ!
The same token (e.g., USDC) has **different addresses** on each L2. Always verify!

### 2. Native vs Bridged Tokens
Many L2s have both:
- **Native USDC**: Circle-issued directly on L2
- **Bridged USDC (USDC.e)**: Bridged from L1 via canonical bridge

Native is generally preferred for new projects.

### 3. Gas Token
All major L2s use **ETH** as the gas token, but:
- Polygon PoS uses MATIC/POL
- Celo uses CELO
- Some app-chains may use other tokens

### 4. RPC Endpoints
When deploying to L2s, you need chain-specific RPCs:
```
Arbitrum:  https://arb1.arbitrum.io/rpc
Base:      https://mainnet.base.org
Optimism:  https://mainnet.optimism.io
Polygon:   https://polygon-rpc.com
ZKsync:    https://mainnet.era.zksync.io
Scroll:    https://rpc.scroll.io
Abstract:  https://api.mainnet.abs.xyz
Celo:      https://forno.celo.org
```

### 5. Block Explorers
- Arbitrum: https://arbiscan.io
- Base: https://basescan.org
- Optimism: https://optimistic.etherscan.io
- Polygon: https://polygonscan.com
- ZKsync: https://era.zksync.network
- Scroll: https://scrollscan.com
- Abstract: https://abscan.org
- Celo: https://celoscan.io

---

## Resources

- [L2Beat](https://l2beat.com) - L2 risk analysis and TVL tracking
- [Arbitrum Docs](https://docs.arbitrum.io)
- [Base Docs](https://docs.base.org)
- [Optimism Docs](https://docs.optimism.io)
- [ZKsync Docs](https://docs.zksync.io)
- [Starknet Docs](https://docs.starknet.io)
- [Scroll Docs](https://docs.scroll.io)
- [Abstract Docs](https://docs.abs.xyz)
- [Celo Docs](https://docs.celo.org)
