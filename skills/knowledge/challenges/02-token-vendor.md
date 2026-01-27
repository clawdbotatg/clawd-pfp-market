# Challenge 2: Token Vendor

## TLDR

Build an ERC-20 token and a vendor contract that buys/sells tokens for ETH at a fixed price. This challenge teaches the critical **approve pattern** for ERC-20 tokens - one of the most important concepts in Ethereum development. Understanding this pattern is essential for any DeFi integration.

## Core Concepts

### What You're Building
1. **ERC-20 Token**: Your own fungible token
2. **Vendor Contract**: A vending machine that:
   - Sells tokens to users for ETH
   - Buys tokens back from users for ETH
   - Maintains a token/ETH exchange rate

### The ERC-20 Approve Pattern (CRITICAL)

This is the most important concept in this challenge:

```
┌─────────────────────────────────────────────────────────────────┐
│ WHY APPROVE IS NEEDED                                           │
├─────────────────────────────────────────────────────────────────┤
│ Contracts CANNOT pull tokens from your wallet directly.         │
│ You must APPROVE them first, then they call transferFrom().     │
│                                                                 │
│ User Wallet ──approve(spender, amount)──> Token Contract        │
│ Spender Contract ──transferFrom(user, to, amount)──> Token      │
└─────────────────────────────────────────────────────────────────┘
```

**Two-Step Process**:
1. User calls `token.approve(vendorAddress, amount)` - "I allow Vendor to spend X tokens"
2. User calls `vendor.sellTokens(amount)` - Vendor uses `transferFrom()` to pull tokens

### Key Mechanics

1. **Token Contract (ERC-20)**
   ```solidity
   contract YourToken is ERC20 {
       constructor() ERC20("YourToken", "YTK") {
           _mint(msg.sender, 1000 * 10**18); // Mint initial supply
       }
   }
   ```

2. **Buying Tokens** (ETH → Tokens)
   ```solidity
   uint256 public constant tokensPerEth = 100;

   function buyTokens() public payable {
       uint256 tokenAmount = msg.value * tokensPerEth;
       require(yourToken.balanceOf(address(this)) >= tokenAmount, "Vendor empty");
       yourToken.transfer(msg.sender, tokenAmount);
       emit BuyTokens(msg.sender, msg.value, tokenAmount);
   }
   ```

3. **Selling Tokens** (Tokens → ETH) - Requires Approval!
   ```solidity
   function sellTokens(uint256 tokenAmount) public {
       require(tokenAmount > 0, "Must sell > 0");
       
       // Check allowance - user must have approved this contract
       uint256 allowance = yourToken.allowance(msg.sender, address(this));
       require(allowance >= tokenAmount, "Insufficient allowance");
       
       uint256 ethAmount = tokenAmount / tokensPerEth;
       require(address(this).balance >= ethAmount, "Vendor lacks ETH");
       
       // Pull tokens from user (requires prior approval)
       yourToken.transferFrom(msg.sender, address(this), tokenAmount);
       
       // Send ETH to user
       (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
       require(success, "ETH transfer failed");
       
       emit SellTokens(msg.sender, tokenAmount, ethAmount);
   }
   ```

## Security Considerations

### Approval Security Risks

1. **Infinite Approvals** (DANGEROUS)
   ```solidity
   // DON'T DO THIS - approving max allows contract to drain all tokens
   token.approve(spender, type(uint256).max);
   
   // DO THIS - approve only what's needed
   token.approve(spender, exactAmount);
   ```

2. **Approval Race Condition**
   - If you change approval from 100 to 50, spender could:
     1. See pending tx, quickly spend 100
     2. After your tx, spend 50 more (150 total!)
   - **Solution**: Set to 0 first, then new amount
   ```solidity
   token.approve(spender, 0);
   token.approve(spender, newAmount);
   ```

3. **Phishing Approvals**: Malicious sites trick users into approving attacker contracts

### Other Security Concerns

- **Reentrancy in sellTokens**: Always use CEI pattern
- **Price Manipulation**: Fixed price is safe; dynamic pricing needs oracle protection
- **Vendor Drainage**: Owner can withdraw, ensure proper access control

## Code Patterns

### Complete Vendor Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vendor is Ownable {
    IERC20 public yourToken;
    uint256 public constant tokensPerEth = 100;

    event BuyTokens(address indexed buyer, uint256 ethSpent, uint256 tokensReceived);
    event SellTokens(address indexed seller, uint256 tokensSold, uint256 ethReceived);

    constructor(address tokenAddress) {
        yourToken = IERC20(tokenAddress);
    }

    function buyTokens() public payable {
        require(msg.value > 0, "Send ETH to buy tokens");
        uint256 tokenAmount = msg.value * tokensPerEth;
        require(yourToken.balanceOf(address(this)) >= tokenAmount, "Vendor out of tokens");
        
        bool success = yourToken.transfer(msg.sender, tokenAmount);
        require(success, "Token transfer failed");
        
        emit BuyTokens(msg.sender, msg.value, tokenAmount);
    }

    function sellTokens(uint256 tokenAmount) public {
        require(tokenAmount > 0, "Specify tokens to sell");
        require(yourToken.allowance(msg.sender, address(this)) >= tokenAmount, "Approve tokens first");
        
        uint256 ethAmount = tokenAmount / tokensPerEth;
        require(address(this).balance >= ethAmount, "Vendor lacks ETH");

        // Pull tokens FIRST (CEI pattern)
        bool tokenSuccess = yourToken.transferFrom(msg.sender, address(this), tokenAmount);
        require(tokenSuccess, "Token transfer failed");
        
        // Then send ETH
        (bool ethSuccess, ) = payable(msg.sender).call{value: ethAmount}("");
        require(ethSuccess, "ETH transfer failed");
        
        emit SellTokens(msg.sender, tokenAmount, ethAmount);
    }

    function withdraw() public onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    receive() external payable {}
}
```

## Common Gotchas

1. **Forgetting Decimals**: ERC-20 tokens typically have 18 decimals
   - 1 token = 1e18 base units
   - `tokensPerEth = 100` means 100 * 1e18 tokens per ETH

2. **Approval Before Sell**: Users MUST approve before calling sellTokens
   - Frontend should check allowance and prompt approval

3. **Return Values**: Some tokens don't return bool on transfer
   - Use OpenZeppelin's SafeERC20 for safety

4. **Division Truncation**: `tokenAmount / tokensPerEth` truncates
   - Selling 99 tokens when tokensPerEth=100 gives 0 ETH

## Real-World Applications

- Token sales / ICOs
- Bonding curves (dynamic pricing)
- DEX router contracts
- Any contract that needs to receive tokens (lending, staking, vaults)
- Payment processors accepting token payments

## Builder Checklist

- [ ] ERC-20 token with proper decimals (18)
- [ ] Vendor holds initial token supply
- [ ] buyTokens() accepts ETH, sends tokens
- [ ] sellTokens() checks allowance, pulls tokens, sends ETH
- [ ] CEI pattern in all functions
- [ ] Events for buys and sells
- [ ] Owner withdrawal function
- [ ] Frontend prompts approval before sell
