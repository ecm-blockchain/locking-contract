

# ECMcoinLocking Integration Guide for Vue.js Developers

This guide explains how to integrate the ECMcoinLocking contract into a Vue.js frontend, covering wallet connection, token approval, locking, claiming tokens, owner withdrawals, and handling contract errors. This guide is updated for the contract logic where users lock all tokens except a configurable `leftOver` amount (default: 0.1 ether).

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

Before locking, users must approve the ECMcoinLocking contract to spend their tokens. The contract will pull all tokens except the `leftOver` amount (default: 0.1 ether) from the user's wallet:

```js
const erc20 = new ethers.Contract(tokenAddress, erc20Abi, signer);
const lockingAddress = '...'; // ECMcoinLocking contract address
const userBalance = await erc20.balanceOf(userAddress);
if (userBalance > ethers.parseEther('0.1')) { // leftOver default is 0.1 ether
	await erc20.approve(lockingAddress, userBalance);
}
```



## 4. Locking Tokens

Call `lockTokens()` (no parameter) to lock all tokens except the `leftOver` amount for 6 months:

```js
const locking = new ethers.Contract(lockingAddress, lockingAbi, signer);
await locking.lockTokens();
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

The owner can also set the `leftOver` value (minimum tokens to leave in user wallet):

```js
await locking.setLeftOver(newLeftOverAmount); // Only owner
```




## 7. Error Handling

Handle custom errors and revert reasons in your UI:

- `InsufficientTokens`: User tried to lock with less than or equal to `leftOver` tokens in their wallet.
- `NothingToClaim`: Tried to claim before unlock, already claimed, or zero-amount lockup.
- `OwnableUnauthorizedAccount`: Only the owner can withdraw tokens/ETH or set `leftOver`.
- `Cannot withdraw locked ECM tokens`: Owner tried to withdraw ECM tokens.
- `Insufficient ETH`: Owner tried to withdraw more ETH than available.

Show user-friendly messages for these errors. Always check the user's token balance and approval before calling `lockTokens()`.




## 8. UI Suggestions

- Show user's lockups and their status (amount, start, unlock, claimed).
- Display countdown to unlock and claim eligibility.
- Provide buttons for approve (auto-fill with user balance), lock (no parameter), claim, and withdraw/setLeftOver (owner only).
- Show transaction status and error messages.




## 9. Example Workflow

1. User connects wallet.
2. User approves ECMcoinLocking contract for their token balance.
3. User calls `lockTokens()` to lock all tokens except `leftOver` for 6 months.
4. UI displays lockups and progress.
5. After 6 months, user can claim locked tokens.
6. Owner can withdraw mistakenly sent tokens/ETH and set `leftOver` value.




## 10. Advanced

- Support multiple lockups per user (show all lockups).
- Handle large amounts and edge cases (e.g., user tries to lock with <= `leftOver` tokens, or multiple lockups in sequence).
- Allow owner to update `leftOver` value via UI.
- Use Ethers.js event listeners to update UI on contract events (`TokensLocked`, `TokensClaimed`).



## 12. Displaying User Lockup Information (Detailed Example)

To display a user's lockups in your Vue.js frontend, fetch all lockups for the connected user and show their details (amount, start, unlock, claimed status, and time left to unlock).

### Fetching Lockups

```js
import { ethers } from 'ethers';

async function fetchUserLockups(locking, userAddress) {
	const count = await locking.getLockupCount(userAddress);
	const lockups = [];
	for (let i = 0; i < count; i++) {
		const lockup = await locking.getLockup(userAddress, i);
		lockups.push({
			...lockup,
			id: i, // keep track of lockupId for claim
		});
	}
	return lockups;
}
```

### Vue.js Display Example

```html
<template>
	<div v-for="lockup in lockups" :key="lockup.id" class="lockup-card">
		<p><strong>Amount:</strong> {{ formatEther(lockup.amount) }} ECM</p>
		<p><strong>Start:</strong> {{ formatDate(lockup.start) }}</p>
		<p><strong>Unlock:</strong> {{ formatDate(lockup.unlock) }}</p>
		<p><strong>Status:</strong> <span v-if="lockup.claimed">Claimed</span><span v-else>Unclaimed</span></p>
		<p v-if="!lockup.claimed"><strong>Time left:</strong> {{ timeLeft(lockup.unlock) }}</p>
		<button v-if="!lockup.claimed && isUnlocked(lockup.unlock)" @click="claim(lockup.id)">Claim</button>
	</div>
</template>

<script setup>
import { ref } from 'vue';
import { ethers } from 'ethers';

const lockups = ref([]); // fetched from fetchUserLockups

function formatEther(amount) {
	return ethers.formatEther(amount);
}
function formatDate(ts) {
	return new Date(Number(ts) * 1000).toLocaleString();
}
function timeLeft(unlock) {
	const now = Math.floor(Date.now() / 1000);
	const seconds = Math.max(0, unlock - now);
	if (seconds === 0) return 'Unlocked!';
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	return `${days}d ${hours}h ${mins}m`;
}
function isUnlocked(unlock) {
	return Number(unlock) <= Math.floor(Date.now() / 1000);
}
async function claim(lockupId) {
	// Call contract's claim(lockupId) function
	// ...existing code to send transaction...
}
</script>

<style>
.lockup-card {
	border: 1px solid #ccc;
	border-radius: 8px;
	padding: 16px;
	margin-bottom: 16px;
	background: #fafbfc;
}
</style>
```

**Tips:**
- Refresh lockups after claiming.
- Show transaction status and errors.
- You can add filters to show only unclaimed or claimed lockups.

This approach gives users a clear view of all their lockups, their status, and when they can claim.

---

# References

- ECMcoinLocking ABI and address
- ERC20 ABI and address
- Ethers.js documentation: https://docs.ethers.org/
