# Clawd PFP Prediction Market — Full Specification

## Overview

A prediction market dApp where anyone can submit an image URL to become Clawd's next profile picture by staking $CLAWD tokens. Other users can stake on submissions they think will win. After a countdown, Clawd picks the winner and stakers of the winning image split the pool.

## Token

- **$CLAWD:** `0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07` (Base, 18 decimals)
- **Stake amount:** 50,000 CLAWD (hardcoded, ≈$5 at time of writing @ $0.0001/CLAWD)

## Core Mechanics

### Submission
- Anyone can submit an image URL + stake 50,000 $CLAWD
- One submission per wallet
- Submission is **hidden/pending** until admin reviews it
- Submitter becomes the "OP" (original proposer) for that image

### Bonding Curve (Per Image)
- Each whitelisted image has its own bonding curve
- As more people stake on an image, the price per share increases (later stakers get fewer shares per token)
- Staking is only allowed on **whitelisted** images
- Minimum stake per buy: 50,000 CLAWD (same as submission cost)

### Admin (Clawd's Wallet)
The admin is Clawd's MetaMask wallet: `0x11ce532845cE0eAcdA41f72FDc1C88c335981442`

Admin can:
1. **Whitelist** — approve pending submissions in batches → image becomes visible and stakeable
2. **Ban/Slash** — flag a submission as banned → submitter's staked CLAWD sent to burn address (0x000...dead)
3. **Pick Winner** — after timer ends, choose the winning image from the top 10

### Timer / Countdown
- **Testing:** 2 minutes
- **Production:** 5 hours
- Countdown displayed at top of the page
- No new submissions after timer ends
- No new staking after timer ends
- Admin picks winner after timer ends

### Winner Selection & Distribution
When admin picks the winner, the total pool (all staked CLAWD across ALL images) is distributed:

1. 🔥 **25% burned** — sent to burn address
2. 🎨 **10% to winning image's OP** — the person who originally submitted the winning image
3. 💰 **65% split among winning image stakers** — proportional to their bonding curve shares

Stakers on losing images get nothing (their tokens go into the pool).

## Smart Contract Interface

### State
```
address public admin;                          // Clawd's wallet
IERC20 public clawdToken;                      // $CLAWD token
uint256 public constant STAKE_AMOUNT = 50_000e18; // 50k CLAWD
uint256 public deadline;                       // Block timestamp when round ends
bool public winnerPicked;                      // Whether winner has been chosen

struct Submission {
    address submitter;          // OP address
    string imageUrl;            // Image URL
    uint256 totalStaked;        // Total CLAWD staked on this image
    uint256 totalShares;        // Total shares issued (bonding curve)
    Status status;              // Pending / Whitelisted / Banned
}

enum Status { Pending, Whitelisted, Banned }

mapping(uint256 => Submission) public submissions;         // id => Submission
mapping(uint256 => mapping(address => uint256)) public shares; // submissionId => staker => shares
mapping(address => bool) public hasSubmitted;              // one submission per wallet
uint256 public submissionCount;
```

### Key Functions

**User Functions:**
- `submit(string imageUrl)` — submit image + stake 50k CLAWD (requires token approval)
- `stake(uint256 submissionId)` — stake 50k CLAWD on a whitelisted image, receive shares based on bonding curve

**Admin Functions:**
- `whitelistBatch(uint256[] ids)` — approve multiple pending submissions
- `banAndSlash(uint256 id)` — ban a submission, burn their staked CLAWD
- `pickWinner(uint256 submissionId)` — pick the winner after deadline, trigger distribution

**View Functions:**
- `getTopSubmissions(uint256 offset, uint256 limit)` — paginated list sorted by totalStaked (descending), only whitelisted
- `getPendingSubmissions(uint256 offset, uint256 limit)` — paginated list of pending (admin only view in frontend)
- `getSubmission(uint256 id)` — get single submission details
- `getShareBalance(uint256 submissionId, address staker)` — check a staker's shares
- `submissionCount()` — total number of submissions

### Bonding Curve Formula

Simple linear curve: price = base + (totalShares * increment)

For each stake of 50k CLAWD:
- shares received = STAKE_AMOUNT / currentPrice
- currentPrice = basePrice + (totalShares * priceIncrement)

This means early stakers get more shares, later stakers get fewer. Keeps it simple and incentivizes early conviction.

### Distribution Logic (pickWinner)

```
totalPool = sum of all CLAWD staked across all images (minus already-slashed/burned)
burnAmount = totalPool * 25 / 100
opBonus = totalPool * 10 / 100
stakerPool = totalPool - burnAmount - opBonus

// Burn
transfer burnAmount to 0x000000000000000000000000000000000000dEaD

// OP bonus
transfer opBonus to winning submission's submitter

// Staker distribution
for each staker on winning image:
    payout = stakerPool * stakerShares / totalWinningShares
    transfer payout to staker
```

## Frontend Pages

### 1. Main Page
- **Countdown timer** at the top (big, prominent)
- **Submit form:** image URL input + "Submit & Stake 50k $CLAWD" button
- **Leaderboard:** sorted by total staked (descending), paginated 10 per page
  - Each entry shows: image thumbnail, OP address, total staked, number of stakers
  - "Stake" button on each whitelisted entry
- After deadline: show "Voting closed — waiting for Clawd to pick winner"
- After winner picked: show winner prominently with distribution results

### 2. Admin Panel (only visible to admin wallet)
- **Pending submissions** list with image previews
- **Batch whitelist** — checkboxes + "Approve Selected" button
- **Ban/Slash** button on each pending submission
- **Pick Winner** UI — shows top 10 whitelisted by total staked, click to pick

### 3. Lobster Theme 🦞
- Lobster-themed design (Clawd's brand)
- Fun, playful, not corporate

## Tech Stack

- **Scaffold-ETH 2** (Next.js frontend + Foundry contracts)
- **Foundry** for smart contracts
- **Base** network
- **IPFS or Vercel** for deployment

## Project Structure

```
~/clawd/projects/clawd-pfp-market/
├── SPEC.md (this file)
├── packages/
│   ├── foundry/
│   │   └── contracts/
│   │       └── ClawdPFPMarket.sol
│   └── nextjs/
│       └── app/
│           └── ... (frontend)
```

## Key Addresses

- **$CLAWD Token:** `0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07` (Base)
- **Admin (Clawd's wallet):** `0x11ce532845cE0eAcdA41f72FDc1C88c335981442`
- **Burn address:** `0x000000000000000000000000000000000000dEaD`
- **Deployer keystore:** `clawd-deployer-2` (address: `0xdaad319fcbd1a9cb3b176ba80a851dc6031a4759`)

## Flow Summary

```
1. Deploy contract with timer (2 min test / 5 hours prod)
2. Users submit image URLs + stake 50k CLAWD each
3. Clawd reviews submissions in admin panel
   - Whitelist good ones → visible + stakeable
   - Ban bad ones → stake slashed/burned
4. Others browse leaderboard, stake on favorites
5. Timer ends → submissions/staking locked
6. Clawd picks winner from top 10
7. Distribution: 25% burn, 10% to OP, 65% to winning stakers
8. Clawd updates profile pic to the winner 🦞
```
