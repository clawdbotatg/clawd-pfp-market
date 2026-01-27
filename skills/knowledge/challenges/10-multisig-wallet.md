# Challenge 10: Multisig Wallet

## TLDR

Build a multi-signature wallet requiring M-of-N owners to approve transactions before execution. Multisigs are the foundation of secure treasury management, eliminating single points of failure. Learn about signature verification, nonces for replay protection, and threshold cryptography.

## Core Concepts

### What You're Building

```
┌─────────────────────────────────────────────────────────────────┐
│ MULTISIG WALLET (2-of-3 example)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Owners: Alice, Bob, Charlie                                     │
│ Threshold: 2 signatures required                                │
│                                                                 │
│ Transaction Flow:                                               │
│ 1. Alice proposes: "Send 10 ETH to Dave"                        │
│ 2. Bob approves the transaction                                 │
│ 3. Threshold reached (2/3) → Transaction executes               │
│                                                                 │
│ Security: No single owner can steal funds                       │
│ Flexibility: Owners can be added/removed (with M-of-N approval) │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Mechanics

#### 1. Transaction Proposal and Approval
```solidity
struct Transaction {
    address to;
    uint256 value;
    bytes data;
    bool executed;
    uint256 numConfirmations;
}

Transaction[] public transactions;
mapping(uint256 => mapping(address => bool)) public isConfirmed;

function submitTransaction(
    address _to,
    uint256 _value,
    bytes calldata _data
) external onlyOwner returns (uint256 txIndex) {
    txIndex = transactions.length;
    
    transactions.push(Transaction({
        to: _to,
        value: _value,
        data: _data,
        executed: false,
        numConfirmations: 0
    }));
    
    emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
}

function confirmTransaction(uint256 _txIndex) external onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
    require(!isConfirmed[_txIndex][msg.sender], "Already confirmed");
    
    Transaction storage transaction = transactions[_txIndex];
    transaction.numConfirmations += 1;
    isConfirmed[_txIndex][msg.sender] = true;
    
    emit ConfirmTransaction(msg.sender, _txIndex);
}
```

#### 2. Execution with Threshold Check
```solidity
uint256 public numConfirmationsRequired;

function executeTransaction(uint256 _txIndex) external onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
    Transaction storage transaction = transactions[_txIndex];
    
    require(transaction.numConfirmations >= numConfirmationsRequired, "Not enough confirmations");
    
    transaction.executed = true;
    
    (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
    require(success, "Transaction failed");
    
    emit ExecuteTransaction(msg.sender, _txIndex);
}
```

#### 3. Off-Chain Signatures (Gas Efficient)
```solidity
// Instead of on-chain approvals, collect signatures off-chain
// More gas efficient for frequent transactions

function executeWithSignatures(
    address to,
    uint256 value,
    bytes calldata data,
    bytes[] calldata signatures
) external {
    bytes32 txHash = getTransactionHash(to, value, data, nonce);
    
    require(signatures.length >= numConfirmationsRequired, "Not enough signatures");
    
    address lastSigner = address(0);
    for (uint256 i = 0; i < signatures.length; i++) {
        address signer = recoverSigner(txHash, signatures[i]);
        require(isOwner[signer], "Not owner");
        require(signer > lastSigner, "Signers must be in ascending order"); // Prevent duplicates
        lastSigner = signer;
    }
    
    nonce++;
    
    (bool success, ) = to.call{value: value}(data);
    require(success, "Transaction failed");
}

function getTransactionHash(
    address to,
    uint256 value,
    bytes memory data,
    uint256 _nonce
) public view returns (bytes32) {
    return keccak256(abi.encodePacked(
        address(this),
        block.chainid,
        to,
        value,
        data,
        _nonce
    ));
}

function recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
    bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    
    (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
    return ecrecover(ethSignedHash, v, r, s);
}
```

#### 4. Owner Management
```solidity
mapping(address => bool) public isOwner;
address[] public owners;

function addOwner(address owner) external onlySelf {
    require(!isOwner[owner], "Already owner");
    require(owner != address(0), "Invalid address");
    
    isOwner[owner] = true;
    owners.push(owner);
    
    emit OwnerAdded(owner);
}

function removeOwner(address owner) external onlySelf {
    require(isOwner[owner], "Not owner");
    require(owners.length - 1 >= numConfirmationsRequired, "Cannot go below threshold");
    
    isOwner[owner] = false;
    
    // Remove from array
    for (uint256 i = 0; i < owners.length; i++) {
        if (owners[i] == owner) {
            owners[i] = owners[owners.length - 1];
            owners.pop();
            break;
        }
    }
    
    emit OwnerRemoved(owner);
}

function changeThreshold(uint256 _numConfirmationsRequired) external onlySelf {
    require(_numConfirmationsRequired > 0, "Invalid threshold");
    require(_numConfirmationsRequired <= owners.length, "Threshold > owners");
    
    numConfirmationsRequired = _numConfirmationsRequired;
    emit ThresholdChanged(_numConfirmationsRequired);
}

modifier onlySelf() {
    require(msg.sender == address(this), "Only via multisig");
    _;
}
```

## Security Considerations

### Critical Vulnerabilities

1. **Replay Attacks**
   ```solidity
   // BAD: No nonce, same signature works twice
   function execute(bytes[] calldata sigs) { ... }
   
   // GOOD: Nonce prevents replay
   uint256 public nonce;
   function execute(bytes[] calldata sigs) {
       // Include nonce in hash
       bytes32 hash = keccak256(abi.encodePacked(..., nonce));
       nonce++;
   }
   ```

2. **Cross-Chain Replay**
   ```solidity
   // Include chainId in hash to prevent cross-chain attacks
   bytes32 hash = keccak256(abi.encodePacked(
       address(this),
       block.chainid, // Critical!
       ...
   ));
   ```

3. **Signature Malleability**
   ```solidity
   // ECDSA signatures can be manipulated to create valid variants
   // Use OpenZeppelin's ECDSA library which checks for this
   import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
   ```

4. **Owner Key Compromise**
   - Single compromised key shouldn't drain funds
   - Threshold should be > 50% of owners
   - Consider time-locks for large transfers

5. **Social Engineering**
   - Attackers trick owners into signing malicious transactions
   - Solution: Clear transaction display, simulation before signing

### Best Practices

```solidity
// Time-lock for high-value transactions
mapping(uint256 => uint256) public txExecutionTime;

function executeTransaction(uint256 _txIndex) external {
    Transaction storage tx = transactions[_txIndex];
    
    if (tx.value > 100 ether) {
        if (txExecutionTime[_txIndex] == 0) {
            txExecutionTime[_txIndex] = block.timestamp + 24 hours;
            emit TransactionQueued(_txIndex);
            return;
        }
        require(block.timestamp >= txExecutionTime[_txIndex], "Time lock active");
    }
    
    // Execute...
}
```

## Code Patterns

### Complete Multisig Wallet
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract MultiSigWallet {
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(address indexed owner, uint256 indexed txIndex, address indexed to, uint256 value, bytes data);
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numConfirmationsRequired;
    
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }
    
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    Transaction[] public transactions;
    
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }
    
    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "Tx does not exist");
        _;
    }
    
    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "Tx already executed");
        _;
    }
    
    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "Tx already confirmed");
        _;
    }
    
    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        require(_owners.length > 0, "Owners required");
        require(
            _numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length,
            "Invalid confirmations"
        );
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        numConfirmationsRequired = _numConfirmationsRequired;
    }
    
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
    
    function submitTransaction(address _to, uint256 _value, bytes calldata _data) external onlyOwner returns (uint256) {
        uint256 txIndex = transactions.length;
        
        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            numConfirmations: 0
        }));
        
        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
        return txIndex;
    }
    
    function confirmTransaction(uint256 _txIndex) 
        external 
        onlyOwner 
        txExists(_txIndex) 
        notExecuted(_txIndex) 
        notConfirmed(_txIndex) 
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;
        
        emit ConfirmTransaction(msg.sender, _txIndex);
    }
    
    function executeTransaction(uint256 _txIndex) external onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        
        require(transaction.numConfirmations >= numConfirmationsRequired, "Not enough confirmations");
        
        transaction.executed = true;
        
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Tx failed");
        
        emit ExecuteTransaction(msg.sender, _txIndex);
    }
    
    function revokeConfirmation(uint256 _txIndex) external onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        require(isConfirmed[_txIndex][msg.sender], "Tx not confirmed");
        
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;
        
        emit RevokeConfirmation(msg.sender, _txIndex);
    }
    
    function getOwners() external view returns (address[] memory) {
        return owners;
    }
    
    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }
    
    function getTransaction(uint256 _txIndex) external view returns (
        address to,
        uint256 value,
        bytes memory data,
        bool executed,
        uint256 numConfirmations
    ) {
        Transaction memory transaction = transactions[_txIndex];
        return (transaction.to, transaction.value, transaction.data, transaction.executed, transaction.numConfirmations);
    }
}
```

## Common Gotchas

1. **Gas Limit for Execution**: Complex transactions may fail; set appropriate gas
2. **Losing Owner Keys**: If too many keys lost, funds locked forever
3. **Transaction Ordering**: Multiple pending transactions can conflict
4. **Contract Interactions**: Multisig calling other contracts adds complexity
5. **Upgrade Considerations**: Migrating to new multisig requires careful planning

## Real-World Applications

- Protocol treasuries (Uniswap, Compound)
- Gnosis Safe (industry standard)
- Team wallets for DAOs
- Escrow services
- Corporate treasury management

## Builder Checklist

- [ ] Proper threshold validation (M <= N)
- [ ] Nonce for replay protection
- [ ] Chain ID for cross-chain protection
- [ ] Owner management with threshold checks
- [ ] Transaction revocation before execution
- [ ] Events for all state changes
- [ ] Consider time-locks for high-value
- [ ] Test with various owner configurations
