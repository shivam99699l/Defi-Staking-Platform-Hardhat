# 🚀 DeFi Staking Platform

A simple full-stack staking dApp (Hardhat + Solidity + React) on Sepolia.

![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636)
![Hardhat](https://img.shields.io/badge/Hardhat-3.1.10-F7DF1E)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB)

## 📌 Features
- Approve `StakeToken`
- Stake / withdraw tokens
- Claim `RewardToken`
- View staked amount, reward rate, earned reward

## 🛠️ Tech Stack
| Layer | Tools |
|---|---|
| Contracts | Solidity, OpenZeppelin |
| Blockchain | Hardhat 3, Ignition, ethers |
| Frontend | React, Vite, react-hot-toast |
| Testing | Mocha, Chai |

## 📍 Deployed on Sepolia
| Contract | Address | Etherscan |
|---|---|---|
| StakeToken | `0x49f3C5E340eC9291c0a8A1353714b3F88502431e` | https://sepolia.etherscan.io/address/0x49f3C5E340eC9291c0a8A1353714b3F88502431e#code |

| RewardToken | `0xEa4Fc783A3Af0088485d9C0cba11d69C24ED5D9F` | https://sepolia.etherscan.io/address/0xEa4Fc783A3Af0088485d9C0cba11d69C24ED5D9F#code |

| Staking | `0x3DAC88046721a23ea92e89286b49998d9f99128F` | https://sepolia.etherscan.io/address/0x3DAC88046721a23ea92e89286b49998d9f99128F#code |

## ⚙️ Local Setup (Step-by-step)
1. Clone repo:
```bash
git clone https://github.com/shivam99699l/DeFi-Staking-Platform.git
cd DeFi-Staking-Platform
```
2. Install root dependencies:
```bash
npm install
```
3. Create `.env` in root:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
SEPOLIA_PRIVATE_KEY=0xyour_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```
4. Compile and test:
```bash
npx hardhat compile
npx hardhat test
```
5. (Optional) Deploy contracts:
```bash
npx hardhat ignition deploy --network sepolia ignition/modules/StakingSystem.ts
```
6. Run frontend:
```bash
npm --prefix frontend install
npm --prefix frontend run dev
```
7. Build frontend:
```bash
npm --prefix frontend run build
```

## 📂 Project Structure
```text
contracts/         # RewardToken, StakeToken, Staking
ignition/modules/  # StakingSystem.ts
test/              # StakingSystem.ts
frontend/          # React app
```

## 🔐 Security Notes
- Never commit private keys
- Keep `.env` private
- Verify network + contract addresses before transactions

## 👨‍💻 Author
Shivam Singh  
GitHub: https://github.com/shivam99699l
