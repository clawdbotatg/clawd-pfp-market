# Composability & Ecosystem Patterns

## What is Composability?

Composability is Ethereum's superpower: **any contract can interact with any other contract**.

```
┌─────────────────────────────────────────────────────────────────┐
│ "MONEY LEGOS"                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Traditional Finance:      │  Ethereum DeFi:                     │
│                           │                                     │
│ Bank A ──X── Bank B       │  Uniswap ←→ Aave ←→ Compound       │
│ (walled gardens)          │  (open, permissionless)            │
│                           │                                     │
│ Need partnerships,        │  Just call the contract!           │
│ APIs, legal agreements    │  No permission needed.             │
│                           │                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Why Composability Matters

### Flash Loans: The Ultimate Example

Flash loans only exist because of composability:

```solidity
function executeFlashLoan() external {
    // 1. Borrow 1M USDC from Aave (no collateral!)
    aave.flashLoan(address(this), USDC, 1_000_000e6, "");
}

function executeOperation(
    address asset,
    uint256 amount,
    uint256 premium,
    bytes calldata
) external returns (bool) {
    // 2. Use borrowed USDC across ANY protocol
    
    // Swap on Uniswap
    uniswap.swap(USDC, ETH, amount);
    
    // Deposit to Compound
    compound.supply(ETH, balance);
    
    // Arbitrage on Curve
    curve.exchange(...);
    
    // 3. Repay loan + fee (must happen or tx reverts)
    IERC20(USDC).approve(address(aave), amount + premium);
    return true;
}
// All happens in ONE atomic transaction!
```

### Yield Aggregators

```
Yearn/Beefy Strategy:

1. Accept user deposits
2. Deploy to highest-yield protocol
   ├── Aave (lending)
   ├── Compound (lending)
   ├── Curve (LP + rewards)
   └── Convex (boosted Curve)
3. Auto-compound rewards
4. Rebalance as yields change

One contract, composing MANY protocols.
```

## Building Composable Protocols

### Design Principle: Be Callable

```solidity
// COMPOSABLE: External functions, standard interfaces
contract GoodVault is IERC4626 {
    function deposit(uint256 assets, address receiver) 
        external returns (uint256 shares) 
    {
        // Standard interface = easy integration
    }
    
    function redeem(uint256 shares, address receiver, address owner)
        external returns (uint256 assets)
    {
        // Any protocol can call this
    }
}

// NOT COMPOSABLE: Custom interfaces, hard to integrate
contract BadVault {
    function myCustomDepositFunction(
        uint256 amount,
        bool someFlag,
        bytes32 secretCode
    ) external onlyWhitelisted {
        // Hard for other protocols to use
    }
}
```

### Design Principle: Use Standards

```solidity
// ERC-20: Fungible tokens
// ERC-721: NFTs
// ERC-1155: Multi-token
// ERC-4626: Vaults

// Using standards means automatic composability:
// - Wallets understand your tokens
// - DEXes can trade them
// - Other protocols can integrate
```

### Design Principle: Emit Events

```solidity
// Events enable off-chain composability
event Deposit(address indexed user, uint256 amount);
event Withdraw(address indexed user, uint256 amount);
event Liquidation(address indexed user, address indexed liquidator, uint256 debt);

// External systems (keepers, UIs, analytics) can:
// - Index your protocol
// - React to state changes
// - Build on top of your data
```

## Common Composability Patterns

### Pattern 1: Protocol Wrappers

```solidity
// Wrap external protocols to add features
contract AaveWithLimits {
    IAavePool public immutable aave;
    
    function depositWithLimit(
        address asset,
        uint256 amount,
        uint256 maxLTV
    ) external {
        // Add custom logic around Aave
        require(getCurrentLTV() <= maxLTV, "LTV too high");
        
        // Compose with Aave
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        IERC20(asset).approve(address(aave), amount);
        aave.supply(asset, amount, msg.sender, 0);
    }
}
```

### Pattern 2: Aggregators

```solidity
// Combine multiple protocols for best outcome
contract DEXAggregator {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // Check prices across DEXes
        uint256 uniswapOut = uniswap.getAmountOut(tokenIn, tokenOut, amountIn);
        uint256 sushiOut = sushi.getAmountOut(tokenIn, tokenOut, amountIn);
        uint256 curveOut = curve.getAmountOut(tokenIn, tokenOut, amountIn);
        
        // Route to best price
        if (uniswapOut >= sushiOut && uniswapOut >= curveOut) {
            return _swapOnUniswap(tokenIn, tokenOut, amountIn);
        } else if (sushiOut >= curveOut) {
            return _swapOnSushi(tokenIn, tokenOut, amountIn);
        } else {
            return _swapOnCurve(tokenIn, tokenOut, amountIn);
        }
    }
}
```

### Pattern 3: Building Blocks

```solidity
// Create new primitives by combining existing ones
contract LeveragedYield {
    // Combine: Lending + Yield Farming
    
    function openPosition(uint256 amount) external {
        // 1. Deposit collateral to Aave
        aave.supply(WETH, amount);
        
        // 2. Borrow stablecoins against it
        aave.borrow(USDC, amount * 70 / 100); // 70% LTV
        
        // 3. Deploy borrowed funds to yield farm
        farm.deposit(USDC, borrowed);
        
        // Result: Leveraged yield farming
    }
}
```

## When to Build vs. Compose

```
┌─────────────────────────────────────────────────────────────────┐
│ BUILD YOUR OWN WHEN:                                            │
├─────────────────────────────────────────────────────────────────┤
│ • Existing solutions don't fit your needs                       │
│ • You need custom logic/parameters                              │
│ • Security requirements demand full control                     │
│ • Gas optimization is critical                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ COMPOSE EXISTING WHEN:                                          │
├─────────────────────────────────────────────────────────────────┤
│ • Battle-tested code reduces risk                               │
│ • Faster time to market                                         │
│ • Leverage existing liquidity/users                             │
│ • Standard interface = easy integration                         │
└─────────────────────────────────────────────────────────────────┘
```

## Composability Risks

### 1. Dependency Risk
```
Your protocol depends on Aave.
Aave depends on Chainlink oracles.
Chainlink depends on node operators.

Bug in ANY layer = your protocol affected.
```

### 2. Upgrade Risk
```solidity
// External protocol upgrades can break your integration
// If Aave changes their interface:

// Before upgrade:
aave.deposit(asset, amount, onBehalfOf, referralCode);

// After upgrade:
aave.supply(asset, amount, onBehalfOf, referralCode);
// Your contract is now broken!
```

### 3. Reentrancy Across Protocols
```solidity
// VULNERABLE: Calling untrusted external contracts
function interact(address protocol, bytes calldata data) external {
    // This could call back into your contract!
    protocol.call(data);
}

// SAFE: Use reentrancy guards
function interact(address protocol, bytes calldata data) 
    external 
    nonReentrant 
{
    protocol.call(data);
}
```

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ COMPOSABILITY PRINCIPLES                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Use standard interfaces (ERC-20, ERC-4626, etc.)             │
│ 2. Make functions external and permissionless where possible    │
│ 3. Emit events for off-chain composability                      │
│ 4. Understand your dependency chain                             │
│ 5. Plan for external protocol changes                           │
│ 6. Always use reentrancy protection                             │
│                                                                 │
│ Composability is a superpower, but dependencies are risks.      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
