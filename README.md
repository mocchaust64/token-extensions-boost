# Solana Token Extension SDK

A simple SDK for interacting with Token Extensions on Solana, making it easier for developers to create and manage tokens with extended features without dealing with the complex details of the Solana Token Extensions Program.

## Introduction

Solana Token Extensions (Token-2022) introduce a variety of new features to tokens on Solana, making them more flexible and customizable. This SDK is designed to simplify the use of these features, helping developers easily integrate them into their applications.

## Features Overview

This SDK provides a comprehensive solution for working with Solana Token-2022 extensions:

### Core Features
- **Simple Token Creation**: Create tokens with any combination of extensions using a fluent builder pattern
- **Instructions-First API**: All operations return instructions for wallet-adapter compatibility
- **TypeScript Support**: Full TypeScript type definitions for better development experience
- **Error Handling**: Comprehensive error checking and validation
- **Simplified Account Management**: Easy creation and management of token accounts

### Token Operations
- **Transfer**: Transfer tokens between accounts with decimal validation
- **Burn**: Burn tokens from accounts
- **Freeze/Thaw**: Freeze and thaw token accounts
- **Mint**: Mint new tokens to accounts
- **Fee Management**: Harvest and withdraw transfer fees

### Extensions Support
| Extension | Description | Key Functionality |
|-----------|-------------|------------------|
| **Transfer Fee** | Add fees to transfers | Automatic fee collection, withdrawal |
| **Metadata** | Add on-chain metadata | Rich token information |
| **Non-Transferable** | Soulbound tokens | Prevent secondary transfers |
| **Permanent Delegate** | Delegate authority | Manage tokens without ownership |
| **Transfer Hook** | Custom transfer logic | Execute programs on transfer |
| **Token Freeze** | Freeze accounts | Prevent transfers from accounts |
| **Default Account State** | Configure new accounts | Set initial state of accounts |
| **Interest-Bearing** | Interest accrual | Tokens that grow over time |
| **Mint Close Authority** | Close mint accounts | Recover rent from mints |
| **Confidential Transfer** | Privacy features | Hide transfer amounts |

## Current Features

The SDK currently supports the following Token Extensions:

- **Transfer Fee**: Create tokens with automatic transfer fees
- **Metadata Pointer**: Store and manage metadata for tokens
- **Non-Transferable**: Create non-transferable tokens (soulbound tokens)
- **Permanent Delegate**: Permanently delegate token management authority to another address
- **Interest-Bearing**: Create tokens that accrue interest over time
- **Transfer Hook**: Execute custom logic on token transfers through a separate program
- **Confidential Transfer**: Execute confidential token transfers that hide amounts
- **Token Freeze**: Freeze and thaw token accounts to prevent transfers
- **Default Account State**: Set the default state (frozen or initialized) for new token accounts
- **Multiple Extensions**: Create tokens with multiple extensions at once, including metadata

## Core Token Features

The base Token class provides the following core functionality:

- **Transfer**: Transfer tokens between accounts with decimal checking
- **Burn**: Burn tokens from an account
- **Account Management**: Create or get token accounts easily

These core features work with all token extensions.

## Wallet-Adapter Integration (No Keypair Required)

The SDK is designed to be fully compatible with wallet-adapter:

```typescript
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TokenBuilder } from "solana-token-extension-boost";

function YourComponent() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const createToken = async () => {
    if (!publicKey) return;

    // Create a token with multiple extensions including metadata
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        6, // decimals
        publicKey, // mint authority
        null // freeze authority
      )
      // Add metadata
      .addTokenMetadata(
        "My Token",
        "TKN",
        "https://example.com/metadata.json",
        { "website": "https://example.com" }
      )
      // Add TransferFee extension
      .addTransferFee(
        100, // 1% fee (basis points)
        BigInt(1_000_000), // max fee 1 token (with 6 decimals)
        publicKey, // config authority
        publicKey // withdraw authority
      );

    // Generate instructions instead of executing transaction directly
    const { instructions, signers, mint } = 
      await tokenBuilder.createTokenInstructions(publicKey);

    // Create transaction from instructions
    const transaction = tokenBuilder.buildTransaction(instructions, publicKey);
    
    // Sign with wallet
    const signature = await sendTransaction(transaction, connection, {
      signers: signers
    });

    console.log(`Token created: ${mint.toBase58()}`);
    console.log(`Transaction signature: ${signature}`);
  };

  return (
    <button onClick={createToken} disabled={!publicKey}>
      Create Token
    </button>
  );
}
```

## TransferFee With Instructions API Example

```typescript
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TransferFeeToken } from "solana-token-extension-boost";

function TransferComponent({ mintAddress }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const transferTokens = async (destination, amount) => {
    if (!publicKey || !mintAddress) return;
    
    // Create TransferFeeToken instance
    const token = new TransferFeeToken(connection, mintAddress, {
      feeBasisPoints: 100, // 1%
      maxFee: BigInt(1_000_000), // 1 token (with 6 decimals)
      transferFeeConfigAuthority: publicKey, 
      withdrawWithheldAuthority: publicKey
    });
    
    // Find source token account
    const sourceAccount = await token.getAssociatedTokenAddress(publicKey);

    // Create transfer instruction
    const instruction = token.createTransferInstruction(
      sourceAccount,
      destination,
      publicKey,
      amount,
      6 // decimals
    );
    
    // Build and send transaction
    const transaction = new Transaction().add(instruction);
    const signature = await sendTransaction(transaction, connection);
    
    console.log(`Transfer complete: ${signature}`);
  };

  return (
    // Your component UI
  );
}
```

## Token Freeze Example

```typescript
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TokenBuilder, TokenFreezeExtension } from "solana-token-extension-boost";
import { AccountState } from "@solana/spl-token";

function FreezeTokensComponent() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  // Create a token with Default Account State
  const createToken = async () => {
    if (!publicKey) return;

    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        6, // decimals
        publicKey, // mint authority
        publicKey  // freeze authority (required for freeze functionality)
      )
      .addTokenMetadata(
        "Frozen Token",
        "FRZT",
        "https://example.com/metadata.json",
        { "description": "A token with freeze capabilities" }
      )
      // Set default state for new accounts (Initialized or Frozen)
      .addDefaultAccountState(AccountState.Initialized);

    const { instructions, signers, mint } = 
      await tokenBuilder.createTokenInstructions(publicKey);
      
    // Create and send transaction
    // ...
  };

  // Freeze a token account
  const freezeAccount = async (account, mint) => {
    if (!publicKey) return;
    
    // Create a transaction to freeze the account
    const transaction = TokenFreezeExtension.prepareFreezeAccountTransaction(
      account, // token account to freeze
      mint,    // mint address
      publicKey, // freeze authority
      publicKey  // fee payer
    );
    
    // Sign and send transaction
    const signature = await sendTransaction(transaction, connection);
    console.log(`Account frozen: ${signature}`);
  };

  return (
    // Your component UI
  );
}
```

## Examples

The SDK includes several examples to help you get started:

- **Transfer Fee Examples** (`examples/transfer-fee/`): Create and use tokens with transfer fees
- **Transfer Hook Examples** (`examples/transfer-hook/`): Create tokens with custom transfer hooks
- **Token Freeze Examples** (`examples/token-freeze/`): Freeze and thaw token accounts
- **Multi-Extension Examples** (`examples/multi-extension-example/`): Create tokens with multiple extensions at once
- **Metadata Examples** (`examples/metadata/`): Create tokens with metadata and other extensions
- **Instructions API Examples** (`examples/instructions-api-example/`): Examples of using the instructions API with wallet adapter

Run an example with:
```bash
ts-node examples/metadata/combined-extensions.ts
```

## Key Features

Important features of the SDK include:

- **Instructions API**: All methods now return instructions rather than executing transactions directly, making them compatible with wallet adapters
  - `createTokenInstructions()`: Generate instructions to create a token
  - `createTransferInstruction()`: Generate instructions for transfers
  - `createWithdrawFeesFromAccountsInstruction()`: Generate instructions to withdraw fees

- **Core Token Support**: The base Token class provides essential functionality:
  - `transfer()`: Transfer tokens between accounts
  - `burnTokens()`: Burn tokens from an account
  - `createOrGetTokenAccount()`: Create or get existing token accounts

## What's New in Current Version

The current version brings significant API changes to fully support wallet-adapter integration:

1. **Removed All Keypair-Based Methods**: All methods that required direct access to private keys (Keypair objects) have been removed. This is a breaking change but improves security by preventing private key exposure.

2. **Instructions-First API Design**: All token operations now follow the instructions pattern:
   - Create instructions using methods like `createTokenInstructions()`
   - Build transactions from instructions
   - Sign and send transactions with your wallet adapter

3. **Complete Wallet Adapter Support**: The SDK now works seamlessly with any wallet adapter implementation, letting users sign transactions without exposing private keys.

4. **Simplified Integration**: The separation of instruction creation from transaction execution makes the SDK more flexible for different frontend frameworks and wallet solutions.

## Development Roadmap

The SDK already supports the following Token Extensions:

- ✅ **Transfer Fee**: Create tokens with automatic transfer fees
- ✅ **Metadata Pointer**: Store and manage metadata for tokens
- ✅ **Non-Transferable**: Create non-transferable tokens (soulbound tokens)
- ✅ **Permanent Delegate**: Permanently delegate token management authority to another address
- ✅ **Interest-Bearing**: Create tokens that accrue interest over time
- ✅ **Transfer Hook**: Execute custom logic on token transfers through a separate program
- ✅ **Default Account State**: Set default state for newly created token accounts
- ✅ **Token Freeze**: Freeze and thaw token accounts to prevent transfers
- ✅ **Mint Close Authority**: Define authority to close a mint account
- ✅ **CPI Guard**: Protect token operations from cross-program invocation (CPI) attacks
- ✅ **Member Pointer**: Link individual tokens to a token group via on-chain metadata
- ✅ **Close Authority**: Define who can close a specific token account

## Installation

```bash
npm install solana-token-extension-boost
```

## Documentation

For detailed documentation on all features and extensions, please refer to the [docs directory](docs/README.md).

The documentation is structured as follows:

- [**Documentation Overview**](docs/README.md): Start here to see all available documentation
- [**Token Extensions Guide**](docs/index.md): A comprehensive guide to token extensions
- [**Extension-Specific Guides**]:
  - [Metadata Integration](docs/metadata.md): How to create tokens with metadata
  - [Transfer Fee](docs/transfer-fee.md): How to implement transfer fees
  - [Transfer Hook](docs/transfer-hook.md): How to use transfer hooks
  - [Token Freeze & DefaultAccountState](docs/token-freeze.md): How to freeze accounts and set default states
  - [Permanent Delegate](docs/permanent-delegate.md): How to use permanent delegates
  - [Non-Transferable](docs/non-transferable.md): How to create non-transferable tokens
- [**General Guides**]:
  - [Extension Compatibility](docs/extension-compatibility.md): How to combine multiple extensions
  - [Core Token Operations](docs/burn-transfer.md): How to perform basic token operations

Each guide includes detailed explanations, code examples, and best practices for using the relevant features.

Token Extensions Boost supports the following Solana Token-2022 extensions:

- **Transfer Hook**: Add custom logic that executes during token transfers
- **Token Metadata**: Store metadata directly on the token mint
- **Non-Transferable**: Create tokens that cannot be transferred, only minted and burned
- **Token Freeze**: Freeze tokens to prevent transfers and minting
- **CPI Guard**: Protect against Cross-Program Invocation attacks
- **Token Groups**: Group tokens together and track membership status
- **Interest-Bearing**: Create tokens that automatically accrue interest
- **Default Account State**: Set the default state for new token accounts
- **Member Pointer**: Link tokens to related data or accounts
- **Mint Close Authority**: Allow a mint account to be closed and recover rent
- **Permanent Delegate**: Set a permanent delegate for token accounts

Documentation can be found in the [docs](./docs) directory. Each extension has its own specific documentation:

- [Transfer Hook](./docs/transfer-hook.md)
- [Token Metadata](./docs/token-metadata.md)
- [Non-Transferable](./docs/non-transferable.md)
- [Token Freeze](./docs/token-freeze.md)
- [CPI Guard](./docs/cpi-guard.md)
- [Token Groups](./docs/token-groups.md)
- [Interest-Bearing](./docs/interest-bearing.md)
- [Default Account State](./docs/default-account-state.md)
- [Member Pointer](./docs/member-pointer.md)
- [Mint Close Authority](./docs/mint-close-authority.md)
- [Permanent Delegate](./docs/permanent-delegate.md)
