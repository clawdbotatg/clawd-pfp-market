# Full-Stack dApp Patterns

## Overview

Common patterns for building complete decentralized applications with Scaffold-ETH 2, from smart contract to frontend.

## Pattern 1: Token with Vendor

A basic pattern for creating a token with buy/sell functionality.

### Smart Contract
```solidity
// packages/hardhat/contracts/YourToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract YourToken is ERC20 {
    constructor() ERC20("YourToken", "YTK") {
        _mint(msg.sender, 1000000 * 10**18);
    }
}

// packages/hardhat/contracts/Vendor.sol
contract Vendor {
    YourToken public token;
    uint256 public constant tokensPerEth = 100;
    address public owner;

    event BuyTokens(address buyer, uint256 ethAmount, uint256 tokenAmount);
    event SellTokens(address seller, uint256 tokenAmount, uint256 ethAmount);

    constructor(address tokenAddress) {
        token = YourToken(tokenAddress);
        owner = msg.sender;
    }

    function buyTokens() public payable {
        uint256 tokenAmount = msg.value * tokensPerEth;
        require(token.balanceOf(address(this)) >= tokenAmount, "Not enough tokens");
        token.transfer(msg.sender, tokenAmount);
        emit BuyTokens(msg.sender, msg.value, tokenAmount);
    }

    function sellTokens(uint256 tokenAmount) public {
        require(tokenAmount > 0, "Must sell > 0");
        uint256 ethAmount = tokenAmount / tokensPerEth;
        require(address(this).balance >= ethAmount, "Not enough ETH");
        
        token.transferFrom(msg.sender, address(this), tokenAmount);
        payable(msg.sender).transfer(ethAmount);
        emit SellTokens(msg.sender, tokenAmount, ethAmount);
    }

    function withdraw() public {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
}
```

### Frontend Component
```typescript
// packages/nextjs/app/vendor/page.tsx
"use client";

import { useState } from "react";
import { parseEther, formatEther } from "viem";
import { useAccount } from "wagmi";
import { 
  useScaffoldReadContract, 
  useScaffoldWriteContract 
} from "~~/hooks/scaffold-eth";

export default function VendorPage() {
  const { address } = useAccount();
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");

  // Read balances
  const { data: tokenBalance } = useScaffoldReadContract({
    contractName: "YourToken",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: vendorBalance } = useScaffoldReadContract({
    contractName: "YourToken",
    functionName: "balanceOf",
    args: ["VENDOR_ADDRESS"], // Replace with deployed address
  });

  // Write functions
  const { writeContractAsync: buyTokens, isPending: isBuying } = 
    useScaffoldWriteContract("Vendor");
  
  const { writeContractAsync: sellTokens, isPending: isSelling } = 
    useScaffoldWriteContract("Vendor");

  const { writeContractAsync: approveTokens } = 
    useScaffoldWriteContract("YourToken");

  const handleBuy = async () => {
    await buyTokens({
      functionName: "buyTokens",
      value: parseEther(buyAmount),
    });
    setBuyAmount("");
  };

  const handleSell = async () => {
    // First approve
    await approveTokens({
      functionName: "approve",
      args: ["VENDOR_ADDRESS", parseEther(sellAmount)],
    });
    // Then sell
    await sellTokens({
      functionName: "sellTokens",
      args: [parseEther(sellAmount)],
    });
    setSellAmount("");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Token Vendor</h1>
      
      <div className="mb-4">
        <p>Your Balance: {formatEther(tokenBalance || 0n)} YTK</p>
        <p>Vendor Balance: {formatEther(vendorBalance || 0n)} YTK</p>
      </div>

      <div className="mb-4">
        <h2 className="text-xl">Buy Tokens (100 YTK per ETH)</h2>
        <input
          type="text"
          value={buyAmount}
          onChange={(e) => setBuyAmount(e.target.value)}
          placeholder="ETH amount"
          className="input input-bordered mr-2"
        />
        <button 
          onClick={handleBuy} 
          disabled={isBuying}
          className="btn btn-primary"
        >
          {isBuying ? "Buying..." : "Buy"}
        </button>
      </div>

      <div>
        <h2 className="text-xl">Sell Tokens</h2>
        <input
          type="text"
          value={sellAmount}
          onChange={(e) => setSellAmount(e.target.value)}
          placeholder="Token amount"
          className="input input-bordered mr-2"
        />
        <button 
          onClick={handleSell} 
          disabled={isSelling}
          className="btn btn-secondary"
        >
          {isSelling ? "Selling..." : "Sell"}
        </button>
      </div>
    </div>
  );
}
```

## Pattern 2: NFT Minting dApp

### Smart Contract
```solidity
// packages/hardhat/contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    uint256 public mintPrice = 0.01 ether;
    uint256 public maxSupply = 10000;
    bool public mintingEnabled = true;

    event Minted(address indexed to, uint256 indexed tokenId, string tokenURI);

    constructor() ERC721("MyNFT", "MNFT") {}

    function mint(string memory tokenURI) public payable returns (uint256) {
        require(mintingEnabled, "Minting disabled");
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_tokenIds.current() < maxSupply, "Max supply reached");

        _tokenIds.increment();
        uint256 newId = _tokenIds.current();
        
        _safeMint(msg.sender, newId);
        _setTokenURI(newId, tokenURI);
        
        emit Minted(msg.sender, newId, tokenURI);
        return newId;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }

    function setMintPrice(uint256 _price) external onlyOwner {
        mintPrice = _price;
    }

    function toggleMinting() external onlyOwner {
        mintingEnabled = !mintingEnabled;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
```

### Frontend with IPFS Upload
```typescript
// packages/nextjs/app/mint/page.tsx
"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function MintPage() {
  const { address } = useAccount();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minting, setMinting] = useState(false);

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "MyNFT",
    functionName: "totalSupply",
  });

  const { data: mintPrice } = useScaffoldReadContract({
    contractName: "MyNFT",
    functionName: "mintPrice",
  });

  const { writeContractAsync: mint } = useScaffoldWriteContract("MyNFT");

  const uploadToIPFS = async () => {
    if (!file) return null;
    
    // Upload image
    const formData = new FormData();
    formData.append("file", file);
    
    const imageRes = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const { imageUrl } = await imageRes.json();

    // Create and upload metadata
    const metadata = {
      name,
      description,
      image: imageUrl,
      attributes: [],
    };

    const metadataRes = await fetch("/api/upload-json", {
      method: "POST",
      body: JSON.stringify(metadata),
    });
    const { metadataUrl } = await metadataRes.json();

    return metadataUrl;
  };

  const handleMint = async () => {
    setMinting(true);
    try {
      const tokenURI = await uploadToIPFS();
      if (!tokenURI) throw new Error("Upload failed");

      await mint({
        functionName: "mint",
        args: [tokenURI],
        value: mintPrice,
      });

      // Reset form
      setFile(null);
      setName("");
      setDescription("");
    } catch (error) {
      console.error("Minting failed:", error);
    }
    setMinting(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Mint NFT</h1>
      
      <p className="mb-4">
        Minted: {totalSupply?.toString() || "0"} / 10,000
      </p>

      <div className="space-y-4">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="file-input w-full"
        />

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="NFT Name"
          className="input input-bordered w-full"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="textarea textarea-bordered w-full"
        />

        <button
          onClick={handleMint}
          disabled={minting || !file || !name}
          className="btn btn-primary w-full"
        >
          {minting ? "Minting..." : `Mint (${formatEther(mintPrice || 0n)} ETH)`}
        </button>
      </div>
    </div>
  );
}
```

## Pattern 3: Staking dApp

### Smart Contract
```solidity
// packages/hardhat/contracts/Staking.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Staking is ReentrancyGuard {
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    
    uint256 public rewardRate = 100; // Rewards per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored;
        return rewardPerTokenStored + 
            ((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return (balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 
            + rewards[account];
    }

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        totalSupply += amount;
        balances[msg.sender] += amount;
        stakingToken.transferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        totalSupply -= amount;
        balances[msg.sender] -= amount;
        stakingToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external {
        withdraw(balances[msg.sender]);
        getReward();
    }
}
```

### Frontend
```typescript
// packages/nextjs/app/stake/page.tsx
"use client";

import { useState } from "react";
import { parseEther, formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function StakePage() {
  const { address } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");

  // Read staking data
  const { data: stakedBalance } = useScaffoldReadContract({
    contractName: "Staking",
    functionName: "balances",
    args: [address],
  });

  const { data: earnedRewards } = useScaffoldReadContract({
    contractName: "Staking",
    functionName: "earned",
    args: [address],
    watch: true, // Auto-refresh
  });

  const { data: totalStaked } = useScaffoldReadContract({
    contractName: "Staking",
    functionName: "totalSupply",
  });

  // Write functions
  const { writeContractAsync: approve } = useScaffoldWriteContract("StakingToken");
  const { writeContractAsync: stake, isPending: isStaking } = useScaffoldWriteContract("Staking");
  const { writeContractAsync: withdraw, isPending: isWithdrawing } = useScaffoldWriteContract("Staking");
  const { writeContractAsync: claimReward, isPending: isClaiming } = useScaffoldWriteContract("Staking");

  const handleStake = async () => {
    const amount = parseEther(stakeAmount);
    // Approve first
    await approve({
      functionName: "approve",
      args: ["STAKING_CONTRACT_ADDRESS", amount],
    });
    // Then stake
    await stake({
      functionName: "stake",
      args: [amount],
    });
    setStakeAmount("");
  };

  const handleWithdraw = async () => {
    await withdraw({
      functionName: "withdraw",
      args: [stakedBalance],
    });
  };

  const handleClaim = async () => {
    await claimReward({
      functionName: "getReward",
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Staking</h1>

      <div className="stats shadow mb-4">
        <div className="stat">
          <div className="stat-title">Your Stake</div>
          <div className="stat-value">{formatEther(stakedBalance || 0n)}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Rewards</div>
          <div className="stat-value">{formatEther(earnedRewards || 0n)}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            placeholder="Amount to stake"
            className="input input-bordered flex-1"
          />
          <button onClick={handleStake} disabled={isStaking} className="btn btn-primary">
            {isStaking ? "Staking..." : "Stake"}
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={handleWithdraw} disabled={isWithdrawing} className="btn btn-secondary flex-1">
            {isWithdrawing ? "Withdrawing..." : "Withdraw All"}
          </button>
          <button onClick={handleClaim} disabled={isClaiming} className="btn btn-accent flex-1">
            {isClaiming ? "Claiming..." : "Claim Rewards"}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-500">
          Total Staked: {formatEther(totalStaked || 0n)} tokens
        </p>
      </div>
    </div>
  );
}
```

## Common UI Components

### Transaction Button with Loading
```typescript
function TxButton({ onClick, loading, children }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`btn btn-primary ${loading ? "loading" : ""}`}
    >
      {loading ? "Processing..." : children}
    </button>
  );
}
```

### Token Balance Display
```typescript
function TokenBalance({ token, address }) {
  const { data: balance } = useScaffoldReadContract({
    contractName: token,
    functionName: "balanceOf",
    args: [address],
  });

  const { data: symbol } = useScaffoldReadContract({
    contractName: token,
    functionName: "symbol",
  });

  return (
    <span>
      {formatEther(balance || 0n)} {symbol}
    </span>
  );
}
```

### Approval Flow
```typescript
async function handleApproveAndAction(tokenContract, spender, amount, action) {
  // Check current allowance
  const allowance = await readContract({
    contractName: tokenContract,
    functionName: "allowance",
    args: [address, spender],
  });

  // Approve if needed
  if (allowance < amount) {
    await writeContract({
      contractName: tokenContract,
      functionName: "approve",
      args: [spender, amount],
    });
  }

  // Execute action
  await action();
}
```
