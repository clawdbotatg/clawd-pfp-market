"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { erc20Abi, parseEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useWriteContract } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const CLAWD_TOKEN = "0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07" as `0x${string}`;
const STAKE_AMOUNT = parseEther("50000");

// Admin is read from the contract — no hardcoded address needed

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
    return (
      <div className="text-4xl font-bold text-center text-success">
        ✅ ROUND COMPLETE
      </div>
    );
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

function SubmissionCard({ id, rank, isTimedOut }: { id: number; rank: number; isTimedOut: boolean }) {
  const { address } = useAccount();

  const { data: submission } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "getSubmission",
    args: [BigInt(id)],
  });

  const { data: myShares } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "getShareBalance",
    args: [BigInt(id), address],
  });

  const { writeContractAsync: writeMarket } = useScaffoldWriteContract("ClawdPFPMarket");
  const { writeContractAsync: writeErc20 } = useWriteContract();
  const { data: deployedContract } = useDeployedContractInfo("ClawdPFPMarket");
  const publicClient = usePublicClient();
  const [isStaking, setIsStaking] = useState(false);

  if (!submission) return null;

  const [submitter, imageUrl, totalStaked, , , stakerCount] = submission;
  const stakedFormatted = Number(formatEther(totalStaked)).toLocaleString();
  const mySharesFormatted = myShares ? Number(formatEther(myShares)).toLocaleString() : "0";

  const handleStake = async () => {
    if (!deployedContract || !publicClient) return;
    setIsStaking(true);
    try {
      // First approve CLAWD
      const approveTx = await writeErc20({
        address: CLAWD_TOKEN,
        abi: erc20Abi,
        functionName: "approve",
        args: [deployedContract.address, STAKE_AMOUNT],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
      // Then stake
      await writeMarket({
        functionName: "stake",
        args: [BigInt(id)],
      });
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
              src={imageUrl}
              alt={`Submission #${id}`}
              className="w-full h-full object-cover"
              onError={e => {
                (e.target as HTMLImageElement).src = "https://placehold.co/200x200/1a1a2e/e94560?text=🦞";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg font-bold">{stakedFormatted} $CLAWD staked</div>
                <div className="text-sm opacity-60">
                  {Number(stakerCount)} staker{Number(stakerCount) !== 1 ? "s" : ""} · ID #{id}
                </div>
                <div className="text-xs opacity-40 truncate">
                  by {submitter?.slice(0, 6)}...{submitter?.slice(-4)}
                </div>
              </div>
              {!isTimedOut && (
                <button className="btn btn-primary btn-sm" onClick={handleStake} disabled={isStaking}>
                  {isStaking ? <span className="loading loading-spinner loading-sm"></span> : "Stake 50k 🦞"}
                </button>
              )}
            </div>
            {myShares !== undefined && myShares > 0n && (
              <div className="text-xs text-success mt-1">Your shares: {mySharesFormatted}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//                     SUBMIT FORM
// ═══════════════════════════════════════════════════════════

function SubmitForm() {
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { writeContractAsync: writeMarket } = useScaffoldWriteContract("ClawdPFPMarket");
  const { writeContractAsync: writeErc20 } = useWriteContract();
  const { data: deployedContract } = useDeployedContractInfo("ClawdPFPMarket");
  const publicClient = usePublicClient();

  const { data: hasSubmitted } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "hasSubmitted",
    args: [useAccount().address],
  });

  const handleSubmit = async () => {
    if (!imageUrl || !deployedContract || !publicClient) return;
    setIsSubmitting(true);
    try {
      // First approve CLAWD spending
      const approveTx = await writeErc20({
        address: CLAWD_TOKEN,
        abi: erc20Abi,
        functionName: "approve",
        args: [deployedContract.address, STAKE_AMOUNT],
      });
      // Wait for approval to be mined
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
      // Then submit
      await writeMarket({
        functionName: "submit",
        args: [imageUrl],
      });
      setImageUrl("");
    } catch (e) {
      console.error("Submit failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="alert alert-info">
        <span>✅ You&apos;ve already submitted! You can still stake on other images.</span>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl border-2 border-dashed border-primary">
      <div className="card-body">
        <h3 className="card-title text-xl">🦞 Submit Your Image</h3>
        <p className="text-sm opacity-60">
          Submit an image URL + stake 50,000 $CLAWD. Make it a lobster AI agent with a wallet and dapp building tools!
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://your-image-url.com/lobster-clawd.png"
            className="input input-bordered flex-1"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!imageUrl || isSubmitting}>
            {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : "Submit & Stake"}
          </button>
        </div>
        {imageUrl && (
          <div className="mt-2">
            <p className="text-xs opacity-60 mb-1">Preview:</p>
            <img
              src={imageUrl}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg border border-base-300"
              onError={e => {
                (e.target as HTMLImageElement).src = "https://placehold.co/200x200/1a1a2e/e94560?text=❌";
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//                     ADMIN PANEL
// ═══════════════════════════════════════════════════════════

function AdminPanel() {
  const { address } = useAccount();
  const { writeContractAsync: writeMarket } = useScaffoldWriteContract("ClawdPFPMarket");

  const { data: pendingIds } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "getPendingSubmissions",
    args: [0n, 50n],
  });

  const { data: winnerPicked } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "winnerPicked",
  });

  const { data: deadline } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "deadline",
  });

  const { data: topSubmissions } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "getTopSubmissions",
    args: [0n, 10n],
  });

  const { data: contractAdmin } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "admin",
  });

  const isAdmin = address && contractAdmin && address.toLowerCase() === contractAdmin.toLowerCase();
  if (!isAdmin) return null;

  const isTimedOut = deadline ? Math.floor(Date.now() / 1000) >= Number(deadline) : false;

  const handleWhitelistAll = async () => {
    if (!pendingIds || pendingIds.length === 0) return;
    try {
      await writeMarket({
        functionName: "whitelistBatch",
        args: [pendingIds as bigint[]],
      });
    } catch (e) {
      console.error("Whitelist failed:", e);
    }
  };

  const handleBan = async (id: bigint) => {
    try {
      await writeMarket({
        functionName: "banAndSlash",
        args: [id],
      });
    } catch (e) {
      console.error("Ban failed:", e);
    }
  };

  const handlePickWinner = async (id: bigint) => {
    try {
      await writeMarket({
        functionName: "pickWinner",
        args: [id],
      });
    } catch (e) {
      console.error("Pick winner failed:", e);
    }
  };

  return (
    <div className="card bg-warning/10 shadow-xl border border-warning">
      <div className="card-body">
        <h3 className="card-title text-xl">🔐 Admin Panel</h3>

        {/* Pending Submissions */}
        <div className="mb-4">
          <h4 className="font-bold mb-2">Pending Submissions ({pendingIds ? pendingIds.length : 0})</h4>
          {pendingIds && pendingIds.length > 0 ? (
            <>
              <button className="btn btn-success btn-sm mb-2" onClick={handleWhitelistAll}>
                ✅ Whitelist All ({pendingIds.length})
              </button>
              <div className="space-y-2">
                {pendingIds.map((id: bigint) => (
                  <PendingCard key={id.toString()} id={Number(id)} onBan={() => handleBan(id)} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm opacity-60">No pending submissions</p>
          )}
        </div>

        {/* Pick Winner */}
        {isTimedOut && !winnerPicked && topSubmissions && (
          <div>
            <h4 className="font-bold mb-2">🏆 Pick Winner (Top 10)</h4>
            <div className="space-y-2">
              {topSubmissions[0]?.map((id: bigint, i: number) => (
                <WinnerPickCard key={id.toString()} id={Number(id)} rank={i + 1} onPick={() => handlePickWinner(id)} />
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

function PendingCard({ id, onBan }: { id: number; onBan: () => void }) {
  const { data: submission } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "getSubmission",
    args: [BigInt(id)],
  });

  if (!submission) return null;
  const [submitter, imageUrl] = submission;

  return (
    <div className="flex items-center gap-3 bg-base-100 p-2 rounded-lg">
      <img
        src={imageUrl}
        alt={`Pending #${id}`}
        className="w-16 h-16 object-cover rounded"
        onError={e => {
          (e.target as HTMLImageElement).src = "https://placehold.co/100x100/1a1a2e/e94560?text=?";
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{imageUrl}</div>
        <div className="text-xs opacity-40">
          by {submitter?.slice(0, 6)}...{submitter?.slice(-4)}
        </div>
      </div>
      <button className="btn btn-error btn-xs" onClick={onBan}>
        🔥 Ban & Slash
      </button>
    </div>
  );
}

function WinnerPickCard({ id, rank, onPick }: { id: number; rank: number; onPick: () => void }) {
  const { data: submission } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "getSubmission",
    args: [BigInt(id)],
  });

  if (!submission) return null;
  const [, imageUrl, totalStaked] = submission;

  return (
    <div className="flex items-center gap-3 bg-base-100 p-2 rounded-lg">
      <div className="text-lg font-bold">#{rank}</div>
      <img
        src={imageUrl}
        alt={`#${id}`}
        className="w-16 h-16 object-cover rounded"
        onError={e => {
          (e.target as HTMLImageElement).src = "https://placehold.co/100x100/1a1a2e/e94560?text=🦞";
        }}
      />
      <div className="flex-1">
        <div className="text-sm font-bold">{Number(formatEther(totalStaked)).toLocaleString()} $CLAWD</div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={onPick}>
        👑 Pick This One
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//                      MAIN PAGE
// ═══════════════════════════════════════════════════════════

const Home: NextPage = () => {
  const { data: deadline } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "deadline",
  });

  const { data: topSubmissions } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "getTopSubmissions",
    args: [0n, 10n],
  });

  const { data: totalPool } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "totalPool",
  });

  const { data: winnerPicked } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "winnerPicked",
  });

  const { data: winningId } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "winningId",
  });

  const { data: winnerSubmission } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "getSubmission",
    args: [winnerPicked ? (winningId ?? 0n) : 0n],
  });

  const { data: timeRemaining } = useScaffoldReadContract({
    contractName: "ClawdPFPMarket",
    functionName: "timeRemaining",
  });

  // Use chain-reported timeRemaining (accurate on forks) with browser-time fallback
  const isTimedOut = timeRemaining !== undefined
    ? timeRemaining === 0n
    : deadline ? Math.floor(Date.now() / 1000) >= Number(deadline) : false;

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Hero */}
      <div className="w-full bg-gradient-to-br from-red-900 via-orange-900 to-red-800 py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-2">🦞 Clawd PFP Market 🦞</h1>
          <p className="text-lg opacity-80 mb-6">
            Stake $CLAWD to pick my next profile picture. Early stakers get more shares.
          </p>

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

      {/* Winner Banner */}
      {winnerPicked && winnerSubmission && (
        <div className="w-full bg-gradient-to-r from-yellow-600 to-amber-500 py-8 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4">🏆 WINNER 🏆</h2>
            <img
              src={winnerSubmission[1]}
              alt="Winning PFP"
              className="w-48 h-48 object-cover rounded-2xl mx-auto border-4 border-white shadow-2xl"
            />
            <p className="mt-2 text-lg">This is my new face.</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl w-full px-4 py-8 space-y-6">
        {/* Submit Form */}
        {!isTimedOut && !winnerPicked && <SubmitForm />}

        {/* Admin Panel */}
        <AdminPanel />

        {/* Leaderboard */}
        <div>
          <h2 className="text-2xl font-bold mb-4">📊 Leaderboard</h2>
          {topSubmissions && topSubmissions[0]?.length > 0 ? (
            <div className="space-y-3">
              {topSubmissions[0].map((id: bigint, i: number) => (
                <SubmissionCard
                  key={id.toString()}
                  id={Number(id)}
                  rank={i + 1}
                  isTimedOut={isTimedOut || !!winnerPicked}
                />
              ))}
            </div>
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
              <li>Submit an image URL + stake 50,000 $CLAWD (~$5)</li>
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
              <a
                href={`https://basescan.org/token/${CLAWD_TOKEN}`}
                target="_blank"
                rel="noreferrer"
                className="link"
              >
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
