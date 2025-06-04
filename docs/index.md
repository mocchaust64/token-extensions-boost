# Token Extensions Boost SDK Documentation

## Overview

The Token Extensions Boost SDK provides an easy-to-use interface for working with Solana's Token-2022 Program and its various extensions. This SDK simplifies the process of creating and managing tokens with advanced features beyond the standard SPL Token capabilities.

## Features

- Create tokens with multiple extensions in a single transaction
- Simplified builder pattern for configuring token properties
- Support for all major Token-2022 extensions
- Utilities for common token operations
- Comprehensive error handling
- TypeScript type safety

## Installation

```bash
npm install token-extensions-boost
# or
yarn add token-extensions-boost
```

## Quick Start

```typescript
import { TokenBuilder } from 'token-extensions-boost';
import { Connection, Keypair } from '@solana/web3.js';

// Connect to Solana
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Create a token with metadata and transfer fees
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    9, // decimals
    wallet.publicKey, // mint authority
    wallet.publicKey  // freeze authority
  )
  .addTokenMetadata(
    "My Token",
    "MYTKN",
    "https://example.com/token-metadata.json",
    { "description": "An example token with transfer fees" }
  )
  .addTransferFee(
    100, // 1% fee (100 basis points)
    BigInt(1000000000), // max fee: 1 token
    wallet.publicKey, // fee config authority
    wallet.publicKey  // fee withdrawal authority
  );

// Get instructions to create the token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(wallet.publicKey);

// Build and send the transaction
// (Transaction building and sending code not shown for brevity)
```

## Supported Extensions

The SDK supports all major Token-2022 extensions:

| Extension | Description | Documentation |
|-----------|-------------|---------------|
| Metadata | Add metadata to your token | [Metadata Guide](./metadata.md) |
| TransferFee | Add fees to token transfers | [Transfer Fee Guide](./transfer-fee.md) |
| NonTransferable | Create non-transferable tokens | [Non-Transferable Guide](./non-transferable.md) |
| InterestBearing | Create tokens that accrue interest | [Interest Bearing Guide](./interest-bearing.md) |
| PermanentDelegate | Designate a permanent delegate authority | [Permanent Delegate Guide](./permanent-delegate.md) |
| TransferHook | Add custom logic to transfers | [Transfer Hook Guide](./transfer-hook.md) |
| DefaultAccountState | Set default state for new accounts | [Default Account State Guide](./default-account-state.md) |
| MintCloseAuthority | Enable closing the mint account | [Mint Close Authority Guide](./mint-close-authority.md) |
| ConfidentialTransfer | Enable confidential transfers | Coming soon |

## Examples

The SDK includes several examples to help you get started:

- [Basic Token Creation](../examples/basic-token/basic-token.ts)
- [Token with Metadata](../examples/metadata-token/metadata-token.ts)
- [Token with Transfer Fees](../examples/transfer-fee/transfer-fee-example.ts)
- [Mint Close Authority](../examples/mint-close-example/mint-close-example.ts)
- [Non-Transferable Token](../examples/non-transferable/non-transferable-example.ts)

## Best Practices

- Always test your token on devnet before deploying to mainnet
- Be mindful of transaction size limits when combining multiple extensions
- Some extensions are incompatible with each other (e.g., NonTransferable and TransferFee)
- Store important token addresses securely
- Consider providing an offchain metadata service for rich token information

## Extension Compatibility

Not all extensions can be used together. Here are some known incompatibilities:

- NonTransferable cannot be used with TransferFee, TransferHook, or ConfidentialTransferMint
- ConfidentialTransferMint cannot be used with TransferFee, TransferHook, or PermanentDelegate

The SDK will automatically check for incompatible extensions and throw an error if any are detected.

## Contributing

Contributions are welcome! Please see our [contributing guidelines](../CONTRIBUTING.md) for more information.

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

# Token Extensions Boost Overview

## Introduction

Token Extensions Boost is a comprehensive SDK for working with Solana's Token-2022 Program and its extensions. It simplifies the creation, management, and interaction with tokens that use the advanced features provided by the Token-2022 Program.

## Key Features

- **Simple Token Creation**: Create tokens with multiple extensions using a fluent builder pattern
- **Extension Support**: Full support for all Token-2022 extensions
- **Token Management**: Manage tokens with extensions for minting, transferring, and burning
- **Automatic Compatibility Checking**: Verify compatibility between different extensions
- **Transaction Optimization**: Efficiently construct and manage transactions
- **Error Handling**: Comprehensive error handling and validation

## Installation

```bash
npm install token-extensions-boost
```

## Basic Usage

### Creating a Token with Extensions

```typescript
import { Connection } from '@solana/web3.js';
import { TokenBuilder } from 'token-extensions-boost';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Create a token with extensions
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    9, // decimals
    mintAuthority.publicKey // mint authority
  )
  .addTokenMetadata(
    "My Token", // name
    "MYTKN", // symbol
    "https://example.com/metadata.json", // URI
    { "description": "My token with metadata" } // additional metadata
  )
  .addTransferFee(
    100, // 1% fee (basis points)
    BigInt(1000000000), // max fee
    feeAuthority.publicKey, // fee config authority
    withdrawAuthority.publicKey // withdraw authority
  );

// Get instructions to create token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);

// Create and send transaction
// ... see examples for complete transaction handling
```

### Working with Multiple Extensions

Token Extensions Boost allows you to combine compatible extensions:

```typescript
// Create a token with multiple extensions
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(6, payer.publicKey)
  
  // Add metadata
  .addTokenMetadata(
    "Multi Extension Token",
    "MULTI",
    "https://example.com/token.json",
    { "description": "Token with multiple extensions" }
  )
  
  // Add transfer fee
  .addTransferFee(
    50, // 0.5% fee
    BigInt(500000), // max fee (with 6 decimals)
    payer.publicKey,
    payer.publicKey
  )
  
  // Add interest bearing
  .addInterestBearing(
    200, // 2% interest rate
    payer.publicKey
  )
  
  // Add permanent delegate
  .addPermanentDelegate(delegatePublicKey);

// Get token creation instructions
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
```

The SDK automatically checks for compatibility between extensions and will throw an error if incompatible extensions are combined. For more information, see the [Extension Compatibility Guide](./extension-compatibility.md).

## Documentation

For detailed documentation on each token extension and example usage, see the following guides:

- [Metadata Extension](./metadata.md)
- [MintCloseAuthority Extension](./mint-close-authority.md)
- [DefaultAccountState Extension](./default-account-state.md)
- [Immutable Owner Extension](./immutable-owner.md)
- [Transfer Fee Extension](./transfer-fee.md)
- [Permanent Delegate Extension](./permanent-delegate.md)
- [Burn and Transfer Operations](./burn-transfer.md)

## Examples

Complete examples are available in the examples directory:

- [Simple Token Creation](../examples/simple-token/token-creation-example.ts)
- [Tokens with Metadata](../examples/metadata/simple-metadata.ts)
- [Transfer Fee Tokens](../examples/transfer-fee/transfer-fee-example.ts)
- [Multiple Extensions](../examples/multi-extension-example/README.md)
- [Mint Close Authority](../examples/mint-close/mint-close-example.ts)

## Best Practices

1. **Use TokenMetadata instead of MetadataPointer**: When combining metadata with other extensions, use `addTokenMetadata()` instead of `addMetadata()`.

2. **Check Extension Compatibility**: Be aware of which extensions can be combined. See the [Extension Compatibility Guide](./extension-compatibility.md).

3. **Decimals Recommendation**: Consider using 6 decimals instead of 9 to reduce data size and increase compatibility.

4. **Error Handling**: Always implement proper error handling in your application code.

5. **Transaction Confirmation**: Wait for transaction confirmations before proceeding with dependent operations.

6. **Extension Order**: The order in which you add extensions to the TokenBuilder is not important - the SDK will arrange them optimally.

## Contributing

Contributions are welcome! See the [Contributing Guide](../CONTRIBUTING.md) for more information.

## Extensions Documentation

- [Default Account State](./default-account-state.md) - Set default state for token accounts
- [Extension Compatibility](./extension-compatibility.md) - Compatibility matrix for token extensions
- [Immutable Owner](./immutable-owner.md) - Make token account ownership immutable
- [Metadata](./metadata.md) - Add metadata to tokens
- [Mint Close Authority](./mint-close-authority.md) - Allow closing mint accounts
- [Non-Transferable](./non-transferable.md) - Make tokens non-transferable
- [Permanent Delegate](./permanent-delegate.md) - Allow an authority to transfer tokens from any account
- [Token Freeze & DefaultAccountState](./token-freeze.md) - Freeze token accounts and set default state
- [Transfer Fee](./transfer-fee.md) - Add transfer fees to token transactions
- [Transfer Hook](./transfer-hook.md) - Execute custom code when tokens are transferred