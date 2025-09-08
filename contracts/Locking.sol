// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ECMcoinLocking
 */
contract ECMcoinLocking is Ownable, ReentrancyGuard {

    using SafeERC20 for IERC20;

    error InsufficientAmount();
    error NothingToClaim();

    struct Lockup {
        uint256 amount;
        uint256 start;
        uint256 unlock;
        bool claimed;
    }

    event TokensLocked(address indexed user, uint256 indexed lockupId, uint256 amount, uint256 start, uint256 unlock);
    event TokensClaimed(address indexed user, uint256 indexed lockupId, uint256 amount);

    uint256 public constant LOCKUP_DURATION = 15552000; // 6 months in seconds
    IERC20 private immutable _token;

    // user => lockups
    mapping(address => Lockup[]) public userLockups;


    constructor(address token_) Ownable(msg.sender) {
        require(token_ != address(0), "Token address cannot be zero");
        _token = IERC20(token_);
    }


    /**
     * @notice User locks tokens for 6 months. Each deposit creates a new lockup.
     * @param amount Amount of tokens to lock
     */
    function lockTokens(uint256 amount) external nonReentrant {
        if (amount == 0) revert InsufficientAmount();
        _token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 start = block.timestamp;
        uint256 unlock = start + LOCKUP_DURATION;
        userLockups[msg.sender].push(Lockup({
            amount: amount,
            start: start,
            unlock: unlock,
            claimed: false
        }));
        emit TokensLocked(msg.sender, userLockups[msg.sender].length - 1, amount, start, unlock);
    }


    receive() external payable {}
    fallback() external payable {}

    /**
     * @notice Owner can withdraw mistakenly sent ERC20 tokens (except locked ECM tokens)
     */
    function withdrawERC20(address token, uint256 amount) external onlyOwner nonReentrant {
        require(token != address(_token), "Cannot withdraw locked ECM tokens");
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Owner can withdraw mistakenly sent ETH
     */
    function withdrawETH(uint256 amount) external onlyOwner nonReentrant {
        require(address(this).balance >= amount, "Insufficient ETH");
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
    }


    /**
     * @notice Claim unlocked tokens for a specific lockup.
     * @param lockupId The index of the lockup to claim
     */
    function claim(uint256 lockupId) external nonReentrant {
        Lockup storage lockup = userLockups[msg.sender][lockupId];
        if (lockup.claimed || block.timestamp < lockup.unlock || lockup.amount == 0) revert NothingToClaim();
        lockup.claimed = true;
        _token.safeTransfer(msg.sender, lockup.amount);
        emit TokensClaimed(msg.sender, lockupId, lockup.amount);
    }

    /**
     * @notice Returns the number of lockups for a user.
     */
    function getLockupCount(address user) external view returns (uint256) {
        return userLockups[user].length;
    }

    /**
     * @notice Returns lockup info for a user and lockupId.
     */
    function getLockup(address user, uint256 lockupId) external view returns (Lockup memory) {
        return userLockups[user][lockupId];
    }
}
