"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { erc20Abi } from "viem";
import { base } from "viem/chains";
import { useAccount, useChainId, useReadContracts, useSwitchChain } from "wagmi";
import { useWriteContract } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const CLAWD_TOKEN = "0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07" as `0x${string}`;
const POLLING_INTERVAL = 3000; // 3 seconds - single batched poll
const PAGE_SIZE = 10; // items per page for pagination

// ═══════════════════════════════════════════════════════════
//         IMAGE URL VALIDATION & SANITIZATION
// ═══════════════════════════════════════════════════════════

const BLOCKED_PROTOCOLS = ["javascript:", "data:", "file:", "blob:", "ftp:", "vbscript:"];
const PLACEHOLDER_IMG = "https://placehold.co/200x200/1a1a2e/e94560?text=🦞";
const ERROR_IMG = "https://placehold.co/200x200/1a1a2e/e94560?text=❌";

function validateImageUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim().length === 0) {
    return { valid: false, error: "URL is required" };
  }

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  for (const protocol of BLOCKED_PROTOCOLS) {
    if (trimmed.startsWith(protocol)) {
      return { valid: false, error: `Blocked protocol: ${protocol}` };
    }
  }

  // Must be https (no http — mixed content + no encryption)
  if (!trimmed.startsWith("https://")) {
    return { valid: false, error: "Only https:// URLs are allowed" };
  }

  // Basic URL parse check
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "Only https:// URLs are allowed" };
    }
    // Block localhost / private IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local")
    ) {
      return { valid: false, error: "Private/local URLs are not allowed" };
    }
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Check file extension (relaxed — some URLs don't have extensions)
  const pathLower = url.trim().toLowerCase().split("?")[0].split("#")[0];
  // We allow URLs without recognized extensions (e.g., CDN URLs, IPFS gateways)
  // but warn if it looks suspicious
  if (pathLower.endsWith(".html") || pathLower.endsWith(".js") || pathLower.endsWith(".php")) {
    return { valid: false, error: "URL does not appear to be an image" };
  }

  return { valid: true };
}

/** Safe image src — returns placeholder for invalid URLs */
function safeImageSrc(url: string | undefined): string {
  if (!url) return PLACEHOLDER_IMG;
  const { valid } = validateImageUrl(url);
  return valid ? url : ERROR_IMG;
}

// ═══════════════════════════════════════════════════════════
//         SINGLE BATCHED POLLING HOOK (ALL READS IN ONE)
// ═══════════════════════════════════════════════════════════

function usePFPMarketState() {
  const { address } = useAccount();
  const { data: deployedContract } = useDeployedContractInfo("ClawdPFPMarket");

  const contractAddress = deployedContract?.address;
  const abi = deployedContract?.abi;

  // Build the batched contract reads
  const contracts = useMemo(() => {
    if (!contractAddress || !abi) return [];

    const baseReads = [
      { address: contractAddress, abi, functionName: "deadline" },
      { address: contractAddress, abi, functionName: "totalPool" },
      { address: contractAddress, abi, functionName: "winnerPicked" },
      { address: contractAddress, abi, functionName: "winningId" },
      { address: contractAddress, abi, functionName: "timeRemaining" },
      { address: contractAddress, abi, functionName: "admin" },
      { address: contractAddress, abi, functionName: "getTopSubmissions", args: [0n, 100n] },
      { address: contractAddress, abi, functionName: "getPendingSubmissions", args: [0n, 100n] },
      { address: contractAddress, abi, functionName: "STAKE_AMOUNT" },
    ] as const;

    // Add user-specific reads if connected
    const userReads = address
      ? ([
          { address: contractAddress, abi, functionName: "hasSubmitted", args: [address] },
          { address: contractAddress, abi, functionName: "canClaim", args: [address] },
          { address: contractAddress, abi, functionName: "getClaimAmount", args: [address] },
          { address: CLAWD_TOKEN, abi: erc20Abi, functionName: "allowance", args: [address, contractAddress] },
        ] as const)
      : [];

    return [...baseReads, ...userReads];
  }, [contractAddress, abi, address]);

  const { data, refetch } = useReadContracts({
    contracts: contracts as any,
    query: {
      enabled: contracts.length > 0,
      refetchInterval: POLLING_INTERVAL,
    },
  });

  // Parse results
  const results = useMemo(() => {
    if (!data) return null;

    const baseResults = {
      deadline: data[0]?.result as bigint | undefined,
      totalPool: data[1]?.result as bigint | undefined,
      winnerPicked: data[2]?.result as boolean | undefined,
      winningId: data[3]?.result as bigint | undefined,
      timeRemaining: data[4]?.result as bigint | undefined,
      admin: data[5]?.result as string | undefined,
      topSubmissions: data[6]?.result as readonly [readonly bigint[], readonly bigint[]] | undefined,
      pendingIds: data[7]?.result as readonly bigint[] | undefined,
      stakeAmount: data[8]?.result as bigint | undefined,
    };

    // User-specific results (indices 9-12 if user is connected)
    const userResults = address
      ? {
          hasSubmitted: data[9]?.result as boolean | undefined,
          canClaim: data[10]?.result as boolean | undefined,
          claimAmount: data[11]?.result as bigint | undefined,
          allowance: (data[12]?.result as bigint) ?? 0n,
        }
      : {
          hasSubmitted: false,
          canClaim: false,
          claimAmount: 0n,
          allowance: 0n,
        };

    return { ...baseResults, ...userResults };
  }, [data, address]);

  return { ...results, refetch, contractAddress, abi };
}

// Fetch individual submission data (static — no polling, for admin/winner cards)
function useSubmissionData(id: bigint | undefined, contractAddress: string | undefined, abi: any) {
  const { data } = useReadContracts({
    contracts:
      id !== undefined && contractAddress && abi
        ? [{ address: contractAddress as `0x${string}`, abi, functionName: "getSubmission", args: [id] }]
        : [],
    query: {
      enabled: id !== undefined && !!contractAddress && !!abi,
      staleTime: 10000,
    },
  });

  return data?.[0]?.result as [string, string, bigint, boolean, boolean, bigint] | undefined;
}

// ═══════════════════════════════════════════════════════════
//   BATCHED SUBMISSION DETAILS + USER SHARES (SINGLE POLL)
// ═══════════════════════════════════════════════════════════

type SubmissionDetail = {
  id: number;
  submitter: string;
  imageUrl: string;
  totalStaked: bigint;
  stakerCount: bigint;
  userShares: bigint;
};

function useSubmissionDetails(
  ids: readonly bigint[] | undefined,
  contractAddress: string | undefined,
  abi: any,
  userAddress: string | undefined,
) {
  const contracts = useMemo(() => {
    if (!ids || ids.length === 0 || !contractAddress || !abi) return [];

    const reads: any[] = [];
    for (const id of ids) {
      // getSubmission(id) for each
      reads.push({ address: contractAddress as `0x${string}`, abi, functionName: "getSubmission", args: [id] });
    }
    if (userAddress) {
      for (const id of ids) {
        // shares(id, user) for each
        reads.push({ address: contractAddress as `0x${string}`, abi, functionName: "shares", args: [id, userAddress] });
      }
    }
    return reads;
  }, [ids, contractAddress, abi, userAddress]);

  const { data } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      refetchInterval: POLLING_INTERVAL,
    },
  });

  return useMemo(() => {
    if (!data || !ids || ids.length === 0) return new Map<number, SubmissionDetail>();
    const map = new Map<number, SubmissionDetail>();
    const count = ids.length;

    for (let i = 0; i < count; i++) {
      const sub = data[i]?.result as [string, string, bigint, boolean, boolean, bigint] | undefined;
      if (!sub) continue;
      const userShares = userAddress && data[count + i] ? ((data[count + i]?.result as bigint) ?? 0n) : 0n;
      map.set(Number(ids[i]), {
        id: Number(ids[i]),
        submitter: sub[0],
        imageUrl: sub[1],
        totalStaked: sub[2],
        stakerCount: sub[5],
        userShares,
      });
    }
    return map;
  }, [data, ids, userAddress]);
}

// ═══════════════════════════════════════════════════════════
//                     COUNTDOWN TIMER
// ═══════════════════════════════════════════════════════════

function CountdownTimer({ deadline, winnerPicked }: { deadline: bigint | undefined; winnerPicked: boolean }) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!deadline) return <div className="text-4xl font-bold text-center">Loading...</div>;

  if (winnerPicked) {
    return <div className="text-4xl font-bold text-center text-success">✅ ROUND COMPLETE</div>;
  }

  const remaining = Number(deadline) - now;
  if (remaining <= 0) {
    return (
      <div className="text-4xl font-bold text-center text-error animate-pulse">
        ⏰ TIME&apos;S UP — PICKING WINNER...
      </div>
    );
  }

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return (
    <div className="text-center">
      <div className="text-6xl font-mono font-bold tracking-wider">
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
      <div className="text-sm opacity-60 mt-1">until submissions close</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//                    SUBMISSION CARD
// ═══════════════════════════════════════════════════════════

function SubmissionCard({
  id,
  rank,
  isTimedOut,
  allowance,
  stakeAmount,
  onRefetch,
  contractAddress,
  detail,
}: {
  id: number;
  rank: number;
  isTimedOut: boolean;
  allowance: bigint;
  stakeAmount: bigint;
  onRefetch: () => void;
  contractAddress: string | undefined;
  detail: SubmissionDetail | undefined;
}) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isOnBase = chainId === base.id;

  const userShares = detail?.userShares;

  // Animate when shares change
  const [sharesAnimating, setSharesAnimating] = useState(false);
  const prevSharesRef = useRef<bigint | undefined>(undefined);

  useEffect(() => {
    if (
      userShares !== undefined &&
      prevSharesRef.current !== undefined &&
      userShares !== prevSharesRef.current &&
      userShares > prevSharesRef.current
    ) {
      setSharesAnimating(true);
      const timer = setTimeout(() => setSharesAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
    prevSharesRef.current = userShares;
  }, [userShares]);

  // Animate when total staked changes
  const [stakedAnimating, setStakedAnimating] = useState(false);
  const prevStakedRef = useRef<bigint | undefined>(undefined);

  useEffect(() => {
    const totalStaked = detail?.totalStaked;
    if (
      totalStaked !== undefined &&
      prevStakedRef.current !== undefined &&
      totalStaked !== prevStakedRef.current &&
      totalStaked > prevStakedRef.current
    ) {
      setStakedAnimating(true);
      const timer = setTimeout(() => setStakedAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
    prevStakedRef.current = totalStaked;
  }, [detail?.totalStaked]);

  const [isSwitching, setIsSwitching] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isApproveSettling, setIsApproveSettling] = useState(false);

  const { writeContractAsync: writeMarket } = useScaffoldWriteContract("ClawdPFPMarket");
  const { writeContractAsync: writeErc20, isPending: isApproving } = useWriteContract();

  if (!detail) return null;

  const { submitter, imageUrl, totalStaked, stakerCount } = detail;
  const stakedFormatted = Number(formatEther(totalStaked)).toLocaleString();
  const hasEnoughAllowance = allowance >= stakeAmount;

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    try {
      await switchChain({ chainId: base.id });
    } catch (e) {
      console.error("Switch network failed:", e);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleApprove = async () => {
    if (!contractAddress) return;
    try {
      await writeErc20({
        address: CLAWD_TOKEN,
        abi: erc20Abi,
        functionName: "approve",
        args: [contractAddress as `0x${string}`, stakeAmount],
      });
      // Keep showing "Approving..." for 5s so allowance polling catches up
      // before revealing the "Lock in" button
      setIsApproveSettling(true);
      setTimeout(() => {
        onRefetch();
        setIsApproveSettling(false);
      }, 5000);
    } catch (e) {
      console.error("Approve failed:", e);
    }
  };

  const handleStake = async () => {
    setIsStaking(true);
    try {
      await writeMarket({
        functionName: "stake",
        args: [BigInt(id)],
      });
      setTimeout(() => {
        onRefetch();
      }, 2000);
    } catch (e) {
      console.error("Stake failed:", e);
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300 hover:border-primary transition-all">
      <div className="card-body p-4">
        <div className="flex gap-4">
          <div className="text-3xl font-bold text-primary opacity-50 self-center">#{rank}</div>
          <div className="w-24 h-24 rounded-lg overflow-hidden bg-base-300 flex-shrink-0">
            <img
              src={safeImageSrc(imageUrl)}
              alt={`Submission #${id}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={e => {
                (e.target as HTMLImageElement).src = ERROR_IMG;
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <div
                  className={`text-lg font-bold transition-all duration-500 ${
                    stakedAnimating ? "text-success scale-105 origin-left" : ""
                  }`}
                  style={stakedAnimating ? { textShadow: "0 0 12px rgba(0, 255, 100, 0.6)" } : undefined}
                >
                  {stakedFormatted} $CLAWD staked
                  {stakedAnimating && <span className="ml-1 animate-bounce inline-block">⬆️</span>}
                </div>
                <div className="text-sm opacity-60">
                  {Number(stakerCount)} staker{Number(stakerCount) !== 1 ? "s" : ""} · ID #{id}
                </div>
                {userShares !== undefined && userShares > 0n && (
                  <div
                    className={`text-sm font-semibold transition-all duration-500 ${
                      sharesAnimating ? "text-success scale-110 origin-left" : "text-accent scale-100"
                    }`}
                    style={
                      sharesAnimating
                        ? {
                            textShadow: "0 0 12px rgba(0, 255, 100, 0.6)",
                          }
                        : undefined
                    }
                  >
                    🎟️ Your shares:{" "}
                    {Number(formatEther(userShares)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {sharesAnimating && <span className="ml-1 animate-bounce inline-block">⬆️</span>}
                  </div>
                )}
                <div className="text-xs opacity-40">
                  by <Address address={submitter as `0x${string}`} size="xs" />
                </div>
              </div>
              {!isTimedOut &&
                address &&
                address?.toLowerCase() !== submitter?.toLowerCase() &&
                (!isOnBase ? (
                  <button
                    className="btn btn-warning btn-lg text-xl font-black tracking-wide"
                    onClick={handleSwitchNetwork}
                    disabled={isSwitching}
                  >
                    {isSwitching ? (
                      <>
                        <span className="loading loading-spinner loading-md"></span> Switching...
                      </>
                    ) : (
                      "🔄 Switch to Base"
                    )}
                  </button>
                ) : isApproving || isApproveSettling ? (
                  <button className="btn btn-secondary btn-lg text-xl font-black tracking-wide" disabled>
                    <span className="loading loading-spinner loading-md"></span> Approving...
                  </button>
                ) : hasEnoughAllowance ? (
                  <button
                    className="btn btn-primary btn-lg text-xl font-black tracking-wide"
                    onClick={handleStake}
                    disabled={isStaking}
                  >
                    {isStaking ? (
                      <>
                        <span className="loading loading-spinner loading-md"></span> Locking in...
                      </>
                    ) : (
                      "💵 Lock in"
                    )}
                  </button>
                ) : (
                  <button className="btn btn-secondary btn-lg text-xl font-black tracking-wide" onClick={handleApprove}>
                    💵 Buy Shares
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//         CHECK IF USER'S SUBMISSION IS STILL PENDING
// ═══════════════════════════════════════════════════════════

function useIsUserPending(
  pendingIds: readonly bigint[] | undefined,
  contractAddress: string | undefined,
  abi: any,
  userAddress: string | undefined,
) {
  const contracts = useMemo(() => {
    if (!pendingIds || pendingIds.length === 0 || !contractAddress || !abi || !userAddress) return [];
    return pendingIds.map(id => ({
      address: contractAddress as `0x${string}`,
      abi,
      functionName: "getSubmission",
      args: [id],
    }));
  }, [pendingIds, contractAddress, abi, userAddress]);

  const { data } = useReadContracts({
    contracts: contracts as any,
    query: { enabled: contracts.length > 0, refetchInterval: POLLING_INTERVAL },
  });

  return useMemo(() => {
    if (!data || !userAddress) return false;
    return data.some((result: any) => {
      const sub = result?.result as [string, string, bigint, bigint, number, bigint] | undefined;
      return sub && sub[0]?.toLowerCase() === userAddress.toLowerCase();
    });
  }, [data, userAddress]);
}

// ═══════════════════════════════════════════════════════════
//                     SUBMIT FORM
// ═══════════════════════════════════════════════════════════

function SubmitForm({
  allowance,
  hasSubmitted,
  stakeAmount,
  pendingIds,
  onRefetch,
  contractAddress,
  abi,
}: {
  allowance: bigint;
  hasSubmitted: boolean;
  stakeAmount: bigint;
  pendingIds: readonly bigint[] | undefined;
  onRefetch: () => void;
  contractAddress: string | undefined;
  abi: any;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproveSettling, setIsApproveSettling] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isOnBase = chainId === base.id;
  const { writeContractAsync: writeMarket } = useScaffoldWriteContract("ClawdPFPMarket");
  const { writeContractAsync: writeErc20, isPending: isApproving } = useWriteContract();

  const hasEnoughAllowance = allowance >= stakeAmount;
  const isUserPending = useIsUserPending(pendingIds, contractAddress, abi, address);

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    try {
      await switchChain({ chainId: base.id });
    } catch (e) {
      console.error("Switch network failed:", e);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleApprove = async () => {
    if (!contractAddress) return;
    try {
      await writeErc20({
        address: CLAWD_TOKEN,
        abi: erc20Abi,
        functionName: "approve",
        args: [contractAddress as `0x${string}`, stakeAmount],
      });
      setIsApproveSettling(true);
      setTimeout(() => {
        onRefetch();
        setIsApproveSettling(false);
      }, 5000);
    } catch (e) {
      console.error("Approve failed:", e);
    }
  };

  const handleSubmit = async () => {
    if (!imageUrl) return;
    const validation = validateImageUrl(imageUrl);
    if (!validation.valid) {
      alert(`Invalid image URL: ${validation.error}`);
      return;
    }
    setIsSubmitting(true);
    try {
      await writeMarket({
        functionName: "submit",
        args: [imageUrl],
      });
      setImageUrl("");
      setTimeout(onRefetch, 2000);
    } catch (e) {
      console.error("Submit failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="card bg-base-100 shadow-xl border-2 border-dashed border-primary">
        <div className="card-body text-center">
          <h3 className="card-title text-xl justify-center">🦞 Submit Your Image</h3>
          <p className="text-sm opacity-60">Connect your wallet on Base to submit and stake!</p>
        </div>
      </div>
    );
  }

  if (hasSubmitted && isUserPending) {
    return (
      <div className="card bg-base-100 shadow-xl border-2 border-warning">
        <div className="card-body">
          <h3 className="card-title text-xl">⏳ Your Submission is Pending Review</h3>
          <p className="text-sm opacity-60">
            The <span className="font-semibold">clawdbotatg.eth</span> reviewer runs on a ~15 minute loop. Your image
            should be reviewed within about 15 minutes. Hang tight! 🦞
          </p>
        </div>
      </div>
    );
  }

  if (hasSubmitted && !isUserPending) {
    return (
      <div className="card bg-base-100 shadow-xl border-2 border-success">
        <div className="card-body">
          <h3 className="card-title text-xl">✅ Your Submission is Live!</h3>
          <p className="text-sm opacity-60">Your image has been approved and is on the leaderboard. Rally stakers!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl border-2 border-dashed border-primary">
      <div className="card-body">
        <h3 className="card-title text-xl">🦞 Submit Your Image</h3>
        <p className="text-sm opacity-60">
          Submit an image URL + stake {Number(formatEther(stakeAmount)).toLocaleString()} $CLAWD. Make it a lobster AI
          agent with a wallet and dapp building tools!
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://your-image-url.com/lobster-clawd.png"
            className="input input-bordered flex-1"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
          />
          {!isOnBase ? (
            <button className="btn btn-warning" onClick={handleSwitchNetwork} disabled={isSwitching}>
              {isSwitching ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span> Switching...
                </>
              ) : (
                "🔄 Switch to Base"
              )}
            </button>
          ) : isApproving || isApproveSettling ? (
            <button className="btn btn-secondary" disabled>
              <span className="loading loading-spinner loading-sm"></span> Approving...
            </button>
          ) : hasEnoughAllowance ? (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!imageUrl || isSubmitting || !validateImageUrl(imageUrl).valid}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span> Submitting...
                </>
              ) : (
                "Submit & Stake"
              )}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={handleApprove}>
              ✅ Approve $CLAWD
            </button>
          )}
        </div>
        {imageUrl && (
          <div className="mt-2">
            <p className="text-xs opacity-60 mb-1">Preview:</p>
            {validateImageUrl(imageUrl).valid ? (
              <img
                src={safeImageSrc(imageUrl)}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border border-base-300"
                referrerPolicy="no-referrer"
                onError={e => {
                  (e.target as HTMLImageElement).src = ERROR_IMG;
                }}
              />
            ) : (
              <div className="w-32 h-32 flex items-center justify-center rounded-lg border border-error bg-error/10 text-xs text-error p-2 text-center">
                {validateImageUrl(imageUrl).error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//                     ADMIN PANEL
// ═══════════════════════════════════════════════════════════

function AdminPanel({
  admin,
  pendingIds,
  winnerPicked,
  topSubmissions,
  deadline,
  onRefetch,
  contractAddress,
  abi,
}: {
  admin: string | undefined;
  pendingIds: readonly bigint[] | undefined;
  winnerPicked: boolean;
  topSubmissions: readonly [readonly bigint[], readonly bigint[]] | undefined;
  deadline: bigint | undefined;
  onRefetch: () => void;
  contractAddress: string | undefined;
  abi: any;
}) {
  const { address } = useAccount();
  const { writeContractAsync: writeMarket } = useScaffoldWriteContract("ClawdPFPMarket");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (pendingIds && pendingIds.length > 0 && !initialized) {
      setCheckedIds(new Set(pendingIds.map((id: bigint) => id.toString())));
      setInitialized(true);
    }
    if (pendingIds && pendingIds.length === 0) {
      setInitialized(false);
    }
  }, [pendingIds, initialized]);

  const isAdmin = address && admin && address.toLowerCase() === admin.toLowerCase();
  if (!isAdmin) return null;

  const isTimedOut = deadline ? Math.floor(Date.now() / 1000) >= Number(deadline) : false;

  const toggleCheck = (id: bigint) => {
    const key = id.toString();
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleWhitelistChecked = async () => {
    if (checkedIds.size === 0) return;
    const idsToWhitelist = Array.from(checkedIds).map(s => BigInt(s));
    try {
      await writeMarket({ functionName: "whitelistBatch", args: [idsToWhitelist] });
      setCheckedIds(new Set());
      setInitialized(false);
      setTimeout(onRefetch, 2000);
    } catch (e) {
      console.error("Whitelist failed:", e);
    }
  };

  const handlePickWinner = async (id: bigint) => {
    try {
      await writeMarket({ functionName: "pickWinner", args: [id] });
      setTimeout(onRefetch, 2000);
    } catch (e) {
      console.error("Pick winner failed:", e);
    }
  };

  return (
    <div className="card bg-warning/10 shadow-xl border border-warning">
      <div className="card-body">
        <h3 className="card-title text-xl">🔐 Admin Panel</h3>

        <div className="mb-4">
          <h4 className="font-bold mb-2">Pending Submissions ({pendingIds?.length ?? 0})</h4>
          {pendingIds && pendingIds.length > 0 ? (
            <>
              <button
                className="btn btn-success btn-sm mb-2"
                onClick={handleWhitelistChecked}
                disabled={checkedIds.size === 0}
              >
                ✅ Whitelist Selected ({checkedIds.size})
              </button>
              <div className="space-y-2">
                {pendingIds.map((id: bigint) => (
                  <PendingCard
                    key={id.toString()}
                    id={id}
                    checked={checkedIds.has(id.toString())}
                    onToggle={() => toggleCheck(id)}
                    contractAddress={contractAddress}
                    abi={abi}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm opacity-60">No pending submissions</p>
          )}
        </div>

        {isTimedOut && !winnerPicked && topSubmissions && topSubmissions[0]?.length > 0 && (
          <div>
            <h4 className="font-bold mb-2">🏆 Pick Winner</h4>
            <div className="space-y-2">
              {topSubmissions[0].map((id: bigint, i: number) => (
                <WinnerPickCard
                  key={id.toString()}
                  id={id}
                  rank={i + 1}
                  onPick={() => handlePickWinner(id)}
                  contractAddress={contractAddress}
                  abi={abi}
                />
              ))}
            </div>
          </div>
        )}

        {winnerPicked && (
          <div className="alert alert-success">
            <span>🏆 Winner has been picked!</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingCard({
  id,
  checked,
  onToggle,
  contractAddress,
  abi,
}: {
  id: bigint;
  checked: boolean;
  onToggle: () => void;
  contractAddress: string | undefined;
  abi: any;
}) {
  const submission = useSubmissionData(id, contractAddress, abi);
  if (!submission) return null;
  const [submitter, imageUrl] = submission;

  return (
    <div className="flex items-center gap-3 bg-base-100 p-2 rounded-lg">
      <input type="checkbox" className="checkbox checkbox-success checkbox-sm" checked={checked} onChange={onToggle} />
      <img
        src={safeImageSrc(imageUrl)}
        alt={`Pending`}
        className="w-16 h-16 object-cover rounded"
        referrerPolicy="no-referrer"
        onError={e => {
          (e.target as HTMLImageElement).src = ERROR_IMG;
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{imageUrl}</div>
        <div className="text-xs opacity-40">
          by <Address address={submitter as `0x${string}`} size="xs" />
        </div>
      </div>
    </div>
  );
}

function WinnerPickCard({
  id,
  rank,
  onPick,
  contractAddress,
  abi,
}: {
  id: bigint;
  rank: number;
  onPick: () => void;
  contractAddress: string | undefined;
  abi: any;
}) {
  const submission = useSubmissionData(id, contractAddress, abi);
  if (!submission) return null;
  const [, imageUrl, totalStaked] = submission;

  return (
    <div className="flex items-center gap-3 bg-base-100 p-2 rounded-lg">
      <div className="text-lg font-bold">#{rank}</div>
      <img
        src={safeImageSrc(imageUrl)}
        alt={`#${id}`}
        className="w-16 h-16 object-cover rounded"
        referrerPolicy="no-referrer"
        onError={e => {
          (e.target as HTMLImageElement).src = ERROR_IMG;
        }}
      />
      <div className="flex-1">
        <div className="text-sm font-bold">{Number(formatEther(totalStaked)).toLocaleString()} $CLAWD</div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={onPick}>
        👑 Pick
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//                    CLAIM REWARDS
// ═══════════════════════════════════════════════════════════

function ClaimRewards({ canClaim, claimAmount }: { canClaim: boolean; claimAmount: bigint | undefined }) {
  const [isClaiming, setIsClaiming] = useState(false);
  const { writeContractAsync: writeMarket } = useScaffoldWriteContract("ClawdPFPMarket");

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await writeMarket({ functionName: "claim" });
    } catch (e) {
      console.error("Claim failed:", e);
    } finally {
      setIsClaiming(false);
    }
  };

  if (!canClaim) return null;

  return (
    <div className="card bg-gradient-to-r from-green-800 to-emerald-700 shadow-xl border-2 border-success">
      <div className="card-body text-center">
        <h3 className="card-title text-2xl justify-center">🎉 You Won!</h3>
        <p className="text-lg">
          You have{" "}
          <span className="font-bold">
            {claimAmount ? Number(formatEther(claimAmount)).toLocaleString() : "..."} $CLAWD
          </span>{" "}
          to claim
        </p>
        <button className="btn btn-success btn-lg text-xl font-black mt-2" onClick={handleClaim} disabled={isClaiming}>
          {isClaiming ? <span className="loading loading-spinner loading-md"></span> : "💰 CLAIM REWARDS"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//                      MAIN PAGE
// ═══════════════════════════════════════════════════════════

const Home: NextPage = () => {
  const state = usePFPMarketState();
  const {
    deadline,
    totalPool,
    winnerPicked,
    winningId,
    timeRemaining,
    admin,
    topSubmissions,
    pendingIds,
    hasSubmitted,
    canClaim,
    claimAmount,
    allowance,
    stakeAmount,
    refetch,
    contractAddress,
    abi,
  } = state;

  const { address } = useAccount();
  const [leaderboardPage, setLeaderboardPage] = useState(0);

  // Single batched poll for ALL submission details + user shares
  const submissionDetails = useSubmissionDetails(topSubmissions?.[0], contractAddress, abi, address);

  // Fetch winner submission only when needed
  const winnerSubmission = useSubmissionData(winnerPicked ? (winningId ?? 0n) : undefined, contractAddress, abi);

  const isTimedOut =
    timeRemaining !== undefined
      ? timeRemaining === 0n
      : deadline
        ? Math.floor(Date.now() / 1000) >= Number(deadline)
        : false;

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Hero */}
      <div className="w-full bg-gradient-to-br from-red-900 via-orange-900 to-red-800 py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <CountdownTimer deadline={deadline} winnerPicked={!!winnerPicked} />
          {totalPool !== undefined && (
            <div className="mt-4 text-2xl font-bold">
              💰 Total Pool: {Number(formatEther(totalPool)).toLocaleString()} $CLAWD
            </div>
          )}
          <div className="flex justify-center gap-4 mt-2 text-sm opacity-60">
            <span>🔥 25% burned</span>
            <span>🎨 10% to winning OP</span>
            <span>💰 65% to winning stakers</span>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="w-full bg-red-700 py-4 px-4">
        <div className="max-w-3xl mx-auto text-white text-sm leading-relaxed">
          <p className="font-bold mb-2">⚠️ WARNING — READ BEFORE USING</p>
          <p>
            First of all make sure you are at{" "}
            <a href="https://clawd-pfp-market.vercel.app" className="underline font-bold">
              https://clawd-pfp-market.vercel.app
            </a>{" "}
            and not an impersonator site. Second, this app was built by a bot. It is the first &quot;money&quot; app
            real users can deposit $CLAWD into, built fully by a bot and it probably will blow up or get locked. We are
            using small amounts of $CLAWD to play a silly game and pick the PFP for the bot with a prediction market
            thingy. But still, this is real money. You should probably NOT use this unless you are pretty good with
            dApps. Let us play a few of these games first before you try putting money in. Seriously, this is probably
            going to blow up and by connecting your wallet you are accepting all risk.
          </p>
        </div>
      </div>

      {/* Winner Banner */}
      {winnerPicked && winnerSubmission && (
        <div className="w-full bg-gradient-to-r from-yellow-600 to-amber-500 py-8 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4">🏆 WINNER 🏆</h2>
            <img
              src={safeImageSrc(winnerSubmission[1])}
              alt="Winning PFP"
              className="w-48 h-48 object-cover rounded-2xl mx-auto border-4 border-white shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <p className="mt-2 text-lg">This is my new face.</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl w-full px-4 py-8 space-y-6">
        {winnerPicked && <ClaimRewards canClaim={!!canClaim} claimAmount={claimAmount} />}

        {!isTimedOut && !winnerPicked && (
          <SubmitForm
            allowance={allowance ?? 0n}
            hasSubmitted={!!hasSubmitted}
            stakeAmount={stakeAmount ?? parseEther("500")}
            pendingIds={pendingIds}
            onRefetch={refetch}
            contractAddress={contractAddress}
            abi={abi}
          />
        )}

        <AdminPanel
          admin={admin}
          pendingIds={pendingIds}
          winnerPicked={!!winnerPicked}
          topSubmissions={topSubmissions}
          deadline={deadline}
          onRefetch={refetch}
          contractAddress={contractAddress}
          abi={abi}
        />

        {/* Leaderboard */}
        <div>
          <h2 className="text-2xl font-bold mb-4">📊 Leaderboard</h2>
          {topSubmissions && topSubmissions[0]?.length > 0 ? (
            <>
              <div className="space-y-3">
                {topSubmissions[0]
                  .slice(leaderboardPage * PAGE_SIZE, (leaderboardPage + 1) * PAGE_SIZE)
                  .map((id: bigint, i: number) => (
                    <SubmissionCard
                      key={id.toString()}
                      id={Number(id)}
                      rank={leaderboardPage * PAGE_SIZE + i + 1}
                      isTimedOut={isTimedOut || !!winnerPicked}
                      allowance={allowance ?? 0n}
                      stakeAmount={stakeAmount ?? parseEther("500")}
                      onRefetch={refetch}
                      contractAddress={contractAddress}
                      detail={submissionDetails.get(Number(id))}
                    />
                  ))}
              </div>
              {topSubmissions[0].length > PAGE_SIZE && (
                <div className="flex justify-center items-center gap-4 mt-4">
                  <button
                    className="btn btn-sm btn-outline"
                    disabled={leaderboardPage === 0}
                    onClick={() => setLeaderboardPage(p => p - 1)}
                  >
                    ← Prev
                  </button>
                  <span className="text-sm opacity-60">
                    Page {leaderboardPage + 1} of {Math.ceil(topSubmissions[0].length / PAGE_SIZE)}
                  </span>
                  <button
                    className="btn btn-sm btn-outline"
                    disabled={(leaderboardPage + 1) * PAGE_SIZE >= topSubmissions[0].length}
                    onClick={() => setLeaderboardPage(p => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 opacity-40">
              <div className="text-6xl mb-4">🦞</div>
              <p className="text-lg">No approved submissions yet. Be the first!</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="card bg-base-200">
          <div className="card-body text-sm opacity-70">
            <h3 className="font-bold text-base">How it works</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Submit an image URL + stake {stakeAmount ? Number(formatEther(stakeAmount)).toLocaleString() : "..."}{" "}
                $CLAWD
              </li>
              <li>Others can stake on your image — early stakers get more shares (bonding curve)</li>
              <li>Images are reviewed before going live (no NSFW)</li>
              <li>When the timer ends, Clawd picks the winner from the top 10</li>
              <li>
                25% of all staked $CLAWD is burned, 10% goes to the winning submitter, 65% split among winning stakers
              </li>
              <li>Submit something offensive = banned + your stake gets burned 🔥</li>
            </ul>
            <p className="mt-2 font-bold">Theme: Lobster AI agent with a wallet and dapp building tools 🦞🤖</p>
            <div className="divider my-1"></div>
            <p className="text-xs opacity-50">
              $CLAWD:{" "}
              <a href={`https://basescan.org/token/${CLAWD_TOKEN}`} target="_blank" rel="noreferrer" className="link">
                {CLAWD_TOKEN}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
