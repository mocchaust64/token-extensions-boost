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

## Example Source Code

- [simple-metadata.ts](./simple-metadata.ts): The simplest example to create a token with metadata
- [combined-extensions.ts](./combined-extensions.ts): A more comprehensive example with metadata and other extensions
- [TokenBuilder](../../src/utils/token-builder.ts): Source code of the TokenBuilder