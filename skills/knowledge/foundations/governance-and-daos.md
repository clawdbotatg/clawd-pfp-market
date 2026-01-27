# Decentralized Governance & DAOs

## What is a DAO?

A **Decentralized Autonomous Organization** is a collectively-owned organization governed by smart contracts and token holders.

```
┌─────────────────────────────────────────────────────────────────┐
│ TRADITIONAL ORG vs DAO                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Corporation:              │  DAO:                               │
│ • Board of directors      │  • Token holders vote               │
│ • Private meetings        │  • On-chain, transparent votes      │
│ • Trust executives        │  • Trust code execution             │
│ • Legal enforcement       │  • Smart contract enforcement       │
│                           │                                     │
└─────────────────────────────────────────────────────────────────┘
```

## DAO Architecture

### Governance Token

```solidity
// Voting power = token balance (or delegated balance)
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract GovernanceToken is ERC20Votes {
    constructor() ERC20("GOV", "GOV") ERC20Permit("GOV") {
        _mint(msg.sender, 1_000_000 * 1e18);
    }
    
    // Users must delegate to activate voting power
    // Can delegate to self or another address
    function delegate(address delegatee) public override {
        super.delegate(delegatee);
    }
}
```

**Critical: Delegation is Required!**
```solidity
// Common mistake: Users hold tokens but haven't delegated
// Their voting power = 0 until they call delegate()

// Self-delegation to activate your own votes:
governanceToken.delegate(msg.sender);

// Or delegate to someone else:
governanceToken.delegate(trustedDelegate);
```

### Governor Contract

```solidity
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract MyDAO is 
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorTimelockControl 
{
    constructor(
        IVotes _token,
        TimelockController _timelock
    )
        Governor("MyDAO")
        GovernorSettings(
            1 days,    // Voting delay
            1 weeks,   // Voting period
            100_000e18 // Proposal threshold (tokens needed)
        )
        GovernorVotes(_token)
        GovernorTimelockControl(_timelock)
    {}
}
```

### Timelock Controller

```
Enforces delay between vote passing and execution.

┌──────────────────────────────────────────────────────────────┐
│ PROPOSAL LIFECYCLE                                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Create     2. Voting    3. Queued     4. Execute         │
│  Proposal      Period       (Timelock)                       │
│                                                              │
│  [Day 0]       [Day 1-8]    [Day 8-10]    [Day 10+]          │
│                                                              │
│  Anyone with   Token        2-day delay   Anyone can         │
│  enough        holders      for users     execute if         │
│  tokens        vote         to exit       vote passed        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Why timelock matters:
```
Without timelock:
- Malicious proposal passes
- Executes immediately
- Users have no time to exit

With timelock:
- Malicious proposal passes
- 2-day delay before execution
- Users can withdraw/exit if they disagree
```

## Voting Mechanisms

### Simple Voting (For/Against/Abstain)

```solidity
enum VoteType { Against, For, Abstain }

function castVote(uint256 proposalId, uint8 support) 
    public 
    returns (uint256) 
{
    address voter = msg.sender;
    uint256 weight = getVotes(voter, proposalSnapshot(proposalId));
    
    _countVote(proposalId, voter, support, weight, "");
    
    emit VoteCast(voter, proposalId, support, weight, "");
    return weight;
}
```

### Quorum Requirements

```solidity
// Minimum participation for valid vote
function quorum(uint256 blockNumber) public pure override returns (uint256) {
    // 4% of total supply must vote
    return token.getPastTotalSupply(blockNumber) * 4 / 100;
}

// Proposal passes if:
// 1. Quorum is met (enough participation)
// 2. For votes > Against votes
```

### Voting Strategies

```
┌─────────────────────────────────────────────────────────────────┐
│ VOTING MODELS                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Token Voting:                                                   │
│ • 1 token = 1 vote                                              │
│ • Simple, widely used                                           │
│ • Risk: Whale dominance                                         │
│                                                                 │
│ Quadratic Voting:                                               │
│ • Vote weight = sqrt(tokens)                                    │
│ • Reduces whale power                                           │
│ • 100 tokens = 10 votes (not 100)                               │
│                                                                 │
│ Conviction Voting:                                              │
│ • Votes accumulate over time                                    │
│ • Longer staking = more weight                                  │
│ • Favors long-term believers                                    │
│                                                                 │
│ Optimistic Governance:                                          │
│ • Proposals pass unless vetoed                                  │
│ • Faster execution                                              │
│ • Requires active guardian oversight                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Common DAO Patterns

### Treasury Management

```solidity
// DAO controls a treasury via governance
contract Treasury {
    address public governance;
    
    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }
    
    // Governance can transfer funds
    function transfer(
        address token,
        address to,
        uint256 amount
    ) external onlyGovernance {
        IERC20(token).transfer(to, amount);
    }
    
    // Governance can execute arbitrary calls
    function execute(
        address target,
        bytes calldata data
    ) external onlyGovernance returns (bytes memory) {
        (bool success, bytes memory result) = target.call(data);
        require(success, "Execution failed");
        return result;
    }
}
```

### Protocol Parameter Changes

```solidity
// DAO controls protocol parameters
contract LendingProtocol {
    address public governance;
    
    uint256 public collateralRatio = 150; // 150%
    uint256 public liquidationBonus = 5;  // 5%
    
    function setCollateralRatio(uint256 newRatio) external {
        require(msg.sender == governance, "Only governance");
        require(newRatio >= 100 && newRatio <= 200, "Invalid ratio");
        collateralRatio = newRatio;
    }
    
    function setLiquidationBonus(uint256 newBonus) external {
        require(msg.sender == governance, "Only governance");
        require(newBonus <= 20, "Bonus too high");
        liquidationBonus = newBonus;
    }
}
```

### Upgrade Authority

```solidity
// DAO controls proxy upgrades
contract GovernedProxy {
    address public implementation;
    address public governance;
    
    function upgrade(address newImplementation) external {
        require(msg.sender == governance, "Only governance");
        implementation = newImplementation;
    }
}
```

## Governance Attacks & Defenses

### Flash Loan Governance Attack

```
Attack Vector:
1. Flash loan governance tokens
2. Create + vote on malicious proposal (instant)
3. Drain treasury
4. Repay flash loan

Defense: Snapshot voting
- Voting power based on PAST block
- Can't flash loan historical balance
```

```solidity
function getVotes(address account, uint256 blockNumber) 
    public view returns (uint256) 
{
    // Uses historical balance, not current
    return token.getPastVotes(account, blockNumber);
}
```

### Low Participation Attack

```
Attack Vector:
- Wait for low-activity period
- Push malicious proposal through
- Few voters = low quorum threshold met

Defense: 
- Set appropriate quorum (4-10%)
- Long voting periods
- Active community monitoring
```

### Hostile Takeover

```
Attack Vector:
- Accumulate majority of tokens
- Vote to drain treasury to yourself
- "Legal" governance attack

Defense:
- Timelock allows users to exit
- Multi-sig veto power for emergencies
- Token distribution matters (don't concentrate)
```

## Real-World DAO Examples

```
┌─────────────────────────────────────────────────────────────────┐
│ NOTABLE DAOs                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Uniswap (UNI)                                                   │
│ • Controls protocol fees, upgrades                              │
│ • $2B+ treasury                                                 │
│ • 4% quorum requirement                                         │
│                                                                 │
│ Compound (COMP)                                                 │
│ • Pioneer of on-chain governance                                │
│ • Governor Bravo model                                          │
│ • 400K COMP proposal threshold                                  │
│                                                                 │
│ MakerDAO (MKR)                                                  │
│ • Controls DAI stability parameters                             │
│ • Complex governance with multiple modules                      │
│ • Emergency shutdown mechanism                                  │
│                                                                 │
│ ENS (ENS)                                                       │
│ • Constitution-based governance                                 │
│ • Working groups and stewards                                   │
│ • Delegate-heavy model                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Best Practices

### For DAO Builders

```solidity
// 1. Always use timelock
// 2. Set reasonable quorum (4-10%)
// 3. Use snapshot voting (not real-time)
// 4. Include emergency mechanisms
// 5. Start with higher thresholds, reduce over time
// 6. Make delegation easy and encouraged
```

### For DAO Participants

```
1. DELEGATE your tokens (to self or trusted delegate)
2. Read proposals before voting
3. Watch timelock queue for suspicious activity
4. Participate in discussions, not just votes
5. Understand what the DAO controls (treasury, upgrades, parameters)
```

## Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ DAO GOVERNANCE CHECKLIST                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ □ Governance token with delegation (ERC20Votes)                 │
│ □ Governor contract (propose, vote, execute)                    │
│ □ Timelock controller (delay between pass and execute)          │
│ □ Snapshot voting (prevent flash loan attacks)                  │
│ □ Appropriate quorum threshold                                  │
│ □ Emergency mechanisms (guardian, pause)                        │
│ □ Clear documentation of what governance controls               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
