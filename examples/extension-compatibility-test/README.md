# Token Extensions Compatibility API Documentation

## Overview

The Token Extensions SDK allows you to create and manage tokens on Solana with various extensions. This module helps you check the compatibility between different token extensions and create tokens with multiple extensions combined.

## Installation

```bash
# Install the SDK
npm install solana-token-extension-boost

# Or using yarn
yarn add solana-token-extension-boost
```

## How to Use the API

### 1. Import Required Modules

```typescript
import { TokenBuilder } from "solana-token-extension-boost";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { ExtensionType } from "@solana/spl-token";
```

### 2. Initialize Connection and Account

```typescript
// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Create or import keypair
const payer = Keypair.generate(); // In a real environment, use wallet-adapter
```

### 3. Check Compatibility Between Extensions

The SDK provides a function to check compatibility between extensions:

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

### 4. Create a Token with Multiple Extensions

Use TokenBuilder to create a token with multiple extensions:

```typescript
async function createTokenWithExtensions() {
  const tokenBuilder = new TokenBuilder(connection);
  
  // Set up basic information
  tokenBuilder.setTokenInfo(
    9, // decimals
    payer.publicKey // mint authority
  );
  
  // Add NonTransferable extension (token cannot be transferred)
  tokenBuilder.addNonTransferable();
  
  // Add PermanentDelegate extension (permanent delegation)
  tokenBuilder.addPermanentDelegate(payer.publicKey);
  
  // Add Metadata extension
  tokenBuilder.addTokenMetadata(
    "Test Token",
    "TEST",
    "https://example.com/token.json",
    {
      "description": "Test token with multiple extensions",
      "creator": payer.publicKey.toString()
    }
  );
  
  // Create instructions instead of directly creating the token
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
  
  // Create transaction from instructions
  const transaction = new Transaction();
  instructions.forEach(ix => transaction.add(ix));
  
  // Send and confirm transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, ...signers],
    { commitment: 'confirmed' }
  );
  
  console.log(`Token created successfully! Mint address: ${mint.toString()}`);
  console.log(`Transaction signature: ${signature}`);
  
  return { mint, signature };
}
```

## Compatibility Matrix Between Extensions

The table below shows the compatibility between common extensions:

| Extension            | NonTransferable | TransferFee | TransferHook | ConfidentialTransfer | PermanentDelegate |
|----------------------|-----------------|-------------|--------------|----------------------|-------------------|
| NonTransferable      | ✅              | ❌          | ❌           | ✅                   | ✅                |
| TransferFee          | ❌              | ✅          | ✅           | ❌                   | ✅                |
| TransferHook         | ❌              | ✅          | ✅           | ❌                   | ✅                |
| ConfidentialTransfer | ✅              | ❌          | ❌           | ✅                   | ❌                |
| PermanentDelegate    | ✅              | ✅          | ✅           | ❌                   | ✅                |
| MetadataPointer      | ✅              | ✅          | ✅           | ✅                   | ✅                |

## Incompatible Extension Pairs

Some extensions cannot be used together:

1. **NonTransferable** is not compatible with:
   - TransferFee (since tokens cannot be transferred, transfer fees cannot be applied)
   - TransferHook (since tokens cannot be transferred, hooks cannot be executed)

2. **ConfidentialTransfer** is not compatible with:
   - TransferFee (since transfer amounts are encrypted, fees cannot be calculated)
   - TransferHook (since transfer amounts are encrypted, hooks cannot process them)
   - PermanentDelegate (since permanent delegation conflicts with transfer confidentiality)

## Running Compatibility Tests

To check and run compatibility tests between extensions:

```bash
# Navigate to the example directory
cd examples/extension-compatibility-test

# Run the test
npx ts-node test-extension-compatibility.ts
```

## Example Output

```
=== TOKEN EXTENSION COMPATIBILITY TEST ===

Checking extension compatibility:
✅ NonTransferable + PermanentDelegate: Compatible in theory
✅ TransferFee + PermanentDelegate: Compatible in theory
✅ TransferFee + TransferHook: Compatible in theory
✅ MetadataPointer + PermanentDelegate: Compatible in theory
✅ NonTransferable + MetadataPointer: Compatible in theory

Token creation test results:
✅ NonTransferable + PermanentDelegate: Success! Token: AQFZxpbBGoJ2FveJZM4qRSKAxUmrTPBPytpq5sDjL6qt
✅ TransferFee + PermanentDelegate: Success! Token: 6HtCzF1YqgZgWnNiPn4ZCAJuCS4moy3WuuHHefkxpgCr
✅ TransferFee + TransferHook: Success! Token: 9c1e45d6ByL37kiUuVjakczzALsDXZvKZzkPiYtFaQ8g
✅ MetadataPointer + PermanentDelegate: Success! Token: 34dHqr2kzpmhLWVXnGh1zyyaVF3U3HHizYuVJqJHHmjx
✅ NonTransferable + MetadataPointer: Success! Token: 2Q9VYNbWa9wwz1yQGmutKMfzCHmchbS3zz3pd3o9bx8o
```

## Integration with Projects

The Token Extensions SDK is designed to be easily integrated with web projects using wallet-adapter:

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TokenBuilder } from "solana-token-extension-boost";

function CreateTokenComponent() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  const handleCreateToken = async () => {
    if (!publicKey) return;
    
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(9, publicKey)
      .addNonTransferable()
      .addTokenMetadata(
        "My Token",
        "MT",
        "https://example.com/metadata.json",
        { "description": "My custom token" }
      );
      
    const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(publicKey);
    
    const transaction = new Transaction().add(...instructions);
    const signature = await sendTransaction(transaction, connection, {
      signers: signers
    });
    
    console.log(`Token created: ${mint.toString()}`);
  };
  
  return (
    <button onClick={handleCreateToken} disabled={!publicKey}>
      Create Token
    </button>
  );
}
``` 