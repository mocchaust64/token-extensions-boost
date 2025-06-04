# Metadata in Token Extensions

This directory contains examples of how to use the Metadata Extension from Token Extensions.

## New API - Simple and Easy to Use

We have developed a new, simpler API to create tokens with metadata. This new API handles the correct initialization order, automatically calculates the necessary size, and splits transactions to ensure success.

### Method 1: Using TokenBuilder (Recommended)

```typescript
import { TokenBuilder } from "../../src/utils/token-builder";

const tokenBuilder = new TokenBuilder(connection);

tokenBuilder
  .setTokenInfo(9, payer.publicKey)
  .addTokenMetadata(
    "My Token",
    "TKN",
    "https://example.com/metadata.json",
    {
      "description": "My token description",
      "creator": "Creator name"
    }
  );

const { mint, transactionSignature, token } = await tokenBuilder.createToken(payer);
```

## Parameter Details

### TokenBuilder Methods

#### `setTokenInfo(decimals, mintAuthority)`
- `decimals`: Number - The number of decimal places the token will have (0-9)
- `mintAuthority`: PublicKey - The authority that can mint new tokens

#### `addTokenMetadata(name, symbol, uri, additionalMetadata)`
- `name`: String - Name of the token (max 32 characters)
- `symbol`: String - Symbol of the token (max 10 characters)
- `uri`: String - URI pointing to off-chain metadata (max 200 characters)
- `additionalMetadata`: Object - Key-value pairs of additional metadata fields

#### `createToken(payer)`
- `payer`: Keypair or Signer - The account that will pay for the transaction fees
- Returns: Object containing `mint` (PublicKey), `transactionSignature` (string), and `token` (TokenMetadataToken instance)

### TokenMetadataToken Methods

#### `getTokenMetadata()`
- Returns: Object containing token metadata (name, symbol, uri, additionalMetadata)

#### `updateMetadataOptimized(connection, wallet, key, value, options)`
- `connection`: Connection - Solana connection object
- `wallet`: Wallet - Wallet adapter or compatible object with `publicKey` and `signTransaction`
- `key`: String - Metadata field name to update
- `value`: String - New value for the metadata field
- `options`: Object - Configuration options (see Optimization Options section)
- Returns: Object containing `signature` and transaction details

#### `updateMetadataBatchOptimized(connection, wallet, fields, options)`
- `connection`: Connection - Solana connection object
- `wallet`: Wallet - Wallet adapter or compatible object
- `fields`: Object - Key-value pairs of metadata fields to update
- `options`: Object - Configuration options
- Returns: Object containing `signatures` array and transaction details

## Issues Fixed

We have fixed the following issues:

1. **Incorrect initialization order**: The new API ensures the correct initialization order as required by Solana.
2. **Insufficient account space**: Automatically calculates necessary space with sufficient padding.
3. **"Invalid account data" error**: Splits transactions to avoid this error.
4. **Errors when combining with other extensions**: Special handling for metadata + other extensions.

## Correct Initialization Order

The new API ensures the correct initialization order in 5 steps:

1. Create account with sufficient space
2. Initialize MetadataPointer (pointing to the mint itself)
3. Initialize Mint
4. Initialize Metadata
5. Add additional metadata fields

## Running the Examples

Run the simple example:

```bash
npx ts-node simple-metadata.ts
```

Run the combined extensions example:

```bash
npx ts-node combined-extensions.ts
```

Run the optimized metadata update example:

```bash
npx ts-node optimized-metadata-update.ts
```

## Reading Metadata from a Token

```typescript
import { getTokenMetadata } from "@solana/spl-token";

const tokenMetadata = await getTokenMetadata(
  connection,
  mintAddress,
  "confirmed"
);

console.log(`Name: ${tokenMetadata?.name}`);
console.log(`Symbol: ${tokenMetadata?.symbol}`);
console.log(`URI: ${tokenMetadata?.uri}`);

// Read additional metadata
if (tokenMetadata?.additionalMetadata) {
  for (const [key, value] of tokenMetadata.additionalMetadata) {
    console.log(`${key}: ${value}`);
  }
}
```

## Optimized Metadata Updates

We've implemented an optimized approach for updating token metadata that significantly reduces costs:

```typescript
// Create a token with metadata extension
const tokenWithMetadata = await TokenMetadataToken.fromMint(connection, mint);

// Update a single metadata field with optimization
await tokenWithMetadata.updateMetadataOptimized(
  connection,
  wallet,
  "description",
  "New description value",
  { priorityLevel: 'low', allocateStorage: true }
);

// Update multiple fields at once
await tokenWithMetadata.updateMetadataBatchOptimized(
  connection,
  wallet,
  {
    "twitter": "@token_account",
    "discord": "https://discord.gg/token",
    "github": "https://github.com/token-project"
  },
  { priorityLevel: 'low', allocateStorage: true, maxFieldsPerTransaction: 4 }
);
```

### Optimization Options

The metadata update methods accept several options to fine-tune the process:

#### `priorityLevel`
- `'max'`: Highest priority, uses maximum compute units and higher fees
- `'high'`: High priority, uses more compute units than default
- `'normal'`: Default priority
- `'low'`: Low priority, minimizes fees but might take longer to confirm

#### `allocateStorage`
- `true`: Automatically allocate additional storage if needed (recommended)
- `false`: Use only existing storage (will fail if space is insufficient)

#### `maxFieldsPerTransaction` (batch updates only)
- Number: Maximum number of fields to update in a single transaction
- Default: 4 (recommended for reliability)

#### `simulateFirst`
- `true`: Simulate transaction before sending (safer, catches errors)
- `false`: Skip simulation (faster but riskier)

#### `additionalSigners`
- Array of additional signers if required

## Combining Metadata with Other Extensions

Metadata can be combined with other token extensions to create powerful token configurations. Here are some examples:

### Metadata with NonTransferable (SoulBound Token)

```typescript
const tokenBuilder = new TokenBuilder(connection);

tokenBuilder
  .setTokenInfo(9, payer.publicKey)
  // Add metadata
  .addTokenMetadata(
    "SoulBound Token",
    "SBT",
    "https://example.com/sbt-metadata.json",
    { "type": "achievement" }
  )
  // Make it non-transferable
  .addNonTransferable();

const { mint } = await tokenBuilder.createToken(payer);
```

### Metadata with TransferFee

```typescript
const tokenBuilder = new TokenBuilder(connection);

tokenBuilder
  .setTokenInfo(9, payer.publicKey)
  // Add metadata
  .addTokenMetadata(
    "Fee Token",
    "FEE",
    "https://example.com/fee-token.json",
    { "fee_description": "2% transfer fee" }
  )
  // Add 2% transfer fee
  .addTransferFee(
    200, // 2% (200 basis points)
    BigInt(1000000000), // Max fee (1 token with 9 decimals)
    payer.publicKey, // Transfer fee authority
    payer.publicKey  // Withdraw authority
  );

const { mint } = await tokenBuilder.createToken(payer);
```

### Metadata with Multiple Extensions

```typescript
const tokenBuilder = new TokenBuilder(connection);

tokenBuilder
  .setTokenInfo(9, payer.publicKey)
  // Add metadata
  .addTokenMetadata(
    "Multi-Extension Token",
    "MET",
    "https://example.com/multi-ext-token.json",
    { "token_type": "multi-feature" }
  )
  // Add transfer fee
  .addTransferFee(
    100, // 1% (100 basis points)
    BigInt(1000000000), // Max fee (1 token with 9 decimals)
    payer.publicKey, // Transfer fee authority
    payer.publicKey  // Withdraw authority
  )
  // Add permanent delegate
  .addPermanentDelegate(
    delegateKeypair.publicKey
  )
  // Add interest bearing capability
  .addInterestBearing(
    0.05, // 5% interest rate
    payer.publicKey // Rate authority
  );

const { mint } = await tokenBuilder.createToken(payer);
```

## Metadata Size Limitations and Structure

### Size Limitations

- **Name**: Maximum 32 characters
- **Symbol**: Maximum 10 characters
- **URI**: Maximum 200 characters
- **Total Metadata Size**: Limited by account size (4KB recommended maximum)
- **Additional Fields**: No fixed limit, but total size must fit within account allocation

### Structure Requirements

- **Name and Symbol**: Required fields
- **URI**: Required field that should point to a valid JSON file
- **Additional Metadata**: Optional key-value pairs
  - Keys must be strings
  - Values must be strings
  - Binary data should be base64 encoded

### Off-chain Metadata Structure (URI Content)

The URI should point to a JSON file with this recommended structure:

```json
{
  "name": "Token Name",
  "symbol": "TKN",
  "description": "Detailed token description",
  "image": "https://example.com/token-image.png",
  "external_url": "https://example.com/token",
  "attributes": [
    {
      "trait_type": "Category",
      "value": "Utility"
    },
    {
      "trait_type": "Rarity",
      "value": "Common"
    }
  ]
}
```

## Common Errors and Solutions

### Initialization Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid account data` | Incorrect initialization order | Use `TokenBuilder` which handles proper order |
| `Account does not support metadata` | MetadataPointer not initialized | Ensure MetadataPointer is initialized before metadata |
| `Not enough account space` | Insufficient allocated space | Use `TokenBuilder` which calculates space correctly |

### Transaction Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Transaction too large` | Too many instructions in one tx | Use batch methods with `maxFieldsPerTransaction` option |
| `Compute budget exceeded` | Complex operations need more compute | Use `priorityLevel: 'high'` option |
| `Invalid token mint` | Wrong program ID | Ensure using TOKEN_2022_PROGRAM_ID for token extensions |

### Metadata Update Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Failed to update metadata` | Insufficient space | Use `allocateStorage: true` option |
| `Token authority mismatch` | Not authorized to update | Ensure using the correct update authority |
| `Metadata field too large` | Field value exceeds space | Split large values or use multiple fields |

## Troubleshooting

### Diagnosing Issues

1. **Verify token program**: Ensure you're using the Token-2022 program
   ```typescript
   const isProgramCorrect = mint.programId.equals(TOKEN_2022_PROGRAM_ID);
   ```

2. **Check metadata existence**:
   ```typescript
   try {
     const metadata = await getTokenMetadata(connection, mint);
     console.log("Metadata exists:", metadata);
   } catch (err) {
     console.error("No metadata found:", err);
   }
   ```

3. **Inspect token extensions**:
   ```typescript
   import { getTokenExtensions } from "@solana/spl-token";
   
   const extensions = await getTokenExtensions(connection, mint);
   console.log("Extensions:", extensions);
   ```

4. **Monitor transaction logs**:
   ```typescript
   const txDetails = await connection.getTransaction(signature, {
     maxSupportedTransactionVersion: 0
   });
   console.log("Logs:", txDetails?.meta?.logMessages);
   ```

### Common Issues and Solutions

**Issue**: Transaction fails with "insufficient funds"
**Solution**: The account needs more SOL to pay for rent exemption. Send more SOL to the payer account.

**Issue**: Unable to add fields after token creation
**Solution**: Ensure you're using the optimization methods which can allocate more space as needed:
```typescript
await tokenWithMetadata.updateMetadataOptimized(
  connection, wallet, key, value, { allocateStorage: true }
);
```

**Issue**: Token creation fails with "failed to send transaction"
**Solution**: Try enabling preflight checks to get detailed error information:
```typescript
const tx = await connection.sendTransaction(transaction, signers, {
  skipPreflight: false, // Enable preflight checks
  preflightCommitment: "confirmed"
});
```

**Issue**: Error "instruction expected an account with metadata fields enabled"
**Solution**: Ensure the token was created with metadata extension. Use `TokenBuilder.addTokenMetadata()` method.

## Example Source Code

- [simple-metadata.ts](./simple-metadata.ts): The simplest example to create a token with metadata
- [combined-extensions.ts](./combined-extensions.ts): A more comprehensive example with metadata and other extensions
- [optimized-metadata-update.ts](./optimized-metadata-update.ts): Demonstrates cost-effective metadata update techniques
- [TokenBuilder](../../src/utils/token-builder.ts): Source code of the TokenBuilder
- [TokenMetadataToken](../../src/extensions/token-metadata/index.ts): Implementation of TokenMetadataToken class