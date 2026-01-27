# Ethereum Wingman

A comprehensive Ethereum development tutor and guide built as an Agent Skill. Teaches smart contract development through SpeedRun Ethereum challenges, Scaffold-ETH tooling, and security best practices.

## Quick Start

**Build an Ethereum dApp from scratch with AI assistance:**

```bash
# 1. Create a new project folder
mkdir my-defi-project
cd my-defi-project

# 2. Install the Ethereum Wingman skill
npx skills add austintgriffith/ethereum-wingman

# 3. Open in Cursor (or your AI-enabled editor)
cursor .
```

**Then just tell the AI what you want to build:**

> "Help me build a dApp where users can stake ETH and earn rewards"

> "Create a token with buy/sell functionality like SpeedRun Ethereum Challenge 2"

> "Build an NFT collection with on-chain SVG art"

The Ethereum Wingman will:
- 🏗️ Scaffold a Scaffold-ETH 2 project for you
- ⚠️ Warn you about critical gotchas (token decimals, reentrancy, etc.)
- 🔐 Guide you on security best practices
- 📚 Reference SpeedRun Ethereum challenges for learning

---

## What is Ethereum Wingman?

Ethereum Wingman is a knowledge base and prompt system that helps AI agents assist developers learning Ethereum development. It covers:

- **SpeedRun Ethereum Challenges**: TLDR modules for all 12 challenges
- **Scaffold-ETH 2 Integration**: Tooling docs, hooks reference, fork workflows
- **DeFi Protocols**: Uniswap, Aave, Compound patterns
- **ERC Standards**: Comprehensive guides for ERC-20, 721, 1155, 4626
- **Security**: Critical gotchas, historical hacks, pre-production checklist

## Installation

### Via skills.sh (Recommended)
```bash
npx skills add austintgriffith/ethereum-wingman
```

This works with Cursor, Claude Code, Codex, OpenCode, and other AI coding agents.

### Manual Installation

**For Cursor:**
Copy `.cursorrules` to your project root or add to your global Cursor rules.

**For Claude Code:**
Reference the `CLAUDE.md` file in your project instructions.

**As MCP Integration:**
The skill.json manifest describes capabilities that can be integrated with MCP-compatible agents.

## Directory Structure

```
ethereum-wingman/
├── skills/
│   └── ethereum-wingman/    # skills.sh compatible package
│       ├── SKILL.md         # Skill definition with frontmatter
│       ├── AGENTS.md        # Full compiled instructions
│       ├── metadata.json    # Skill metadata
│       ├── README.md        # Skill documentation
│       ├── scripts/         # Helper scripts
│       │   ├── init-project.sh
│       │   └── check-gotchas.sh
│       └── references/      # Key knowledge files
├── knowledge/
│   ├── challenges/     # 12 SpeedRun Ethereum challenge modules
│   ├── protocols/      # DeFi protocol documentation
│   ├── standards/      # ERC standards
│   ├── foundations/    # Core concepts
│   └── gotchas/        # Security knowledge
├── tools/
│   ├── scaffold-eth/   # Scaffold-ETH 2 documentation
│   ├── deployment/     # Deployment patterns
│   └── security/       # Security tools
├── prompts/            # AI agent prompts
├── AGENTS.md           # Symlink to skills/ethereum-wingman/AGENTS.md
├── skill.json          # Legacy skill manifest
├── .cursorrules        # Cursor IDE integration
└── CLAUDE.md           # Claude Code integration
```

## Key Concepts Covered

### 🚨 The Most Important Concept

**NOTHING IS AUTOMATIC ON ETHEREUM.**

Smart contracts cannot execute themselves. For any function that "needs to happen":
1. Make it callable by **ANYONE** (not just admin)
2. Give callers a **REASON** (profit, reward, their own interest)
3. Make the incentive **SUFFICIENT** to cover gas + profit

The Wingman will always ask: *"Who calls this function? Why would they pay gas?"*

### Critical Gotchas
Every Ethereum developer must know:

1. **Token Decimals Vary**: USDC = 6, WBTC = 8, most = 18
2. **Approve Pattern Required**: Contracts need approval before transferFrom
3. **Reentrancy Attacks**: Always use Checks-Effects-Interactions + ReentrancyGuard
4. **Oracle Manipulation**: Never use DEX spot prices
5. **No Floating Point**: Use basis points (500/10000 = 5%)
6. **Nothing is Automatic**: Design incentives for function callers
7. **Vault Inflation Attack**: Protect first depositors

### SpeedRun Ethereum Challenges
Each challenge teaches a key blockchain concept:

| Challenge | Concept |
|-----------|---------|
| Simple NFT | ERC-721, minting, metadata |
| Decentralized Staking | Coordination, deadlines, escrow |
| Token Vendor | ERC-20 approve pattern |
| Dice Game | Randomness vulnerabilities |
| DEX | AMM, constant product formula |
| Oracles | Price feeds, manipulation resistance |
| Lending | Collateralization, liquidation |
| Stablecoins | Pegging mechanisms |
| Prediction Markets | Outcome resolution |
| ZK Voting | Privacy-preserving governance |
| Multisig | Threshold signatures |
| SVG NFT | On-chain generative art |

## Usage Examples

### Teaching Mode
Ask questions like:
- "How does the ERC-20 approve pattern work?"
- "Explain the constant product formula in AMMs"
- "What are the security considerations for a lending protocol?"

### Code Review Mode
Submit code for review:
- "Review this withdrawal function for vulnerabilities"
- "Check this vault contract for inflation attacks"
- "Audit this oracle integration"

### Build Mode
Get help building:
- "Help me build a token with buy/sell functionality"
- "Set up a staking contract with rewards"
- "Create an NFT minting page"

### Debug Mode
Troubleshoot issues:
- "Why is my transaction reverting?"
- "How do I fix 'insufficient allowance' errors?"
- "Debug this reentrancy issue"

## Contributing

To add new content:
1. Add markdown files to appropriate directory
2. Follow existing format (TLDR, code examples, security notes)
3. Update skill.json if adding new capabilities
4. Test with AI agent to ensure clarity

## License

MIT License - Use freely for learning and building.

## Credits

Built for the [BuidlGuidl](https://buidlguidl.com/) community.

Integrates knowledge from:
- [SpeedRun Ethereum](https://speedrunethereum.com/)
- [Scaffold-ETH 2](https://scaffoldeth.io/)
- [OpenZeppelin](https://openzeppelin.com/)
- [Chainlink](https://chain.link/)
