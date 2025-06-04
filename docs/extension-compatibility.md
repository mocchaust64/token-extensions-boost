# Token Extensions Compatibility Guide

## Overview

Not all token extensions can be used together due to functional conflicts or technical limitations. This guide explains which extensions are compatible with each other and provides tools to check compatibility when creating tokens with multiple extensions.

## Compatibility Matrix

The table below shows the compatibility between common token extensions:

| Extension            | NonTransferable | TransferFee | TransferHook | ConfidentialTransfer | PermanentDelegate | MetadataPointer |
|----------------------|-----------------|-------------|--------------|----------------------|-------------------|-----------------|
| NonTransferable      | ✅              | ❌          | ❌           | ✅                   | ✅                | ✅              |
| TransferFee          | ❌              | ✅          | ✅           | ❌                   | ✅                | ✅              |
| TransferHook         | ❌              | ✅          | ✅           | ❌                   | ✅                | ✅              |
| ConfidentialTransfer | ✅              | ❌          | ❌           | ✅                   | ❌                | ✅              |
| PermanentDelegate    | ✅              | ✅          | ✅           | ❌                   | ✅                | ✅              |
| MetadataPointer      | ✅              | ✅          | ✅           | ✅                   | ✅                | ✅              |
| MintCloseAuthority   | ✅              | ✅          | ✅           | ✅                   | ✅                | ✅              |
| InterestBearing      | ✅              | ✅          | ✅           | ✅                   | ✅                | ✅              |
| DefaultAccountState  | ✅              | ✅          | ✅           | ✅                   | ✅                | ✅              |

## Incompatible Extension Pairs

### NonTransferable incompatibilities:

- **TransferFee**: Since tokens cannot be transferred, transfer fees cannot be applied
- **TransferHook**: Since tokens cannot be transferred, hooks cannot be executed

### ConfidentialTransfer incompatibilities:

- **TransferFee**: Since transfer amounts are encrypted, fees cannot be calculated
- **TransferHook**: Since transfer amounts are encrypted, hooks cannot process them
- **PermanentDelegate**: Since permanent delegation conflicts with transfer confidentiality

## Using the Compatibility Checker

The token-extensions-boost SDK includes a built-in extension compatibility checker that automatically verifies whether the extensions you want to combine are compatible:

```typescript
import { TokenBuilder } from 'token-extensions-boost';
import { Connection } from '@solana/web3.js';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Create token builder with potentially incompatible extensions
try {
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)
    .addNonTransferable()
    .addTransferFee(
      100, // 1% fee
      BigInt(1000000000), // max fee
      payer.publicKey, 
      payer.publicKey
    );
    
  // This will throw an error due to incompatibility
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
} catch (error) {
  console.error("Compatibility error:", error.message);
  // Error message will explain which extensions are incompatible
}
```

## Extension Compatibility Logic

The compatibility checker uses the following logic to determine if extensions are compatible:

```typescript
function checkExtensionCompatibility(extensionTypes: ExtensionType[]): {
  isCompatible: boolean;
  reason?: string;
} {
  const incompatiblePairs: [ExtensionType, ExtensionType][] = [];
  
  // Check extensions incompatible with NonTransferable
  if (extensionTypes.includes(ExtensionType.NonTransferable)) {
    if (extensionTypes.includes(ExtensionType.TransferFeeConfig)) {
      incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.TransferFeeConfig]);
    }
    
    if (extensionTypes.includes(ExtensionType.TransferHook)) {
      incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.TransferHook]);
    }
  }
  
  // Check extensions incompatible with ConfidentialTransfer
  if (extensionTypes.includes(ExtensionType.ConfidentialTransferMint)) {
    if (extensionTypes.includes(ExtensionType.TransferFeeConfig)) {
      incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.TransferFeeConfig]);
    }
    
    if (extensionTypes.includes(ExtensionType.TransferHook)) {
      incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.TransferHook]);
    }
    
    if (extensionTypes.includes(ExtensionType.PermanentDelegate)) {
      incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.PermanentDelegate]);
    }
  }
  
  if (incompatiblePairs.length > 0) {
    const reasons = incompatiblePairs.map(([a, b]) => 
      `${ExtensionType[a]} and ${ExtensionType[b]} are not compatible`
    );
    
    return {
      isCompatible: false,
      reason: reasons.join("; ")
    };
  }
  
  return { isCompatible: true };
}
```

## Creating Tokens with Compatible Extensions

Here are some examples of creating tokens with compatible extension combinations:

### Example 1: Metadata + PermanentDelegate

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(9, payer.publicKey)
  .addTokenMetadata(
    "Delegated Token", 
    "DLGT", 
    "https://example.com/metadata.json",
    { "description": "Token with permanent delegate" }
  )
  .addPermanentDelegate(payer.publicKey);

const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
```

### Example 2: Metadata + NonTransferable (Soul-bound token)

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(9, payer.publicKey)
  .addTokenMetadata(
    "Soul Bound Token", 
    "SBT", 
    "https://example.com/metadata.json",
    { "description": "Non-transferable token" }
  )
  .addNonTransferable();

const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
```

### Example 3: TransferFee + TransferHook + MetadataPointer

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(9, payer.publicKey)
  .addTokenMetadata(
    "Fee Token with Hook", 
    "FTH", 
    "https://example.com/metadata.json",
    { "description": "Token with fee and hook" }
  )
  .addTransferFee(
    100, // 1% fee
    BigInt(1000000000), // max fee
    payer.publicKey,
    payer.publicKey
  )
  .addTransferHook(hookProgramId);

const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
```

## Complete Example

A complete example of testing extension compatibility is available in the examples directory:
- [Extension Compatibility Test](../examples/extension-compatibility-test/test-extension-compatibility.ts)

## Best Practices

1. **Plan Extensions First**: Decide which extensions you need before creating your token
2. **Test Combinations**: Test your specific extension combination on devnet first
3. **Understand Limitations**: Be aware of why certain extensions are incompatible
4. **Use the Checker**: Always use the compatibility checker to validate your extension choices
5. **Document Extensions**: Document which extensions your token uses for transparency 