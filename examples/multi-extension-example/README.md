# Examples of Tokens with Multiple Extensions

This directory contains examples demonstrating how to create tokens with multiple extensions using the SDK.

## Available Examples

1. **Create tokens with multiple extensions (without metadata)**
   - File: `multiple-extensions-example.ts`
   - Description: Creates a token with TransferFee, InterestBearing, and PermanentDelegate
   - Method used: `createToken()`

2. **Create tokens with metadata and multiple extensions**
   - File: `metadata-with-extensions-example.ts`
   - Description: Creates a token with TokenMetadata, TransferFee, and PermanentDelegate
   - Method used: `createToken()`

## Best Practices

When combining extensions, follow these rules:

1. **Use TokenMetadata instead of MetadataPointer**: When adding metadata with other extensions, use `addTokenMetadata()` instead of `addMetadata()`.

2. **Check compatibility**: Always check the compatibility of extensions before combining them. The SDK will automatically check and report errors if it detects invalid combinations.

3. **Extension order**: The order in which you add extensions to the TokenBuilder is not important - the SDK will automatically arrange them in the optimal order when creating the token.

4. **Decimals**: Consider using 6 decimals instead of 9 to reduce data size and increase compatibility.

## Usage

### 1. Create a token with multiple extensions (without metadata)

```typescript
// Create TokenBuilder with multiple extensions
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    6, // decimals
    payer.publicKey, // mint authority
    null // freeze authority
  )
  // Add TransferFee
  .addTransferFee(
    100, // 1% fee (basis points)
    BigInt(1000000), // max fee (with 6 decimals)
    payer.publicKey, // config authority
    payer.publicKey // withdraw authority
  )
  // Add InterestBearing
  .addInterestBearing(
    500, // 5% interest rate (basis points)
    payer.publicKey // rate authority
  )
  // Add PermanentDelegate
  .addPermanentDelegate(delegateKeypair.publicKey);

// Create token with configured extensions
const { mint, transactionSignature, token } = await tokenBuilder.createToken(payer);
```

### 2. Create a token with metadata and multiple extensions

```typescript
// Create TokenBuilder and add extensions
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    6, // decimals
    payer.publicKey, // mint authority
    null // freeze authority
  )
  // Add TokenMetadata - NOTE: Use addTokenMetadata, NOT addMetadata
  .addTokenMetadata(
    "Multi Extension Token",
    "MEXT",
    "https://example.com/metadata.json",
    { 
      "description": "Token with metadata and extensions",
      "website": "https://solana.com" 
    }
  )
  // Add TransferFee
  .addTransferFee(
    50, // 0.5% fee (basis points)
    BigInt(500000), // max fee (0.5 token with 6 decimals)
    payer.publicKey, // config authority
    payer.publicKey // withdraw authority
  )
  // Add PermanentDelegate
  .addPermanentDelegate(delegateKeypair.publicKey);

// Create token with metadata and other extensions
const { mint, transactionSignature, token } = await tokenBuilder.createToken(payer);
```

## Running the Examples

### Create a token with multiple extensions

```bash
npm run build
npx ts-node examples/multi-extension-example/multiple-extensions-example.ts
```

### Create a token with metadata and multiple extensions

```bash
npm run build
npx ts-node examples/multi-extension-example/metadata-with-extensions-example.ts
```

## Notes on Extension Compatibility

Not all extensions can be combined with each other. Here are the important rules:

1. **TokenMetadata vs MetadataPointer**
   - When combining metadata with other extensions, use `addTokenMetadata()` instead of `addMetadata()`
   - TokenMetadata works better with other extensions

2. **NonTransferable** is not compatible with:
   - TransferFee
   - TransferHook
   - ConfidentialTransfer

3. **ConfidentialTransfer** is not compatible with:
   - TransferFee
   - TransferHook
   - PermanentDelegate
   - NonTransferable

4. **Recommended combinations**:
   - TransferFee + PermanentDelegate + InterestBearing: Works well
   - TokenMetadata + TransferFee + PermanentDelegate: Works well
   - TokenMetadata + InterestBearing: Works well

The SDK will check the compatibility of extensions and report errors if it detects invalid combinations.

