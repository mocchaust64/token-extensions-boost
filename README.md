# Solana Token Extension SDK

A simple SDK for interacting with Token Extensions on Solana, making it easier for developers to create and manage tokens with extended features without dealing with the complex details of the Solana Token Extensions Program.

## Introduction

Solana Token Extensions (Token-2022) introduce a variety of new features to tokens on Solana, making them more flexible and customizable. This SDK is designed to simplify the use of these features, helping developers easily integrate them into their applications.

## Current Features

The SDK currently supports the following Token Extensions:

- **Transfer Fee**: Create tokens with automatic transfer fees
- **Metadata Pointer**: Store and manage metadata for tokens
- **Non-Transferable**: Create non-transferable tokens (soulbound tokens)
- **Permanent Delegate**: Permanently delegate token management authority to another address
- **Interest-Bearing**: Create tokens that accrue interest over time
- **Transfer Hook**: Execute custom logic on token transfers through a separate program
- **Confidential Transfer**: Execute confidential token transfers that hide amounts
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
        9, // decimals
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
        BigInt(1000000000), // max fee 1 token
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
      maxFee: BigInt(1000000000), // 1 token
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
      9 // decimals
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

## Examples

The SDK includes several examples to help you get started:

- **Transfer Fee Examples** (`examples/transfer-fee/`): Create and use tokens with transfer fees
- **Transfer Hook Examples** (`examples/transfer-hook/`): Create tokens with custom transfer hooks
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
- ✅ **Confidential Transfer**: Execute confidential token transfers that hide amounts
- ✅ **Default Account State**: Set default state for newly created token accounts
- ✅ **Mint Close Authority**: Define authority to close a mint account
- ✅ **CPI Guard**: Protect token operations from cross-program invocation (CPI) attacks
- ✅ **Token Groups & Group Pointer**: Group multiple tokens under a shared classification or identity
- ✅ **Member Pointer**: Link individual tokens to a token group via on-chain metadata
- ✅ **Required Memo**: Require a memo to be included with each token transfer
- ✅ **Close Authority**: Define who can close a specific token account

## Installation

```bash
npm install solana-token-extension-boost
```

## Documentation

Refer to the `docs/` directory for detailed guides on using each feature:

- [Token Extensions Guide](docs/token-extensions-guide.md): A comprehensive guide to token extensions
- [Metadata Integration Guide](docs/metadata-integration-guide.md): How to create tokens with metadata
- [Multi-Extension Guide](docs/multi-extension-guide.md): How to combine multiple extensions
- [Wallet Adapter Integration](docs/wallet-adapter-integration.md): How to use the SDK with wallet adapter
