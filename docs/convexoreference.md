# Convexo Protocol

> **Bridging international capital to Latin American SMEs through compliant, on-chain lending infrastructure.**

Convexo is a full-stack, production-grade DeFi protocol enabling institutional and high-net-worth investors to lend to LATAM SMEs via NFT-permissioned liquidity pools, tokenized bond vaults, AI-driven credit scoring, and privacy-preserving identity verification.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contracts](https://img.shields.io/badge/Contracts-v3.17%20%E2%80%94%2012%20deployed-blue)](#smart-contracts)
[![Tests](https://img.shields.io/badge/Forge%20Tests-87%2F87%20passing-brightgreen)](#testing)
[![Networks](https://img.shields.io/badge/Networks-4%20mainnets%20%2B%204%20testnets-purple)](#deployed-networks)

---

## Table of Contents

- [Overview](#overview)
- [Monorepo Structure](#monorepo-structure)
- [Architecture](#architecture)
- [User Flows](#user-flows)
- [NFT Tier System](#nft-tier-system)
- [Smart Contracts](#smart-contracts)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Frontend Routes](#frontend-routes)
- [Backend API](#backend-api)
- [Deployed Networks](#deployed-networks)
- [Deployment](#deployment)
- [Testing](#testing)

---

## Overview

### The Problem

SMEs in Latin America struggle to access international capital due to:
- Complex cross-border compliance requirements
- Limited or non-existent credit history on-chain
- High transaction costs from currency conversion
- Lack of transparent, auditable lending infrastructure

### The Solution

Convexo creates a compliant, efficient lending protocol using:

| Pillar | Technology |
|---|---|
| **Compliance-gated pools** | Uniswap V4 Hooks restrict access to verified holders |
| **Privacy-first identity** | ZKPassport (individual) · Veriff + Sumsub (business) |
| **AI credit scoring** | Automated risk assessment → Tier 3 NFT mint |
| **Tokenized bond vaults** | ERC-20 share vaults, 12% APY, flexible repayment |
| **Multi-chain** | Base · Unichain · Ethereum · Arbitrum |
| **Local stablecoins** | USDC ↔ ECOP · ARS · MXN via Uniswap V4 |

---

## Monorepo Structure

```
convexoapp/
├── convexo_frontend/      # Next.js 16 — app for investors & SMEs
├── convexo-backend/       # Fastify 5 — REST API + webhooks
├── convexo_contracts/     # Solidity — 12 contracts on 8 networks
└── convexo-protocol/      # Protocol definitions & i18n
```

Each sub-project has its own `README.md`, `DEPLOY.md`, and `SEQUENCES.md`.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser / Wallet                         │
│           Next.js 16 (App Router) · Alchemy Account Kit          │
│           Wagmi 2 · Viem · ZKPassport SDK · Framer Motion        │
└───────────────────────┬──────────────────────────────────────────┘
                        │ JWT (SIWE)
┌───────────────────────▼──────────────────────────────────────────┐
│                    Fastify 5 REST API (:3001)                     │
│     13 modules · Prisma 5 · PostgreSQL · Redis · Pino logs       │
│     Veriff · Sumsub · Pinata IPFS · n8n · Resend · Telegram      │
└───────────────────────┬──────────────────────────────────────────┘
                        │ viem / wagmi read-write
┌───────────────────────▼──────────────────────────────────────────┐
│                  EVM Smart Contracts (v3.17)                      │
│     12 contracts · Solidity 0.8.27 · Foundry · CREATE2           │
│     Base · Unichain · Ethereum · Arbitrum                        │
└──────────────────────────────────────────────────────────────────┘
```

### Verification Paths (3-Path System)

```
PATH 1 — Individual Self-Verification (Tier 1)
  ZKPassport → Self-Mint → Convexo_Passport NFT
  → LP Pool Swaps (Uniswap V4) + Vault investments

PATH 2A — Individual KYC (Tier 2)
  Veriff → VeriffVerifier Registry → Admin Approval
  → Limited_Partners_Individuals NFT
  → Treasury · OTC · Monetization · Credit Score Request

PATH 2B — Business KYB (Tier 2)
  Sumsub → SumsubVerifier Registry → Admin Approval
  → Limited_Partners_Business NFT
  → Same permissions as PATH 2A

PATH 3 — Vault Creators (Tier 3)
  AI Credit Score ≥ 70 → Backend mint
  → Ecreditscoring NFT
  → All of the above + Vault creation
```

---

## User Flows

### Individual Investor (ZKPassport)
```
Connect Wallet → Onboarding → ZKPassport Verification
→ Self-Mint Passport NFT (Tier 1)
→ Browse Vaults → Invest USDC → Earn 12% APY
→ Redeem after borrower fully repays
```

### SME Borrower
```
Connect Wallet → Onboarding → Sumsub KYB
→ Admin Approval → Receive LP Business NFT (Tier 2)
→ Submit Financial Statements → AI Credit Score
→ Score ≥ 70 → Receive eCredit NFT (Tier 3)
→ Create Vault → Get Funded → Sign e-Contract
→ Withdraw USDC → Convert to local stable (ECOP/ARS/MXN)
→ Repay anytime → Investors withdraw proportionally
```

### Business Investor
```
Connect Wallet → Onboarding → Veriff or Sumsub KYB
→ Admin Approval → Receive LP NFT (Tier 2)
→ Browse Vaults → Invest USDC
→ Track returns in real-time → Redeem on full repayment
```

---

## NFT Tier System

All NFTs are **soulbound** (non-transferable), **one per address**. Highest tier wins (progressive KYC).

| Tier | Contract | User Type | Minting | Unlocks |
|---|---|---|---|---|
| **0** | — | Unverified | — | Nothing |
| **1** | `Convexo_Passport` | Individual Investor | Self-mint via ZKPassport | LP pool swaps · Vault investments |
| **2** | `Limited_Partners_Individuals` | Individual LP | Admin via VeriffVerifier | Treasury · OTC · Monetization · Credit score |
| **2** | `Limited_Partners_Business` | Business LP | Admin via SumsubVerifier | Same as above |
| **3** | `Ecreditscoring` | Vault Creator | Backend (AI score ≥ 70) | All above + Vault creation |

### Access Matrix

| Feature | Tier 1 | Tier 2 | Tier 3 |
|---|:---:|:---:|:---:|
| LP Pool Swaps (Uniswap V4) | ✅ | ✅ | ✅ |
| Invest in Vaults | ✅ | ✅ | ✅ |
| Treasury / OTC / Monetization | ❌ | ✅ | ✅ |
| Request AI Credit Score | ❌ | ✅ | ✅ |
| Create Funding Vaults | ❌ | ❌ | ✅ |

---

## Smart Contracts

**Version: 3.17** · 12 contracts · Deterministic deployment via CREATE2 (same addresses on all chains)

| # | Contract | Purpose |
|---|---|---|
| 1 | `Convexo_Passport` | Soulbound NFT — Tier 1 (ZKPassport identity) |
| 2 | `Limited_Partners_Individuals` | Soulbound NFT — Tier 2 individual |
| 3 | `Limited_Partners_Business` | Soulbound NFT — Tier 2 business |
| 4 | `Ecreditscoring` | Soulbound NFT — Tier 3 (vault creators) |
| 5 | `VeriffVerifier` | Individual KYC registry (privacy-preserving) |
| 6 | `SumsubVerifier` | Business KYB registry (privacy-preserving) |
| 7 | `ReputationManager` | On-chain tier calculation |
| 8 | `HookDeployer` | Helper for deploying Uniswap V4 hooks |
| 9 | `PassportGatedHook` | Uniswap V4 hook — gates pool to Tier 1+ |
| 10 | `PoolRegistry` | Registry of compliant liquidity pools |
| 11 | `PriceFeedManager` | Chainlink price feed integration |
| 12 | `ContractSigner` | On-chain multi-signature lending contracts |

> See [`convexo_contracts/addresses.json`](convexo_contracts/addresses.json) for all deployed addresses and [`convexo_contracts/CONTRACTS_REFERENCE.md`](convexo_contracts/CONTRACTS_REFERENCE.md) for full API reference.

---

## Tech Stack

### Frontend (`convexo_frontend/`)

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router, **webpack mode**) |
| Language | TypeScript 5.3.3 |
| Styling | Tailwind CSS 3.4 |
| Animations | Framer Motion 12 |
| Wallet | Wagmi 2.19.3 · Viem 2.46.3 · Alchemy Account Kit 4.84.1 |
| Identity | ZKPassport SDK 0.12.4 |
| Data | TanStack Query 5 (react-query) |
| QR | qrcode.react |

> ⚠️ **Always start with `--webpack`**. The `thread-stream` dependency (from pino/Alchemy) breaks Turbopack. Use `npm run dev` (aliased to `next dev --webpack`).

### Backend (`convexo-backend/`)

| Layer | Technology |
|---|---|
| Framework | Fastify 5 · TypeScript |
| ORM | Prisma 5 + PostgreSQL 16 |
| Cache | Redis (ioredis) |
| Auth | SIWE (Sign-In with Ethereum) · JWT · Refresh tokens |
| Validation | Zod |
| Logging | Pino + pino-pretty |
| Email | Resend |
| Storage | Pinata IPFS |
| KYC/KYB | Veriff · Sumsub |
| Automation | n8n (AI credit score webhook) |
| Notifications | Telegram Bot |

### Smart Contracts (`convexo_contracts/`)

| Layer | Technology |
|---|---|
| Language | Solidity ^0.8.27 |
| Toolchain | Foundry (forge, cast, anvil) |
| Standards | ERC-721 · ERC-20 (OpenZeppelin v5.5.0) |
| DEX | Uniswap V4 Hooks |
| Oracles | Chainlink Price Feeds + CCIP |
| Deployment | CREATE2 via Safe Singleton Factory |

---

## Quick Start

### Prerequisites

```bash
# Node.js 20+
node --version

# Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# PostgreSQL 16 + Redis (local or Docker)
docker-compose -f convexo-backend/docker-compose.yml up -d postgres redis
```

### 1. Install Dependencies

```bash
# Frontend
cd convexo_frontend && npm install

# Backend
cd convexo-backend && npm install

# Contracts
cd convexo_contracts && forge install
```

### 2. Configure Environment

```bash
# Backend
cp convexo-backend/.env.example convexo-backend/.env
# → fill in DATABASE_URL, JWT_SECRET, API keys (see Environment Variables)

# Frontend
cp convexo_frontend/.env.example convexo_frontend/.env.local
# → fill in NEXT_PUBLIC_ALCHEMY_API_KEY, NEXT_PUBLIC_API_URL, etc.
```

### 3. Run Database Migrations

```bash
cd convexo-backend
npx prisma migrate dev
```

### 4. Start Services

```bash
# Terminal 1 — Backend API (port 3001)
cd convexo-backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd convexo_frontend && npm run dev
```

> Backend API docs available at `http://localhost:3001/docs` (Swagger UI)

### 5. Verify Everything Works

```bash
# Backend health
curl http://localhost:3001/health

# Frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
# → 200
```

---

## Environment Variables

### Backend (`convexo-backend/.env`)

```env
# Database & Cache
DATABASE_URL=postgresql://user:pass@localhost:5432/convexo
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
APP_URL=http://localhost:3001
PORT=3001

# KYC / KYB
VERIFF_API_KEY=...
VERIFF_BASE_URL=https://stationapi.veriff.com
SUMSUB_APP_TOKEN=...
SUMSUB_SECRET_KEY=...
SUMSUB_BASE_URL=https://api.sumsub.com

# AI Credit Score
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/...
N8N_WEBHOOK_SECRET=...

# Storage
PINATA_API_KEY=...
PINATA_SECRET_API_KEY=...

# Notifications
RESEND_API_KEY=re_...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# Admin
ADMIN_WALLET_ADDRESSES=0xABC...,0xDEF...
NODE_ENV=development
```

### Frontend (`convexo_frontend/.env.local`)

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Alchemy (Account Kit + NFT + Portfolio APIs)
NEXT_PUBLIC_ALCHEMY_API_KEY=...

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# Chain (8453 = Base Mainnet)
NEXT_PUBLIC_CHAIN_ID=8453
```

### Contracts (`convexo_contracts/.env`)

```env
PRIVATE_KEY=0x...
MINTER_ADDRESS=0x...
ETHERSCAN_API_KEY=...
BASESCAN_API_KEY=...
ARBISCAN_API_KEY=...

# RPC URLs
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/...
UNICHAIN_MAINNET_RPC_URL=...
ETHEREUM_MAINNET_RPC_URL=...
```

---

## Frontend Routes

28 pages across 6 sections:

| Route | Description | Min Tier |
|---|---|---|
| `/` | Dashboard / Landing | — |
| `/onboarding` | 5-step account setup wizard | — |
| **Digital ID** |||
| `/digital-id` | Identity hub | — |
| `/digital-id/humanity` | ZKPassport verification status | — |
| `/digital-id/humanity/verify` | ZKPassport verification flow | — |
| `/digital-id/limited-partner-individuals` | Individual KYC (Veriff) | — |
| `/digital-id/limited-partner-business` | Business KYB (Sumsub) | — |
| `/digital-id/credit-score` | AI credit score status | 2 |
| `/digital-id/credit-score/verify` | Submit financial statements | 2 |
| **Treasury** |||
| `/treasury` | Treasury hub | 2 |
| `/treasury/swaps` | USDC ↔ Token swaps | 2 |
| `/treasury/convert-fast` | Fast currency conversion | 2 |
| `/treasury/otc` | OTC orders | 2 |
| `/treasury/monetization` | Yield tools | 2 |
| `/treasury/fiat-to-stable` | Fiat on/off ramp | 2 |
| `/treasury/financial-accounts` | Bank accounts | 2 |
| **Investments** |||
| `/investments` | Investment hub | 1 |
| `/investments/vaults` | Tokenized bond vaults | 1 |
| `/investments/market-lps` | LP market | 1 |
| `/investments/c-bonds` | Corporate bonds | 1 |
| **Funding** |||
| `/funding` | Funding hub | 3 |
| `/funding/e-loans` | Loan requests | 3 |
| `/funding/e-contracts` | Electronic contracts | 3 |
| **Profile** |||
| `/profile` | User profile (individual or business) | — |
| `/profile/wallet` | Multi-chain wallet view | — |
| `/profile/bank-accounts` | Bank account CRUD | — |
| `/profile/contacts` | Address book | — |
| `/admin` | Admin panel (SUPER_ADMIN only) | Admin |

---

## Backend API

**Base URL:** `http://localhost:3001`  
**Docs (Swagger):** `http://localhost:3001/docs`  
**Auth:** JWT Bearer (obtained via SIWE flow)

### Modules

| Module | Routes | Notes |
|---|---|---|
| `auth` | `GET /auth/nonce` · `POST /auth/verify` · `POST /auth/logout` · `POST /auth/refresh` | SIWE + JWT + silent refresh |
| `users` | `GET/PUT/DELETE /users/me` | GDPR compliant |
| `onboarding` | `GET/POST /onboarding/*` | 5-step state machine |
| `profile` | `GET/PUT /profile` | Individual or Business |
| `verification` | 7 routes | Veriff · Sumsub · n8n credit score |
| `bank-accounts` | 5 routes | Full CRUD + set default |
| `contacts` | 5 routes | Full CRUD + search |
| `rates` | 4 routes | Exchange rate cache (2 public, 2 admin) |
| `otc` | 5 routes | OTC orders (3 user, 2 admin) |
| `documents` | 4 routes | IPFS via Pinata |
| `reputation` | 2 routes | NFT tier sync (blockchain → DB) |
| `funding` | 5 routes | Business only (3 user, 2 admin) |
| `admin` | 8 routes | Roles · users · verifications |
| `webhooks` | 3 routes | Veriff · Sumsub · n8n (HMAC verified) |

### Response Format

```typescript
// Success
{ data: T, message?: string }

// Error
{ error: string, code: string, statusCode: number }
```

---

## Deployed Networks

| Network | Chain ID | Status | Explorer |
|---|---|---|---|
| **Base Mainnet** | 8453 | ✅ Live | [basescan.org](https://basescan.org) |
| **Unichain Mainnet** | 130 | ✅ Live | [unichain.blockscout.com](https://unichain.blockscout.com) |
| **Ethereum Mainnet** | 1 | ✅ Live | [etherscan.io](https://etherscan.io) |
| **Arbitrum One** | 42161 | 🔧 Ready | [arbiscan.io](https://arbiscan.io) |
| **Base Sepolia** | 84532 | ✅ Testnet | [sepolia.basescan.org](https://sepolia.basescan.org) |
| **Unichain Sepolia** | 1301 | ✅ Testnet | [unichain-sepolia.blockscout.com](https://unichain-sepolia.blockscout.com) |
| **Ethereum Sepolia** | 11155111 | ✅ Testnet | [sepolia.etherscan.io](https://sepolia.etherscan.io) |
| **Arbitrum Sepolia** | 421614 | 🔧 Ready | [sepolia.arbiscan.io](https://sepolia.arbiscan.io) |

> All core contracts share the **same address on every chain** (CREATE2 deterministic deployment with salt `convexo.v3.17`).

---

## Deployment

### Frontend → Vercel

```bash
cd convexo_frontend
npm run build          # must pass with 0 errors
vercel --prod
```

See [`convexo_frontend/DEPLOY.md`](convexo_frontend/DEPLOY.md) for full Vercel env configuration.

### Backend → Docker / VPS

```bash
cd convexo-backend

# Local (infra only via Docker, app via tsx)
docker-compose up -d postgres redis
npm run dev

# Full Docker stack
docker-compose up -d --build
docker-compose exec app npm run db:migrate:prod
docker-compose logs -f app
```

See [`convexo-backend/DEPLOY.md`](convexo-backend/DEPLOY.md) for production checklist.

### Contracts → Any EVM Chain

```bash
cd convexo_contracts

# Deploy
./scripts/deploy.sh base                   # or ethereum, unichain, arbitrum
./scripts/deploy.sh base-sepolia           # testnets

# Post-deploy
./scripts/update-addresses.sh 8453         # update addresses.json
./scripts/verify-all.sh 8453              # verify on block explorer
./scripts/extract-abis.sh                 # sync ABIs to frontend
```

See [`convexo_contracts/README.md`](convexo_contracts/README.md) for full deployment workflow.

---

## Testing

### Frontend

```bash
cd convexo_frontend

# TypeScript check
npx tsc --noEmit
# → 0 errors

# Production build
npm run build
# → 28 routes, 0 errors

# Dev server (webpack — required)
npm run dev
# → http://localhost:3000
```

### Backend

```bash
cd convexo-backend

# TypeScript check
npx tsc --noEmit

# Start with watch
npm run dev
```

### Smart Contracts

```bash
cd convexo_contracts

# Run all tests
forge test

# Verbose
forge test -vvv

# Gas report
forge test --gas-report
```

**Test Results: ✅ 87/87 passing (100% coverage)**

| Suite | Passing |
|---|---|
| NFT contracts | 37/37 |
| Verifier contracts | 30/30 |
| Integration | 20/20 |

---

## Key Operational Notes

- **Frontend dev server MUST use webpack**: `npm run dev` (aliased to `next dev --webpack`). Never use bare `next dev` — Turbopack breaks with the `thread-stream` dependency from Alchemy/pino.
- **After many file changes**, clear Next.js cache to avoid chunk hash mismatches: `rm -rf convexo_frontend/.next`
- **Admin bootstrap**: Wallet addresses in `ADMIN_WALLET_ADDRESSES` are auto-seeded as `SUPER_ADMIN` on first login.
- **Sumsub webhooks** use `HMAC_SHA256_HEX` on header `x-payload-digest`; **Veriff webhooks** use `HMAC_SHA256` on `x-hmac-signature`.
- **Credit score flow**: frontend → `POST /verification/credit-score/submit` (multipart with 3 financial PDFs) → backend fires n8n webhook → n8n calls back `/webhooks/n8n/credit-score` → backend mints Tier 3 NFT if score ≥ 70.

---

## Documentation Index

| Document | Location |
|---|---|
| Master plan & status | [`PLAN.md`](PLAN.md) |
| Contract reference | [`convexo_contracts/CONTRACTS_REFERENCE.md`](convexo_contracts/CONTRACTS_REFERENCE.md) |
| Frontend integration guide | [`convexo_contracts/FRONTEND_INTEGRATION.md`](convexo_contracts/FRONTEND_INTEGRATION.md) |
| ZKPassport integration | [`convexo_contracts/ZKPASSPORT_FRONTEND_INTEGRATION.md`](convexo_contracts/ZKPASSPORT_FRONTEND_INTEGRATION.md) |
| Security audit | [`convexo_contracts/SECURITY_AUDIT.md`](convexo_contracts/SECURITY_AUDIT.md) |
| Frontend deploy guide | [`convexo_frontend/DEPLOY.md`](convexo_frontend/DEPLOY.md) |
| Frontend sequences | [`convexo_frontend/SEQUENCES.md`](convexo_frontend/SEQUENCES.md) |
| Backend deploy guide | [`convexo-backend/DEPLOY.md`](convexo-backend/DEPLOY.md) |
| Backend sequences | [`convexo-backend/SEQUENCES.md`](convexo-backend/SEQUENCES.md) |
| Backend API reference | `http://localhost:3001/docs` (Swagger, local) |

---

## License

MIT — see individual sub-project LICENSE files.

---

<p align="center">Built for Latin American SMEs · Powered by Base · Secured by ZKPassport</p>
