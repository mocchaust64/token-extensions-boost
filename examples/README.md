# Solana Token Extension Boost - Examples

This directory contains examples of how to use the Solana Token Extension Boost SDK to work with Solana Token 2022 extensions.

## Directory Structure

Each extension has its own directory with source code and documentation:

- **[transfer-fee](./transfer-fee/)** - Examples of creating tokens with automatic transfer fee capabilities
- **[confidential-transfer](./confidential-transfer/)** - Examples of tokens with confidential transfers
- **[metadata](./metadata/)** - Examples of tokens with rich metadata
- **[immutable-owner-example](./immutable-owner-example/)** - Examples of token accounts with immutable owners
- **[permanent-delegate](./permanent-delegate/)** - Examples of tokens with permanent delegate control
- **[transfer-hook](./transfer-hook/)** - Examples of tokens with transfer hook functionality
- **[non-transferable](./non-transferable/)** - Examples of non-transferable (soulbound) tokens
- **[multi-extension-example](./multi-extension-example/)** - Examples of tokens with multiple extensions
- **[extension-compatibility-test](./extension-compatibility-test/)** - Tests for extension compatibility

## How to Run Examples

Each example directory contains an `index.ts` file that can be run independently. To run an example:

```bash
# Navigate to the extension directory you want to try
cd transfer-fee

# Install dependencies
npm install

# Run the example
npx ts-node index.ts
```

## Requirements

- Node.js 14+ and npm
- Solana CLI Tools (for creating a wallet on Solana devnet)
- Solana wallet with some SOL on devnet

## Setting Up Your Environment

1. **Install Solana CLI Tools**:
   ```
   sh -c "$(curl -sSfL https://release.solana.com/v1.17.5/install)"
   ```

2. **Create a Solana Wallet**:
   ```
   solana-keygen new
   ```

3. **Switch to Devnet**:
   ```
   solana config set --url devnet
   ```

4. **Airdrop SOL to Your Wallet**:
   ```
   solana airdrop 1
   ```

## Token-2022 Extensions Explained

### Transfer Fee

This extension allows tokens to automatically collect fees when transferred, enabling complex tokenomics and revenue models.

### Confidential Transfer

This extension allows for private transactions that don't disclose amounts, enhancing privacy for token users.

### Metadata

This extension stores and manages rich metadata for tokens, allowing tokens to contain additional information and attributes.

### Immutable Owner

This extension ensures that the owner of a token account cannot be changed, enhancing security against takeover attacks.

### Permanent Delegate

This extension allows designating an address that can transfer tokens from any account without consent, useful for tokens that need revocation capabilities.

### Transfer Hook

This extension allows tokens to execute custom logic (via a program) when they are transferred.

### Non-Transferable

This extension creates tokens that cannot be transferred once received, useful for credentials, certificates, and soulbound tokens.

## Integrating With Your Project

```javascript
// Install SDK
npm install solana-token-extension-boost

// Import the extension you need
import { TransferFeeToken } from "solana-token-extension-boost";

// Use the extension
const token = await TransferFeeToken.create(
  connection,
  payer,
  {
    decimals: 9,
    mintAuthority: mintAuthority.publicKey,
    transferFeeConfig: {
      feeBasisPoints: 100, // 1%
      maxFee: BigInt(1000000000),
      transferFeeConfigAuthority,
      withdrawWithheldAuthority
    }
  }
);
```

## Available Examples

- **Transfer Fee**: Examples showing how to create and use tokens with transfer fees
  - Create a token with transfer fee
  - Withdraw withheld fees
  - Transfer tokens with fees

- **Metadata**: Examples showing how to create tokens with embedded metadata
  - Create a token with metadata (new simplified API)
  - Read and update token metadata
  - Create tokens with rich metadata

- **Non-transferable**: Examples showing how to create non-transferable tokens
  - Create a non-transferable token
  - Mint non-transferable tokens to an account
  - Verify non-transferable properties

- **Multi-extension Examples**: Examples showing how to create tokens with multiple extensions
  - Create a token with both transfer fee and metadata
  - Create a token with metadata and non-transferable extension
  - Create a token with transfer hook and metadata

### Running the Examples

To run an example, use the following commands:

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run a specific example
npx ts-node examples/non-transferable/create-non-transferable-token.ts
```

### Using the Examples as Reference

These examples demonstrate common patterns for working with Token Extensions:

1. Connect to a Solana cluster
2. Create a new token with specific extensions
3. Initialize the extensions with appropriate parameters
4. Interact with the token based on its extension features
5. Query and display information about the token and its extensions 