# Transfer Fee Example

This directory contains examples of how to use the Transfer Fee Extension with SPL Token-2022.

## Examples

### 1. Basic (index.ts)

A basic example of how to create and use a token with the TransferFee extension. This example includes:

- Creating a token with a 1% transfer fee
- Minting tokens to the owner
- Transferring tokens with automatic fee calculation
- Harvesting fees from transaction accounts to the mint
- Withdrawing fees from the mint to the fee collector's wallet

To run:
```bash
npx ts-node index.ts
```

### 2. Multiple Accounts Management (multi-account.ts)

An advanced example of how to manage fees with multiple accounts. This example demonstrates:

- Creating a token with a 1% transfer fee
- Transferring tokens to multiple different accounts
- Finding all accounts holding withheld fees
- Harvesting fees from multiple accounts at once
- Withdrawing fees to a single address

To run:
```bash
npx ts-node multi-account.ts
```

## Key Features

TransferFeeToken provides the following methods:

- `create()` - Create a new token with the TransferFeeConfig extension
- `calculateFee()` - Calculate the fee for a transaction
- `transfer()` - Transfer tokens with fees
- `harvestWithheldTokensToMint()` - Harvest fees from accounts to the mint
- `withdrawFeesFromMint()` - Withdraw fees from the mint to a specified address
- `findAccountsWithWithheldFees()` - Find all accounts holding withheld fees

## Requirements

- Solana CLI Tools
- Node.js and npm/yarn
- Sufficient SOL in your wallet (minimum 1 SOL) to perform transactions 