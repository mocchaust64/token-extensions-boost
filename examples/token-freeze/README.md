# Token Freeze & DefaultAccountState Example

This directory contains examples of how to use the Token Freeze and DefaultAccountState extensions with SPL Token-2022.

## Overview

The Token Freeze extension allows token issuers to freeze and unfreeze individual token accounts, temporarily preventing transfers from those accounts. The DefaultAccountState extension allows setting the default frozen state for all newly created accounts.

## Examples

### 1. Local Test (local-test.ts)

A comprehensive example testing Token Freeze functionality using keypairs. This example includes:

- Creating a token with the DefaultAccountState extension (initially unfrozen)
- Creating and funding token accounts
- Minting tokens to an account
- Freezing an account and verifying its state
- Attempting to transfer from a frozen account (which should fail)
- Thawing an account and verifying its state
- Transferring from a thawed account (which should succeed)

To run:
```bash
npx ts-node examples/token-freeze/local-test.ts
```

### 2. Wallet Adapter Example (wallet-adapter-example.ts)

A reference implementation showing how to use TokenFreezeExtension with wallet adapter in a React application. This example demonstrates:

- Freezing token accounts with wallet adapter
- Thawing token accounts with wallet adapter
- Updating default account state with wallet adapter
- Building custom freeze transactions

This file is meant to be integrated into a React/Web application with @solana/wallet-adapter.

## Key Features

TokenFreezeExtension provides the following utility methods:

- `createFreezeAccountInstruction()` - Create instruction to freeze an account
- `createThawAccountInstruction()` - Create instruction to thaw an account
- `createUpdateDefaultAccountStateInstruction()` - Create instruction to update default account state
- `prepareFreezeAccountTransaction()` - Create transaction to freeze an account
- `prepareThawAccountTransaction()` - Create transaction to thaw an account
- `prepareUpdateDefaultAccountStateTransaction()` - Create transaction to update default account state
- `buildTransaction()` - Utility to build transaction from instructions

## Documentation

For detailed documentation on the Token Freeze and DefaultAccountState extensions, see:
- [Token Freeze & DefaultAccountState Extension Guide](../../docs/token-freeze.md)

## Requirements

- Solana CLI Tools
- Node.js and npm/yarn
- Sufficient SOL in your wallet (minimum 1 SOL) to perform transactions 