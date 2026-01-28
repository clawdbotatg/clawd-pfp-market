// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ClawdPFPMarket
 * @notice Prediction market for picking Clawd's next profile picture.
 *         Users submit image URLs + stake $CLAWD. Others can stake on
 *         submissions they like. Admin picks the winner after the deadline.
 *         Bonding curve per image — early stakers get more shares.
 *
 * Audit fixes applied:
 * - Bonding curve normalized (shares in whole units for price calc)
 * - Claim pattern for payouts (no unbounded loop DoS)
 * - Emergency rescue after 30 days if admin MIA
 * - Dust goes to last claimer
 */
contract ClawdPFPMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ══════════════════════════════════════════════════════════════
    //                          TYPES
    // ══════════════════════════════════════════════════════════════

    enum Status { Pending, Whitelisted, Banned }

    struct Submission {
        address submitter;      // Original proposer (OP)
        string imageUrl;        // Image URL
        uint256 totalStaked;    // Total CLAWD staked on this image
        uint256 totalShares;    // Total shares issued via bonding curve
        Status status;          // Pending / Whitelisted / Banned
    }

    // ══════════════════════════════════════════════════════════════
    //                         CONSTANTS
    // ══════════════════════════════════════════════════════════════

    uint256 public constant STAKE_AMOUNT = 1_500e18;    // 1,500 CLAWD per stake
    uint256 public constant BASE_PRICE = 1e18;           // Base price: 1 CLAWD per share
    uint256 public constant PRICE_INCREMENT = 1e15;      // Price goes up per share issued
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 public constant BURN_BPS = 2500;    // 25%
    uint256 public constant OP_BONUS_BPS = 1000; // 10%
    // Staker pool = 65% (remainder)

    uint256 public constant RESCUE_DELAY = 30 days;

    // ══════════════════════════════════════════════════════════════
    //                          STATE
    // ══════════════════════════════════════════════════════════════

    IERC20 public immutable clawdToken;
    address public admin;
    uint256 public deadline;
    bool public winnerPicked;
    uint256 public winningId;

    uint256 public submissionCount;
    mapping(uint256 => Submission) public submissions;
    mapping(uint256 => mapping(address => uint256)) public shares;  // submissionId => staker => shares
    mapping(uint256 => address[]) public stakers;                   // submissionId => list of stakers
    mapping(uint256 => mapping(address => bool)) public isStaker;   // dedup stakers list
    mapping(address => bool) public hasSubmitted;

    uint256 public totalPool;  // Total CLAWD in the pool (across all images, minus slashed)

    // Claim pattern state
    uint256 public stakerPool;           // 65% of pool, set when winner picked
    uint256 public stakerPoolRemaining;  // Tracks remaining for dust handling
    uint256 public totalWinningShares;   // Cached for claims
    uint256 public claimedCount;         // How many stakers have claimed
    uint256 public totalWinningStakers;  // Total stakers on winning submission
    mapping(address => bool) public hasClaimed;
    bool public rescueTriggered;

    // ══════════════════════════════════════════════════════════════
    //                          EVENTS
    // ══════════════════════════════════════════════════════════════

    event Submitted(uint256 indexed id, address indexed submitter, string imageUrl);
    event Staked(uint256 indexed id, address indexed staker, uint256 sharesReceived, uint256 amount);
    event Whitelisted(uint256 indexed id);
    event Banned(uint256 indexed id, uint256 slashedAmount);
    event WinnerPicked(uint256 indexed id, string imageUrl, uint256 totalPool);
    event Payout(address indexed recipient, uint256 amount, string reason);
    event Claimed(address indexed staker, uint256 amount);
    event EmergencyRescue(address indexed caller, uint256 amount);

    // ══════════════════════════════════════════════════════════════
    //                        MODIFIERS
    // ══════════════════════════════════════════════════════════════

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier beforeDeadline() {
        require(block.timestamp < deadline, "Round ended");
        _;
    }

    modifier afterDeadline() {
        require(block.timestamp >= deadline, "Round still active");
        _;
    }

    // ══════════════════════════════════════════════════════════════
    //                       CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════

    constructor(address _clawdToken, uint256 _duration, address _admin) {
        clawdToken = IERC20(_clawdToken);
        deadline = block.timestamp + _duration;
        admin = _admin;
    }

    // ══════════════════════════════════════════════════════════════
    //                     USER FUNCTIONS
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Submit an image URL and stake STAKE_AMOUNT of CLAWD.
     *         One submission per wallet. Image starts as Pending.
     */
    function submit(string calldata imageUrl) external beforeDeadline nonReentrant {
        require(!hasSubmitted[msg.sender], "Already submitted");
        require(bytes(imageUrl).length > 0, "Empty URL");

        hasSubmitted[msg.sender] = true;
        uint256 id = submissionCount++;

        // Pull tokens
        clawdToken.safeTransferFrom(msg.sender, address(this), STAKE_AMOUNT);
        totalPool += STAKE_AMOUNT;

        // Calculate shares at base price (first staker)
        uint256 sharesOut = _calculateShares(0); // totalShares = 0 for new submission

        submissions[id] = Submission({
            submitter: msg.sender,
            imageUrl: imageUrl,
            totalStaked: STAKE_AMOUNT,
            totalShares: sharesOut,
            status: Status.Pending
        });

        shares[id][msg.sender] = sharesOut;
        stakers[id].push(msg.sender);
        isStaker[id][msg.sender] = true;

        emit Submitted(id, msg.sender, imageUrl);
        emit Staked(id, msg.sender, sharesOut, STAKE_AMOUNT);
    }

    /**
     * @notice Stake STAKE_AMOUNT of CLAWD on a whitelisted submission.
     *         Shares received decrease as more people stake (bonding curve).
     */
    function stake(uint256 id) external beforeDeadline nonReentrant {
        require(id < submissionCount, "Invalid submission");
        Submission storage sub = submissions[id];
        require(sub.status == Status.Whitelisted, "Not whitelisted");
        require(msg.sender != sub.submitter, "Cannot stake on own submission");

        // Pull tokens
        clawdToken.safeTransferFrom(msg.sender, address(this), STAKE_AMOUNT);
        totalPool += STAKE_AMOUNT;

        // Calculate shares based on bonding curve
        uint256 sharesOut = _calculateShares(sub.totalShares);

        sub.totalStaked += STAKE_AMOUNT;
        sub.totalShares += sharesOut;
        shares[id][msg.sender] += sharesOut;

        if (!isStaker[id][msg.sender]) {
            stakers[id].push(msg.sender);
            isStaker[id][msg.sender] = true;
        }

        emit Staked(id, msg.sender, sharesOut, STAKE_AMOUNT);
    }

    /**
     * @notice Claim your share of the winning pool (pull pattern).
     *         Call after pickWinner() if you staked on the winning submission.
     */
    function claim() external nonReentrant {
        require(winnerPicked, "No winner yet");
        require(!hasClaimed[msg.sender], "Already claimed");

        uint256 stakerShares = shares[winningId][msg.sender];
        require(stakerShares > 0, "No shares on winner");

        hasClaimed[msg.sender] = true;
        
        unchecked {
            claimedCount++;
        }

        uint256 payout;
        if (claimedCount == totalWinningStakers) {
            // Last claimer gets all remaining (handles dust)
            payout = stakerPoolRemaining;
        } else {
            payout = (stakerPool * stakerShares) / totalWinningShares;
        }

        require(payout > 0, "Nothing to claim");
        
        unchecked {
            stakerPoolRemaining -= payout;
        }

        clawdToken.safeTransfer(msg.sender, payout);
        emit Claimed(msg.sender, payout);
    }

    /**
     * @notice Emergency rescue if admin never picks a winner.
     *         Anyone can call after deadline + RESCUE_DELAY.
     *         Returns all staked tokens proportionally.
     */
    function emergencyRescue() external afterDeadline nonReentrant {
        require(!winnerPicked, "Winner already picked");
        require(!rescueTriggered, "Already rescued");
        require(block.timestamp > deadline + RESCUE_DELAY, "Too early for rescue");

        rescueTriggered = true;

        // Return all tokens to the contract — users will need to call emergencyWithdraw
        emit EmergencyRescue(msg.sender, totalPool);
    }

    /**
     * @notice Withdraw your stake after emergency rescue is triggered.
     */
    function emergencyWithdraw(uint256 id) external nonReentrant {
        require(rescueTriggered, "No rescue triggered");

        uint256 stakerShares = shares[id][msg.sender];
        require(stakerShares > 0, "No shares");

        // Zero out shares to prevent double withdrawal
        shares[id][msg.sender] = 0;

        Submission storage sub = submissions[id];
        // Proportional return based on shares
        uint256 payout = (sub.totalStaked * stakerShares) / sub.totalShares;
        if (payout > 0) {
            clawdToken.safeTransfer(msg.sender, payout);
        }

        emit Payout(msg.sender, payout, "rescue");
    }

    // ══════════════════════════════════════════════════════════════
    //                     ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Transfer admin role to a new address.
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        admin = newAdmin;
    }

    /**
     * @notice Whitelist multiple pending submissions in a batch.
     */
    function whitelistBatch(uint256[] calldata ids) external onlyAdmin {
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            require(id < submissionCount, "Invalid submission");
            require(submissions[id].status == Status.Pending, "Not pending");
            submissions[id].status = Status.Whitelisted;
            emit Whitelisted(id);
        }
    }

    /**
     * @notice Ban a submission and slash their stake to the burn address.
     */
    function banAndSlash(uint256 id) external onlyAdmin nonReentrant {
        require(id < submissionCount, "Invalid submission");
        Submission storage sub = submissions[id];
        require(sub.status == Status.Pending, "Not pending");

        sub.status = Status.Banned;
        uint256 slashAmount = sub.totalStaked;
        totalPool -= slashAmount;

        // Burn the slashed tokens
        clawdToken.safeTransfer(BURN_ADDRESS, slashAmount);

        emit Banned(id, slashAmount);
    }

    /**
     * @notice Pick the winning submission after the deadline.
     *         Burns 25%, sends 10% to OP, stores 65% for staker claims.
     */
    function pickWinner(uint256 id) external onlyAdmin afterDeadline nonReentrant {
        require(!winnerPicked, "Winner already picked");
        require(id < submissionCount, "Invalid submission");
        require(submissions[id].status == Status.Whitelisted, "Not whitelisted");

        winnerPicked = true;
        winningId = id;

        Submission storage winner = submissions[id];
        uint256 pool = totalPool;

        uint256 burnAmount;
        uint256 opBonus;
        uint256 _stakerPool;

        // Calculate distributions
        unchecked {
            burnAmount = (pool * BURN_BPS) / 10000;
            opBonus = (pool * OP_BONUS_BPS) / 10000;
            _stakerPool = pool - burnAmount - opBonus;
        }

        // Store for claim pattern
        stakerPool = _stakerPool;
        stakerPoolRemaining = _stakerPool;
        totalWinningShares = winner.totalShares;
        totalWinningStakers = stakers[id].length;

        // 1. Burn 25%
        clawdToken.safeTransfer(BURN_ADDRESS, burnAmount);
        emit Payout(BURN_ADDRESS, burnAmount, "burn");

        // 2. OP bonus 10%
        clawdToken.safeTransfer(winner.submitter, opBonus);
        emit Payout(winner.submitter, opBonus, "op_bonus");

        // 3. Staker pool held in contract — stakers call claim()

        emit WinnerPicked(id, winner.imageUrl, pool);
    }

    // ══════════════════════════════════════════════════════════════
    //                     VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Get top whitelisted submissions sorted by totalStaked (descending).
     */
    function getTopSubmissions(uint256 offset, uint256 limit) 
        external view returns (uint256[] memory ids, uint256[] memory stakedAmounts) 
    {
        uint256[] memory whitelistedIds = new uint256[](submissionCount);
        uint256[] memory whitelistedStakes = new uint256[](submissionCount);
        uint256 count = 0;

        for (uint256 i = 0; i < submissionCount; i++) {
            if (submissions[i].status == Status.Whitelisted) {
                whitelistedIds[count] = i;
                whitelistedStakes[count] = submissions[i].totalStaked;
                count++;
            }
        }

        // Simple insertion sort (fine for reasonable submission counts)
        for (uint256 i = 1; i < count; i++) {
            uint256 keyId = whitelistedIds[i];
            uint256 keyStake = whitelistedStakes[i];
            int256 j = int256(i) - 1;
            while (j >= 0 && whitelistedStakes[uint256(j)] < keyStake) {
                whitelistedIds[uint256(j + 1)] = whitelistedIds[uint256(j)];
                whitelistedStakes[uint256(j + 1)] = whitelistedStakes[uint256(j)];
                j--;
            }
            whitelistedIds[uint256(j + 1)] = keyId;
            whitelistedStakes[uint256(j + 1)] = keyStake;
        }

        uint256 start = offset;
        if (start >= count) {
            return (new uint256[](0), new uint256[](0));
        }
        uint256 end = start + limit;
        if (end > count) end = count;
        uint256 resultLen = end - start;

        ids = new uint256[](resultLen);
        stakedAmounts = new uint256[](resultLen);
        for (uint256 i = 0; i < resultLen; i++) {
            ids[i] = whitelistedIds[start + i];
            stakedAmounts[i] = whitelistedStakes[start + i];
        }
    }

    /**
     * @notice Get pending submissions for admin review.
     */
    function getPendingSubmissions(uint256 offset, uint256 limit)
        external view returns (uint256[] memory ids)
    {
        uint256[] memory pendingIds = new uint256[](submissionCount);
        uint256 count = 0;

        for (uint256 i = 0; i < submissionCount; i++) {
            if (submissions[i].status == Status.Pending) {
                pendingIds[count] = i;
                count++;
            }
        }

        uint256 start = offset;
        if (start >= count) {
            return new uint256[](0);
        }
        uint256 end = start + limit;
        if (end > count) end = count;
        uint256 resultLen = end - start;

        ids = new uint256[](resultLen);
        for (uint256 i = 0; i < resultLen; i++) {
            ids[i] = pendingIds[start + i];
        }
    }

    /**
     * @notice Get full submission details.
     */
    function getSubmission(uint256 id) external view returns (
        address submitter,
        string memory imageUrl,
        uint256 totalStaked,
        uint256 totalShares,
        Status status,
        uint256 stakerCount
    ) {
        require(id < submissionCount, "Invalid submission");
        Submission storage sub = submissions[id];
        return (
            sub.submitter,
            sub.imageUrl,
            sub.totalStaked,
            sub.totalShares,
            sub.status,
            stakers[id].length
        );
    }

    /**
     * @notice Get a staker's share balance for a submission.
     */
    function getShareBalance(uint256 id, address staker) external view returns (uint256) {
        return shares[id][staker];
    }

    /**
     * @notice Get time remaining until deadline.
     */
    function timeRemaining() external view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    /**
     * @notice Check if a staker can claim rewards.
     */
    function canClaim(address staker) external view returns (bool) {
        if (!winnerPicked) return false;
        if (hasClaimed[staker]) return false;
        return shares[winningId][staker] > 0;
    }

    /**
     * @notice Get estimated claim amount for a staker.
     */
    function getClaimAmount(address staker) external view returns (uint256) {
        if (!winnerPicked) return 0;
        if (hasClaimed[staker]) return 0;
        uint256 stakerShares = shares[winningId][staker];
        if (stakerShares == 0) return 0;
        return (stakerPool * stakerShares) / totalWinningShares;
    }

    // ══════════════════════════════════════════════════════════════
    //                    INTERNAL FUNCTIONS
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Calculate shares for STAKE_AMOUNT given current totalShares.
     *         Bonding curve: price = BASE_PRICE + (normalizedShares * PRICE_INCREMENT)
     *         Normalize totalShares to whole units before price calc to prevent
     *         astronomical prices from 18-decimal share counts.
     */
    function _calculateShares(uint256 currentTotalShares) internal pure returns (uint256) {
        uint256 normalizedShares = currentTotalShares / 1e18;
        uint256 currentPrice = BASE_PRICE + (normalizedShares * PRICE_INCREMENT);
        return (STAKE_AMOUNT * 1e18) / currentPrice;
    }
}
