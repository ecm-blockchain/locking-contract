
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { parseEther } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("ECMcoinLocking", function () {
  let Token: any;
  let testToken: any;
  let Locking: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addrs: any;

  beforeEach(async function () {
    await hre.network.provider.send("hardhat_reset");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    Token = await ethers.getContractFactory("MockERC20");
    Locking = await ethers.getContractFactory("ECMcoinLocking");
    testToken = await Token.deploy("Test Token", "TT", parseEther("1000000"));
  });

  it.only("Should allow user to lock tokens and claim after 6 months", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await expect(locking.connect(addr1).lockTokens(parseEther("50")))
      .to.emit(locking, "TokensLocked");
    let lockup = await locking.getLockup(addr1.address, 0);
    expect(lockup.amount).to.equal(parseEther("50"));
    expect(lockup.claimed).to.be.false;
    // Fast forward 6 months
    await time.increase(15552000);
    await expect(locking.connect(addr1).claim(0))
      .to.emit(locking, "TokensClaimed").withArgs(addr1.address, 0, parseEther("50"));
    lockup = await locking.getLockup(addr1.address, 0);
    expect(lockup.claimed).to.be.true;
    expect(await testToken.balanceOf(addr1.address)).to.equal(parseEther("100"));
  });

  it.only("Should allow multiple lockups per user and claim each independently", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("200"));
    await testToken.connect(addr1).approve(locking.target, parseEther("200"));
    await locking.connect(addr1).lockTokens(parseEther("50"));
    await locking.connect(addr1).lockTokens(parseEther("75"));
    expect(await locking.getLockupCount(addr1.address)).to.equal(2);
    // Fast forward 6 months
    await time.increase(15552000);
    await expect(locking.connect(addr1).claim(0)).to.emit(locking, "TokensClaimed");
    await expect(locking.connect(addr1).claim(1)).to.emit(locking, "TokensClaimed");
    expect((await locking.getLockup(addr1.address, 0)).claimed).to.be.true;
    expect((await locking.getLockup(addr1.address, 1)).claimed).to.be.true;
    expect(await testToken.balanceOf(addr1.address)).to.equal(parseEther("200"));
  });

  it.only("Should not allow claiming before unlock time", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await locking.connect(addr1).lockTokens(parseEther("50"));
    await expect(locking.connect(addr1).claim(0)).to.be.revertedWithCustomError(locking, "NothingToClaim");
  });

  it.only("Should not allow locking zero tokens", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await expect(locking.connect(addr1).lockTokens(0)).to.be.revertedWithCustomError(locking, "InsufficientAmount");
  });

  it.only("Should return correct lockup count and info", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await locking.connect(addr1).lockTokens(parseEther("10"));
    await locking.connect(addr1).lockTokens(parseEther("20"));
    expect(await locking.getLockupCount(addr1.address)).to.equal(2);
    const lockup0 = await locking.getLockup(addr1.address, 0);
    const lockup1 = await locking.getLockup(addr1.address, 1);
    expect(lockup0.amount).to.equal(parseEther("10"));
    expect(lockup1.amount).to.equal(parseEther("20"));
  });

  it.only("Should only allow lockup owner to claim", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await locking.connect(addr1).lockTokens(parseEther("50"));
    await time.increase(15552000);
    await expect(locking.connect(addr2).claim(0)).to.be.reverted;
    await expect(locking.connect(addr1).claim(0)).to.emit(locking, "TokensClaimed");
  });

  it.only("Should assign the total supply of tokens to the owner", async function () {
    const ownerBalance = await testToken.balanceOf(owner.address);
    expect(await testToken.totalSupply()).to.equal(ownerBalance);
  });


  // --- Edge Cases ---

  it.only("Should revert if claiming a lockup twice", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await locking.connect(addr1).lockTokens(parseEther("50"));
    await time.increase(15552000);
    await locking.connect(addr1).claim(0);
    await expect(locking.connect(addr1).claim(0)).to.be.revertedWithCustomError(locking, "NothingToClaim");
  });

  it.only("Should revert if claiming a lockup with zero amount", async function () {
    const locking = await Locking.deploy(testToken.target);
    // Manually create a zero-amount lockup for testing
    await expect(locking.connect(addr1).lockTokens(parseEther("0"))).to.be.revertedWithCustomError(locking, "InsufficientAmount");
  });

  it.only("Should revert if claiming a lockup with invalid index", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await locking.connect(addr1).lockTokens(parseEther("50"));
    await time.increase(15552000);
    await expect(locking.connect(addr1).claim(1)).to.be.reverted;
  });

  it.only("Should revert if locking tokens with no approval", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await expect(locking.connect(addr1).lockTokens(parseEther("50"))).to.be.reverted;
  });

  it.only("Should revert if locking tokens with insufficient balance", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await expect(locking.connect(addr1).lockTokens(parseEther("50"))).to.be.reverted;
  });

  it.only("Should revert if another user tries to claim someone else's lockup", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await locking.connect(addr1).lockTokens(parseEther("50"));
    await time.increase(15552000);
    await expect(locking.connect(addr2).claim(0)).to.be.reverted;
  });

  it.only("Should allow locking tokens after claiming all previous lockups", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await locking.connect(addr1).lockTokens(parseEther("50"));
    await time.increase(15552000);
    await locking.connect(addr1).claim(0);
    await locking.connect(addr1).lockTokens(parseEther("25"));
    expect(await locking.getLockupCount(addr1.address)).to.equal(2);
    const lockup = await locking.getLockup(addr1.address, 1);
    expect(lockup.amount).to.equal(parseEther("25"));
    expect(lockup.claimed).to.be.false;
  });

  it.only("Should keep lockup info correct after claim", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await locking.connect(addr1).lockTokens(parseEther("50"));
    await time.increase(15552000);
    await locking.connect(addr1).claim(0);
    const lockup = await locking.getLockup(addr1.address, 0);
    expect(lockup.amount).to.equal(parseEther("50"));
    expect(lockup.claimed).to.be.true;
  });

  it.only("Should not decrease lockup count after claim", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(addr1.address, parseEther("100"));
    await testToken.connect(addr1).approve(locking.target, parseEther("100"));
    await locking.connect(addr1).lockTokens(parseEther("50"));
    await time.increase(15552000);
    await locking.connect(addr1).claim(0);
    expect(await locking.getLockupCount(addr1.address)).to.equal(1);
  });


  it.only("Owner can withdraw mistakenly sent ERC20 tokens (not ECM)", async function () {
    const locking = await Locking.deploy(testToken.target);
    // Deploy a second token
    const OtherToken = await ethers.getContractFactory("MockERC20");
    const otherToken = await OtherToken.deploy("Other", "OT", parseEther("1000"));
    await otherToken.transfer(locking.target, parseEther("100"));
    const before = await otherToken.balanceOf(owner.address);
    await expect(locking.withdrawERC20(otherToken.target, parseEther("50")))
      .to.not.be.reverted;
    const after = await otherToken.balanceOf(owner.address);
    expect(after - before).to.equal(parseEther("50"));
  });

  it.only("Owner cannot withdraw locked ECM tokens", async function () {
    const locking = await Locking.deploy(testToken.target);
    await testToken.transfer(locking.target, parseEther("10"));
    await expect(locking.withdrawERC20(testToken.target, parseEther("10")))
      .to.be.revertedWith("Cannot withdraw locked ECM tokens");
  });

  it.only("Non-owner cannot withdraw ERC20 tokens", async function () {
    const locking = await Locking.deploy(testToken.target);
    const OtherToken = await ethers.getContractFactory("MockERC20");
    const otherToken = await OtherToken.deploy("Other", "OT", parseEther("1000"));
    await otherToken.transfer(locking.target, parseEther("100"));
    await expect(locking.connect(addr1).withdrawERC20(otherToken.target, parseEther("10")))
      .to.be.revertedWithCustomError(locking, "OwnableUnauthorizedAccount");
  });

  it.only("Owner can withdraw ETH sent to contract", async function () {
    const locking = await Locking.deploy(testToken.target);
    const before = await ethers.provider.getBalance(owner.address);
    await owner.sendTransaction({ to: locking.target, value: parseEther("0.02") });
    await expect(locking.withdrawETH(parseEther("0.01"))).to.not.be.reverted;
    const after = await ethers.provider.getBalance(owner.address);
    expect(after).to.be.lessThan(before);
  });

  it.only("Non-owner cannot withdraw ETH", async function () {
    const locking = await Locking.deploy(testToken.target);
    await owner.sendTransaction({ to: locking.target, value: parseEther("0.01") });
    await expect(locking.connect(addr1).withdrawETH(parseEther("0.01")))
      .to.be.revertedWithCustomError(locking, "OwnableUnauthorizedAccount");
  });

  it.only("Withdraw ETH reverts if insufficient balance", async function () {
    const locking = await Locking.deploy(testToken.target);
    await expect(locking.withdrawETH(parseEther("1"))).to.be.revertedWith("Insufficient ETH");
  });

});
