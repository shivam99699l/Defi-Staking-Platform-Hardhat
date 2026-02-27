import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Initial token supply in whole tokens (contracts apply 18 decimals internally).
const INITIAL_SUPPLY = 10_000_000_000_000n;

export default buildModule("StakingSystemModule", (m) => {
  // Deploy staking token and reward token first.
  const stakeToken = m.contract("StakeToken", [INITIAL_SUPPLY]);
  const rewardToken = m.contract("RewardToken", [INITIAL_SUPPLY]);

  // Deploy staking contract with both token addresses from above deployments.
  const staking = m.contract("Staking", [stakeToken, rewardToken]);

  // Expose deployed contracts in Ignition output.
  return { stakeToken, rewardToken, staking };
});
