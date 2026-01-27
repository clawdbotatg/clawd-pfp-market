# Challenge 6: Over-Collateralized Lending

## TLDR

Build a lending protocol where users deposit collateral (e.g., ETH) to borrow assets (e.g., stablecoins). Loans must be **over-collateralized** (e.g., 150%), and if collateral value drops below the threshold, anyone can **liquidate** the position. This is the foundation of DeFi protocols like Aave, Compound, and MakerDAO.

## Core Concepts

### What You're Building

```
┌─────────────────────────────────────────────────────────────────┐
│ OVER-COLLATERALIZED LENDING                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ User deposits $150 ETH as collateral                            │
│            ↓                                                    │
│ Protocol allows borrowing up to $100 (150% ratio)               │
│            ↓                                                    │
│ If ETH drops → collateral ratio falls                           │
│            ↓                                                    │
│ Below liquidation threshold → position is liquidated            │
│            ↓                                                    │
│ Liquidator repays debt, gets collateral + bonus                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Mechanics

1. **Collateral Ratio**
   ```solidity
   // Collateral Ratio = (Collateral Value / Debt Value) * 100
   // Must stay above 150% (or protocol's minimum)
   
   function getCollateralRatio(address user) public view returns (uint256) {
       uint256 collateralValue = getUserCollateralValue(user);
       uint256 debtValue = getUserDebtValue(user);
       
       if (debtValue == 0) return type(uint256).max;
       
       // Returns in basis points (15000 = 150%)
       return (collateralValue * 10000) / debtValue;
   }
   ```

2. **Depositing Collateral**
   ```solidity
   mapping(address => uint256) public collateralDeposited;
   mapping(address => uint256) public debtOwed;
   
   function depositCollateral() external payable {
       require(msg.value > 0, "Must deposit");
       collateralDeposited[msg.sender] += msg.value;
       emit CollateralDeposited(msg.sender, msg.value);
   }
   ```

3. **Borrowing**
   ```solidity
   uint256 public constant COLLATERAL_RATIO = 15000; // 150%
   
   function borrow(uint256 amount) external {
       uint256 maxBorrow = getMaxBorrowAmount(msg.sender);
       require(amount <= maxBorrow, "Exceeds max borrow");
       
       debtOwed[msg.sender] += amount;
       // Transfer borrowed tokens to user
       stablecoin.transfer(msg.sender, amount);
       
       emit Borrowed(msg.sender, amount);
   }
   
   function getMaxBorrowAmount(address user) public view returns (uint256) {
       uint256 collateralValue = getUserCollateralValue(user);
       uint256 currentDebt = debtOwed[user];
       
       // maxBorrow = (collateralValue / minCollateralRatio) - currentDebt
       uint256 maxTotal = (collateralValue * 10000) / COLLATERAL_RATIO;
       if (maxTotal <= currentDebt) return 0;
       
       return maxTotal - currentDebt;
   }
   ```

4. **Liquidation (THE KEY MECHANISM)**
   ```solidity
   uint256 public constant LIQUIDATION_THRESHOLD = 12000; // 120%
   uint256 public constant LIQUIDATION_BONUS = 500; // 5%
   
   function liquidate(address user) external {
       uint256 ratio = getCollateralRatio(user);
       require(ratio < LIQUIDATION_THRESHOLD, "Position healthy");
       
       uint256 debt = debtOwed[user];
       uint256 collateral = collateralDeposited[user];
       
       // Liquidator pays user's debt
       stablecoin.transferFrom(msg.sender, address(this), debt);
       
       // Calculate collateral to give liquidator (debt value + bonus)
       uint256 collateralToLiquidator = calculateCollateralForDebt(debt);
       collateralToLiquidator += (collateralToLiquidator * LIQUIDATION_BONUS) / 10000;
       
       // Clear user's position
       debtOwed[user] = 0;
       collateralDeposited[user] -= collateralToLiquidator;
       
       // Send collateral to liquidator
       payable(msg.sender).transfer(collateralToLiquidator);
       
       emit Liquidation(user, msg.sender, debt, collateralToLiquidator);
   }
   ```

### Interest Rate Mechanics

```solidity
// Simple interest accrual
uint256 public constant INTEREST_RATE_PER_SECOND = 1000000001547125957; // ~5% APY

mapping(address => uint256) public lastUpdate;
mapping(address => uint256) public principalDebt;

function updateDebt(address user) internal {
    uint256 elapsed = block.timestamp - lastUpdate[user];
    uint256 principal = principalDebt[user];
    
    // Compound interest: debt = principal * (1 + rate)^time
    // Simplified: debt = principal * rate^time
    debtOwed[user] = principal * (INTEREST_RATE_PER_SECOND ** elapsed) / (10**27);
    lastUpdate[user] = block.timestamp;
}
```

## Security Considerations

### Oracle Manipulation

**THE #1 RISK in lending protocols**

```solidity
// BAD: Using spot DEX price
function getPrice() internal view returns (uint256) {
    return dex.getSpotPrice(); // DANGEROUS - flashloan manipulable!
}

// GOOD: Using Chainlink oracle
function getPrice() internal view returns (uint256) {
    (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
    require(block.timestamp - updatedAt < 3600, "Stale price");
    require(price > 0, "Invalid price");
    return uint256(price);
}
```

### Liquidation Timing

- Liquidators need incentive (bonus) to act quickly
- If bonus too low → bad debt accumulates
- If bonus too high → borrowers get penalized excessively

### Flash Loan Attacks

```
Attack pattern:
1. Flash loan massive amount
2. Manipulate oracle (if using DEX)
3. Borrow against artificially high collateral
4. Oracle normalizes
5. Walk away with unbacked debt
```

**Mitigation**: Use Chainlink, implement TWAPs, add borrowing delays

### Interest Rate Model

```solidity
// Utilization-based interest (like Compound/Aave)
function getInterestRate() public view returns (uint256) {
    uint256 utilization = (totalBorrowed * 10000) / totalDeposited;
    
    if (utilization < 8000) { // Under 80% utilization
        return BASE_RATE + (utilization * SLOPE_1 / 10000);
    } else { // Over 80% - rates spike
        return BASE_RATE + KINK_RATE + ((utilization - 8000) * SLOPE_2 / 2000);
    }
}
```

## Code Patterns

### Complete Lending Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract SimpleLending is ReentrancyGuard {
    IERC20 public stablecoin;
    AggregatorV3Interface public priceFeed;
    
    mapping(address => uint256) public collateralDeposited; // ETH
    mapping(address => uint256) public debtOwed; // Stablecoin
    
    uint256 public constant MIN_COLLATERAL_RATIO = 15000; // 150%
    uint256 public constant LIQUIDATION_THRESHOLD = 12000; // 120%
    uint256 public constant LIQUIDATION_BONUS = 500; // 5%
    
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event Liquidation(address indexed user, address indexed liquidator, uint256 debt, uint256 collateral);
    
    constructor(address _stablecoin, address _priceFeed) {
        stablecoin = IERC20(_stablecoin);
        priceFeed = AggregatorV3Interface(_priceFeed);
    }
    
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Must deposit ETH");
        collateralDeposited[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    function withdraw(uint256 amount) external nonReentrant {
        require(collateralDeposited[msg.sender] >= amount, "Insufficient collateral");
        
        collateralDeposited[msg.sender] -= amount;
        
        // Check still healthy after withdrawal
        if (debtOwed[msg.sender] > 0) {
            require(getCollateralRatio(msg.sender) >= MIN_COLLATERAL_RATIO, "Would be undercollateralized");
        }
        
        payable(msg.sender).transfer(amount);
        emit Withdraw(msg.sender, amount);
    }
    
    function borrow(uint256 amount) external nonReentrant {
        uint256 maxBorrow = getMaxBorrow(msg.sender);
        require(amount <= maxBorrow, "Exceeds max borrow");
        require(stablecoin.balanceOf(address(this)) >= amount, "Insufficient liquidity");
        
        debtOwed[msg.sender] += amount;
        stablecoin.transfer(msg.sender, amount);
        
        emit Borrow(msg.sender, amount);
    }
    
    function repay(uint256 amount) external nonReentrant {
        require(debtOwed[msg.sender] >= amount, "Repaying too much");
        
        debtOwed[msg.sender] -= amount;
        stablecoin.transferFrom(msg.sender, address(this), amount);
        
        emit Repay(msg.sender, amount);
    }
    
    function liquidate(address user) external nonReentrant {
        require(getCollateralRatio(user) < LIQUIDATION_THRESHOLD, "Position healthy");
        
        uint256 debt = debtOwed[user];
        
        // Calculate collateral value of debt + bonus
        uint256 collateralValue = (debt * 1e18) / getEthPrice();
        uint256 bonus = (collateralValue * LIQUIDATION_BONUS) / 10000;
        uint256 totalCollateral = collateralValue + bonus;
        
        require(collateralDeposited[user] >= totalCollateral, "Insufficient collateral");
        
        // Liquidator pays debt
        stablecoin.transferFrom(msg.sender, address(this), debt);
        
        // Update state
        debtOwed[user] = 0;
        collateralDeposited[user] -= totalCollateral;
        
        // Send collateral to liquidator
        payable(msg.sender).transfer(totalCollateral);
        
        emit Liquidation(user, msg.sender, debt, totalCollateral);
    }
    
    function getEthPrice() public view returns (uint256) {
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(block.timestamp - updatedAt < 3600, "Stale price");
        require(price > 0, "Invalid price");
        return uint256(price) * 1e10; // Convert 8 decimals to 18
    }
    
    function getUserCollateralValue(address user) public view returns (uint256) {
        return (collateralDeposited[user] * getEthPrice()) / 1e18;
    }
    
    function getCollateralRatio(address user) public view returns (uint256) {
        if (debtOwed[user] == 0) return type(uint256).max;
        return (getUserCollateralValue(user) * 10000) / debtOwed[user];
    }
    
    function getMaxBorrow(address user) public view returns (uint256) {
        uint256 collateralValue = getUserCollateralValue(user);
        uint256 maxTotal = (collateralValue * 10000) / MIN_COLLATERAL_RATIO;
        uint256 currentDebt = debtOwed[user];
        
        if (maxTotal <= currentDebt) return 0;
        return maxTotal - currentDebt;
    }
}
```

## Common Gotchas

1. **Decimal Precision**: ETH = 18 decimals, USDC = 6 decimals, Chainlink USD = 8 decimals
2. **Oracle Staleness**: Always check `updatedAt`
3. **Liquidation Incentives**: Must be profitable for liquidators to act
4. **Flash Loan Liquidations**: Can liquidate in same tx as getting funds
5. **Bad Debt**: When collateral < debt, protocol takes loss

## Real-World Applications

- MakerDAO (DAI minting)
- Aave, Compound (money markets)
- Liquity (0% interest, 110% collateral)
- Euler (permissionless markets)

## Builder Checklist

- [ ] Use Chainlink oracles (NEVER DEX spot price)
- [ ] Implement proper decimal handling
- [ ] Set appropriate collateral ratios
- [ ] Liquidation bonus incentivizes fast liquidation
- [ ] Check oracle staleness
- [ ] ReentrancyGuard on all external functions
- [ ] Events for all state changes
- [ ] Consider interest rate model
- [ ] Handle bad debt scenarios
