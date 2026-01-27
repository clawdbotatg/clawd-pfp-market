# Challenge 8: Prediction Markets

## TLDR

Build a decentralized prediction market where users bet on real-world outcomes (elections, sports, crypto prices). Learn about market creation, betting mechanics, outcome resolution via oracles, and how prices reflect probability. Prediction markets harness crowd wisdom to forecast future events.

## Core Concepts

### What You're Building

```
┌─────────────────────────────────────────────────────────────────┐
│ PREDICTION MARKET FLOW                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. CREATE MARKET                                                │
│    "Will ETH be above $5000 on Dec 31, 2026?"                   │
│    Outcomes: YES / NO                                           │
│                                                                 │
│ 2. TRADING PERIOD                                               │
│    Users buy YES tokens at $0.60 (60% implied probability)      │
│    Users buy NO tokens at $0.40 (40% implied probability)       │
│    Prices fluctuate based on demand                             │
│                                                                 │
│ 3. RESOLUTION                                                   │
│    Oracle reports: ETH = $5,234 on Dec 31                       │
│    Outcome: YES                                                 │
│                                                                 │
│ 4. SETTLEMENT                                                   │
│    YES tokens pay $1 each                                       │
│    NO tokens worth $0                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Mechanics

1. **Market Creation**
   ```solidity
   struct Market {
       string question;
       uint256 endTime;
       uint256 resolutionTime;
       bool resolved;
       Outcome result;
       uint256 totalYesShares;
       uint256 totalNoShares;
   }
   
   enum Outcome { UNRESOLVED, YES, NO, INVALID }
   
   mapping(uint256 => Market) public markets;
   uint256 public marketCount;
   
   function createMarket(
       string calldata question,
       uint256 endTime,
       uint256 resolutionTime
   ) external returns (uint256 marketId) {
       require(endTime > block.timestamp, "End must be future");
       require(resolutionTime > endTime, "Resolution after end");
       
       marketId = marketCount++;
       markets[marketId] = Market({
           question: question,
           endTime: endTime,
           resolutionTime: resolutionTime,
           resolved: false,
           result: Outcome.UNRESOLVED,
           totalYesShares: 0,
           totalNoShares: 0
       });
       
       emit MarketCreated(marketId, question, endTime);
   }
   ```

2. **Buying Outcome Shares (Simple Model)**
   ```solidity
   mapping(uint256 => mapping(address => uint256)) public yesShares;
   mapping(uint256 => mapping(address => uint256)) public noShares;
   
   function buyYes(uint256 marketId) external payable {
       Market storage market = markets[marketId];
       require(block.timestamp < market.endTime, "Market closed");
       require(msg.value > 0, "Must send ETH");
       
       // Simple: 1 share = price based on current ratio
       uint256 shares = calculateShares(marketId, true, msg.value);
       yesShares[marketId][msg.sender] += shares;
       market.totalYesShares += shares;
       
       emit SharesPurchased(marketId, msg.sender, true, shares);
   }
   
   function buyNo(uint256 marketId) external payable {
       // Similar to buyYes but for NO outcome
   }
   ```

3. **LMSR (Logarithmic Market Scoring Rule) - Advanced**
   ```solidity
   // Used by Polymarket, Augur for better pricing
   uint256 public constant LIQUIDITY_PARAM = 100e18; // b parameter
   
   function getLMSRCost(
       uint256 currentYes,
       uint256 currentNo,
       uint256 buyYes,
       uint256 buyNo
   ) public pure returns (uint256) {
       // Cost = b * ln(e^(q1/b) + e^(q2/b))
       // Simplified implementation
       uint256 oldCost = _lmsrCost(currentYes, currentNo);
       uint256 newCost = _lmsrCost(currentYes + buyYes, currentNo + buyNo);
       return newCost - oldCost;
   }
   
   function getPrice(uint256 marketId, bool forYes) public view returns (uint256) {
       Market memory m = markets[marketId];
       // Price = e^(q/b) / (e^(q_yes/b) + e^(q_no/b))
       // Returns price in wei for 1 share
   }
   ```

4. **Resolution and Settlement**
   ```solidity
   address public oracle;
   
   function resolve(uint256 marketId, Outcome outcome) external {
       require(msg.sender == oracle, "Only oracle");
       Market storage market = markets[marketId];
       require(block.timestamp >= market.resolutionTime, "Too early");
       require(!market.resolved, "Already resolved");
       
       market.resolved = true;
       market.result = outcome;
       
       emit MarketResolved(marketId, outcome);
   }
   
   function claim(uint256 marketId) external {
       Market memory market = markets[marketId];
       require(market.resolved, "Not resolved");
       
       uint256 payout;
       if (market.result == Outcome.YES) {
           payout = yesShares[marketId][msg.sender];
           yesShares[marketId][msg.sender] = 0;
       } else if (market.result == Outcome.NO) {
           payout = noShares[marketId][msg.sender];
           noShares[marketId][msg.sender] = 0;
       } else if (market.result == Outcome.INVALID) {
           // Refund proportionally
           payout = (yesShares[marketId][msg.sender] + noShares[marketId][msg.sender]) / 2;
           yesShares[marketId][msg.sender] = 0;
           noShares[marketId][msg.sender] = 0;
       }
       
       if (payout > 0) {
           payable(msg.sender).transfer(payout);
           emit Claimed(marketId, msg.sender, payout);
       }
   }
   ```

### Complete Shares Model

```solidity
// Complete shares: Buy 1 YES + 1 NO = Always pays $1
// This ensures market is always balanced

function mintCompleteSet(uint256 marketId) external payable {
    require(msg.value == 1 ether, "Must send 1 ETH");
    
    yesShares[marketId][msg.sender] += 1 ether;
    noShares[marketId][msg.sender] += 1 ether;
    
    emit CompleteSetMinted(marketId, msg.sender);
}

function redeemCompleteSet(uint256 marketId) external {
    uint256 amount = min(
        yesShares[marketId][msg.sender],
        noShares[marketId][msg.sender]
    );
    require(amount > 0, "No complete sets");
    
    yesShares[marketId][msg.sender] -= amount;
    noShares[marketId][msg.sender] -= amount;
    
    payable(msg.sender).transfer(amount);
}
```

## Security Considerations

### Oracle Manipulation

```
Attack scenario:
1. Attacker takes large position
2. Manipulates oracle data
3. Market resolves incorrectly
4. Attacker profits
```

**Solutions**:
- Decentralized oracles (UMA, Chainlink)
- Dispute periods with bonds
- Multi-oracle aggregation

### Front-Running

```
Attacker sees insider bet → Front-runs to profit
```

**Mitigation**:
- Commit-reveal betting
- Private mempools
- Batch auctions

### Market Manipulation

```
Whale manipulation:
1. Buy large YES position
2. Create news/hype about outcome
3. Sell at inflated price
```

**Mitigation**:
- Liquidity depth (LMSR parameter)
- Trading fees
- Position limits

## Code Patterns

### Complete Prediction Market
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PredictionMarket is ReentrancyGuard {
    struct Market {
        string question;
        uint256 endTime;
        uint256 resolutionDeadline;
        address creator;
        bool resolved;
        bool outcome; // true = YES, false = NO
        uint256 totalPool;
        uint256 yesPool;
        uint256 noPool;
    }
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public yesBets;
    mapping(uint256 => mapping(address => uint256)) public noBets;
    
    uint256 public marketCount;
    uint256 public constant FEE_BPS = 100; // 1%
    address public oracle;
    
    event MarketCreated(uint256 indexed id, string question, uint256 endTime);
    event BetPlaced(uint256 indexed id, address indexed bettor, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed id, bool outcome);
    event WinningsClaimed(uint256 indexed id, address indexed bettor, uint256 amount);
    
    constructor(address _oracle) {
        oracle = _oracle;
    }
    
    function createMarket(
        string calldata question,
        uint256 duration,
        uint256 resolutionBuffer
    ) external payable returns (uint256) {
        require(msg.value >= 0.1 ether, "Initial liquidity required");
        
        uint256 id = marketCount++;
        markets[id] = Market({
            question: question,
            endTime: block.timestamp + duration,
            resolutionDeadline: block.timestamp + duration + resolutionBuffer,
            creator: msg.sender,
            resolved: false,
            outcome: false,
            totalPool: msg.value,
            yesPool: msg.value / 2,
            noPool: msg.value / 2
        });
        
        emit MarketCreated(id, question, block.timestamp + duration);
        return id;
    }
    
    function bet(uint256 marketId, bool betYes) external payable nonReentrant {
        Market storage market = markets[marketId];
        require(block.timestamp < market.endTime, "Market closed");
        require(msg.value > 0, "Must bet something");
        
        uint256 fee = (msg.value * FEE_BPS) / 10000;
        uint256 betAmount = msg.value - fee;
        
        market.totalPool += betAmount;
        
        if (betYes) {
            yesBets[marketId][msg.sender] += betAmount;
            market.yesPool += betAmount;
        } else {
            noBets[marketId][msg.sender] += betAmount;
            market.noPool += betAmount;
        }
        
        emit BetPlaced(marketId, msg.sender, betYes, betAmount);
    }
    
    function resolve(uint256 marketId, bool outcome) external {
        require(msg.sender == oracle, "Only oracle");
        Market storage market = markets[marketId];
        require(block.timestamp >= market.endTime, "Not ended");
        require(block.timestamp <= market.resolutionDeadline, "Resolution expired");
        require(!market.resolved, "Already resolved");
        
        market.resolved = true;
        market.outcome = outcome;
        
        emit MarketResolved(marketId, outcome);
    }
    
    function claim(uint256 marketId) external nonReentrant {
        Market memory market = markets[marketId];
        require(market.resolved, "Not resolved");
        
        uint256 userBet;
        uint256 winningPool;
        uint256 losingPool;
        
        if (market.outcome) {
            userBet = yesBets[marketId][msg.sender];
            winningPool = market.yesPool;
            losingPool = market.noPool;
            yesBets[marketId][msg.sender] = 0;
        } else {
            userBet = noBets[marketId][msg.sender];
            winningPool = market.noPool;
            losingPool = market.yesPool;
            noBets[marketId][msg.sender] = 0;
        }
        
        require(userBet > 0, "Nothing to claim");
        
        // Payout = user's share of winning pool + proportional share of losing pool
        uint256 payout = userBet + (userBet * losingPool) / winningPool;
        
        payable(msg.sender).transfer(payout);
        emit WinningsClaimed(marketId, msg.sender, payout);
    }
    
    function getOdds(uint256 marketId) external view returns (uint256 yesOdds, uint256 noOdds) {
        Market memory m = markets[marketId];
        uint256 total = m.yesPool + m.noPool;
        yesOdds = (m.yesPool * 10000) / total; // Basis points
        noOdds = (m.noPool * 10000) / total;
    }
}
```

## Common Gotchas

1. **Resolution Edge Cases**: What if event is cancelled? Need INVALID outcome
2. **Time Zones**: Use UTC, be specific in question
3. **Ambiguous Questions**: "ETH > 5000" - at what time exactly?
4. **Oracle Latency**: Resolution data may not be immediate
5. **Liquidity**: Thin markets have high slippage

## Real-World Applications

- Polymarket (crypto, politics, sports)
- Augur (decentralized)
- Gnosis (conditional tokens)
- Metaculus (forecasting)
- Kalshi (regulated US)

## Builder Checklist

- [ ] Clear, unambiguous market questions
- [ ] Defined resolution criteria
- [ ] Trustworthy oracle mechanism
- [ ] Dispute resolution period
- [ ] Fee structure for sustainability
- [ ] Handle INVALID outcomes
- [ ] Prevent front-running
- [ ] Events for all actions
