# Aave Protocol

## Overview

Aave is the leading decentralized lending protocol, enabling users to deposit assets to earn interest and borrow assets by providing collateral. It pioneered flash loans and introduced innovative features like credit delegation and efficiency mode (eMode).

## Core Mechanics

### Supplying Assets
```solidity
// 1. Approve the Pool to spend your tokens
IERC20(asset).approve(address(pool), amount);

// 2. Supply to the pool
pool.supply(asset, amount, onBehalfOf, referralCode);

// You receive aTokens representing your deposit
// aTokens automatically accrue interest (rebasing)
```

### Borrowing Assets
```solidity
// Borrow against your collateral
// interestRateMode: 1 = stable, 2 = variable
pool.borrow(asset, amount, interestRateMode, referralCode, onBehalfOf);

// Interest accrues on your debt
// Must maintain health factor > 1 to avoid liquidation
```

### Repaying Debt
```solidity
// Approve the pool for the debt token
IERC20(debtAsset).approve(address(pool), amountToRepay);

// Repay the loan
pool.repay(asset, amount, interestRateMode, onBehalfOf);

// Use type(uint256).max to repay entire debt
```

## Key Concepts

### Health Factor

```
Health Factor = (Total Collateral in ETH × Liquidation Threshold) / Total Borrows in ETH

HF > 1: Position is safe
HF = 1: Liquidation threshold
HF < 1: Position can be liquidated
```

```solidity
// Check health factor before any action
(, , , , , uint256 healthFactor) = pool.getUserAccountData(user);
require(healthFactor > 1e18, "Position unhealthy");
```

### Liquidation

```solidity
// Anyone can liquidate unhealthy positions
// Liquidator repays debt, receives collateral + bonus

function liquidationCall(
    address collateralAsset,
    address debtAsset,
    address user,
    uint256 debtToCover,
    bool receiveAToken
) external;

// Liquidation bonus is typically 5-10%
// Covers up to 50% of debt in single liquidation
```

### Flash Loans

```solidity
// Borrow without collateral, repay in same transaction
// Fee: 0.09% of borrowed amount

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

contract MyFlashLoan is IFlashLoanSimpleReceiver {
    IPool public pool;
    
    function executeFlashLoan(address asset, uint256 amount) external {
        pool.flashLoanSimple(
            address(this),
            asset,
            amount,
            abi.encode(/* params */),
            0 // referralCode
        );
    }
    
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // Your arbitrage/liquidation logic here
        
        // Must repay: amount + premium
        uint256 amountOwed = amount + premium;
        IERC20(asset).approve(address(pool), amountOwed);
        
        return true;
    }
}
```

### Efficiency Mode (eMode)

```solidity
// eMode allows higher LTV for correlated assets
// e.g., stETH/ETH can have 97% LTV instead of 80%

// Set user's eMode category
pool.setUserEMode(categoryId);

// Categories:
// 1 = Stablecoins (USDC, USDT, DAI)
// 2 = ETH correlated (ETH, wstETH, rETH)
```

## Integration Patterns

### Supply and Borrow
```solidity
import "@aave/v3-core/contracts/interfaces/IPool.sol";
import "@aave/v3-core/contracts/interfaces/IPoolAddressesProvider.sol";

contract AaveIntegration {
    IPool public immutable pool;
    
    constructor(address provider) {
        pool = IPool(IPoolAddressesProvider(provider).getPool());
    }
    
    function supplyAndBorrow(
        address supplyAsset,
        uint256 supplyAmount,
        address borrowAsset,
        uint256 borrowAmount
    ) external {
        // Supply collateral
        IERC20(supplyAsset).transferFrom(msg.sender, address(this), supplyAmount);
        IERC20(supplyAsset).approve(address(pool), supplyAmount);
        pool.supply(supplyAsset, supplyAmount, address(this), 0);
        
        // Borrow
        pool.borrow(borrowAsset, borrowAmount, 2, 0, address(this));
        
        // Send borrowed tokens to user
        IERC20(borrowAsset).transfer(msg.sender, borrowAmount);
    }
}
```

### Getting User Data
```solidity
function getUserData(address user) external view returns (
    uint256 totalCollateralBase,
    uint256 totalDebtBase,
    uint256 availableBorrowsBase,
    uint256 currentLiquidationThreshold,
    uint256 ltv,
    uint256 healthFactor
) {
    return pool.getUserAccountData(user);
}
```

## Risk Parameters

| Parameter | Description |
|-----------|-------------|
| LTV (Loan-to-Value) | Max borrow against collateral (e.g., 80%) |
| Liquidation Threshold | HF level triggering liquidation (e.g., 85%) |
| Liquidation Bonus | Bonus to liquidators (e.g., 5%) |
| Reserve Factor | Protocol fee on interest (e.g., 10%) |

## Security Considerations

### Oracle Dependency
- Aave uses Chainlink oracles
- Price manipulation doesn't work due to TWAP
- But stale oracles can still cause issues

### Interest Rate Attacks
- Utilization-based rates can spike
- Attackers can temporarily increase borrow rates
- Monitor utilization in your strategies

### Governance Risks
- Parameter changes can affect positions
- Time-locks provide some protection

## Addresses (Ethereum Mainnet)

> **Verified**: Addresses confirmed via [Blockscout](https://eth.blockscout.com/) (Jan 2026)

```solidity
// Aave V3 on Ethereum
PoolAddressesProvider: 0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e
Pool: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
AaveOracle: 0x54586bE62E3c3580375aE3723C145253060Ca0C2
```

## Resources

- [Aave V3 Docs](https://docs.aave.com/)
- [Risk Parameters](https://docs.aave.com/risk/)
- [Developer Portal](https://docs.aave.com/developers/)
