# Compound Protocol

## Overview

Compound is a foundational DeFi lending protocol that pioneered the cToken model. Users deposit assets and receive cTokens representing their deposit plus accrued interest. Compound V3 (Comet) introduced a simpler single-asset borrowing model.

## Compound V2 (cToken Model)

### Core Mechanics

```
Deposit ETH → Receive cETH
cETH balance stays same, but exchange rate increases
When you redeem, you get more ETH than deposited
```

### Supplying Assets
```solidity
// 1. Get the cToken contract
CErc20 cToken = CErc20(cTokenAddress);

// 2. Approve underlying
underlying.approve(cTokenAddress, amount);

// 3. Mint cTokens
uint mintResult = cToken.mint(amount);
require(mintResult == 0, "Mint failed");

// For ETH:
CEther cEth = CEther(cEthAddress);
cEth.mint{value: amount}();
```

### Borrowing
```solidity
// 1. Enter markets (enable as collateral)
address[] memory markets = new address[](1);
markets[0] = cTokenAddress;
comptroller.enterMarkets(markets);

// 2. Borrow
uint borrowResult = cToken.borrow(borrowAmount);
require(borrowResult == 0, "Borrow failed");
```

### Exchange Rate

```solidity
// cToken exchange rate increases over time as interest accrues
// exchangeRate = (totalCash + totalBorrows - totalReserves) / totalSupply

uint exchangeRate = cToken.exchangeRateCurrent();

// Your underlying balance:
uint underlyingBalance = cTokenBalance * exchangeRate / 1e18;

// Redeem underlying:
cToken.redeemUnderlying(amount);
// or redeem cTokens:
cToken.redeem(cTokenAmount);
```

## Compound V3 (Comet)

### Key Differences from V2
- Single borrowable asset per deployment (USDC, WETH)
- Multiple collateral assets
- No more cTokens for suppliers
- Simpler accounting model
- Better capital efficiency

### Supplying
```solidity
IComet comet = IComet(cometAddress);

// Supply collateral (doesn't earn interest in V3)
IERC20(collateral).approve(cometAddress, amount);
comet.supply(collateral, amount);

// Supply base asset (earns interest)
IERC20(baseAsset).approve(cometAddress, amount);
comet.supply(baseAsset, amount);
```

### Borrowing
```solidity
// After supplying collateral, borrow base asset
comet.withdraw(baseAsset, borrowAmount);

// Your balance can be negative (debt)
int104 balance = comet.userBasic(user).principal;
```

### Liquidation
```solidity
// V3 uses "absorb" for liquidation
// Protocol takes collateral, liquidator can buy at discount

// Absorb unhealthy account
comet.absorb(address(this), [unhealthyUser]);

// Buy collateral at discount
comet.buyCollateral(
    collateralAsset,
    minAmount,
    baseAmount,
    recipient
);
```

## Integration Patterns

### Compound V2 Integration
```solidity
interface CErc20 {
    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function exchangeRateCurrent() external returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);
}

interface Comptroller {
    function enterMarkets(address[] calldata) external returns (uint[] memory);
    function getAccountLiquidity(address) external view returns (uint, uint, uint);
}

contract CompoundV2Integration {
    Comptroller public comptroller;
    CErc20 public cUsdc;
    
    function supplyAndBorrow(uint supplyAmount, uint borrowAmount) external {
        // Supply
        IERC20(usdc).transferFrom(msg.sender, address(this), supplyAmount);
        IERC20(usdc).approve(address(cUsdc), supplyAmount);
        require(cUsdc.mint(supplyAmount) == 0, "Mint failed");
        
        // Enter market
        address[] memory markets = new address[](1);
        markets[0] = address(cUsdc);
        comptroller.enterMarkets(markets);
        
        // Borrow
        require(cUsdc.borrow(borrowAmount) == 0, "Borrow failed");
        IERC20(usdc).transfer(msg.sender, borrowAmount);
    }
}
```

### Compound V3 Integration
```solidity
interface IComet {
    function supply(address asset, uint amount) external;
    function withdraw(address asset, uint amount) external;
    function getCollateralReserves(address asset) external view returns (uint);
    function isLiquidatable(address account) external view returns (bool);
    function absorb(address absorber, address[] calldata accounts) external;
    function buyCollateral(address asset, uint minAmount, uint baseAmount, address recipient) external;
}

contract CompoundV3Integration {
    IComet public comet;
    IERC20 public baseAsset;
    IERC20 public weth;
    
    function leveragedPosition(uint collateralAmount, uint borrowAmount) external {
        // Supply WETH as collateral
        weth.transferFrom(msg.sender, address(this), collateralAmount);
        weth.approve(address(comet), collateralAmount);
        comet.supply(address(weth), collateralAmount);
        
        // Borrow USDC
        comet.withdraw(address(baseAsset), borrowAmount);
        baseAsset.transfer(msg.sender, borrowAmount);
    }
}
```

## Key Differences: Compound vs Aave

| Feature | Compound V2 | Compound V3 | Aave V3 |
|---------|-------------|-------------|---------|
| Token Model | cTokens | Balance tracking | aTokens |
| Multi-asset Borrow | Yes | No | Yes |
| Flash Loans | Limited | No | Yes |
| Interest Model | Utilization | Utilization | Utilization |
| Governance | COMP | COMP | AAVE |

## Security Considerations

### Oracle Manipulation
- Compound uses Chainlink/custom oracles
- Historical issues with oracle attacks (2020)
- Verify price feed freshness

### Utilization Spikes
- High utilization = high borrow rates
- Can't withdraw when utilization at 100%
- Monitor before large withdrawals

### Governance Risks
- COMP holders control parameters
- Time-locks provide protection

## Addresses (Ethereum Mainnet)

> **Verified**: Addresses confirmed via [Blockscout](https://eth.blockscout.com/) (Jan 2026)

```solidity
// Compound V2
Comptroller: 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B
cETH: 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5
cUSDC: 0x39AA39c021dfbaE8faC545936693aC917d5E7563

// Compound V3 (USDC)
Comet USDC: 0xc3d688B66703497DAA19211EEdff47f25384cdc3
```

## Resources

- [Compound Docs](https://docs.compound.finance/)
- [Compound V3 Docs](https://docs.compound.finance/v3/)
- [Risk Parameters](https://compound.finance/markets)
