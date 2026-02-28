import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import "./App.css";

const SEPOLIA_CHAIN_ID = 11155111;
const STAKE_TOKEN_ADDRESS = "0x49f3C5E340eC9291c0a8A1353714b3F88502431e";
const STAKING_ADDRESS = "0x3DAC88046721a23ea92e89286b49998d9f99128F";

const stakeTokenAbi = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const stakingAbi = [
  "function stake(uint256 amount)",
  "function withdrawStakedTokens(uint256 amount)",
  "function getReward()",
  "function stakedBalance(address account) view returns (uint256)",
  "function REWARD_RATE() view returns (uint256)",
  "function earned(address account) view returns (uint256)",
];

function App() {
  const [displaySection, setDisplaySection] = useState("stake");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [approveAmount, setApproveAmount] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const [stakedAmount, setStakedAmount] = useState("0");
  const [rewardRate, setRewardRate] = useState("0");
  const [earnedReward, setEarnedReward] = useState("0");

  const stakeTokenContract = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(STAKE_TOKEN_ADDRESS, stakeTokenAbi, signer);
  }, [signer]);

  const stakingContract = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(STAKING_ADDRESS, stakingAbi, signer);
  }, [signer]);

  useEffect(() => {
    if (!window.ethereum) return;

    const onAccountsChanged = (accounts) => {
      setSelectedAccount(accounts?.[0] ?? "");
    };

    const onChainChanged = async () => {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const network = await browserProvider.getNetwork();
      setChainId(Number(network.chainId));
    };

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, []);

  useEffect(() => {
    const fetchDisplayData = async () => {
      if (!stakingContract || !selectedAccount) return;

      try {
        const [stakedWei, rewardRateWei, earnedWei] = await Promise.all([
          stakingContract.stakedBalance(selectedAccount),
          stakingContract.REWARD_RATE(),
          stakingContract.earned(selectedAccount),
        ]);

        setStakedAmount(Number(ethers.formatUnits(stakedWei, 18)).toFixed(2));
        setRewardRate(Number(ethers.formatUnits(rewardRateWei, 18)).toFixed(2));
        setEarnedReward(Number(ethers.formatUnits(earnedWei, 18)).toFixed(2));
      } catch {
        toast.error("Error fetching staking data");
      }
    };

    fetchDisplayData();
    const interval = setInterval(fetchDisplayData, 20000);
    return () => clearInterval(interval);
  }, [stakingContract, selectedAccount]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask is not installed");
      return;
    }

    setIsLoading(true);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const network = await browserProvider.getNetwork();
      const connectedSigner = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(connectedSigner);
      setSelectedAccount(accounts[0]);
      setChainId(Number(network.chainId));
      toast.success("Wallet connected");
    } catch {
      toast.error("Failed to connect wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const approveToken = async (event) => {
    event.preventDefault();
    if (!stakeTokenContract || !stakingContract) return;

    try {
      const amountToSend = ethers.parseUnits(approveAmount.trim(), 18);
      const transaction = await stakeTokenContract.approve(stakingContract.target, amountToSend);
      await toast.promise(transaction.wait(), {
        loading: "Transaction is pending...",
        success: "Transaction successful 👌",
        error: "Transaction failed 🤯",
      });
      setApproveAmount("");
    } catch {
      toast.error("Token Approval Failed");
    }
  };

  const stakeToken = async (event) => {
    event.preventDefault();
    if (!stakingContract) return;

    try {
      const amountToStake = ethers.parseUnits(stakeAmount.trim(), 18);
      const transaction = await stakingContract.stake(amountToStake);
      await toast.promise(transaction.wait(), {
        loading: "Transaction is pending...",
        success: "Transaction successful 👌",
        error: "Transaction failed 🤯",
      });
      setStakeAmount("");
    } catch {
      toast.error("Staking Failed");
    }
  };

  const withdrawStakeToken = async (event) => {
    event.preventDefault();
    if (!stakingContract) return;

    try {
      const amountToWithdraw = ethers.parseUnits(withdrawAmount.trim(), 18);
      const transaction = await stakingContract.withdrawStakedTokens(amountToWithdraw);
      await toast.promise(transaction.wait(), {
        loading: "Transaction is pending...",
        success: "Transaction successful 👌",
        error: "Transaction failed 🤯",
      });
      setWithdrawAmount("");
    } catch {
      toast.error("Withdraw Failed");
    }
  };

  const claimReward = async () => {
    if (!stakingContract) return;

    try {
      const transaction = await stakingContract.getReward();
      await toast.promise(transaction.wait(), {
        loading: "Transaction is pending...",
        success: "Transaction successful 👌",
        error: "Transaction failed 🤯",
      });
    } catch {
      toast.error("Claim Reward Failed");
    }
  };

  const networkLabel = chainId === null ? "Network Not Defected" : chainId === SEPOLIA_CHAIN_ID ? "Sepolia" : "Network Not Defected";

  return (
    <div className="main-section">
      <header className="navbar">
        <div className="navbar-btns">
          <div className="claim-reward">
            <button type="button" onClick={claimReward}>Claim Reward</button>
          </div>
        </div>
        <div className="navbar-acc">
          <p className="connected-ac">{selectedAccount || "Connect Account"}</p>
          <p className="network">{networkLabel}</p>
          <button className="connect-wallet-btn" onClick={connectWallet} disabled={isLoading} title="Connect Wallet">
            <svg className="wallet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"></path>
              <path d="M4 7h16"></path>
              <circle cx="18" cy="17" r="2"></circle>
            </svg>
            <span className="wallet-text">{isLoading ? "Connecting..." : "Connect Wallet"}</span>
          </button>
        </div>
      </header>

      <div className="top-wrapper">
        <div className="staked-amount">
          <p>Staked Amount:</p>
          <span>{stakedAmount}</span>
        </div>
        <div className="reward-rate">
          <p>Reward Rate:</p>
          <span>{rewardRate} token/sec</span>
        </div>
        <div className="earned-reward">
          <p>Earned Reward:</p>
          <span>{earnedReward}</span>
        </div>
      </div>

      <div className="main-content">
        <div className="button-section">
          <button onClick={() => setDisplaySection("stake")} className={displaySection === "stake" ? "" : "active"}>
            Stake
          </button>
          <button onClick={() => setDisplaySection("withdraw")} className={displaySection === "withdraw" ? "" : "active"}>
            Withdraw
          </button>
        </div>

        {displaySection === "stake" && (
          <div className="stake-wrapper">
            <form onSubmit={approveToken} className="token-amount-form">
              <label className="token-input-label">Token Aproval:</label>
              <input type="text" value={approveAmount} onChange={(event) => setApproveAmount(event.target.value)} />
              <button type="submit">Token Aproval</button>
            </form>

            <form onSubmit={stakeToken} className="stake-amount-form">
              <label className="stake-input-label">Enter Staked Amount:</label>
              <input type="text" value={stakeAmount} onChange={(event) => setStakeAmount(event.target.value)} />
              <button type="submit">Stake Token</button>
            </form>
          </div>
        )}

        {displaySection === "withdraw" && (
          <div className="stake-wrapper">
            <form className="withdraw-form" onSubmit={withdrawStakeToken}>
              <label>Withdraw Token:</label>
              <input type="text" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} />
              <button type="submit">Withdraw Staked Token</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
