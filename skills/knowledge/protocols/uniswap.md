# Uniswap Protocol

## Overview

Uniswap is the pioneering decentralized exchange (DEX) that popularized the Automated Market Maker (AMM) model. It enables trustless token swaps without order books, using liquidity pools and mathematical formulas to determine prices.

## Protocol Versions

### Uniswap V2 (2020)
- **Formula**: x * y = k (constant product)
- **Pools**: ERC-20 / ERC-20 pairs
- **Features**: Flash swaps, price oracles (TWAP)
- **Still Used**: Many forks (SushiSwap, PancakeSwap)

### Uniswap V3 (2021)
- **Formula**: Concentrated liquidity
- **Innovation**: LPs choose price ranges
- **Efficiency**: Up to 4000x capital efficiency
- **Complexity**: More sophisticated LP management

### Uniswap V4 (2024)
- **Architecture**: Singleton contract (all pools in one)
- **Hooks**: Custom logic at swap points
- **Features**: Native ETH, flash accounting
- **Gas**: Significantly cheaper multi-hop swaps

## Key Concepts

### Liquidity Providing

```solidity
// V2 Style: Provide equal value of both tokens
function addLiquidity(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
) external returns (uint amountA, uint amountB, uint liquidity);

// V3 Style: Provide liquidity within price range
function mint(MintParams calldata params) external returns (
    uint256 tokenId,
    uint128 liquidity,
    uint256 amount0,
    uint256 amount1
);

struct MintParams {
    address token0;
    address token1;
    uint24 fee;
    int24 tickLower;  // Lower price bound
    int24 tickUpper;  // Upper price bound
    uint256 amount0Desired;
    uint256 amount1Desired;
    uint256 amount0Min;
    uint256 amount1Min;
    address recipient;
    uint256 deadline;
}
```

### Swapping

```solidity
// V2: Simple swap with path
function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
) external returns (uint[] memory amounts);

// V3: Exact input single swap
function exactInputSingle(ExactInputSingleParams calldata params) 
    external payable returns (uint256 amountOut);

struct ExactInputSingleParams {
    address tokenIn;
    address tokenOut;
    uint24 fee;
    address recipient;
    uint256 amountIn;
    uint256 amountOutMinimum;
    uint160 sqrtPriceLimitX96;
}
```

### V4 Hooks Pattern

```solidity
// V4 allows custom logic at key points
interface IHooks {
    function beforeInitialize(...) external returns (bytes4);
    function afterInitialize(...) external returns (bytes4);
    function beforeAddLiquidity(...) external returns (bytes4);
    function afterAddLiquidity(...) external returns (bytes4);
    function beforeRemoveLiquidity(...) external returns (bytes4);
    function afterRemoveLiquidity(...) external returns (bytes4);
    function beforeSwap(...) external returns (bytes4, BeforeSwapDelta, uint24);
    function afterSwap(...) external returns (bytes4, int128);
}

// Example: Dynamic fee hook
function beforeSwap(...) external returns (bytes4, BeforeSwapDelta, uint24) {
    uint24 dynamicFee = calculateFeeBasedOnVolatility();
    return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, dynamicFee);
}
```

## Security Considerations

### Price Manipulation
```
NEVER use getReserves() or spot price for value calculations
Attackers can manipulate with flash loans

Solution: Use Uniswap TWAPs or Chainlink oracles
```

### Slippage Protection
```solidity
// Always set amountOutMin based on expected price
uint256 expectedOut = quoter.quoteExactInputSingle(params);
uint256 minOut = expectedOut * 995 / 1000; // 0.5% slippage
```

### Sandwich Attacks
```
1. Attacker sees your swap in mempool
2. Front-runs with buy → raises price
3. Your swap executes at worse rate
4. Attacker sells → profits

Mitigation: Private mempools, MEV protection (Flashbots)
```

## Integration Patterns

### Using the Router
```solidity
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

ISwapRouter public immutable swapRouter;

function swapExactInputSingle(uint256 amountIn) external returns (uint256 amountOut) {
    IERC20(tokenIn).approve(address(swapRouter), amountIn);
    
    ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
        tokenIn: DAI,
        tokenOut: WETH,
        fee: 3000, // 0.3%
        recipient: msg.sender,
        deadline: block.timestamp,
        amountIn: amountIn,
        amountOutMinimum: 0, // Set properly in production!
        sqrtPriceLimitX96: 0
    });
    
    amountOut = swapRouter.exactInputSingle(params);
}
```

### Using the Quoter
```solidity
import "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";

function getQuote(uint256 amountIn) external returns (uint256 amountOut) {
    (amountOut, , , ) = quoter.quoteExactInputSingle(
        IQuoterV2.QuoteExactInputSingleParams({
            tokenIn: DAI,
            tokenOut: WETH,
            fee: 3000,
            amountIn: amountIn,
            sqrtPriceLimitX96: 0
        })
    );
}
```

## Fee Tiers (V3/V4)

| Fee Tier | Use Case |
|----------|----------|
| 0.01% (100) | Stable pairs (USDC/USDT) |
| 0.05% (500) | Correlated pairs (ETH/stETH) |
| 0.3% (3000) | Standard pairs (ETH/USDC) |
| 1% (10000) | Exotic pairs (low liquidity) |

## Resources

- [Uniswap V3 Docs](https://docs.uniswap.org/)
- [V3 Whitepaper](https://uniswap.org/whitepaper-v3.pdf)
- [V4 Docs](https://docs.uniswapfoundation.org/)
