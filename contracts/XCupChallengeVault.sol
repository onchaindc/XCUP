// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract XCupChallengeVault {
    enum Outcome {
        Home,
        Draw,
        Away
    }

    enum Asset {
        OKB,
        USDC
    }

    enum SlipStatus {
        Locked,
        Won,
        Lost,
        Exited
    }

    struct Slip {
        uint256 id;
        address player;
        bytes32 matchId;
        Outcome outcome;
        uint256 amount;
        Asset asset;
        SlipStatus status;
        uint64 createdAt;
        uint64 lockDeadline;
        bool rewardClaimed;
    }

    struct MatchRecord {
        bytes32 matchId;
        bytes32 metadataHash;
        bool resolved;
        Outcome result;
        uint64 lockDeadline;
    }

    address public owner;
    address public resolver;
    IERC20 public usdc;
    bool public paused;
    uint256 public nextSlipId = 1;
    uint256 public constant WIN_REWARD_BPS = 13_000;
    uint256 public constant LOSS_REFUND_BPS = 9_000;
    uint256 public constant EARLY_EXIT_REFUND_BPS = 10_000;
    uint256 public constant BPS = 10_000;
    uint64 public defaultLockSeconds = 30 minutes;

    mapping(uint256 => Slip) public slips;
    mapping(address => uint256[]) private userSlipIds;
    mapping(bytes32 => MatchRecord) public matchesById;

    event ChallengeCreated(uint256 indexed slipId, address indexed player, bytes32 indexed matchId, uint8 outcome, uint256 amount, uint8 asset);
    event ChallengeExited(uint256 indexed slipId, address indexed player, uint256 refund);
    event MatchResolved(bytes32 indexed matchId, uint8 result);
    event RewardClaimed(uint256 indexed slipId, address indexed player, uint256 payout);
    event VaultFunded(address indexed funder, uint8 asset, uint256 amount);
    event VaultWithdrawn(address indexed to, uint8 asset, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotResolver();
    error Paused();
    error InvalidAmount();
    error InvalidOutcome();
    error InvalidAsset();
    error InvalidSlip();
    error NotSlipOwner();
    error LockClosed();
    error MatchNotResolved();
    error AlreadyClaimed();
    error NotWinner();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyResolver() {
        if (msg.sender != owner && msg.sender != resolver) revert NotResolver();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    constructor(address usdcAddress, address resolverAddress) {
        owner = msg.sender;
        resolver = resolverAddress == address(0) ? msg.sender : resolverAddress;
        usdc = IERC20(usdcAddress);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    receive() external payable {
        emit VaultFunded(msg.sender, uint8(Asset.OKB), msg.value);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "owner zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setResolver(address newResolver) external onlyOwner {
        resolver = newResolver;
    }

    function setUSDC(address usdcAddress) external onlyOwner {
        usdc = IERC20(usdcAddress);
    }

    function setPaused(bool nextPaused) external onlyOwner {
        paused = nextPaused;
    }

    function setDefaultLockSeconds(uint64 secondsUntilLock) external onlyOwner {
        defaultLockSeconds = secondsUntilLock;
    }

    function upsertMatch(bytes32 matchId, bytes32 metadataHash, uint64 lockDeadline) external onlyResolver {
        matchesById[matchId].matchId = matchId;
        matchesById[matchId].metadataHash = metadataHash;
        matchesById[matchId].lockDeadline = lockDeadline;
    }

    function lockChallenge(bytes32 matchId, uint8 outcome, uint256 amount, uint8 asset) external payable whenNotPaused returns (uint256 slipId) {
        if (amount == 0) revert InvalidAmount();
        if (outcome > uint8(Outcome.Away)) revert InvalidOutcome();
        if (asset > uint8(Asset.USDC)) revert InvalidAsset();

        Asset challengeAsset = Asset(asset);
        if (challengeAsset == Asset.OKB) {
            if (msg.value != amount) revert InvalidAmount();
        } else {
            if (msg.value != 0) revert InvalidAmount();
            if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        }

        MatchRecord storage matchRecord = matchesById[matchId];
        if (matchRecord.matchId == bytes32(0)) {
            matchRecord.matchId = matchId;
            matchRecord.lockDeadline = uint64(block.timestamp) + defaultLockSeconds;
        }
        if (matchRecord.resolved || block.timestamp > matchRecord.lockDeadline) revert LockClosed();

        slipId = nextSlipId++;
        slips[slipId] = Slip({
            id: slipId,
            player: msg.sender,
            matchId: matchId,
            outcome: Outcome(outcome),
            amount: amount,
            asset: challengeAsset,
            status: SlipStatus.Locked,
            createdAt: uint64(block.timestamp),
            lockDeadline: matchRecord.lockDeadline,
            rewardClaimed: false
        });
        userSlipIds[msg.sender].push(slipId);
        emit ChallengeCreated(slipId, msg.sender, matchId, outcome, amount, asset);
    }

    function exitChallenge(uint256 slipId) external whenNotPaused {
        Slip storage slip = slips[slipId];
        if (slip.player == address(0)) revert InvalidSlip();
        if (slip.player != msg.sender) revert NotSlipOwner();
        if (slip.status != SlipStatus.Locked) revert InvalidSlip();
        if (block.timestamp > slip.lockDeadline) revert LockClosed();

        slip.status = SlipStatus.Exited;
        uint256 refund = (slip.amount * EARLY_EXIT_REFUND_BPS) / BPS;
        _pay(slip.asset, msg.sender, refund);
        emit ChallengeExited(slipId, msg.sender, refund);
    }

    function resolveMatch(bytes32 matchId, uint8 result) external onlyResolver {
        if (result > uint8(Outcome.Away)) revert InvalidOutcome();
        MatchRecord storage matchRecord = matchesById[matchId];
        matchRecord.matchId = matchId;
        matchRecord.resolved = true;
        matchRecord.result = Outcome(result);
        emit MatchResolved(matchId, result);
    }

    function claimReward(uint256 slipId) external whenNotPaused {
        Slip storage slip = slips[slipId];
        if (slip.player == address(0)) revert InvalidSlip();
        if (slip.player != msg.sender) revert NotSlipOwner();
        if (slip.rewardClaimed) revert AlreadyClaimed();
        MatchRecord storage matchRecord = matchesById[slip.matchId];
        if (!matchRecord.resolved) revert MatchNotResolved();
        if (slip.status != SlipStatus.Locked) revert InvalidSlip();

        slip.rewardClaimed = true;
        if (slip.outcome == matchRecord.result) {
            slip.status = SlipStatus.Won;
            uint256 payout = (slip.amount * WIN_REWARD_BPS) / BPS;
            _pay(slip.asset, msg.sender, payout);
            emit RewardClaimed(slipId, msg.sender, payout);
        } else {
            slip.status = SlipStatus.Lost;
            uint256 refund = (slip.amount * LOSS_REFUND_BPS) / BPS;
            _pay(slip.asset, msg.sender, refund);
            emit RewardClaimed(slipId, msg.sender, refund);
        }
    }

    function fundVault() external payable onlyOwner {
        emit VaultFunded(msg.sender, uint8(Asset.OKB), msg.value);
    }

    function fundVaultUSDC(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit VaultFunded(msg.sender, uint8(Asset.USDC), amount);
    }

    function withdrawVault(uint8 asset, uint256 amount, address to) external onlyOwner {
        if (asset > uint8(Asset.USDC)) revert InvalidAsset();
        _pay(Asset(asset), to, amount);
        emit VaultWithdrawn(to, asset, amount);
    }

    function vaultBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function usdcVaultBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function getUserSlips(address user) external view returns (Slip[] memory userSlips) {
        uint256[] storage ids = userSlipIds[user];
        userSlips = new Slip[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            userSlips[i] = slips[ids[i]];
        }
    }

    function getMatchById(bytes32 matchId) external view returns (MatchRecord memory) {
        return matchesById[matchId];
    }

    function _pay(Asset asset, address to, uint256 amount) internal {
        if (asset == Asset.OKB) {
            (bool ok, ) = payable(to).call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            if (!usdc.transfer(to, amount)) revert TransferFailed();
        }
    }
}
