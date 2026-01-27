# Challenge 7: Stablecoins

## TLDR

Build a stablecoin system where tokens maintain a stable price (usually pegged to $1 USD). This challenge teaches collateralization, redemption mechanisms, and price stability algorithms. Understand the differences between **collateralized** (MakerDAO, USDC), **algorithmic** (FRAX), and **hybrid** approaches.

## Core Concepts

### Stablecoin Types

```
┌─────────────────────────────────────────────────────────────────┐
│ STABLECOIN CLASSIFICATION                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. FIAT-BACKED (Centralized)                                    │
│    • USDC, USDT, BUSD                                           │
│    • 1:1 reserves in bank accounts                              │
│    • Centralized issuer, censorship risk                        │
│                                                                 │
│ 2. CRYPTO-COLLATERALIZED (Decentralized)                        │
│    • DAI (MakerDAO), LUSD (Liquity)                             │
│    • Over-collateralized with ETH/crypto                        │
│    • Trustless, but capital inefficient                         │
│                                                                 │
│ 3. ALGORITHMIC                                                  │
│    • Ampleforth (rebasing)                                      │
│    • Expand/contract supply algorithmically                     │
│    • Risky - UST/LUNA collapse                                  │
│                                                                 │
│ 4. HYBRID                                                       │
│    • FRAX (partial collateral + algorithmic)                    │
│    • Balance between capital efficiency and stability           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Mechanics

#### Crypto-Collateralized Stablecoin (MakerDAO-style)

1. **Minting Stablecoins**
   ```solidity
   uint256 public constant COLLATERAL_RATIO = 15000; // 150%
   
   mapping(address => uint256) public collateral; // ETH deposited
   mapping(address => uint256) public debt; // Stablecoin minted
   
   function mintStablecoin(uint256 amount) external {
       uint256 collateralValue = getCollateralValue(msg.sender);
       uint256 newDebt = debt[msg.sender] + amount;
       
       // Check collateral ratio remains above minimum
       uint256 requiredCollateral = (newDebt * COLLATERAL_RATIO) / 10000;
       require(collateralValue >= requiredCollateral, "Undercollateralized");
       
       debt[msg.sender] = newDebt;
       stablecoin.mint(msg.sender, amount);
       
       emit Minted(msg.sender, amount);
   }
   ```

2. **Burning/Repaying**
   ```solidity
   function burnStablecoin(uint256 amount) external {
       require(debt[msg.sender] >= amount, "Exceeds debt");
       
       debt[msg.sender] -= amount;
       stablecoin.burnFrom(msg.sender, amount);
       
       emit Burned(msg.sender, amount);
   }
   
   function withdrawCollateral(uint256 amount) external {
       collateral[msg.sender] -= amount;
       
       // Verify still collateralized after withdrawal
       if (debt[msg.sender] > 0) {
           uint256 collateralValue = getCollateralValue(msg.sender);
           uint256 requiredCollateral = (debt[msg.sender] * COLLATERAL_RATIO) / 10000;
           require(collateralValue >= requiredCollateral, "Would undercollateralize");
       }
       
       payable(msg.sender).transfer(amount);
   }
   ```

3. **Redemption Mechanism (Liquity-style)**
   ```solidity
   // Anyone can redeem stablecoins for collateral at face value
   // This creates a price floor
   function redeem(uint256 stablecoinAmount) external {
       require(stablecoin.balanceOf(msg.sender) >= stablecoinAmount, "Insufficient balance");
       
       // Calculate ETH to receive at $1 per stablecoin
       uint256 ethPrice = getEthPrice();
       uint256 ethAmount = (stablecoinAmount * 1e18) / ethPrice;
       
       // Deduct redemption fee (e.g., 0.5%)
       uint256 fee = (ethAmount * 50) / 10000;
       uint256 ethToSend = ethAmount - fee;
       
       // Burn stablecoins
       stablecoin.burnFrom(msg.sender, stablecoinAmount);
       
       // Send ETH from protocol reserves (riskiest positions first)
       sendEthFromRiskiestVaults(ethToSend);
       
       emit Redeemed(msg.sender, stablecoinAmount, ethToSend);
   }
   ```

### Price Stability Mechanisms

#### Mechanism 1: Arbitrage (Crypto-Collateralized)
```
When stablecoin trades ABOVE $1:
  → Mint new stablecoins (get $1+ for $1 of collateral)
  → Sell on market
  → Price pushed back to $1

When stablecoin trades BELOW $1:
  → Buy cheap stablecoins on market
  → Redeem for $1 of collateral
  → Price pushed back to $1
```

#### Mechanism 2: Interest Rate Adjustment
```solidity
// If price > $1: Lower rates → more minting → more supply
// If price < $1: Raise rates → more burning → less supply

function adjustStabilityFee() external {
    uint256 currentPrice = getStablecoinPrice();
    
    if (currentPrice > 1.01e18) { // > $1.01
        stabilityFee = stabilityFee > 10 ? stabilityFee - 10 : 0;
    } else if (currentPrice < 0.99e18) { // < $0.99
        stabilityFee += 10;
    }
}
```

#### Mechanism 3: Peg Stability Module (PSM)
```solidity
// Direct 1:1 swaps with fiat stablecoins (USDC)
contract PegStabilityModule {
    IERC20 public usdc;
    IStablecoin public dai;
    
    function sellUSDC(uint256 amount) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        dai.mint(msg.sender, amount * 1e12); // USDC 6 decimals → DAI 18
    }
    
    function buyUSDC(uint256 amount) external {
        dai.burnFrom(msg.sender, amount * 1e12);
        usdc.transfer(msg.sender, amount);
    }
}
```

## Security Considerations

### Critical Risks

1. **Oracle Manipulation**
   - If ETH price oracle is manipulated, users mint unbacked stablecoins
   - Solution: Use Chainlink, implement delays, multiple oracle sources

2. **Black Swan Events**
   - Rapid ETH price crash → cascade of liquidations
   - Solution: Emergency shutdown mechanisms, stability pools

3. **Governance Attacks**
   - Changing collateral ratios maliciously
   - Solution: Time-locks, multi-sig, decentralized voting

4. **Bank Run / Death Spiral**
   ```
   Price drops → Users panic sell → More price drop → Liquidations
   → Fire sale of collateral → ETH price drops → More liquidations
   ```

### Stability Pool (Liquity Innovation)
```solidity
contract StabilityPool {
    mapping(address => uint256) public deposits; // Stablecoin deposits
    
    // Depositors provide stablecoins to absorb liquidations
    function deposit(uint256 amount) external {
        stablecoin.transferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
    }
    
    // When liquidation occurs, pool absorbs debt, gets collateral
    function offset(uint256 debt, uint256 collateral) external onlyLiquidationContract {
        totalDeposits -= debt;
        totalCollateral += collateral;
        // Depositors' stablecoin is burned, but they gain ETH
    }
}
```

## Code Patterns

### Complete Stablecoin System
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract StableCoin is ERC20 {
    address public minter;
    
    constructor() ERC20("DecentralizedUSD", "DUSD") {
        minter = msg.sender;
    }
    
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Only minter");
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external {
        require(msg.sender == minter, "Only minter");
        _burn(from, amount);
    }
}

contract StablecoinEngine is Ownable {
    StableCoin public stablecoin;
    AggregatorV3Interface public priceFeed;
    
    uint256 public constant COLLATERAL_RATIO = 15000; // 150%
    uint256 public constant LIQUIDATION_THRESHOLD = 11000; // 110%
    uint256 public constant LIQUIDATION_BONUS = 1000; // 10%
    
    struct Vault {
        uint256 collateral;
        uint256 debt;
    }
    
    mapping(address => Vault) public vaults;
    
    event VaultOpened(address indexed user, uint256 collateral, uint256 debt);
    event VaultClosed(address indexed user);
    event Liquidated(address indexed user, address indexed liquidator);
    
    constructor(address _priceFeed) {
        stablecoin = new StableCoin();
        priceFeed = AggregatorV3Interface(_priceFeed);
    }
    
    function depositCollateral() external payable {
        vaults[msg.sender].collateral += msg.value;
    }
    
    function mintStablecoin(uint256 amount) external {
        Vault storage vault = vaults[msg.sender];
        uint256 newDebt = vault.debt + amount;
        
        uint256 collateralValue = (vault.collateral * getPrice()) / 1e18;
        uint256 requiredCollateral = (newDebt * COLLATERAL_RATIO) / 10000;
        
        require(collateralValue >= requiredCollateral, "Undercollateralized");
        
        vault.debt = newDebt;
        stablecoin.mint(msg.sender, amount);
    }
    
    function repay(uint256 amount) external {
        Vault storage vault = vaults[msg.sender];
        require(vault.debt >= amount, "Repaying too much");
        
        vault.debt -= amount;
        stablecoin.burn(msg.sender, amount);
    }
    
    function withdrawCollateral(uint256 amount) external {
        Vault storage vault = vaults[msg.sender];
        require(vault.collateral >= amount, "Insufficient collateral");
        
        uint256 newCollateral = vault.collateral - amount;
        
        if (vault.debt > 0) {
            uint256 collateralValue = (newCollateral * getPrice()) / 1e18;
            uint256 requiredCollateral = (vault.debt * COLLATERAL_RATIO) / 10000;
            require(collateralValue >= requiredCollateral, "Would undercollateralize");
        }
        
        vault.collateral = newCollateral;
        payable(msg.sender).transfer(amount);
    }
    
    function liquidate(address user) external {
        Vault storage vault = vaults[user];
        require(getHealthFactor(user) < 10000, "Vault is healthy");
        
        uint256 debt = vault.debt;
        uint256 collateralToSeize = (debt * 1e18) / getPrice();
        uint256 bonus = (collateralToSeize * LIQUIDATION_BONUS) / 10000;
        
        // Liquidator pays debt
        stablecoin.burn(msg.sender, debt);
        
        // Clear vault
        vault.debt = 0;
        vault.collateral -= (collateralToSeize + bonus);
        
        // Send collateral + bonus to liquidator
        payable(msg.sender).transfer(collateralToSeize + bonus);
        
        emit Liquidated(user, msg.sender);
    }
    
    function getPrice() public view returns (uint256) {
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(block.timestamp - updatedAt < 3600, "Stale price");
        return uint256(price) * 1e10;
    }
    
    function getHealthFactor(address user) public view returns (uint256) {
        Vault memory vault = vaults[user];
        if (vault.debt == 0) return type(uint256).max;
        
        uint256 collateralValue = (vault.collateral * getPrice()) / 1e18;
        return (collateralValue * 10000) / (vault.debt * LIQUIDATION_THRESHOLD / 10000);
    }
}
```

## Common Gotchas

1. **USDC has 6 decimals, not 18** - Always normalize
2. **Chainlink feeds have 8 decimals for USD pairs**
3. **Redemption can grief smallest vaults** - Order by risk
4. **Flash mint attacks** - Limit minting per block
5. **Governance delay needed** - Prevent rug pulls

## Real-World Applications

- MakerDAO (DAI) - Original decentralized stablecoin
- Liquity (LUSD) - 0% interest, 110% collateral
- Frax - Partially algorithmic
- Reflexer (RAI) - Floating peg, not $1

## Builder Checklist

- [ ] Reliable oracle integration (Chainlink)
- [ ] Proper collateral ratio enforcement
- [ ] Liquidation mechanism with incentives
- [ ] Price stability mechanism (redemption/PSM)
- [ ] Emergency shutdown capability
- [ ] Decimal handling for different tokens
- [ ] Events for all state changes
- [ ] Governance time-locks
