# Solidity Essentials

## Overview

Solidity is the primary programming language for Ethereum smart contracts. It's statically typed, supports inheritance, and compiles to EVM bytecode.

## Basic Syntax

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract MyContract {
    // State variables (stored on-chain)
    uint256 public myNumber;
    address public owner;
    
    // Events (for logging)
    event NumberChanged(uint256 oldValue, uint256 newValue);
    
    // Modifiers (reusable checks)
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // Constructor (runs once on deployment)
    constructor() {
        owner = msg.sender;
    }
    
    // Functions
    function setNumber(uint256 _number) external onlyOwner {
        emit NumberChanged(myNumber, _number);
        myNumber = _number;
    }
    
    function getNumber() external view returns (uint256) {
        return myNumber;
    }
}
```

## Data Types

### Value Types
```solidity
// Integers
uint256 unsignedInt = 42;        // 0 to 2^256-1
int256 signedInt = -42;          // -2^255 to 2^255-1
uint8 smallInt = 255;            // 0 to 255

// Address
address wallet = 0x1234...;      // 20 bytes
address payable recipient;        // Can receive ETH

// Boolean
bool isActive = true;

// Fixed-size bytes
bytes32 hash = keccak256("hello");
bytes1 singleByte = 0x42;

// Enum
enum Status { Pending, Active, Completed }
Status public status = Status.Pending;
```

### Reference Types
```solidity
// Dynamic arrays
uint256[] public numbers;
string public name = "Hello";
bytes public data;

// Fixed arrays
uint256[10] public fixedNumbers;

// Mappings
mapping(address => uint256) public balances;
mapping(address => mapping(address => uint256)) public allowances;

// Structs
struct User {
    address wallet;
    uint256 balance;
    bool isActive;
}
mapping(address => User) public users;
```

## Data Locations

```solidity
contract DataLocations {
    uint256[] public storageArray; // Stored on-chain (persistent)
    
    function example(uint256[] calldata inputData) external {
        // calldata: Read-only, for external function inputs
        // Cannot modify inputData
        
        // memory: Temporary, modifiable, cleared after function
        uint256[] memory tempArray = new uint256[](3);
        tempArray[0] = 1;
        
        // storage: Reference to state variable
        uint256[] storage ref = storageArray;
        ref.push(1); // Modifies storageArray
    }
}
```

## Functions

### Visibility
```solidity
contract Visibility {
    // public: Anyone can call
    function publicFunc() public {}
    
    // external: Only callable from outside (not internally)
    // More gas efficient for large data
    function externalFunc() external {}
    
    // internal: Only this contract and derived contracts
    function internalFunc() internal {}
    
    // private: Only this contract
    function privateFunc() private {}
}
```

### State Mutability
```solidity
contract Mutability {
    uint256 public value;
    
    // view: Reads state, no modifications
    function getValue() external view returns (uint256) {
        return value;
    }
    
    // pure: No state access at all
    function add(uint256 a, uint256 b) external pure returns (uint256) {
        return a + b;
    }
    
    // payable: Can receive ETH
    function deposit() external payable {
        // msg.value contains ETH sent
    }
    
    // (default): Can modify state
    function setValue(uint256 _value) external {
        value = _value;
    }
}
```

### Function Modifiers
```solidity
contract Modifiers {
    address public owner;
    bool public paused;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _; // Execute function body here
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }
    
    // Chain modifiers
    function sensitiveAction(address to) 
        external 
        onlyOwner 
        whenNotPaused 
        validAddress(to) 
    {
        // Only runs if all modifiers pass
    }
}
```

## Error Handling

```solidity
contract Errors {
    // Custom errors (gas efficient)
    error InsufficientBalance(uint256 available, uint256 required);
    error Unauthorized();
    
    function withdraw(uint256 amount) external {
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(balances[msg.sender], amount);
        }
        
        // Or use require (string message)
        require(amount > 0, "Amount must be positive");
        
        // assert for invariants (should never fail)
        assert(totalSupply >= amount);
    }
}
```

## Inheritance

```solidity
// Base contract
contract Ownable {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // virtual: Can be overridden
    function transferOwnership(address newOwner) public virtual onlyOwner {
        owner = newOwner;
    }
}

// Derived contract
contract MyContract is Ownable {
    // override: Overriding virtual function
    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "Invalid");
        super.transferOwnership(newOwner); // Call parent
    }
}

// Multiple inheritance
contract Token is ERC20, Ownable, Pausable {
    // Inherits from all three
}
```

## Interfaces & Abstract Contracts

```solidity
// Interface: Only function signatures
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// Abstract: Can have some implementations
abstract contract Pausable {
    bool public paused;
    
    // Implemented
    function _pause() internal {
        paused = true;
    }
    
    // Must be implemented by child
    function pause() external virtual;
}

// Using interface
contract TokenUser {
    IERC20 public token;
    
    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
    }
    
    function checkBalance(address user) external view returns (uint256) {
        return token.balanceOf(user);
    }
}
```

## Events

```solidity
contract Events {
    // Up to 3 indexed parameters (searchable)
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value
    );
    
    event Log(string message);
    
    function transfer(address to, uint256 amount) external {
        // Emit event
        emit Transfer(msg.sender, to, amount);
    }
}
```

## Receiving ETH

```solidity
contract ETHReceiver {
    // Called when ETH sent with empty calldata
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
    
    // Called when calldata doesn't match any function
    fallback() external payable {
        // Handle or revert
    }
    
    // Check contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Send ETH
    function sendETH(address payable to) external {
        // Option 1: transfer (2300 gas, reverts on failure)
        to.transfer(1 ether);
        
        // Option 2: send (2300 gas, returns bool)
        bool success = to.send(1 ether);
        
        // Option 3: call (recommended, forwards all gas)
        (bool sent, ) = to.call{value: 1 ether}("");
        require(sent, "Failed to send");
    }
}
```

## Common Patterns

### Checks-Effects-Interactions (CEI)
```solidity
function withdraw(uint256 amount) external {
    // 1. CHECKS
    require(balances[msg.sender] >= amount, "Insufficient");
    
    // 2. EFFECTS (update state)
    balances[msg.sender] -= amount;
    
    // 3. INTERACTIONS (external calls)
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

### Pull Over Push
```solidity
// BAD: Push payments
function distributeRewards(address[] calldata users) external {
    for (uint i = 0; i < users.length; i++) {
        payable(users[i]).transfer(reward); // One failure = all fail
    }
}

// GOOD: Pull payments
mapping(address => uint256) public rewards;

function claimReward() external {
    uint256 amount = rewards[msg.sender];
    rewards[msg.sender] = 0;
    payable(msg.sender).transfer(amount);
}
```

## Global Variables

```solidity
// Block info
block.timestamp  // Current block timestamp
block.number     // Current block number
block.chainid    // Chain ID

// Transaction info
msg.sender       // Caller address
msg.value        // ETH sent (in wei)
msg.data         // Complete calldata
tx.origin        // Original sender (avoid using!)
tx.gasprice      // Gas price

// Contract info
address(this)            // This contract's address
address(this).balance    // This contract's ETH balance
```

## Gas Optimization Tips

```solidity
contract GasOptimized {
    // Pack storage variables
    struct Packed {
        uint128 a;  // Slot 0 (first 16 bytes)
        uint128 b;  // Slot 0 (second 16 bytes)
    }
    
    // Use calldata for external functions
    function process(uint256[] calldata data) external {}
    
    // Cache storage reads in memory
    function sum() external view returns (uint256) {
        uint256[] memory nums = storageArray; // One SLOAD
        uint256 total;
        for (uint i = 0; i < nums.length; i++) {
            total += nums[i];
        }
        return total;
    }
    
    // Use unchecked for safe math
    function increment(uint256 x) external pure returns (uint256) {
        unchecked {
            return x + 1; // Saves gas if overflow impossible
        }
    }
}
```
