# Oracles & External Data

## The Oracle Problem

Smart contracts are **isolated** - they cannot access anything outside the blockchain.

```
┌─────────────────────────────────────────────────────────────────┐
│ WHAT SMART CONTRACTS CAN ACCESS                                 │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Blockchain state (balances, contract storage)                │
│ ✅ Transaction data (msg.sender, msg.value, calldata)           │
│ ✅ Block data (timestamp, number, coinbase)                     │
│ ✅ Other contracts on the same chain                            │
├─────────────────────────────────────────────────────────────────┤
│ WHAT THEY CANNOT ACCESS                                         │
├─────────────────────────────────────────────────────────────────┤
│ ❌ External APIs                                                │
│ ❌ Stock/crypto prices                                          │
│ ❌ Weather data                                                 │
│ ❌ Sports scores                                                │
│ ❌ Random numbers (true randomness)                             │
│ ❌ Anything outside the EVM                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Oracles** bridge this gap by bringing external data on-chain.

## Why Can't Contracts Call APIs?

```
Ethereum requires DETERMINISM:
Every node must produce IDENTICAL results for every transaction.

If Contract A calls weather.com:
- Node 1 gets response at 12:00:01 → "72°F"
- Node 2 gets response at 12:00:02 → "73°F"
- Node 3 gets timeout error

Different results = consensus failure = blockchain broken

Solution: External data must be PUSHED on-chain by someone,
then all nodes read the same on-chain value.
```

## Oracle Architectures

### 1. Chainlink (Decentralized Oracle Network)

The most widely used oracle solution.

```
┌─────────────────────────────────────────────────────────────────┐
│ CHAINLINK ARCHITECTURE                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  External World        Oracle Network         Smart Contract    │
│                                                                 │
│  [CoinGecko]──┐                                                │
│  [CoinMarket]─┼──→ [Node 1]─┐                                  │
│  [Exchange A]─┼──→ [Node 2]─┼──→ Aggregate ──→ [Price Feed]   │
│  [Exchange B]─┘──→ [Node 3]─┘     (median)      (on-chain)     │
│                                                                 │
│  Multiple data sources + Multiple nodes = Decentralization      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Using Chainlink Price Feeds:**

```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PriceConsumer {
    AggregatorV3Interface internal priceFeed;
    
    constructor() {
        // ETH/USD on Mainnet (verified via Blockscout Jan 2026)
        priceFeed = AggregatorV3Interface(
            0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
        );
    }
    
    function getLatestPrice() public view returns (int256) {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        // CRITICAL: Always validate oracle data!
        require(updatedAt > block.timestamp - 3600, "Stale price");
        require(price > 0, "Invalid price");
        require(answeredInRound >= roundId, "Stale round");
        
        return price; // 8 decimals for USD pairs
    }
}
```

### 2. Uniswap TWAP (Time-Weighted Average Price)

```
On-chain price oracle using DEX trading data.

TWAP smooths out manipulation by averaging over time:
- Single block manipulation has minimal effect
- Must maintain manipulation for entire averaging period
- More resistant than spot prices

Tradeoff: Price lags behind real market
```

```solidity
// Uniswap V3 TWAP example
function getTWAP(uint32 secondsAgo) external view returns (int24) {
    uint32[] memory secondsAgos = new uint32[](2);
    secondsAgos[0] = secondsAgo;
    secondsAgos[1] = 0;
    
    (int56[] memory tickCumulatives, ) = pool.observe(secondsAgos);
    
    int24 avgTick = int24(
        (tickCumulatives[1] - tickCumulatives[0]) / 
        int56(uint56(secondsAgo))
    );
    
    return avgTick;
}
```

### 3. UMA Optimistic Oracle

```
Different philosophy: Assume data is correct, challenge if wrong.

1. Proposer submits answer + bond
2. Challenge period (e.g., 2 hours)
3. If disputed → arbitration by UMA token holders
4. If no dispute → answer accepted

Tradeoff: Slower (challenge period) but more flexible
Good for: Arbitrary data, predictions, complex queries
```

## Critical Oracle Security

### ❌ NEVER Use DEX Spot Prices

```solidity
// VULNERABLE - Can be manipulated with flash loans
function getPrice() internal view returns (uint256) {
    (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
    return reserve1 / reserve0; // Spot price - MANIPULABLE!
}

// Attack:
// 1. Flash loan massive amount
// 2. Swap to skew reserves → crash price
// 3. Exploit protocol using manipulated price
// 4. Swap back, repay flash loan
// All in ONE transaction!
```

### ✅ Validate All Oracle Data

```solidity
function getOraclePrice() internal view returns (uint256) {
    (
        uint80 roundId,
        int256 price,
        ,
        uint256 updatedAt,
        uint80 answeredInRound
    ) = priceFeed.latestRoundData();
    
    // Check 1: Price is positive
    require(price > 0, "Invalid price");
    
    // Check 2: Data is recent (not stale)
    require(
        block.timestamp - updatedAt < 3600, // 1 hour max
        "Stale oracle data"
    );
    
    // Check 3: Answer is from current round
    require(answeredInRound >= roundId, "Stale round");
    
    // Check 4: Sanity bounds (optional but recommended)
    require(
        uint256(price) > MIN_PRICE && uint256(price) < MAX_PRICE,
        "Price out of bounds"
    );
    
    return uint256(price);
}
```

### Handling Oracle Failures

```solidity
contract ResilientOracle {
    AggregatorV3Interface public primaryOracle;
    AggregatorV3Interface public fallbackOracle;
    
    function getPrice() public view returns (uint256) {
        // Try primary oracle
        try primaryOracle.latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            if (_isValidOracleData(price, updatedAt, roundId, answeredInRound)) {
                return uint256(price);
            }
        } catch { }
        
        // Fallback to secondary oracle
        try fallbackOracle.latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            if (_isValidOracleData(price, updatedAt, roundId, answeredInRound)) {
                return uint256(price);
            }
        } catch { }
        
        // If both fail, revert or use last known good price
        revert("No valid oracle data");
    }
}
```

## Oracle Decimals

**CRITICAL**: Different oracles use different decimals!

```
Chainlink:
  ETH/USD: 8 decimals  (price * 1e8)
  BTC/USD: 8 decimals
  ETH/BTC: 18 decimals (crypto pairs)
  
Always check decimals():
  uint8 decimals = priceFeed.decimals();
```

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ ORACLE BEST PRACTICES                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Use decentralized oracles (Chainlink) over DEX spot prices   │
│ 2. ALWAYS validate: freshness, positivity, round completion     │
│ 3. Check decimal precision for the specific feed                │
│ 4. Implement fallback mechanisms for critical data              │
│ 5. Consider circuit breakers for extreme price movements        │
│ 6. Remember: Oracles add trust assumptions to your contract     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
