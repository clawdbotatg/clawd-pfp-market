# Pre-Production Security Checklist

Use this checklist before deploying any smart contract to mainnet. Each item represents a common vulnerability or best practice.

---

## Access Control

- [ ] **Admin functions protected**: All administrative functions have proper access control (`onlyOwner`, role-based)
- [ ] **No tx.origin**: Using `msg.sender`, not `tx.origin` for authentication
- [ ] **Multi-sig for critical operations**: High-value operations require multiple signatures
- [ ] **Time-locks on governance**: Parameter changes have time delays
- [ ] **Ownership transfer is two-step**: Uses `transferOwnership` + `acceptOwnership` pattern

```solidity
// Good: Two-step ownership transfer
address public pendingOwner;

function transferOwnership(address newOwner) external onlyOwner {
    pendingOwner = newOwner;
}

function acceptOwnership() external {
    require(msg.sender == pendingOwner, "Not pending owner");
    owner = pendingOwner;
    pendingOwner = address(0);
}
```

---

## Reentrancy Protection

- [ ] **CEI pattern**: All functions follow Checks-Effects-Interactions
- [ ] **ReentrancyGuard**: Functions with external calls use `nonReentrant`
- [ ] **State before external calls**: State is updated before any external call
- [ ] **Read-only reentrancy considered**: View functions don't return stale data during reentrancy

```solidity
// Checklist for each function with external calls
function withdraw() external nonReentrant {
    // 1. CHECKS
    require(balances[msg.sender] > 0, "No balance");
    
    // 2. EFFECTS (before external call!)
    uint256 amount = balances[msg.sender];
    balances[msg.sender] = 0;
    
    // 3. INTERACTIONS (last!)
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

---

## Token Handling

- [ ] **Decimals checked**: Not assuming 18 decimals for any token
- [ ] **SafeERC20 used**: Using OpenZeppelin's SafeERC20 for transfers
- [ ] **Fee-on-transfer handled**: Checking actual received amount for fee tokens
- [ ] **Rebasing tokens handled**: Not caching balances for rebasing tokens
- [ ] **Approval race condition**: Using approve(0) then approve(amount) or increaseAllowance
- [ ] **No infinite approvals**: Not requesting type(uint256).max approvals

```solidity
// Safe token handling
using SafeERC20 for IERC20;

function deposit(uint256 amount) external {
    uint256 balanceBefore = token.balanceOf(address(this));
    token.safeTransferFrom(msg.sender, address(this), amount);
    uint256 received = token.balanceOf(address(this)) - balanceBefore;
    
    // Use 'received', not 'amount'
    balances[msg.sender] += received;
}
```

---

## Oracle Security

- [ ] **No spot prices**: Not using DEX spot prices as oracles
- [ ] **Chainlink used properly**: Checking staleness, validity, and decimals
- [ ] **Multiple oracle sources**: Critical prices have fallback oracles
- [ ] **Price deviation checks**: Large price movements trigger review/pause

```solidity
function getPrice() internal view returns (uint256) {
    (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
    
    // Staleness check
    require(block.timestamp - updatedAt < MAX_STALENESS, "Stale price");
    
    // Validity check
    require(price > 0, "Invalid price");
    
    // Deviation check (optional)
    require(
        price >= lastPrice * 90 / 100 && price <= lastPrice * 110 / 100,
        "Price deviation too high"
    );
    
    return uint256(price);
}
```

---

## Math & Precision

- [ ] **No floating point assumptions**: Using basis points or scaled integers
- [ ] **Multiply before divide**: `(a * b) / c` not `a / c * b`
- [ ] **Overflow considered**: Using SafeMath or Solidity 0.8+ (with unchecked awareness)
- [ ] **Rounding direction**: Rounding in favor of protocol, not user
- [ ] **Edge cases tested**: Zero amounts, max values, first depositor

```solidity
// Good precision math
uint256 constant PRECISION = 1e18;

function calculateFee(uint256 amount, uint256 feeBps) internal pure returns (uint256) {
    return (amount * feeBps) / 10000; // Multiply first
}

// Round up (favor protocol)
function divUp(uint256 a, uint256 b) internal pure returns (uint256) {
    return (a + b - 1) / b;
}
```

---

## Vault Security (ERC-4626)

- [ ] **Inflation attack mitigated**: Using dead shares, virtual offset, or minimum deposit
- [ ] **First depositor protected**: First deposit has special handling
- [ ] **Share manipulation prevented**: Donations can't manipulate share price unfairly
- [ ] **Withdrawal queue if needed**: High-value vaults have withdrawal delays

---

## Input Validation

- [ ] **Zero address checks**: Functions validate address != 0
- [ ] **Amount checks**: Functions validate amount > 0 where appropriate
- [ ] **Array length validation**: Matching array lengths in batch operations
- [ ] **Bounds checking**: Values within expected ranges

```solidity
function transfer(address to, uint256 amount) external {
    require(to != address(0), "Invalid recipient");
    require(amount > 0, "Invalid amount");
    require(balances[msg.sender] >= amount, "Insufficient balance");
    // ...
}
```

---

## Emergency Controls

- [ ] **Pause mechanism**: Can pause contract in emergency
- [ ] **Emergency withdrawal**: Users can exit even when paused (if appropriate)
- [ ] **Upgrade path**: Clear upgrade mechanism if using proxies
- [ ] **Circuit breakers**: Automatic pause on anomalies

```solidity
import "@openzeppelin/contracts/security/Pausable.sol";

contract MyContract is Pausable {
    function deposit() external whenNotPaused { }
    
    function emergencyWithdraw() external whenPaused {
        // Allow users to exit during emergency
    }
    
    function pause() external onlyOwner {
        _pause();
    }
}
```

---

## Testing Requirements

- [ ] **Unit tests**: >90% line coverage
- [ ] **Integration tests**: Multi-contract interactions tested
- [ ] **Fork tests**: Tested against mainnet state
- [ ] **Fuzz tests**: Property-based testing for edge cases
- [ ] **Invariant tests**: Core invariants verified
- [ ] **Gas optimization**: Gas usage profiled and optimized

```solidity
// Foundry fuzz test example
function testFuzz_Withdraw(uint256 amount) public {
    vm.assume(amount > 0 && amount <= 1000 ether);
    
    // Deposit
    token.mint(user, amount);
    vm.prank(user);
    vault.deposit(amount);
    
    // Withdraw
    vm.prank(user);
    vault.withdraw(amount);
    
    // Invariant: User gets back what they deposited
    assertEq(token.balanceOf(user), amount);
}
```

---

## External Dependencies

- [ ] **Verified contracts only**: External calls only to verified contracts
- [ ] **Upgrade risks documented**: If calling upgradeable contracts, risks acknowledged
- [ ] **Fallback behavior**: Graceful handling if external call fails

---

## Deployment Checklist

- [ ] **Testnet deployment**: Successfully deployed and tested on testnet
- [ ] **Contract verification**: Source code verified on block explorer
- [ ] **Constructor args documented**: Deployment parameters documented
- [ ] **Initial state correct**: All initial values set correctly
- [ ] **Ownership configured**: Ownership transferred to multisig

---

## Post-Deployment

- [ ] **Monitoring setup**: Alerts for unusual activity
- [ ] **Bug bounty active**: Reward program for vulnerabilities
- [ ] **Documentation public**: Usage docs and security considerations published
- [ ] **Incident response plan**: Clear process for handling exploits
- [ ] **Insurance considered**: Coverage for user funds if applicable

---

## Static Analysis

Run these tools before deployment:

```bash
# Slither (comprehensive analysis)
slither . --print human-summary

# Mythril (security analysis)
myth analyze contracts/MyContract.sol

# Foundry coverage
forge coverage

# Gas snapshot
forge snapshot
```

---

## Audit Preparation

Before sending to auditors:
- [ ] Clean, documented code
- [ ] Test suite with high coverage
- [ ] Deployment scripts
- [ ] Architecture documentation
- [ ] Known limitations documented
- [ ] Previous audit reports (if any)

---

## Final Sign-Off

```
Contract: _________________
Deployer: _________________
Date: ____________________
Network: __________________
Audit Firm: _______________
Audit Date: _______________

[ ] All checklist items verified
[ ] Team review completed
[ ] Audit findings addressed
[ ] Ready for mainnet
```
