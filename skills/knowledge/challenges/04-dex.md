# Challenge 4: Build a DEX

## TLDR

Build an Automated Market Maker (AMM) that enables trustless token swaps using the **constant product formula (x * y = k)**. This challenge teaches liquidity pools, reserves, pricing curves, and the mathematics behind decentralized exchanges like Uniswap.

## Core Concepts

### What You're Building
A decentralized exchange where:
- Liquidity providers (LPs) deposit token pairs
- Traders swap one token for another
- Prices are determined algorithmically by reserves
- No order books, no intermediaries

### The Constant Product Formula (x * y = k)

```
┌─────────────────────────────────────────────────────────────────┐
│ CORE FORMULA: x * y = k                                         │
├─────────────────────────────────────────────────────────────────┤
│ x = reserve of Token A                                          │
│ y = reserve of Token B                                          │
│ k = constant (product must stay same after trades)              │
│                                                                 │
│ Example: Pool has 100 ETH and 10,000 USDC                       │
│ k = 100 * 10,000 = 1,000,000                                    │
│                                                                 │
│ Swap 10 ETH in:                                                 │
│ New ETH reserve: 110                                            │
│ New USDC reserve: 1,000,000 / 110 = 9,090.9                     │
│ USDC out: 10,000 - 9,090.9 = 909.1                              │
│                                                                 │
│ Price impact: Larger trades = worse rates                       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Mechanics

1. **Adding Liquidity**
   ```solidity
   function deposit() public payable returns (uint256 tokensDeposited) {
       // First deposit sets the ratio
       if (totalLiquidity == 0) {
           totalLiquidity = address(this).balance;
           liquidity[msg.sender] = totalLiquidity;
           // Transfer tokens from user (requires approval!)
           token.transferFrom(msg.sender, address(this), msg.value);
           return msg.value;
       }
       
       // Subsequent deposits must match ratio
       uint256 ethReserve = address(this).balance - msg.value;
       uint256 tokenReserve = token.balanceOf(address(this));
       uint256 tokenAmount = (msg.value * tokenReserve) / ethReserve;
       
       token.transferFrom(msg.sender, address(this), tokenAmount);
       
       uint256 liquidityMinted = (msg.value * totalLiquidity) / ethReserve;
       liquidity[msg.sender] += liquidityMinted;
       totalLiquidity += liquidityMinted;
       
       return tokenAmount;
   }
   ```

2. **Swapping ETH for Tokens**
   ```solidity
   function ethToToken() public payable returns (uint256 tokenOutput) {
       require(msg.value > 0, "Must send ETH");
       
       uint256 ethReserve = address(this).balance - msg.value;
       uint256 tokenReserve = token.balanceOf(address(this));
       
       tokenOutput = getOutputAmount(msg.value, ethReserve, tokenReserve);
       
       token.transfer(msg.sender, tokenOutput);
       
       emit EthToTokenSwap(msg.sender, msg.value, tokenOutput);
       return tokenOutput;
   }
   ```

3. **The Output Calculation (with fees)**
   ```solidity
   function getOutputAmount(
       uint256 inputAmount,
       uint256 inputReserve,
       uint256 outputReserve
   ) public pure returns (uint256) {
       require(inputReserve > 0 && outputReserve > 0, "Invalid reserves");
       
       // 0.3% fee (multiply by 997/1000)
       uint256 inputWithFee = inputAmount * 997;
       uint256 numerator = inputWithFee * outputReserve;
       uint256 denominator = (inputReserve * 1000) + inputWithFee;
       
       return numerator / denominator;
   }
   ```

4. **Withdrawing Liquidity**
   ```solidity
   function withdraw(uint256 liquidityAmount) public returns (uint256 ethAmount, uint256 tokenAmount) {
       require(liquidity[msg.sender] >= liquidityAmount, "Insufficient liquidity");
       
       uint256 ethReserve = address(this).balance;
       uint256 tokenReserve = token.balanceOf(address(this));
       
       ethAmount = (liquidityAmount * ethReserve) / totalLiquidity;
       tokenAmount = (liquidityAmount * tokenReserve) / totalLiquidity;
       
       liquidity[msg.sender] -= liquidityAmount;
       totalLiquidity -= liquidityAmount;
       
       (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
       require(success, "ETH transfer failed");
       token.transfer(msg.sender, tokenAmount);
       
       emit LiquidityWithdrawn(msg.sender, ethAmount, tokenAmount);
   }
   ```

### Price Impact Visualization

```
Price vs Trade Size (x*y=k curve)

Token B │
        │    *
        │     *
        │      *
        │       **
        │         ***
        │            ****
        │                *******
        └────────────────────────── Token A
        
Larger trades move further along the curve = worse price
```

## Security Considerations

### Key Vulnerabilities

1. **Sandwich Attacks / Front-Running**
   - Attacker sees your pending swap
   - Buys before you → raises price
   - Your swap executes at worse rate
   - Attacker sells → pockets difference
   
   **Mitigation**: Slippage protection
   ```solidity
   function ethToToken(uint256 minTokens) public payable {
       uint256 tokenOutput = getOutputAmount(...);
       require(tokenOutput >= minTokens, "Slippage too high");
       // ...
   }
   ```

2. **Price Oracle Manipulation**
   - Don't use DEX spot price as oracle
   - Flash loans can temporarily skew prices
   
   **Solution**: Use TWAPs (Time-Weighted Average Prices)

3. **Reentrancy on Withdrawals**
   - Always update state before transfers
   - Use ReentrancyGuard

4. **First LP Manipulation**
   - First depositor can set extreme ratio
   - Consider initial liquidity bootstrapping

## Code Patterns

### Complete DEX Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DEX is ReentrancyGuard {
    IERC20 public token;
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event EthToTokenSwap(address indexed swapper, uint256 ethIn, uint256 tokensOut);
    event TokenToEthSwap(address indexed swapper, uint256 tokensIn, uint256 ethOut);
    event LiquidityProvided(address indexed provider, uint256 ethIn, uint256 tokensIn, uint256 liquidityMinted);
    event LiquidityWithdrawn(address indexed provider, uint256 ethOut, uint256 tokensOut, uint256 liquidityBurned);

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
    }

    function init(uint256 tokenAmount) public payable returns (uint256) {
        require(totalLiquidity == 0, "Already initialized");
        require(msg.value > 0 && tokenAmount > 0, "Invalid amounts");
        
        totalLiquidity = address(this).balance;
        liquidity[msg.sender] = totalLiquidity;
        
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");
        
        emit LiquidityProvided(msg.sender, msg.value, tokenAmount, totalLiquidity);
        return totalLiquidity;
    }

    function price(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) 
        public pure returns (uint256) 
    {
        require(inputReserve > 0 && outputReserve > 0, "Invalid reserves");
        uint256 inputWithFee = inputAmount * 997;
        uint256 numerator = inputWithFee * outputReserve;
        uint256 denominator = (inputReserve * 1000) + inputWithFee;
        return numerator / denominator;
    }

    function ethToToken() public payable nonReentrant returns (uint256) {
        require(msg.value > 0, "Send ETH");
        
        uint256 ethReserve = address(this).balance - msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 tokenOutput = price(msg.value, ethReserve, tokenReserve);
        
        require(token.transfer(msg.sender, tokenOutput), "Token transfer failed");
        
        emit EthToTokenSwap(msg.sender, msg.value, tokenOutput);
        return tokenOutput;
    }

    function tokenToEth(uint256 tokenInput) public nonReentrant returns (uint256) {
        require(tokenInput > 0, "Send tokens");
        
        uint256 ethReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 ethOutput = price(tokenInput, tokenReserve, ethReserve);
        
        require(token.transferFrom(msg.sender, address(this), tokenInput), "Token transfer failed");
        
        (bool success, ) = payable(msg.sender).call{value: ethOutput}("");
        require(success, "ETH transfer failed");
        
        emit TokenToEthSwap(msg.sender, tokenInput, ethOutput);
        return ethOutput;
    }

    function deposit() public payable nonReentrant returns (uint256) {
        uint256 ethReserve = address(this).balance - msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 tokenDeposit = (msg.value * tokenReserve) / ethReserve;
        uint256 liquidityMinted = (msg.value * totalLiquidity) / ethReserve;
        
        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;
        
        require(token.transferFrom(msg.sender, address(this), tokenDeposit), "Token transfer failed");
        
        emit LiquidityProvided(msg.sender, msg.value, tokenDeposit, liquidityMinted);
        return liquidityMinted;
    }

    function withdraw(uint256 amount) public nonReentrant returns (uint256, uint256) {
        require(liquidity[msg.sender] >= amount, "Insufficient liquidity");
        
        uint256 ethReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));
        
        uint256 ethAmount = (amount * ethReserve) / totalLiquidity;
        uint256 tokenAmount = (amount * tokenReserve) / totalLiquidity;
        
        liquidity[msg.sender] -= amount;
        totalLiquidity -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        require(token.transfer(msg.sender, tokenAmount), "Token transfer failed");
        
        emit LiquidityWithdrawn(msg.sender, ethAmount, tokenAmount, amount);
        return (ethAmount, tokenAmount);
    }
}
```

## Common Gotchas

1. **Reserves Include Pending Amount**: In `ethToToken`, subtract `msg.value` from balance
2. **Rounding Errors**: Division truncates; handle dust amounts
3. **First Deposit Ratio**: Sets the price forever for that pool
4. **Impermanent Loss**: LPs lose value when price diverges from deposit ratio
5. **Fee-on-Transfer Tokens**: Some tokens take fees, breaking reserve math

## Real-World Applications

- Uniswap (V2 uses x*y=k)
- SushiSwap, PancakeSwap
- Balancer (multi-asset pools)
- Curve (stable-optimized formula)
- Protocol-owned liquidity

## Builder Checklist

- [ ] Implement constant product formula
- [ ] Include 0.3% swap fee
- [ ] Add slippage protection (minOutput parameter)
- [ ] Track liquidity shares per provider
- [ ] Use ReentrancyGuard
- [ ] Emit events for all operations
- [ ] Test edge cases (empty pool, large swaps)
- [ ] Consider impermanent loss in documentation
