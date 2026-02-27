import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

// StakeToken unit tests
describe("StakeToken", function () {
  it("Should set correct metadata and mint total supply", async function () {
    // Deploy token with whole-token initial supply (contract applies 18 decimals)
    const initialSupply = 10_000_000_000_000n;
    const stakeToken = await ethers.deployContract("StakeToken", [initialSupply]);
    const [owner] = await ethers.getSigners();

    // Verify ERC20 metadata
    expect(await stakeToken.name()).to.equal("StakeToken");
    expect(await stakeToken.symbol()).to.equal("STK");

    // Verify total supply and deployer allocation
    const expectedTotalSupply = initialSupply * 10n ** 18n;
    expect(await stakeToken.totalSupply()).to.equal(expectedTotalSupply);
    expect(await stakeToken.balanceOf(owner.address)).to.equal(expectedTotalSupply);
  });
});

// RewardToken unit tests
describe("RewardToken", function () {
  it("Should set correct metadata and mint total supply", async function () {
    // Deploy token with whole-token initial supply (contract applies 18 decimals)
    const initialSupply = 10_000_000_000_000n;
    const rewardToken = await ethers.deployContract("RewardToken", [initialSupply]);
    const [owner] = await ethers.getSigners();

    // Verify ERC20 metadata
    expect(await rewardToken.name()).to.equal("RewardToken");
    expect(await rewardToken.symbol()).to.equal("RWT");

    // Verify total supply and deployer allocation
    const expectedTotalSupply = initialSupply * 10n ** 18n;
    expect(await rewardToken.totalSupply()).to.equal(expectedTotalSupply);
    expect(await rewardToken.balanceOf(owner.address)).to.equal(expectedTotalSupply);
  });
});

// Staking contract integration-style unit tests
describe("Staking", function () {
  // Shared setup helper for all staking tests
  async function deployStakingSystem() {
    const initialSupply = 10_000_000_000_000n;
    const stakeToken = await ethers.deployContract("StakeToken", [initialSupply]);
    const rewardToken = await ethers.deployContract("RewardToken", [initialSupply]);
    const staking = await ethers.deployContract("Staking", [
      await stakeToken.getAddress(),
      await rewardToken.getAddress(),
    ]);

    const [owner, user] = await ethers.getSigners();

    return { owner, user, stakeToken, rewardToken, staking };
  }

  it("Should store staking and reward token addresses in constructor", async function () {
    const { stakeToken, rewardToken, staking } = await deployStakingSystem();

    // Constructor should store both token addresses correctly
    expect(await staking.s_stakingToken()).to.equal(await stakeToken.getAddress());
    expect(await staking.s_rewardToken()).to.equal(await rewardToken.getAddress());
  });

  it("Should allow user to stake tokens and emit Staked event", async function () {
    const { owner, user, stakeToken, staking } = await deployStakingSystem();

    // Fund user with stake tokens and approve staking contract
    const stakeAmount = 1_000n * 10n ** 18n;
    await stakeToken.transfer(user.address, stakeAmount);
    await stakeToken.connect(user).approve(await staking.getAddress(), stakeAmount);

    // Stake and assert event
    await expect(staking.connect(user).stake(stakeAmount))
      .to.emit(staking, "Staked")
      .withArgs(user.address, stakeAmount);

    // Verify updated balances and contract custody
    expect(await staking.stakedBalance(user.address)).to.equal(stakeAmount);
    expect(await stakeToken.balanceOf(await staking.getAddress())).to.equal(stakeAmount);
    expect(await stakeToken.balanceOf(owner.address)).to.equal(
      (await stakeToken.totalSupply()) - stakeAmount,
    );
  });

  it("Should revert when staking zero", async function () {
    const { user, staking } = await deployStakingSystem();

    // Staking zero should fail by require check
    await expect(staking.connect(user).stake(0n)).to.be.revertedWith(
      "Amount must be greater than zero",
    );
  });

  it("Should allow user to withdraw staked tokens", async function () {
    const { user, stakeToken, staking } = await deployStakingSystem();

    const stakeAmount = 500n * 10n ** 18n;
    const withdrawAmount = 200n * 10n ** 18n;

    // Stake first, then withdraw a partial amount
    await stakeToken.transfer(user.address, stakeAmount);
    await stakeToken.connect(user).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(user).stake(stakeAmount);

    await expect(staking.connect(user).withdrawStakedTokens(withdrawAmount))
      .to.emit(staking, "Withdrawn")
      .withArgs(user.address, withdrawAmount);

    expect(await staking.stakedBalance(user.address)).to.equal(
      stakeAmount - withdrawAmount,
    );
  });

  it("Should revert when withdrawing zero", async function () {
    const { user, staking } = await deployStakingSystem();

    // Withdraw zero should fail by require check
    await expect(staking.connect(user).withdrawStakedTokens(0n)).to.be.revertedWith(
      "Amount must be greater than zero",
    );
  });

  it("Should revert when withdrawing more than staked amount", async function () {
    const { user, stakeToken, staking } = await deployStakingSystem();

    const stakeAmount = 100n * 10n ** 18n;
    const excessiveAmount = 101n * 10n ** 18n;

    // Stake a smaller amount and attempt to over-withdraw
    await stakeToken.transfer(user.address, stakeAmount);
    await stakeToken.connect(user).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(user).stake(stakeAmount);

    await expect(
      staking.connect(user).withdrawStakedTokens(excessiveAmount),
    ).to.be.revertedWith("Staked amount not enough");
  });

  it("Should accrue and pay rewards to staker", async function () {
    const { owner, user, stakeToken, rewardToken, staking } = await deployStakingSystem();

    const stakeAmount = 1_000n * 10n ** 18n;
    const rewardFunding = 1_000_000n * 10n ** 18n;

    // Fund user with stake tokens and fund staking contract with reward pool
    await stakeToken.transfer(user.address, stakeAmount);
    await rewardToken.transfer(await staking.getAddress(), rewardFunding);

    // Stake tokens to start earning rewards
    await stakeToken.connect(user).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(user).stake(stakeAmount);

    // Fast-forward chain time to accrue rewards
    await ethers.provider.send("evm_increaseTime", [10]);
    await ethers.provider.send("evm_mine", []);

    const rewardBeforeClaim = await rewardToken.balanceOf(user.address);

    // Claim rewards and extract emitted reward amount
    const claimTx = await staking.connect(user).getReward();
    const receipt = await claimTx.wait();

    const claimedEvent = receipt!.logs
      .map((log) => {
        try {
          return staking.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsedLog) => parsedLog?.name === "RewardsClaimed");

    expect(claimedEvent).to.not.equal(undefined);

    const claimedAmount = claimedEvent!.args[1] as bigint;
    expect(claimedAmount).to.be.greaterThan(0n);

    // Verify user reward transfer and reward reset
    const rewardAfterClaim = await rewardToken.balanceOf(user.address);
    expect(rewardAfterClaim - rewardBeforeClaim).to.equal(claimedAmount);
    expect(await staking.rewards(user.address)).to.equal(0n);

    // Verify deployer balance reflects reward funding transfer
    expect(await rewardToken.balanceOf(owner.address)).to.equal(
      (await rewardToken.totalSupply()) - rewardFunding,
    );
  });
});
