# Token Metadata Extension Guide

## Overview

The Metadata extension allows you to store token information directly on-chain, making it easily accessible to any application that interacts with your token. This includes basic information like name, symbol, and URI to off-chain metadata, plus the ability to add custom key-value pairs for additional attributes.

## Key Features

- Store token name, symbol, and URI on-chain
- Add unlimited custom fields as key-value pairs
- Update metadata fields after token creation
- Optimized metadata updates to reduce transaction costs
- Combine with other token extensions for enhanced functionality

## Creating a Token with Metadata

The recommended way to create a token with metadata is using the `TokenBuilder` class:

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { TokenBuilder } from 'token-extensions-boost';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Create a token with metadata
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    9, // decimals
    payer.publicKey // mint authority
  )
  .addTokenMetadata(
    "My Token", // name
    "MYTKN", // symbol
    "https://example.com/metadata.json", // URI
    {
      "description": "A token with on-chain metadata",
      "website": "https://example.com",
      "twitter": "@example"
    }
  );

// Get instructions to create token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);

// Create and send transaction
const transaction = tokenBuilder.buildTransaction(instructions, payer.publicKey);

// Get latest blockhash
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
transaction.lastValidBlockHeight = lastValidBlockHeight;

// Sign and send transaction
if (signers.length > 0) {
  transaction.partialSign(...signers);
}
transaction.partialSign(payer);

const transactionSignature = await connection.sendRawTransaction(
  transaction.serialize(),
  { skipPreflight: false }
);

await connection.confirmTransaction({
  signature: transactionSignature,
  blockhash,
  lastValidBlockHeight
});

console.log(`Token created with mint address: ${mint.toBase58()}`);
```

## Reading Token Metadata

To read the metadata from a token:

```typescript
import { TokenMetadataToken } from 'token-extensions-boost';
import { Connection, PublicKey } from '@solana/web3.js';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Create a token instance from existing mint
const tokenWithMetadata = await TokenMetadataToken.fromMint(
  connection, 
  new PublicKey("...") // mint address
);

// Get metadata
const metadata = await tokenWithMetadata.getTokenMetadata();

console.log(`Name: ${metadata.name}`);
console.log(`Symbol: ${metadata.symbol}`);
console.log(`URI: ${metadata.uri}`);

// Read additional metadata fields
if (metadata.additionalMetadata) {
  for (const [key, value] of metadata.additionalMetadata) {
    console.log(`${key}: ${value}`);
  }
}
```

## Updating Token Metadata

### Updating a Single Field

```typescript
import { TokenMetadataToken } from 'token-extensions-boost';

// Load token with metadata
const tokenWithMetadata = await TokenMetadataToken.fromMint(connection, mint);

// Update a single field
const result = await tokenWithMetadata.updateMetadataOptimized(
  connection,
  wallet, // Must be metadata update authority
  "description", // Field to update
  "New description value", // New value
  { 
    priorityLevel: 'normal', 
    allocateStorage: true 
  }
);

console.log(`Update transaction: ${result.signature}`);
```

### Updating Multiple Fields at Once

```typescript
// Update multiple fields at once
const batchResult = await tokenWithMetadata.updateMetadataBatchOptimized(
  connection,
  wallet, // Must be metadata update authority
  {
    "twitter": "@new_handle",
    "discord": "https://discord.gg/new",
    "website": "https://new-website.com"
  },
  { 
    priorityLevel: 'normal',
    allocateStorage: true,
    maxFieldsPerTransaction: 4
  }
);

console.log(`Batch update transactions: ${batchResult.signatures.join(', ')}`);
```

## Optimization Options

The metadata update methods support several optimization options:

### Priority Levels

Control transaction priority and cost:

```typescript
// Options for different priority levels
const options = {
  // Highest priority, uses maximum compute units and higher fees
  priorityLevel: 'max',
  
  // High priority, uses more compute units than default
  // priorityLevel: 'high',
  
  // Default priority
  // priorityLevel: 'normal',
  
  // Low priority, minimizes fees but might take longer to confirm
  // priorityLevel: 'low',
};
```

### Storage Allocation

Automatically manage storage space for metadata:

```typescript
// Options for storage allocation
const options = {
  // Automatically allocate additional storage if needed (recommended)
  allocateStorage: true,
  
  // Use only existing storage (will fail if space is insufficient)
  // allocateStorage: false,
};
```

### Batch Processing

Control how many fields to update in a single transaction:

```typescript
// Options for batch updates
const options = {
  // Maximum number of fields to update in a single transaction
  maxFieldsPerTransaction: 4, // Default is 4 (recommended for reliability)
  
  // Simulate transaction before sending (safer, catches errors)
  simulateFirst: true,
};
```

## Combining Metadata with Other Extensions

Metadata can be combined with other token extensions to create powerful token configurations:

### Metadata with NonTransferable (SoulBound Token)

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(9, payer.publicKey)
  .addTokenMetadata(
    "SoulBound Token",
    "SBT",
    "https://example.com/sbt-metadata.json",
    { "type": "achievement" }
  )
  .addNonTransferable();
```

### Metadata with TransferFee

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(9, payer.publicKey)
  .addTokenMetadata(
    "Fee Token",
    "FEE",
    "https://example.com/fee-token.json",
    { "fee_description": "2% transfer fee" }
  )
  .addTransferFee(
    200, // 2% (200 basis points)
    BigInt(1000000000), // Max fee (1 token with 9 decimals)
    payer.publicKey, // Transfer fee authority
    payer.publicKey  // Withdraw authority
  );
```

## Best Practices

1. **URI Metadata Format**: Follow the [Metaplex Token Metadata Standard](https://docs.metaplex.com/programs/token-metadata/token-standard) for your off-chain metadata format.

2. **Field Name Limitations**: Metadata field names should be reasonable in length and avoid special characters.

3. **Field Value Size**: Keep field values under 1KB each to avoid storage issues.

4. **Update Frequency**: Minimize metadata updates to reduce costs. Consider which fields will need frequent updates.

5. **Storage Planning**: Use the `allocateStorage: true` option when updating metadata to automatically handle storage requirements.

## Common Errors and Solutions

### "Not enough account space"
- **Cause**: Insufficient storage for the metadata being added
- **Solution**: Use `allocateStorage: true` in update options

### "Authority mismatch"
- **Cause**: The account trying to update is not the metadata update authority
- **Solution**: Use the correct authority for updates (normally the mint authority)

### "Invalid account data"
- **Cause**: Trying to add too many fields in one transaction
- **Solution**: Use batch updates with `maxFieldsPerTransaction: 4` or lower

## Complete Examples

Complete examples are available in the examples directory:
- [Simple Metadata Example](../examples/metadata/simple-metadata.ts)
- [Optimized Metadata Update Example](../examples/metadata/optimized-metadata-update.ts)
- [Combined Extensions Example](../examples/metadata/combined-extensions.ts)

## Related Extensions

- [PermanentDelegate](./permanent-delegate.md) - Creates a permanent delegate authority for the token
- [TransferFeeConfig](./transfer-fee.md) - Adds transfer fees to token transactions
- [NonTransferable](./non-transferable.md) - Creates non-transferable tokens