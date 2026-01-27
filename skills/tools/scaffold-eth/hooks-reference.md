# Scaffold-ETH 2 Hooks Reference

> **Verified**: Hook names confirmed against [scaffold-eth-2 GitHub repo](https://github.com/scaffold-eth/scaffold-eth-2/tree/main/packages/nextjs/hooks/scaffold-eth) (Jan 2026)

## Overview

Scaffold-ETH 2 provides custom React hooks that wrap wagmi/viem for seamless contract interaction. These hooks automatically handle ABI loading, type safety, and error handling.

## Reading Contract Data

### useScaffoldReadContract
Read data from your deployed contracts.

```typescript
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

function MyComponent() {
  // Basic read
  const { data: greeting } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "greeting",
  });

  // With arguments
  const { data: balance } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "balanceOf",
    args: ["0x1234..."],
  });

  // Full options
  const { 
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "complexFunction",
    args: [arg1, arg2],
    watch: true,  // Auto-refresh on new blocks
  });

  return <div>{greeting}</div>;
}
```

### useScaffoldContract
Get the deployed contract instance for direct access.

```typescript
import { useScaffoldContract } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const { data: contract } = useScaffoldContract({
    contractName: "YourContract",
  });

  // Access contract address and ABI
  console.log(contract?.address);
  console.log(contract?.abi);
}
```

### useDeployedContractInfo
Get deployment information.

```typescript
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const { data: deployedContract, isLoading } = useDeployedContractInfo("YourContract");

  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Address: {deployedContract?.address}</p>
      <p>Chain: {deployedContract?.chainId}</p>
    </div>
  );
}
```

## Writing to Contracts

### useScaffoldWriteContract
Write transactions to your contracts.

```typescript
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const { writeContractAsync, isPending } = useScaffoldWriteContract("YourContract");

  const handleClick = async () => {
    try {
      await writeContractAsync({
        functionName: "setGreeting",
        args: ["Hello World!"],
      });
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  // With ETH value
  const handleDeposit = async () => {
    await writeContractAsync({
      functionName: "deposit",
      value: parseEther("1.0"), // Send 1 ETH
    });
  };

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? "Sending..." : "Set Greeting"}
    </button>
  );
}
```

### useTransactor
Execute any transaction with built-in notifications.

```typescript
import { useTransactor } from "~~/hooks/scaffold-eth";
import { useWalletClient } from "wagmi";

function MyComponent() {
  const { data: walletClient } = useWalletClient();
  const transactor = useTransactor(walletClient);

  const handleSend = async () => {
    await transactor({
      to: "0x1234...",
      value: parseEther("1.0"),
    });
  };

  return <button onClick={handleSend}>Send ETH</button>;
}
```

## Events

### useScaffoldEventHistory
Fetch historical events.

```typescript
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const { data: events, isLoading } = useScaffoldEventHistory({
    contractName: "YourContract",
    eventName: "GreetingChange",
    fromBlock: 0n,  // From deployment
    watch: true,    // Subscribe to new events
    filters: {      // Optional: filter by indexed params
      setter: "0x1234...",
    },
  });

  return (
    <ul>
      {events?.map((event, index) => (
        <li key={index}>
          {event.args.newGreeting} by {event.args.setter}
        </li>
      ))}
    </ul>
  );
}
```

### useScaffoldWatchContractEvent
Subscribe to events in real-time.

```typescript
import { useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth";

function MyComponent() {
  useScaffoldWatchContractEvent({
    contractName: "YourContract",
    eventName: "GreetingChange",
    onLogs: (logs) => {
      logs.forEach((log) => {
        console.log("New greeting:", log.args.newGreeting);
        // Show notification, update state, etc.
      });
    },
  });

  return <div>Watching for events...</div>;
}
```

## Account & Network

### useAccount (from wagmi)
Get connected account info.

```typescript
import { useAccount } from "wagmi";

function MyComponent() {
  const { address, isConnected, chain } = useAccount();

  if (!isConnected) return <div>Connect wallet</div>;
  
  return <div>Connected: {address}</div>;
}
```

### useTargetNetwork
Get the target network configuration.

```typescript
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

function MyComponent() {
  const { targetNetwork } = useTargetNetwork();

  return (
    <div>
      Network: {targetNetwork.name}
      Chain ID: {targetNetwork.id}
    </div>
  );
}
```

### useNetworkColor
Get network-specific color for UI.

```typescript
import { useNetworkColor } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const networkColor = useNetworkColor();
  
  return <div style={{ color: networkColor }}>Network Status</div>;
}
```

## Price & Balance

### useAccountBalance
Get ETH and token balances.

```typescript
import { useAccountBalance } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const { balance, isLoading } = useAccountBalance("0x1234...");

  return <div>Balance: {balance?.formatted} ETH</div>;
}
```

### useScaffoldContractRead with Token Balances
```typescript
// Read ERC-20 balance
const { data: tokenBalance } = useScaffoldReadContract({
  contractName: "MyToken",
  functionName: "balanceOf",
  args: [address],
});

// Format with decimals
const formatted = formatUnits(tokenBalance ?? 0n, 18);
```

## External Contracts

### Using External Contracts
First, add to `externalContracts.ts`:

```typescript
// packages/nextjs/contracts/externalContracts.ts
const externalContracts = {
  1: {  // Mainnet
    USDC: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      abi: erc20Abi,
    },
    UniswapRouter: {
      address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      abi: swapRouterAbi,
    },
  },
  31337: {  // Local fork
    USDC: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      abi: erc20Abi,
    },
  },
} as const;

export default externalContracts;
```

Then use with hooks:
```typescript
const { data: usdcBalance } = useScaffoldReadContract({
  contractName: "USDC",
  functionName: "balanceOf",
  args: [address],
});
```

## Advanced Patterns

### Conditional Reading
```typescript
const { data } = useScaffoldReadContract({
  contractName: "YourContract",
  functionName: "getData",
  args: [userId],
  query: {
    enabled: !!userId,  // Only fetch when userId exists
  },
});
```

### Polling
```typescript
const { data } = useScaffoldReadContract({
  contractName: "YourContract",
  functionName: "getPrice",
  watch: true,
  query: {
    refetchInterval: 5000,  // Refetch every 5 seconds
  },
});
```

### Multiple Contract Calls
```typescript
function useMultipleReads() {
  const { data: balance } = useScaffoldReadContract({
    contractName: "Token",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: allowance } = useScaffoldReadContract({
    contractName: "Token",
    functionName: "allowance",
    args: [address, spender],
  });

  return { balance, allowance };
}
```

### Error Handling
```typescript
const { writeContractAsync } = useScaffoldWriteContract("YourContract");

const handleTransaction = async () => {
  try {
    const txHash = await writeContractAsync({
      functionName: "riskyFunction",
      args: [value],
    });
    console.log("Success:", txHash);
  } catch (error: any) {
    // Handle specific errors
    if (error.message.includes("insufficient funds")) {
      alert("Not enough ETH for gas");
    } else if (error.message.includes("user rejected")) {
      alert("Transaction cancelled");
    } else {
      console.error("Transaction failed:", error);
    }
  }
};
```

## Migration from wagmi

If you need direct wagmi access:

```typescript
import { useContractRead, useContractWrite } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

function MyComponent() {
  const { data: contractInfo } = useDeployedContractInfo("YourContract");

  // Direct wagmi hook with scaffold-eth contract
  const { data } = useContractRead({
    address: contractInfo?.address,
    abi: contractInfo?.abi,
    functionName: "myFunction",
  });
}
```
