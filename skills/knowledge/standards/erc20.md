# ERC-20: Fungible Token Standard

> **Verified**: Interface matches [EIP-20](https://eips.ethereum.org/EIPS/eip-20) (Jan 2026)

## Overview

ERC-20 is the foundational standard for fungible tokens on Ethereum. Every unit of an ERC-20 token is identical and interchangeable, making them suitable for currencies, voting rights, staking, and more.

## Interface

```solidity
interface IERC20 {
    // Returns total token supply
    function totalSupply() external view returns (uint256);
    
    // Returns balance of an address
    function balanceOf(address account) external view returns (uint256);
    
    // Transfer tokens to recipient
    function transfer(address to, uint256 amount) external returns (bool);
    
    // Returns remaining allowance for spender
    function allowance(address owner, address spender) external view returns (uint256);
    
    // Approve spender to transfer tokens
    function approve(address spender, uint256 amount) external returns (bool);
    
    // Transfer tokens using allowance
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
```

## Critical Concepts

### Decimals

```
CRITICAL: Not all tokens have 18 decimals!

Common decimals:
- 18: ETH, DAI, LINK, UNI (most tokens)
- 8:  WBTC
- 6:  USDC, USDT
- 0:  Some NFT-like tokens

1 USDC = 1,000,000 (6 decimals)
1 DAI  = 1,000,000,000,000,000,000 (18 decimals)

ALWAYS check decimals() before calculations!
```

```solidity
// Safe way to handle different decimals
uint8 decimals = token.decimals();
uint256 oneToken = 10 ** decimals;

// Converting between tokens with different decimals
function convert(uint256 amount, uint8 fromDecimals, uint8 toDecimals) pure returns (uint256) {
    if (fromDecimals > toDecimals) {
        return amount / (10 ** (fromDecimals - toDecimals));
    } else {
        return amount * (10 ** (toDecimals - fromDecimals));
    }
}
```

### The Approve Pattern

```
CRITICAL: Contracts cannot pull tokens directly!

Two-step process required:
1. User calls token.approve(spender, amount)
2. Spender calls token.transferFrom(user, recipient, amount)
```

```solidity
// Contract that needs to receive tokens
contract TokenReceiver {
    IERC20 public token;
    
    function deposit(uint256 amount) external {
        // Check allowance (good practice)
        require(token.allowance(msg.sender, address(this)) >= amount, "Approve first");
        
        // Pull tokens from user
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
    }
}

// Frontend should prompt user to approve first:
// await token.approve(contractAddress, amount);
// await contract.deposit(amount);
```

### Approval Security Issues

```solidity
// DANGER: Infinite approval
token.approve(spender, type(uint256).max);
// Risk: If spender is compromised, they can drain ALL your tokens

// SAFE: Approve exact amount
token.approve(spender, exactAmount);

// Approval race condition:
// If you change approval from 100 to 50:
// 1. Attacker sees tx, quickly spends 100
// 2. Your tx sets approval to 50
// 3. Attacker spends 50 more (150 total!)

// Safe pattern: Set to 0 first
token.approve(spender, 0);
token.approve(spender, newAmount);
```

## Implementation

### Basic ERC-20
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") {
        _mint(msg.sender, initialSupply * 10**decimals());
    }
}
```

### ERC-20 with Mint/Burn
```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MintableToken is ERC20, Ownable {
    constructor() ERC20("Mintable", "MNT") {}
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
```

## Non-Standard Behaviors

### Fee-on-Transfer Tokens
```solidity
// Some tokens take a fee on transfer (e.g., STA, PAXG)
// Received amount < sent amount!

// BAD: Assumes full amount received
function deposit(uint256 amount) external {
    token.transferFrom(msg.sender, address(this), amount);
    balances[msg.sender] += amount; // WRONG!
}

// GOOD: Check actual received amount
function deposit(uint256 amount) external {
    uint256 balanceBefore = token.balanceOf(address(this));
    token.transferFrom(msg.sender, address(this), amount);
    uint256 received = token.balanceOf(address(this)) - balanceBefore;
    balances[msg.sender] += received;
}
```

### Tokens Without Return Values
```solidity
// Old tokens (USDT) don't return bool on transfer
// Standard transfer() reverts if it doesn't get true

// Use OpenZeppelin's SafeERC20
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

// Instead of:
token.transfer(to, amount);

// Use:
token.safeTransfer(to, amount);
```

### Rebasing Tokens
```solidity
// Tokens like stETH, AMPL change balances automatically
// Your balance can increase or decrease without transfers

// BAD: Caching balances
mapping(address => uint256) public stakedBalance;
function stake(uint256 amount) external {
    token.transferFrom(msg.sender, address(this), amount);
    stakedBalance[msg.sender] = amount; // Gets stale!
}

// GOOD: Use share-based accounting
mapping(address => uint256) public shares;
uint256 public totalShares;

function stake(uint256 amount) external {
    uint256 shareAmount = (amount * totalShares) / token.balanceOf(address(this));
    shares[msg.sender] += shareAmount;
    totalShares += shareAmount;
}
```

## Common Extensions

### ERC-20 Permit (EIP-2612)
```solidity
// Gasless approvals via signatures
interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

// User signs permit off-chain, anyone can submit
// Saves user from approval transaction
```

### ERC-20 Votes (Governance)
```solidity
// Snapshot balances for governance
interface IVotes {
    function getVotes(address account) external view returns (uint256);
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
    function delegate(address delegatee) external;
}
```

## Security Checklist

- [ ] Check token decimals before calculations
- [ ] Use SafeERC20 for transfers
- [ ] Handle fee-on-transfer tokens
- [ ] Don't use infinite approvals
- [ ] Be aware of rebasing tokens
- [ ] Check return values (or use safe wrappers)
- [ ] Validate addresses (not zero)
