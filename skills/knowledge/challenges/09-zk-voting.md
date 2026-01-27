# Challenge 9: ZK Voting

## TLDR

Build a privacy-preserving voting system using zero-knowledge proofs. Voters can prove they're eligible to vote without revealing their identity, ensuring ballot secrecy while maintaining verifiability. This challenge introduces ZK-SNARKs/STARKs, Merkle trees for voter eligibility, and nullifiers to prevent double voting.

## Core Concepts

### Why ZK Voting?

```
┌─────────────────────────────────────────────────────────────────┐
│ THE VOTING PROBLEM                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Traditional on-chain voting is PUBLIC:                          │
│ • Everyone sees who voted for what                              │
│ • Enables coercion and vote buying                              │
│ • Social pressure affects outcomes                              │
│                                                                 │
│ ZK Voting provides:                                             │
│ • Ballot secrecy (no one knows your vote)                       │
│ • Eligibility verification (only valid voters)                  │
│ • Double-vote prevention (each person votes once)               │
│ • Verifiable results (anyone can verify correctness)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Zero-Knowledge Proof Basics

```
ZK Proof = Prove you know something WITHOUT revealing it

Example: Prove you know password "secret123" without revealing it
1. Verifier sends random challenge
2. Prover computes response using secret
3. Verifier checks response is valid
4. Verifier learns nothing about actual password

In voting:
- Prove you're on voter list (without revealing which voter)
- Prove you haven't voted before (without linking to identity)
```

### Key Components

#### 1. Merkle Tree for Eligibility
```solidity
// Voter addresses hashed into Merkle tree
// Voter proves membership with Merkle proof

bytes32 public voterMerkleRoot;

struct MerkleProof {
    bytes32[] siblings;
    uint8[] pathIndices; // 0 = left, 1 = right
}

function verifyMerkleProof(
    bytes32 leaf,
    MerkleProof calldata proof
) internal view returns (bool) {
    bytes32 computedHash = leaf;
    
    for (uint256 i = 0; i < proof.siblings.length; i++) {
        if (proof.pathIndices[i] == 0) {
            computedHash = keccak256(abi.encodePacked(computedHash, proof.siblings[i]));
        } else {
            computedHash = keccak256(abi.encodePacked(proof.siblings[i], computedHash));
        }
    }
    
    return computedHash == voterMerkleRoot;
}
```

#### 2. Commitment Scheme
```solidity
// Voter commits to vote without revealing it
// commitment = hash(vote, secret)

mapping(address => bytes32) public commitments;

function commitVote(bytes32 commitment) external {
    require(isEligible(msg.sender), "Not eligible");
    require(commitments[msg.sender] == bytes32(0), "Already committed");
    
    commitments[msg.sender] = commitment;
    emit VoteCommitted(msg.sender);
}

function revealVote(uint8 vote, bytes32 secret) external {
    bytes32 commitment = keccak256(abi.encodePacked(vote, secret));
    require(commitments[msg.sender] == commitment, "Invalid reveal");
    
    // Record vote...
}
```

#### 3. Nullifiers (Prevent Double Voting)
```solidity
// Nullifier = hash(secret, proposalId)
// Same voter always generates same nullifier for same proposal
// But nullifier reveals nothing about identity

mapping(bytes32 => bool) public usedNullifiers;

function vote(
    bytes32 nullifier,
    uint8 voteChoice,
    bytes calldata zkProof
) external {
    require(!usedNullifiers[nullifier], "Already voted");
    require(verifyProof(nullifier, voteChoice, zkProof), "Invalid proof");
    
    usedNullifiers[nullifier] = true;
    votes[voteChoice]++;
    
    emit VoteCast(nullifier, voteChoice); // Identity hidden!
}
```

### ZK Circuit (Conceptual)

```
ZK Circuit proves:
1. I know a secret key (sk)
2. My public key (pk = hash(sk)) is in the voter Merkle tree
3. My nullifier = hash(sk, proposalId)
4. My vote is valid (0 or 1)

WITHOUT revealing: sk, pk, or which leaf in tree
```

### Using Semaphore (Popular ZK Identity Protocol)

```solidity
import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

contract ZKVoting {
    ISemaphore public semaphore;
    uint256 public groupId;
    
    mapping(uint256 => uint256) public proposalVotes; // proposalId => yes votes
    
    constructor(address _semaphore, uint256 _groupId) {
        semaphore = ISemaphore(_semaphore);
        groupId = _groupId;
    }
    
    function vote(
        uint256 proposalId,
        uint256 vote, // 0 = no, 1 = yes
        uint256 merkleTreeRoot,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        // Signal = vote choice
        // External nullifier = proposalId (prevents voting twice on same proposal)
        
        semaphore.verifyProof(
            groupId,
            merkleTreeRoot,
            vote,
            nullifierHash,
            proposalId, // externalNullifier
            proof
        );
        
        if (vote == 1) {
            proposalVotes[proposalId]++;
        }
    }
}
```

## Security Considerations

### Key Vulnerabilities

1. **Trusted Setup**
   - ZK-SNARKs require trusted setup ceremony
   - If compromised, fake proofs possible
   - Solution: Use ZK-STARKs or large MPC ceremonies

2. **Front-Running**
   - Attacker sees vote in mempool, submits their own first
   - Solution: Commit-reveal or private mempools

3. **Social Coercion**
   - "Prove to me how you voted"
   - Solution: Deniable voting (can create fake proofs)

4. **Merkle Tree Manipulation**
   - Admin adds/removes voters after voting starts
   - Solution: Lock tree after voting begins

5. **Nullifier Derivation**
   - Predictable nullifiers enable tracking
   - Solution: Include randomness or proposal-specific data

### Timing Attacks

```
Attack: Track when known voters transact, correlate with votes
Defense: Add random delays, batch vote submission
```

## Code Patterns

### Complete ZK Voting System
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[4] calldata input // [merkleRoot, nullifier, proposalId, vote]
    ) external view returns (bool);
}

contract ZKVoting is Ownable {
    IVerifier public verifier;
    bytes32 public voterMerkleRoot;
    
    struct Proposal {
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 yesVotes;
        uint256 noVotes;
        bool finalized;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(bytes32 => bool) public nullifierUsed;
    uint256 public proposalCount;
    
    event ProposalCreated(uint256 indexed id, string description);
    event VoteCast(uint256 indexed proposalId, bytes32 indexed nullifier, bool voteYes);
    event ProposalFinalized(uint256 indexed id, bool passed);
    
    constructor(address _verifier, bytes32 _merkleRoot) {
        verifier = IVerifier(_verifier);
        voterMerkleRoot = _merkleRoot;
    }
    
    function createProposal(
        string calldata description,
        uint256 duration
    ) external onlyOwner returns (uint256) {
        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            description: description,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            yesVotes: 0,
            noVotes: 0,
            finalized: false
        });
        
        emit ProposalCreated(id, description);
        return id;
    }
    
    function vote(
        uint256 proposalId,
        bool voteYes,
        bytes32 nullifier,
        uint256[2] calldata proofA,
        uint256[2][2] calldata proofB,
        uint256[2] calldata proofC
    ) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!nullifierUsed[nullifier], "Already voted");
        
        // Verify ZK proof
        uint256[4] memory publicInputs = [
            uint256(voterMerkleRoot),
            uint256(nullifier),
            proposalId,
            voteYes ? 1 : 0
        ];
        
        require(
            verifier.verifyProof(proofA, proofB, proofC, publicInputs),
            "Invalid proof"
        );
        
        nullifierUsed[nullifier] = true;
        
        if (voteYes) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }
        
        emit VoteCast(proposalId, nullifier, voteYes);
    }
    
    function finalize(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.finalized, "Already finalized");
        
        proposal.finalized = true;
        bool passed = proposal.yesVotes > proposal.noVotes;
        
        emit ProposalFinalized(proposalId, passed);
    }
    
    function getResults(uint256 proposalId) external view returns (
        uint256 yes,
        uint256 no,
        bool finalized
    ) {
        Proposal memory p = proposals[proposalId];
        return (p.yesVotes, p.noVotes, p.finalized);
    }
}
```

## Common Gotchas

1. **ZK Proof Generation is Client-Side**: Heavy computation, takes seconds
2. **Circuit Constraints**: Changes require new trusted setup
3. **Merkle Tree Updates**: Adding voters changes root
4. **Gas Costs**: ZK verification is expensive (~200k-500k gas)
5. **Library Compatibility**: Circom, SnarkJS versions must match

## Real-World Applications

- DAO governance (anonymous voting)
- Corporate board elections
- National elections (future)
- Whistleblower systems
- Anonymous surveys
- Private auctions

## Builder Checklist

- [ ] Merkle tree for voter eligibility
- [ ] Nullifier system prevents double voting
- [ ] ZK circuit verifies membership + vote validity
- [ ] Trusted setup or STARK-based proof
- [ ] Voting period enforcement
- [ ] Events don't leak voter identity
- [ ] Client-side proof generation UI
- [ ] Consider gas costs for verification
