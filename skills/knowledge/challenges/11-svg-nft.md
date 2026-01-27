# Challenge 11: SVG NFT

## TLDR

Build fully on-chain NFTs where the artwork is generated as SVG code directly in the smart contract. Unlike traditional NFTs pointing to IPFS/URLs, on-chain SVGs are **permanent, immutable, and trustless**. Learn about Base64 encoding, dynamic metadata generation, and the trade-offs of on-chain storage.

## Core Concepts

### Why On-Chain SVGs?

```
┌─────────────────────────────────────────────────────────────────┐
│ TRADITIONAL NFT vs ON-CHAIN SVG                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Traditional NFT:                                                │
│ tokenURI → "ipfs://Qm..." → JSON → image: "ipfs://Qm..."        │
│ ⚠️  If IPFS node goes down, image disappears                    │
│ ⚠️  Metadata can point to anything                              │
│                                                                 │
│ On-Chain SVG:                                                   │
│ tokenURI → "data:application/json;base64,..." → SVG embedded    │
│ ✅ Permanent - lives as long as Ethereum                        │
│ ✅ Trustless - verifiable from contract                         │
│ ✅ Dynamic - can change based on state                          │
│ ⚠️  Gas expensive for complex art                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Mechanics

#### 1. Generating SVG in Solidity
```solidity
function generateSVG(uint256 tokenId) internal view returns (string memory) {
    // Generate deterministic but unique traits from tokenId
    uint256 hue = (tokenId * 137) % 360;
    uint256 size = 50 + (tokenId % 50);
    
    return string(abi.encodePacked(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">',
        '<rect width="200" height="200" fill="hsl(', 
        Strings.toString(hue), 
        ', 70%, 20%)"/>',
        '<circle cx="100" cy="100" r="',
        Strings.toString(size),
        '" fill="hsl(',
        Strings.toString((hue + 180) % 360),
        ', 80%, 60%)"/>',
        '</svg>'
    ));
}
```

#### 2. Base64 Encoding
```solidity
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "Token does not exist");
    
    string memory svg = generateSVG(tokenId);
    string memory svgBase64 = Base64.encode(bytes(svg));
    
    string memory json = string(abi.encodePacked(
        '{"name": "OnChain NFT #',
        Strings.toString(tokenId),
        '", "description": "Fully on-chain SVG NFT", "image": "data:image/svg+xml;base64,',
        svgBase64,
        '"}'
    ));
    
    return string(abi.encodePacked(
        "data:application/json;base64,",
        Base64.encode(bytes(json))
    ));
}
```

#### 3. Dynamic Attributes Based on State
```solidity
struct NFTState {
    uint256 level;
    uint256 experience;
    uint256 lastInteraction;
}

mapping(uint256 => NFTState) public nftStates;

function generateSVG(uint256 tokenId) internal view returns (string memory) {
    NFTState memory state = nftStates[tokenId];
    
    // Size grows with level
    uint256 size = 20 + (state.level * 10);
    
    // Color changes based on experience
    uint256 hue = (state.experience * 10) % 360;
    
    // Glow effect if recently interacted
    string memory glow = "";
    if (block.timestamp - state.lastInteraction < 1 hours) {
        glow = '<filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    }
    
    return string(abi.encodePacked(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">',
        '<defs>', glow, '</defs>',
        '<circle cx="100" cy="100" r="', Strings.toString(size), 
        '" fill="hsl(', Strings.toString(hue), ', 80%, 60%)"',
        bytes(glow).length > 0 ? ' filter="url(#glow)"' : '',
        '/>',
        '</svg>'
    ));
}

function interact(uint256 tokenId) external {
    require(ownerOf(tokenId) == msg.sender, "Not owner");
    nftStates[tokenId].experience += 10;
    nftStates[tokenId].lastInteraction = block.timestamp;
}
```

#### 4. On-Chain Attributes
```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    NFTState memory state = nftStates[tokenId];
    
    string memory attributes = string(abi.encodePacked(
        '[{"trait_type": "Level", "value": ', Strings.toString(state.level),
        '}, {"trait_type": "Experience", "value": ', Strings.toString(state.experience),
        '}, {"trait_type": "Rarity", "value": "', getRarity(tokenId), '"}]'
    ));
    
    string memory json = string(abi.encodePacked(
        '{"name": "Dynamic NFT #', Strings.toString(tokenId),
        '", "description": "Evolving on-chain NFT",',
        '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(generateSVG(tokenId))),
        '", "attributes": ', attributes, '}'
    ));
    
    return string(abi.encodePacked(
        "data:application/json;base64,",
        Base64.encode(bytes(json))
    ));
}
```

### SVG Techniques

```xml
<!-- Gradients -->
<linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" style="stop-color:rgb(255,255,0)"/>
  <stop offset="100%" style="stop-color:rgb(255,0,0)"/>
</linearGradient>
<rect fill="url(#grad1)" width="200" height="200"/>

<!-- Patterns -->
<pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
  <circle cx="10" cy="10" r="5" fill="white"/>
</pattern>
<rect fill="url(#dots)" width="200" height="200"/>

<!-- Animation (some marketplaces support) -->
<circle cx="100" cy="100" r="50">
  <animate attributeName="r" values="40;60;40" dur="2s" repeatCount="indefinite"/>
</circle>

<!-- Text -->
<text x="100" y="100" text-anchor="middle" fill="white" font-size="24">NFT</text>
```

## Security Considerations

### Gas Optimization

```solidity
// BAD: Building string in loop
function badSvg() internal pure returns (string memory) {
    string memory result = "";
    for (uint i = 0; i < 10; i++) {
        result = string(abi.encodePacked(result, "<circle/>")); // Expensive!
    }
    return result;
}

// GOOD: Pre-compute and concatenate once
function goodSvg() internal pure returns (string memory) {
    bytes memory circles = new bytes(10 * 10); // Pre-allocate
    // ... fill bytes ...
    return string(circles);
}

// BETTER: Store SVG parts as constants
string constant SVG_HEADER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">';
string constant SVG_FOOTER = '</svg>';
```

### Rendering Issues

1. **XSS Prevention**: Don't include user input directly in SVG
   ```solidity
   // BAD: User input could contain malicious SVG/script
   function setSvg(string memory userSvg) external { ... }
   
   // GOOD: Only allow controlled attributes
   function setColor(uint8 hue) external {
       require(hue <= 360, "Invalid hue");
       // Use hue in SVG generation
   }
   ```

2. **Marketplace Compatibility**: Test on OpenSea, Blur, etc.

3. **Size Limits**: Very complex SVGs may not render

## Code Patterns

### Complete On-Chain SVG NFT
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract OnChainSVGNFT is ERC721 {
    using Counters for Counters.Counter;
    using Strings for uint256;
    
    Counters.Counter private _tokenIds;
    
    struct TokenData {
        uint256 seed;
        uint256 createdAt;
    }
    
    mapping(uint256 => TokenData) public tokenData;
    
    constructor() ERC721("OnChain Art", "OCHART") {}
    
    function mint() external returns (uint256) {
        _tokenIds.increment();
        uint256 newId = _tokenIds.current();
        
        tokenData[newId] = TokenData({
            seed: uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, newId))),
            createdAt: block.timestamp
        });
        
        _safeMint(msg.sender, newId);
        return newId;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        string memory svg = generateSVG(tokenId);
        string memory attributes = generateAttributes(tokenId);
        
        string memory json = string(abi.encodePacked(
            '{"name": "OnChain Art #', tokenId.toString(),
            '", "description": "Generative art stored entirely on-chain",',
            '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
            '", "attributes": ', attributes, '}'
        ));
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }
    
    function generateSVG(uint256 tokenId) internal view returns (string memory) {
        TokenData memory data = tokenData[tokenId];
        
        // Derive traits from seed
        uint256 bgHue = data.seed % 360;
        uint256 shapeHue = (data.seed / 360) % 360;
        uint256 numShapes = 3 + (data.seed / 129600) % 5;
        
        bytes memory shapes;
        for (uint256 i = 0; i < numShapes; i++) {
            uint256 shapeSeed = uint256(keccak256(abi.encodePacked(data.seed, i)));
            uint256 x = 20 + (shapeSeed % 160);
            uint256 y = 20 + ((shapeSeed / 200) % 160);
            uint256 size = 10 + ((shapeSeed / 40000) % 40);
            uint256 hue = (shapeHue + (i * 30)) % 360;
            
            shapes = abi.encodePacked(shapes,
                '<circle cx="', x.toString(),
                '" cy="', y.toString(),
                '" r="', size.toString(),
                '" fill="hsl(', hue.toString(), ', 70%, 60%)" opacity="0.8"/>'
            );
        }
        
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">',
            '<rect width="200" height="200" fill="hsl(', bgHue.toString(), ', 50%, 15%)"/>',
            shapes,
            '</svg>'
        ));
    }
    
    function generateAttributes(uint256 tokenId) internal view returns (string memory) {
        TokenData memory data = tokenData[tokenId];
        
        uint256 numShapes = 3 + (data.seed / 129600) % 5;
        string memory rarity = numShapes >= 6 ? "Rare" : (numShapes >= 5 ? "Uncommon" : "Common");
        
        return string(abi.encodePacked(
            '[{"trait_type": "Shapes", "value": ', numShapes.toString(),
            '}, {"trait_type": "Rarity", "value": "', rarity,
            '"}]'
        ));
    }
    
    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenData[tokenId].createdAt != 0;
    }
}
```

## Common Gotchas

1. **String Concatenation is Expensive**: Minimize abi.encodePacked calls
2. **Base64 Adds ~33% Size**: Factor into gas estimates
3. **Special Characters**: Escape `<`, `>`, `&`, `"` in attributes
4. **SVG Compatibility**: Not all features work everywhere
5. **View Function Gas**: tokenURI() can be expensive; some RPCs timeout

## Real-World Applications

- Loot (on-chain text)
- Nouns (on-chain pixel art)
- Autoglyphs (generative on-chain)
- Shields (SVG heraldry)
- On-chain gaming items

## Builder Checklist

- [ ] Use Base64 encoding for data URIs
- [ ] Include proper JSON metadata structure
- [ ] Optimize string concatenation
- [ ] Test rendering on marketplaces
- [ ] Generate deterministic traits from seed
- [ ] Consider gas costs for complex SVGs
- [ ] Escape special characters
- [ ] Add relevant attributes/traits
