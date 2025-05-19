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
- **Multiple Extensions**: Create tokens with multiple extensions at once

## Multi-Extension Support

This SDK now supports creating tokens with multiple extensions in a single transaction. For example:

```typescript
// Create a token with both Transfer Fee and Metadata
const factory = new Token2022Factory(connection);
const { transferFeeToken, metadataToken, mint } = await factory.createTransferFeeWithMetadataToken(
  payer,
  {
    decimals: 9,
    mintAuthority: payer.publicKey,
    transferFee: {
      feeBasisPoints: 100, // 1%
      maxFee: BigInt(1_000_000_000),
      transferFeeConfigAuthority: payer,
      withdrawWithheldAuthority: payer
    },
    metadata: {
      name: "My Token",
      symbol: "TKN",
      uri: "https://example.com/metadata.json",
      additionalMetadata: { /* optional additional fields */ }
    }
  }
);
```

## Examples

The SDK includes several examples to help you get started:

- **Transfer Fee Examples** (`examples/transfer-fee/`): Create and use tokens with transfer fees
- **Transfer Hook Examples** (`examples/transfer-hook/`): Create tokens with custom transfer hooks
- **Multi-Extension Examples** (`examples/multi-extension-example/`): Create tokens with multiple extensions at once

Run an example with:
```bash
ts-node examples/multi-extension-example/transfer-fee-with-metadata.ts
```

## Roadmap

Upcoming Token Extensions planned for development and integration into the SDK:

- **Non-transferable**: Create non-transferable tokens (soulbound tokens)  
- **Default Account State**: Set default state for newly created token accounts  
- **Interest-Bearing**: Create tokens that accrue interest over time  
- **Mint Close Authority**: Define authority to close a mint account  
- **Token Groups & Group Pointer**: Group multiple tokens under a shared classification or identity  
- **Member Pointer**: Link individual tokens to a token group via on-chain metadata  
- **CPI Guard**: Protect token operations from cross-program invocation (CPI) attacks  
- **Required Memo**: Require a memo to be included with each token transfer  
- **Close Authority**: Define who can close a specific token account

## Installation

```bash
npm install solana-token-extension-boost
