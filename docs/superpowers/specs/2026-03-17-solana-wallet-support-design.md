# Solana Wallet Support — Design Spec

**Date:** 2026-03-17
**Scope:** Enable Privy Solana embedded wallets across all wallet-facing flows: Deposit QR, Withdraw, Comprar wizard, and key export.

---

## Context

The app currently provisions only Ethereum (EVM) embedded wallets via Privy. Users have a single `0x…` address. Convexo is enabling Solana USDC-SPL support end-to-end, requiring a Solana address in all four wallet flows.

Privy exposes EVM and Solana embedded wallets through **separate hooks**:
- EVM: `useWallets` from `@privy-io/react-auth`
- Solana: `useWallets` from `@privy-io/react-auth/solana`
- Solana export: `useExportWallet` from `@privy-io/react-auth/solana`

---

## Touch Points (4 files, no new files)

### 1. `components/Providers.tsx` — Privy config

Add Solana auto-creation alongside the existing Ethereum config:

```ts
embeddedWallets: {
  ethereum: { createOnLogin: 'users-without-wallets' },
  solana:   { createOnLogin: 'users-without-wallets' },
}
```

This causes Privy to provision a Solana embedded wallet for every user on login (if they don't already have one).

---

### 2. `app/(app)/cuenta/WalletActions.tsx` — Deposit QR + Withdraw

**Deposit modal:**

Add `depositChain: 'ethereum' | 'solana'` state (defaults to `'ethereum'`).

Add `useWallets as useSolanaWallets` from `@privy-io/react-auth/solana` to get the Solana embedded address.

UI change: a two-tab row above the QR implemented as **inline pill buttons** (no shared component), consistent with the inline-styles-only pattern in the file:
```
[ Ethereum ]  [ Solana ]
```

Switch QR, address, tags, and warning based on `depositChain`:
- **Ethereum:** QR of EVM address, tags `"Ethereum"` + `"ERC-20"`, warning about ERC-20
- **Solana:** QR of Solana address, tags `"Solana"` + `"SPL"`, warning about SPL

If the Solana wallet is not yet provisioned, use `!ready || !solanaAddress` as the guard (where `ready` comes from the Solana `useWallets` hook), showing the same loading banner as for Ethereum.

**Withdraw modal:**

Add `withdrawChain: 'ethereum' | 'tron' | 'solana'` state (defaults to `'ethereum'`).

Add a chain selector row (pill buttons) above the destination address field. The `placeholder` on the address input updates per chain:
- Ethereum: `"0x…"`
- Tron: `"T…"`
- Solana: `"Base58 address…"`

The selected chain goes into the wallet request metadata: `metadata.destination_chain`.

---

### 3. `app/(app)/otc/OtcWizard.tsx` — Comprar Step 2

Currently the embedded wallet section shows one card hardcoded to Ethereum. With Solana enabled, show **two separate selectable cards** in the "Tu wallet Convexo" section:

```
Tu wallet Convexo
  ┌──────────────────────────────────────────┐
  │ ⬡  Wallet embebida     [Ethereum] badge  │  ← EVM address
  └──────────────────────────────────────────┘
  ┌──────────────────────────────────────────┐
  │ ◎  Wallet embebida     [Solana]   badge  │  ← Solana address
  └──────────────────────────────────────────┘
```

State changes:
- Add `embeddedChain: 'ethereum' | 'solana'` state.
- When the user selects an embedded card, set both `selectedEmbeddedAddress` and `embeddedChain`.
- `receiveChain` derivation: `walletSource === 'embedded' ? embeddedChain : externalChain` (removing the hardcoded `'Ethereum'`).

Import `useWallets as useSolanaWallets` from `@privy-io/react-auth/solana` alongside the existing EVM `useWallets`.

The external wallet section (Ethereum / Tron / Solana chain picker + text input) is unchanged — it already supports Solana.

---

### 4. `app/(app)/settings/security/SecurityClient.tsx` — Export key

Currently exports only the Ethereum embedded wallet in a single card row. With Solana, show **two export rows**:

```
Exportar clave privada — Ethereum     [Exportar]
Exportar clave privada — Solana       [Exportar]
```

Each row has its own loading state (`exportingEth`, `exportingSol`).

Ethereum export: existing `useExportWallet` from `@privy-io/react-auth` — call `exportWallet({ address: embeddedWallet.address })`.
Solana export: `useExportWallet` from `@privy-io/react-auth/solana` — call `exportWallet()` with **no arguments** (Privy defaults to the wallet at index 0). Because users have at most one Solana embedded wallet (auto-created on login, `createAdditional` never used), no address picker is needed.

If either wallet is not yet provisioned, that row's button is disabled with the existing loading/init message.

---

## Data Flow

```
Privy config (Providers.tsx)
  → auto-creates Solana wallet on login
  → available via useWallets from @privy-io/react-auth/solana

WalletActions deposit
  → depositChain state
  → shows correct address / QR / tags

WalletActions withdraw
  → withdrawChain state
  → metadata.destination_chain included in CRYPTO_WITHDRAW request

OtcWizard Step 2 COMPRAR
  → embeddedChain state
  → receiveChain derived correctly
  → metadata.destination_chain included in CASH_IN request

SecurityClient
  → two separate export buttons (EVM + Solana hooks)
```

---

## What Is NOT in Scope

- No database schema changes (chain is passed as metadata in wallet requests, already supported)
- No admin UI changes (Convexo ops team handles chain distinction manually via metadata)
- No Tron embedded wallet (Privy does not support Tron embedded wallets)
- No on-chain balance tracking for Solana (OnChainBalances component is separate)
