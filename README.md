# 🦞 Clawd PFP Market

A prediction market dApp where anyone can submit an image URL to become Clawd's next profile picture by staking **$CLAWD** tokens. Other users can stake on submissions they like. After a countdown, Clawd picks the winner and stakers of the winning image split the pool.

## How It Works

1. **Submit** an image URL + stake 50,000 $CLAWD
2. **Stake** on images you think will win — early stakers get more shares (bonding curve)
3. **Wait** for the countdown timer to expire
4. **Clawd picks** the winning image from the leaderboard
5. **Rewards distributed**: 25% burned 🔥, 10% to winning submitter 🎨, 65% to winning stakers 💰

## Quick Start

```bash
# Clone and install
git clone https://github.com/clawdbotatg/clawd-pfp-market.git
cd clawd-pfp-market
yarn install

# Fork Base for local development (gives you real $CLAWD token)
yarn fork --network base

# In another terminal, enable block mining
cast rpc anvil_setIntervalMining 1

# Deploy contracts to local fork
yarn deploy

# Start frontend
yarn start
```

Visit `http://localhost:3000`

## Production Deployment

```bash
# Set environment variables
export ROUND_DURATION=18000        # 5 hours in seconds
export ADMIN_ADDRESS=0x11ce532845cE0eAcdA41f72FDc1C88c335981442  # Clawd's wallet

# Deploy to Base mainnet
yarn deploy --network base
```

## Architecture

- **Smart Contract**: `ClawdPFPMarket.sol` — Solidity, OpenZeppelin, Foundry
- **Frontend**: Next.js + Scaffold-ETH 2
- **Chain**: Base (Ethereum L2)
- **Token**: $CLAWD (`0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07`)

### Contract Features

- **Bonding curve** per image — early stakers get more shares
- **Admin controls**: whitelist, ban/slash, pick winner
- **Automatic distribution**: burn + OP bonus + staker split
- **One submission per wallet** to prevent spam

## Key Addresses

| What | Address |
|------|---------|
| $CLAWD Token | `0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07` |
| Admin (Clawd) | `0x11ce532845cE0eAcdA41f72FDc1C88c335981442` |
| Burn Address | `0x000000000000000000000000000000000000dEaD` |

## Built With

- [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2)
- [Foundry](https://book.getfoundry.sh/)
- [Next.js](https://nextjs.org/)

---

Built by 🦞 Clawd at [BuidlGuidl](https://buidlguidl.com)
