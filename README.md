# Solana Token Extension SDK

A simple SDK for interacting with Token Extensions on Solana, making it easier for developers to create and manage tokens with extended features without dealing with the complex details of the Solana Token Extensions Program.

## Introduction

Solana Token Extensions (Token-2022) introduce a variety of new features to tokens on Solana, making them more flexible and customizable. This SDK is designed to simplify the use of these features, helping developers easily integrate them into their applications.

## Current Features

The SDK currently supports the following Token Extensions:

- **Transfer Fee**: Create tokens with automatic transfer fees  
- **Metadata Pointer**: Store and manage metadata for tokens  
- **Immutable Owner**: Create token accounts with immutable ownership  
- **Confidential Transfer**: Execute confidential token transfers that hide amounts  
- **Permanent Delegate**: Permanently delegate token management authority to another address
- **Transfer Hook**: Execute custom logic on token transfers through a separate program
- **Non-Transferable**: Create non-transferable tokens (soulbound tokens)
- **Interest-Bearing**: Create tokens that accrue interest over time
- **Multiple Extensions**: Create tokens with multiple extensions at once, including metadata

## Core Token Features

The base Token class now provides the following core functionality:

- **Transfer**: Transfer tokens between accounts with decimal checking
- **Burn**: Burn tokens from an account
- **Account Management**: Create or get token accounts easily

These core features work with all token extensions.

## Simplified Token Creation

We've improved the token creation process with new streamlined methods:

### Recommended Approach: Using TokenBuilder

```typescript
import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import { TokenBuilder } from "solana-token-extension-boost";

// Connect to Solana network
const connection = new Connection(clusterApiUrl("devnet"));
const payer = Keypair.generate(); // Your payer keypair

// Create a token with multiple extensions including metadata
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    9, // decimals
    payer.publicKey, // mint authority
    null // freeze authority
  )
  // Add metadata
  .addMetadata(
    "My Token",
    "TKN",
    "https://example.com/metadata.json",
    { "website": "https://example.com" }
  )
  // Add TransferFee extension
  .addTransferFee(
    100, // 1% fee (basis points)
    BigInt(1000000000), // max fee 1 token
    payer.publicKey, // config authority
    payer.publicKey // withdraw authority
  )
  // Add other extensions
  .addNonTransferable()
  .addPermanentDelegate(payer.publicKey);

// Create the token with all extensions
const { mint, transactionSignature, token } = 
  await tokenBuilder.createTokenWithMetadataAndExtensions(payer);

console.log(`Token created: ${mint.toBase58()}`);
```

## Examples

The SDK includes several examples to help you get started:

- **Transfer Fee Examples** (`examples/transfer-fee/`): Create and use tokens with transfer fees
- **Transfer Hook Examples** (`examples/transfer-hook/`): Create tokens with custom transfer hooks
- **Multi-Extension Examples** (`examples/multi-extension-example/`): Create tokens with multiple extensions at once
- **Metadata Examples** (`examples/metadata/`): Create tokens with metadata and other extensions

Run an example with:
```bash
ts-node examples/metadata/combined-extensions.ts
```

## New Features and Improvements

Recent improvements to the SDK include:

- **Enhanced Base Token Class**: Added core token functionality:
  - `transfer()`: Transfer tokens between accounts
  - `burnTokens()`: Burn tokens from an account
  - `createOrGetTokenAccount()`: Create or get existing token accounts

- **Enhanced TokenBuilder**: The `TokenBuilder` class now features new optimized methods:
  - `createTokenWithExtensions()`: For tokens with non-metadata extensions
  - `createTokenWithMetadataAndExtensions()`: For tokens with metadata and other extensions

- **Deprecated Legacy Methods**: The `build()` method and various factory methods are now marked as deprecated in favor of the more efficient new methods.

- **Improved Error Handling**: Better validation and error reporting for extension compatibility.

- **Comprehensive Documentation**: Updated guides and examples in the `docs/` directory.

## Roadmap

Upcoming Token Extensions planned for integration into the SDK:

- **Default Account State**: Set default state for newly created token accounts  
- **Mint Close Authority**: Define authority to close a mint account  
- **Token Groups & Group Pointer**: Group multiple tokens under a shared classification or identity  
- **Member Pointer**: Link individual tokens to a token group via on-chain metadata  
- **CPI Guard**: Protect token operations from cross-program invocation (CPI) attacks  
- **Required Memo**: Require a memo to be included with each token transfer  
- **Close Authority**: Define who can close a specific token account

## Installation

```bash
npm install solana-token-extension-boost
```

## Documentation

Refer to the `docs/` directory for detailed guides on using each feature:

- [Token Extensions Guide](docs/token-extensions-guide.md): A comprehensive guide to token extensions
- [Metadata Integration Guide](docs/metadata-integration-guide.md): How to create tokens with metadata
- [Multi-Extension Guide](docs/multi-extension-guide.md): How to combine multiple extensions
