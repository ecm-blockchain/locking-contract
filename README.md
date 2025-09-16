

# ECMcoinLocking Contract

## Overview


`ECMcoinLocking` is a simple, secure ERC20 token lockup contract. Users can lock their ECM tokens for a fixed 6-month period. Each deposit creates a new lockup, and users can have multiple lockups. After 6 months, users can claim their tokens. The contract owner can withdraw mistakenly sent ERC20 tokens (except ECM) and ETH. The contract leaves a configurable `leftOver` amount (default: 0.1 ether) in the user's wallet when locking.

## Key Features

- **User-Initiated Lockup:** Any user can lock their ECM tokens for 6 months by calling `lockTokens()` (no parameter) after approval. The contract pulls all tokens except the `leftOver` amount from the user's wallet.
- **Multiple Lockups:** Each user can have multiple independent lockups.
- **Claim After 6 Months:** Users can claim their tokens after the lockup period.
- **Owner Withdrawals:** Owner can withdraw mistakenly sent ERC20 tokens (not ECM) and ETH.
- **Custom Errors:** Uses Solidity custom errors for gas efficiency and clarity.
- **SafeERC20:** All token transfers use OpenZeppelin's SafeERC20.
- **Reentrancy Protection:** All token transfer functions are protected by `ReentrancyGuard`.
- **Events:** Emits events for lockup creation, claims, and withdrawals.

## Lockup Logic

- **Lockup Period:** 6 months (15,552,000 seconds) from deposit.
- **Multiple Lockups:** Users can create multiple lockups by calling `lockTokens()` multiple times.
- **Claim:** After 6 months, users can claim their locked tokens.
- **leftOver:** The contract leaves a minimum `leftOver` amount (default: 0.1 ether) in the user's wallet. The owner can update this value with `setLeftOver(uint256)`.

## Usage

### Locking Tokens

```
function lockTokens() external
```
- User must approve the contract to spend their tokens first.
- Transfers all tokens except `leftOver` from user to contract and creates a new lockup for the user.

### Claiming Locked Tokens

```
function claim(uint256 lockupId) external
```
- Can be called by the lockup owner after 6 months.
- Transfers locked tokens to the user and marks the lockup as claimed.

### Owner Withdrawals & leftOver Setting

```
function withdrawERC20(address token, uint256 amount) external onlyOwner
function withdrawETH(uint256 amount) external onlyOwner
function setLeftOver(uint256 newLeftOver) external onlyOwner
```
- Owner can withdraw mistakenly sent ERC20 tokens (not ECM) and ETH.
- Owner can update the `leftOver` value (minimum tokens to leave in user wallet).

## Security

- **Access Control:** Only the owner can withdraw tokens/ETH and set `leftOver`.
- **ReentrancyGuard:** All token transfer functions are protected.
- **Custom Errors:** All validation uses custom errors for gas savings and clarity.
- **SafeERC20:** All token transfers use SafeERC20.

## Events

- `TokensLocked(address user, uint256 lockupId, uint256 amount, uint256 start, uint256 unlock)`
- `TokensClaimed(address user, uint256 lockupId, uint256 amount)`

## Example: User-Initiated Lockup

- Lockup: 6 months (15,552,000 seconds)
- Each user can create multiple lockups by calling `lockTokens()` multiple times. Each call will lock all tokens except the `leftOver` amount in their wallet.

## Testing

Tests are provided in the `test/` directory and cover:
- User-initiated lockups and multiple lockups per user
- Claim logic and event emission
- Withdrawals, leftOver setting, and access control
- Custom error reverts (e.g., InsufficientTokens, NothingToClaim, etc.)
- Edge cases: reentrancy, large amounts, timestamp boundaries, access control, and more

### Test Commands

Run all tests:
```
npm run test
```
Run tests with verbose logs (tracing):
```
npm run test:logs
```
Run tests with gas reporting:
```
REPORT_GAS=true npm run test
```

## Deployment

1. **Clean build artifacts:**
   ```shell
   npm run clean
   ```
2. **Compile contracts:**
   ```shell
   npm run build
   ```
3. **Deploy contract:**
   ```shell
   npm run deploy:network <network-name>
   ```
   Replace `<network-name>` with your desired network (e.g., `localhost`, `sepolia`, etc.).
4. **Verify contract:**
   ```shell
   npm run deploy:verify <network-name>
   ```
5. **Fund contract:**
   Transfer ECM tokens to the contract address for lockup.

## Usage

```shell
npm run build
npm run clean
npm run test
npm run test:logs
```

# ECMcoinLocking Contract

This contract implements user-initiated 6-month lockups for ERC20 tokens. It always leaves a configurable `leftOver` amount in the user's wallet. See above for usage, deployment, and testing instructions.
