# Challenge 5: State Channel Application

## TLDR

Build an oracle system that brings off-chain data onto the blockchain. Oracles are essential for DeFi (price feeds), insurance (weather data), gaming (sports scores), and more. This challenge explores three oracle patterns: **whitelisted oracles**, **staking-based oracles**, and **optimistic oracles with dispute resolution**.

## Core Concepts

### Why Oracles Matter

```
┌─────────────────────────────────────────────────────────────────┐
│ THE ORACLE PROBLEM                                              │
├─────────────────────────────────────────────────────────────────┤
│ Smart contracts can ONLY access on-chain data.                  │
│                                                                 │
│ They CANNOT:                                                    │
│ • Call external APIs                                            │
│ • Fetch web data                                                │
│ • Know real-world events                                        │
│                                                                 │
│ Oracles bridge this gap by putting external data on-chain.      │
│                                                                 │
│ Risk: If oracle is wrong/manipulated, contracts act on bad data │
└─────────────────────────────────────────────────────────────────┘
```

### Three Oracle Patterns

#### Pattern 1: Whitelisted Oracle
Simplest approach - trust a single entity or small set of addresses.

```solidity
contract WhitelistedOracle {
    mapping(address => bool) public oracles;
    uint256 public price;
    
    modifier onlyOracle() {
        require(oracles[msg.sender], "Not an oracle");
        _;
    }
    
    function updatePrice(uint256 newPrice) external onlyOracle {
        price = newPrice;
        emit PriceUpdated(newPrice, msg.sender);
    }
}
```

**Pros**: Simple, fast, cheap
**Cons**: Centralized, single point of failure

#### Pattern 2: Staking-Based Oracle
Oracles stake collateral; bad data = slashed stake.

```solidity
contract StakingOracle {
    uint256 public constant STAKE_AMOUNT = 1 ether;
    uint256 public constant DISPUTE_PERIOD = 1 hours;
    
    struct PriceReport {
        uint256 price;
        address reporter;
        uint256 timestamp;
        uint256 stake;
        bool disputed;
    }
    
    mapping(bytes32 => PriceReport) public reports;
    
    function reportPrice(bytes32 feedId, uint256 price) external payable {
        require(msg.value >= STAKE_AMOUNT, "Insufficient stake");
        
        reports[feedId] = PriceReport({
            price: price,
            reporter: msg.sender,
            timestamp: block.timestamp,
            stake: msg.value,
            disputed: false
        });
        
        emit PriceReported(feedId, price, msg.sender);
    }
    
    function dispute(bytes32 feedId, uint256 correctPrice) external payable {
        PriceReport storage report = reports[feedId];
        require(block.timestamp < report.timestamp + DISPUTE_PERIOD, "Dispute period over");
        require(msg.value >= STAKE_AMOUNT, "Must stake to dispute");
        
        report.disputed = true;
        // Resolution logic (could involve voting, arbitration, etc.)
    }
    
    function finalize(bytes32 feedId) external {
        PriceReport storage report = reports[feedId];
        require(block.timestamp >= report.timestamp + DISPUTE_PERIOD, "Dispute period active");
        require(!report.disputed, "Under dispute");
        
        // Return stake to honest reporter
        payable(report.reporter).transfer(report.stake);
    }
}
```

**Pros**: Economic incentives for honesty
**Cons**: Capital inefficient, dispute complexity

#### Pattern 3: Optimistic Oracle
Assume data is correct; allow challenges with proof.

```solidity
contract OptimisticOracle {
    uint256 public constant DISPUTE_WINDOW = 2 hours;
    uint256 public constant BOND_AMOUNT = 0.1 ether;
    
    struct Assertion {
        bytes32 dataHash;
        address asserter;
        uint256 timestamp;
        uint256 bond;
        bool resolved;
    }
    
    mapping(bytes32 => Assertion) public assertions;
    
    function assert(bytes32 assertionId, bytes32 dataHash) external payable {
        require(msg.value >= BOND_AMOUNT, "Insufficient bond");
        require(assertions[assertionId].timestamp == 0, "Already asserted");
        
        assertions[assertionId] = Assertion({
            dataHash: dataHash,
            asserter: msg.sender,
            timestamp: block.timestamp,
            bond: msg.value,
            resolved: false
        });
        
        emit DataAsserted(assertionId, dataHash, msg.sender);
    }
    
    function dispute(bytes32 assertionId, bytes32 correctDataHash) external payable {
        Assertion storage assertion = assertions[assertionId];
        require(block.timestamp < assertion.timestamp + DISPUTE_WINDOW, "Too late");
        require(msg.value >= BOND_AMOUNT, "Must bond");
        
        // Escalate to resolution mechanism (UMA, Kleros, etc.)
        emit DisputeRaised(assertionId, msg.sender);
    }
    
    function settle(bytes32 assertionId) external {
        Assertion storage assertion = assertions[assertionId];
        require(block.timestamp >= assertion.timestamp + DISPUTE_WINDOW, "Not settled");
        require(!assertion.resolved, "Already resolved");
        
        assertion.resolved = true;
        payable(assertion.asserter).transfer(assertion.bond);
        
        emit DataSettled(assertionId, assertion.dataHash);
    }
}
```

**Pros**: Capital efficient, handles complex queries
**Cons**: Latency from dispute period

## Security Considerations

### Oracle Manipulation Attacks

1. **Flash Loan + Spot Price**
   ```
   Attacker:
   1. Flash loan massive amount
   2. Manipulate DEX price temporarily  
   3. Protocol reads bad price
   4. Attacker profits from mispriced action
   5. Repay flash loan
   ```
   
   **Solution**: Use TWAPs, not spot prices

2. **Centralized Oracle Compromise**
   - If admin key leaks, all data compromised
   - Solution: Multi-sig, decentralized oracle networks

3. **Stale Data**
   ```solidity
   function getPrice() external view returns (uint256) {
       require(block.timestamp - lastUpdate < MAX_STALENESS, "Stale data");
       return price;
   }
   ```

### Chainlink (Industry Standard)

```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract ChainlinkConsumer {
    AggregatorV3Interface internal priceFeed;
    
    constructor() {
        // ETH/USD price feed on mainnet
        priceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
    }
    
    function getLatestPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        // Validate data freshness
        require(updatedAt > block.timestamp - 3600, "Stale price");
        require(price > 0, "Invalid price");
        require(answeredInRound >= roundID, "Stale round");
        
        return price; // 8 decimal places for USD feeds
    }
}
```

## Code Patterns

### Multi-Source Price Oracle
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract MultiSourceOracle {
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        address source;
    }
    
    mapping(address => bool) public trustedSources;
    PriceData[] public priceHistory;
    uint256 public constant MIN_SOURCES = 3;
    uint256 public constant MAX_DEVIATION = 500; // 5% in basis points
    
    function submitPrice(uint256 price) external {
        require(trustedSources[msg.sender], "Untrusted source");
        priceHistory.push(PriceData(price, block.timestamp, msg.sender));
    }
    
    function getMedianPrice() external view returns (uint256) {
        // Get recent prices from different sources
        uint256[] memory recentPrices = new uint256[](MIN_SOURCES);
        uint256 count = 0;
        
        for (uint256 i = priceHistory.length; i > 0 && count < MIN_SOURCES; i--) {
            if (block.timestamp - priceHistory[i-1].timestamp < 1 hours) {
                recentPrices[count] = priceHistory[i-1].price;
                count++;
            }
        }
        
        require(count >= MIN_SOURCES, "Insufficient data");
        
        // Sort and return median
        return sortAndGetMedian(recentPrices, count);
    }
    
    function sortAndGetMedian(uint256[] memory arr, uint256 len) internal pure returns (uint256) {
        // Simple bubble sort for small arrays
        for (uint256 i = 0; i < len - 1; i++) {
            for (uint256 j = 0; j < len - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    (arr[j], arr[j + 1]) = (arr[j + 1], arr[j]);
                }
            }
        }
        return arr[len / 2];
    }
}
```

## Common Gotchas

1. **Decimal Handling**: Chainlink uses 8 decimals for USD, 18 for ETH pairs
2. **Negative Prices**: Some feeds can return negative (interest rates)
3. **L2 Sequencer Downtime**: Check sequencer status on rollups
4. **Price Deviation**: Validate price against expected range

## Real-World Applications

- DeFi price feeds (lending, perps, options)
- Insurance claims (weather, flight delays)
- Prediction markets (election results)
- Gaming (sports scores)
- Supply chain (shipping status)
- Identity verification

## Builder Checklist

- [ ] Use Chainlink for production price feeds
- [ ] Validate freshness (updatedAt)
- [ ] Check for zero/negative prices
- [ ] Consider L2 sequencer status
- [ ] NEVER use spot DEX prices
- [ ] Implement circuit breakers for extreme prices
- [ ] Use TWAPs for manipulation resistance
