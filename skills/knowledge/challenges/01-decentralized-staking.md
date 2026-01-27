# Challenge 1: Decentralized Staking

## TLDR

Build a staking contract that collects ETH from multiple users toward a funding goal with a deadline. If the goal is met, funds are sent to an external contract; if not, users can withdraw. This teaches coordination mechanisms, time-based logic, and the receive/fallback pattern.

## Core Concepts

### What You're Building
A crowdfunding-style staking application where:
- Users stake ETH before a deadline
- If threshold is reached → funds execute (sent to another contract)
- If threshold not reached → users can withdraw their stake
- Demonstrates trustless coordination without intermediaries

### Key Mechanics

1. **Payable Functions**: Accepting ETH
   ```solidity
   function stake() public payable {
       require(msg.value > 0, "Must send ETH");
       balances[msg.sender] += msg.value;
       emit Stake(msg.sender, msg.value);
   }
   ```

2. **Time-Based Conditions**
   ```solidity
   uint256 public deadline = block.timestamp + 72 hours;
   
   modifier deadlineReached() {
       require(block.timestamp >= deadline, "Deadline not reached");
       _;
   }
   ```

3. **Threshold Logic**
   ```solidity
   uint256 public threshold = 1 ether;
   
   function execute() public deadlineReached {
       require(address(this).balance >= threshold, "Threshold not met");
       externalContract.complete{value: address(this).balance}();
   }
   ```

4. **Withdrawal Pattern**
   ```solidity
   function withdraw() public deadlineReached {
       require(address(this).balance < threshold, "Threshold was met");
       uint256 amount = balances[msg.sender];
       balances[msg.sender] = 0; // CEI pattern!
       payable(msg.sender).transfer(amount);
   }
   ```

### State Machine Pattern

```
OPEN (staking allowed)
    │
    ├── deadline reached + threshold met → EXECUTE
    │                                          └── funds sent to external contract
    │
    └── deadline reached + threshold NOT met → WITHDRAW
                                                   └── users reclaim funds
```

## Security Considerations

1. **Reentrancy in Withdrawals**: Always use Checks-Effects-Interactions
   - Check: Verify conditions
   - Effects: Update state BEFORE external calls
   - Interactions: Make external call last

2. **Block Timestamp Manipulation**: Miners can manipulate ~15 seconds
   - Don't use for precise timing
   - Safe for hours/days granularity

3. **Denial of Service**: If external contract reverts, can lock funds
   - Use pull-over-push pattern for withdrawals

4. **Integer Overflow**: Not an issue in Solidity 0.8+ (built-in checks)

## Code Patterns

### Full Staking Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Staker {
    mapping(address => uint256) public balances;
    uint256 public constant threshold = 1 ether;
    uint256 public deadline = block.timestamp + 72 hours;
    ExternalContract public externalContract;
    bool public openForWithdraw;
    bool public executed;

    event Stake(address indexed staker, uint256 amount);
    event Withdraw(address indexed staker, uint256 amount);

    constructor(address externalContractAddress) {
        externalContract = ExternalContract(externalContractAddress);
    }

    function stake() public payable {
        require(block.timestamp < deadline, "Staking period over");
        balances[msg.sender] += msg.value;
        emit Stake(msg.sender, msg.value);
    }

    function execute() public {
        require(block.timestamp >= deadline, "Deadline not reached");
        require(!executed, "Already executed");
        require(address(this).balance >= threshold, "Threshold not met");
        
        executed = true;
        externalContract.complete{value: address(this).balance}();
    }

    function withdraw() public {
        require(block.timestamp >= deadline, "Deadline not reached");
        require(address(this).balance < threshold, "Threshold met, cannot withdraw");
        
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdraw(msg.sender, amount);
    }

    function timeLeft() public view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    receive() external payable {
        stake();
    }
}
```

## Common Gotchas

1. **Forgetting receive()**: Contract can't receive plain ETH transfers without it
2. **State changes after external calls**: Classic reentrancy vulnerability
3. **Using transfer() vs call()**: `transfer()` has 2300 gas limit, can fail with complex receivers
4. **Not handling execute/withdraw exclusivity**: User shouldn't withdraw if threshold met

## Real-World Applications

- Crowdfunding platforms (Kickstarter-style)
- DAO treasury contributions
- Protocol bootstrapping
- Assurance contracts (dominant assurance)
- Token launches with minimum raise targets
- Quadratic funding rounds

## Builder Checklist

- [ ] Payable function to accept stakes
- [ ] Deadline enforcement with block.timestamp
- [ ] Threshold check before execution
- [ ] Withdrawal only if threshold not met
- [ ] CEI pattern in all functions with external calls
- [ ] Events for stake/withdraw/execute
- [ ] receive() function for plain ETH transfers
- [ ] View function for time remaining
