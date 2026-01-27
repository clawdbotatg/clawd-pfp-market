# Challenge 0: Simple NFT

## TLDR

Your first step into Ethereum development - deploy an NFT contract and mint tokens to addresses. This challenge introduces the fundamental concepts of smart contracts, deployment, and the ERC-721 standard.

## Core Concepts

### What You're Building
A basic NFT (Non-Fungible Token) contract that can mint unique tokens with associated metadata (images, attributes). Each token has a unique ID and can be owned by only one address at a time.

### Key Mechanics

1. **ERC-721 Standard**: The interface that defines how NFTs work
   - `balanceOf(address)` - How many NFTs an address owns
   - `ownerOf(tokenId)` - Who owns a specific token
   - `transferFrom(from, to, tokenId)` - Transfer ownership
   - `approve(to, tokenId)` - Allow another address to transfer

2. **Minting**: Creating new tokens
   ```solidity
   function mintItem(address to, string memory tokenURI) public returns (uint256) {
       _tokenIds.increment();
       uint256 newItemId = _tokenIds.current();
       _mint(to, newItemId);
       _setTokenURI(newItemId, tokenURI);
       return newItemId;
   }
   ```

3. **Token URI**: Links on-chain tokens to off-chain metadata (images, attributes)
   - Can point to IPFS, Arweave, or centralized servers
   - Contains JSON with name, description, image, attributes

### The Development Flow

1. Write Solidity contract inheriting from OpenZeppelin's ERC721
2. Compile with Hardhat/Foundry
3. Deploy to local blockchain (Anvil/Hardhat node)
4. Interact via React frontend or debug UI
5. Test on testnet, then mainnet

## Security Considerations

- **Access Control**: Who can mint? Open minting can be exploited
- **Reentrancy**: Safe if using OpenZeppelin's implementation
- **Token URI Immutability**: Consider if metadata should be changeable
- **Gas Costs**: Storing data on-chain is expensive

## Code Patterns

### Basic NFT Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract YourCollectible is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("YourCollectible", "YCB") {}

    function mintItem(address to, string memory tokenURI) public returns (uint256) {
        _tokenIds.increment();
        uint256 id = _tokenIds.current();
        _mint(to, id);
        _setTokenURI(id, tokenURI);
        return id;
    }
}
```

## Common Gotchas

1. **Token IDs start at 1, not 0** - First increment, then use
2. **tokenURI vs baseURI** - Individual URIs vs concatenated base + tokenId
3. **Metadata standards** - Follow OpenSea/marketplace conventions for attributes
4. **IPFS pinning** - Content must be pinned or it disappears

## Real-World Applications

- Profile pictures (PFPs) like BAYC, CryptoPunks
- Digital art and collectibles
- Gaming items and characters
- Event tickets and access passes
- Domain names (ENS)
- Real-world asset tokenization

## Builder Checklist

- [ ] Contract inherits from ERC721 or ERC721URIStorage
- [ ] Minting function has appropriate access control
- [ ] Token URIs point to pinned/permanent storage
- [ ] Metadata follows marketplace standards
- [ ] Events emitted for indexing (Transfer, Approval)
- [ ] Tested on local chain before deployment
