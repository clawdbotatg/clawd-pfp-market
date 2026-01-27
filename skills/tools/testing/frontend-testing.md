# Frontend Testing with Browser Automation

After deploying contracts and starting the frontend, use the `cursor-browser-extension` MCP to automatically test your dApp by opening a browser, funding the burner wallet, and interacting with the UI.

> **THIS IS THE PRIMARY TEST METHOD**: Scaffold-ETH 2 is a fullstack app. The best way to test is through the browser - you verify both the smart contract AND the frontend work together. Don't just run contract tests in isolation.

> **IT'S FAST**: On a local fork, transactions confirm INSTANTLY. Don't wait 20-30 seconds between clicks - that's mainnet thinking! With `pollingInterval: 3000` (which you should set in `scaffold.config.ts`), the UI updates within 3 seconds. Click a button, wait 3 seconds max, see the result. The whole test flow takes seconds, not minutes.

---

## Quick Start

After `yarn start` is running:

```
1. Navigate to http://localhost:3000
2. Take a snapshot to get page elements
3. Click faucet to fund burner wallet with ETH
4. (Optional) Transfer tokens from whales if needed
5. Click through the app to test functionality
```

---

## Browser Extension MCP Tools

The `cursor-browser-extension` MCP provides these tools for UI testing:

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Navigate to a URL |
| `browser_snapshot` | Get accessibility snapshot with element refs |
| `browser_click` | Click an element (requires ref from snapshot) |
| `browser_type` | Type text into an input field |
| `browser_fill_form` | Fill multiple form fields at once |
| `browser_wait_for` | Wait for text to appear/disappear |
| `browser_take_screenshot` | Capture visual screenshot |

---

## Step-by-Step Testing Workflow

### Step 1: Navigate to the App

```
Tool: browser_navigate
Arguments: { "url": "http://localhost:3000" }
```

Wait a moment for the page to load fully.

### Step 2: Take a Snapshot

```
Tool: browser_snapshot
Arguments: {}
```

This returns an accessibility tree with element refs. Look for:
- **Faucet button** - Usually labeled "Faucet" or shows a water drop icon
- **Connected address** - Displayed in the header (0x...)
- **Navigation links** - Home, Debug, your custom pages
- **Form inputs** - Text fields, buttons for your app

### Step 3: Fund the Burner Wallet (Faucet)

The burner wallet starts with 0 ETH. Click the faucet to get test ETH:

```
Tool: browser_click
Arguments: {
  "element": "Faucet button",
  "ref": "<ref from snapshot>"
}
```

Wait for the transaction to complete:

```
Tool: browser_wait_for
Arguments: { "text": "Received" }
```

Or wait a few seconds:

```
Tool: browser_wait_for
Arguments: { "time": 3 }
```

### Step 4: Get the Connected Address

From the snapshot, find the connected wallet address (displayed in header). It looks like `0x1234...abcd`. You'll need the full address for token funding.

**To get the full address:**
1. Click on the address display in the header
2. It usually copies to clipboard or shows full address
3. Or check the browser snapshot for the full value

### Step 5: Fund with Tokens (If Needed)

If your app needs tokens (USDC, etc.), transfer from whale accounts:

```bash
# Give whale ETH for gas
cast rpc anvil_setBalance 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb 0x56BC75E2D63100000

# Impersonate Morpho Blue (USDC whale on Base)
cast rpc anvil_impersonateAccount 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb

# Transfer 10,000 USDC (6 decimals) to burner wallet
cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "transfer(address,uint256)" <BURNER_ADDRESS> 10000000000 \
  --from 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb --unlocked
```

Replace `<BURNER_ADDRESS>` with the address from the browser snapshot.

See `data/addresses/whales.json` for whale addresses on different chains.

### Step 6: Test App Functionality

Now interact with your app's UI:

**Navigate to your app page:**
```
Tool: browser_navigate
Arguments: { "url": "http://localhost:3000/your-page" }
```

**Take a snapshot to find elements:**
```
Tool: browser_snapshot
Arguments: {}
```

**Type into input fields:**
```
Tool: browser_type
Arguments: {
  "element": "Amount input field",
  "ref": "<ref from snapshot>",
  "text": "1.5"
}
```

**Click buttons:**
```
Tool: browser_click
Arguments: {
  "element": "Buy button",
  "ref": "<ref from snapshot>"
}
```

**Wait for transaction result:**
```
Tool: browser_wait_for
Arguments: { "text": "Transaction completed" }
```

---

## Scaffold-ETH 2 UI Elements

Common elements you'll find in Scaffold-ETH 2 apps:

### Header
- **Faucet button** - Gives test ETH to connected wallet
- **Connected address** - Shows current wallet (burner by default)
- **Network indicator** - Shows connected chain
- **Balance display** - ETH balance of connected wallet

### Debug Page (`/debug`)
- Lists all deployed contracts
- Auto-generated UI for every contract function
- Great for testing individual functions

### Transaction Notifications
- **"Transaction sent"** - TX submitted to network
- **"Transaction completed"** - TX confirmed
- **Error messages** - If TX reverts

---

## Example Test Flows

### Token Vendor Test

```
1. browser_navigate to http://localhost:3000
2. browser_snapshot to get elements
3. browser_click on Faucet button
4. browser_wait_for "Received" text
5. browser_navigate to http://localhost:3000/vendor (or your vendor page)
6. browser_snapshot to find Buy input and button
7. browser_type "0.1" into ETH amount input
8. browser_click on "Buy Tokens" button
9. browser_wait_for transaction completion
10. Verify token balance updated (take another snapshot)
```

### NFT Minting Test

```
1. Fund burner wallet via faucet
2. Navigate to mint page
3. Fill in NFT metadata (name, description)
4. Click "Mint" button
5. Wait for transaction
6. Verify NFT appears in collection/gallery
```

### Staking Test

```
1. Fund burner wallet with ETH (faucet)
2. Fund burner wallet with staking tokens (whale transfer)
3. Navigate to staking page
4. Approve tokens (click Approve, wait for TX)
5. Enter stake amount
6. Click Stake button
7. Wait for transaction
8. Verify staked balance updated
9. Wait some time, verify rewards accumulating
```

---

## Debugging Failed Tests

### Page Not Loading
- Verify `yarn start` is running
- Check terminal for compilation errors
- Try `http://localhost:3000` manually in browser

### Faucet Not Working
- Verify `yarn fork` is running (not `yarn chain`)
- Check that chain ID is 31337
- Faucet only works on local/fork networks

### Transaction Failing
- Check browser console for errors (use `browser_console_messages`)
- Verify burner has enough ETH for gas
- Check contract function requirements

### Element Not Found
- Take a fresh snapshot after page loads
- Wait for dynamic content to render
- Check if element is inside a modal or dropdown

---

## Tips

1. **Always snapshot after navigation** - Page content changes, refs become stale
2. **Wait for transactions** - Don't click next button until previous TX confirms
3. **Check balances** - Verify state changes after each action
4. **Use Debug page** - `/debug` gives direct contract access for verification
5. **Read console messages** - Use `browser_console_messages` to catch errors
