
# ECMcoinLocking Integration Guide for Vue.js Developers

This guide explains how to integrate the ECMcoinLocking contract into a Vue.js frontend, covering wallet connection, token approval, locking, claiming tokens, owner withdrawals, and handling contract errors.

## 1. Prerequisites

- Vue.js project (Vue 3 recommended)
- Ethers.js (for interacting with Ethereum)
- Wallet provider (e.g., MetaMask)
- ABI and contract address for ECMcoinVesting and ERC20 token

## 2. Wallet Connection

Use Ethers.js to connect to the user's wallet:

```js
import { ethers } from 'ethers';

async function connectWallet() {
	if (window.ethereum) {
		await window.ethereum.request({ method: 'eth_requestAccounts' });
		const provider = new ethers.BrowserProvider(window.ethereum);
		const signer = await provider.getSigner();
		return { provider, signer };
	}
	throw new Error('No wallet found');
}
```



## 3. Approving Tokens for Locking

Before locking, users must approve the ECMcoinLocking contract to spend their tokens:

```js
const erc20 = new ethers.Contract(tokenAddress, erc20Abi, signer);
const lockingAddress = '...'; // ECMcoinLocking contract address
const userBalance = await erc20.balanceOf(userAddress);
if (userBalance > 0) {
	await erc20.approve(lockingAddress, userBalance);
}
```


## 4. Locking Tokens

Call `lockTokens(amount)` to lock tokens for 6 months:

```js
const locking = new ethers.Contract(lockingAddress, lockingAbi, signer);
await locking.lockTokens(amount); // amount in wei
```

After locking, you can fetch the user's lockups:

```js
const count = await locking.getLockupCount(userAddress);
const lockups = [];
for (let i = 0; i < count; i++) {
	const lockup = await locking.getLockup(userAddress, i);
	lockups.push(lockup);
}
```


## 5. Claiming Locked Tokens

To claim locked tokens after 6 months:

```js
await locking.claim(lockupId); // lockupId is the index in user's lockups
```


## 6. Owner Withdrawals (Mistakenly Sent Tokens/ETH)

The contract owner can withdraw mistakenly sent ERC20 tokens (not ECM) and ETH:

```js
// Withdraw ERC20 tokens (not ECM)
await locking.withdrawERC20(otherTokenAddress, amount);

// Withdraw ETH
await locking.withdrawETH(amount);
```



## 7. Error Handling

Handle custom errors and revert reasons in your UI:

- `InsufficientAmount`: User tried to lock zero tokens.
- `NothingToClaim`: Tried to claim before unlock, already claimed, or zero-amount lockup.
- `OwnableUnauthorizedAccount`: Only the owner can withdraw tokens/ETH.
- `Cannot withdraw locked ECM tokens`: Owner tried to withdraw ECM tokens.
- `Insufficient ETH`: Owner tried to withdraw more ETH than available.

Show user-friendly messages for these errors. Always check the user's token balance and approval before calling `lockTokens()`.



## 8. UI Suggestions

- Show user's lockups and their status (amount, start, unlock, claimed).
- Display countdown to unlock and claim eligibility.
- Provide buttons for approve (auto-fill with user balance), lock (with amount), claim, and withdraw (owner only).
- Show transaction status and error messages.



## 9. Example Workflow

1. User connects wallet.
2. User approves ECMcoinLocking contract for their token balance.
3. User calls `lockTokens(amount)` to lock tokens for 6 months.
4. UI displays lockups and progress.
5. After 6 months, user can claim locked tokens.
6. Owner can withdraw mistakenly sent tokens/ETH.



## 10. Advanced

- Support multiple lockups per user (show all lockups).
- Handle large amounts and edge cases (e.g., user tries to lock zero tokens, or multiple lockups in sequence).
- Use Ethers.js event listeners to update UI on contract events (`TokensLocked`, `TokensClaimed`).


## 11. References

- ECMcoinLocking ABI and address
- ERC20 ABI and address
- Ethers.js documentation: https://docs.ethers.org/
