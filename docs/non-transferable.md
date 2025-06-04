# NonTransferable Extension Guide

## Overview

The NonTransferable extension creates tokens that cannot be transferred between accounts once they have been minted. Also known as "soulbound tokens," these tokens are permanently bound to the receiving account, making them ideal for credentials, certificates, badges, and identity tokens.

## Key Features

- **Transfer Restriction**: Tokens cannot be transferred after minting
- **Soulbound Tokens**: Create tokens that are permanently bound to an account
- **Protocol Enforcement**: Transfer restriction is enforced at the protocol level
- **Compatibility**: Works with other compatible extensions like TokenMetadata

## Use Cases

- **Digital Credentials**: Issue credentials that cannot be transferred to others
- **Achievement Badges**: Create achievement tokens that are tied to the recipient
- **Membership NFTs**: Issue membership tokens that are non-transferable
- **Identity Tokens**: Create identity tokens that cannot be sold or transferred
- **Certifications**: Issue certifications that stay with the recipient

## Creating a NonTransferable Token

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { TokenBuilder } from 'token-extensions-boost';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Initialize token builder
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    6, // decimals
    mintAuthority.publicKey // mint authority
  )
  // Add metadata (optional but recommended)
  .addTokenMetadata(
    "SoulBound Token",
    "SBT",
    "https://example.com/sbt-metadata.json",
    { "type": "certificate", "issuer": "Example Organization" }
  )
  // Add non-transferable extension
  .addNonTransferable();

// Get instructions to create token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);

// Create and send transaction
const transaction = new Transaction().add(...instructions);
// (Sign and send transaction - code omitted for brevity)

console.log(`Non-transferable token created with mint address: ${mint.toBase58()}`);
```

## Creating a NonTransferableToken Instance

The SDK provides a dedicated `NonTransferableToken` class for working with non-transferable tokens:

```typescript
import { NonTransferableToken } from 'token-extensions-boost';

// Create a NonTransferableToken instance from an existing mint
const nonTransferableToken = new NonTransferableToken(connection, mint);

// Check if a token has the non-transferable extension
const isNonTransferable = await nonTransferableToken.isNonTransferable();
console.log(`Is non-transferable: ${isNonTransferable}`);
```

## Minting NonTransferable Tokens

Minting non-transferable tokens follows the standard minting process:

```typescript
// Create a token account for the recipient
const recipientTokenAccount = await nonTransferableToken.getOrCreateTokenAccount(
  payer, // fee payer
  recipient.publicKey // owner of the token account
);

// Mint tokens to the recipient
await nonTransferableToken.mintTo(
  recipientTokenAccount.address, // destination token account
  payer, // mint authority
  BigInt(1_000_000) // amount (1 token with 6 decimals)
);

console.log(`Minted non-transferable token to ${recipient.publicKey.toBase58()}`);
```

## Transfer Behavior

When someone attempts to transfer a non-transferable token, the transaction will fail with an error:

```typescript
try {
  // This will fail for non-transferable tokens
  await nonTransferableToken.transfer(
    sourceTokenAccount,
    destinationTokenAccount,
    owner,
    BigInt(1_000_000) // amount to transfer
  );
} catch (error) {
  console.log(`Transfer failed as expected: ${error.message}`);
}
```

## Important Considerations

1. **Permanent Restriction**: Once a token is created with the non-transferable extension, this property cannot be changed.

2. **Burning is Allowed**: Non-transferable tokens can still be burned by their owners.

3. **Extension Compatibility**: NonTransferable is not compatible with:
   - TransferFee
   - TransferHook
   - ConfidentialTransfer

4. **Recipient Selection**: Carefully choose recipients as tokens cannot be recovered if sent to the wrong address.

5. **Freezing**: Non-transferable tokens can still be frozen if a freeze authority was specified.

## Verifying NonTransferable Status

You can check if a token has the non-transferable extension:

```typescript
import { getMint, ExtensionType, getExtensionTypes, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Get mint account data
const mintInfo = await getMint(
  connection,
  mintAddress,
  'confirmed',
  TOKEN_2022_PROGRAM_ID
);

// Check if the token has the NonTransferable extension
const extensionTypes = getExtensionTypes(mintInfo.tlvData);
const isNonTransferable = extensionTypes.includes(ExtensionType.NonTransferable);

console.log(`Token has NonTransferable extension: ${isNonTransferable}`);
```

## Combining with Other Extensions

NonTransferable works well with certain other extensions:

### NonTransferable + TokenMetadata (for certificates or badges)

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(6, payer.publicKey)
  .addTokenMetadata(
    "Certificate of Completion",
    "CERT",
    "https://example.com/certificate.json",
    { 
      "course": "Solana Development",
      "issuer": "Solana Academy",
      "completion_date": "2023-06-15"
    }
  )
  .addNonTransferable();
```

### NonTransferable + DefaultAccountState (for credentials)

```typescript
import { AccountState } from '@solana/spl-token';

const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    6, 
    payer.publicKey,
    payer.publicKey // freeze authority (required for DefaultAccountState)
  )
  .addTokenMetadata(
    "Verified Credential",
    "VCRED",
    "https://example.com/credential.json",
    { "credential_type": "identity" }
  )
  .addDefaultAccountState(AccountState.Frozen) // New accounts are frozen by default
  .addNonTransferable();
```

## Complete Example

A complete example of creating and testing non-transferable tokens is available in the examples directory:
- [Non-Transferable Token Example](../examples/non-transferable/create-non-transferable-token.ts)

## Related Extensions

- [DefaultAccountState](./default-account-state.md) - Set default state for token accounts
- [PermanentDelegate](./permanent-delegate.md) - Creates a permanent delegate authority for the token
- [ImmutableOwner](./immutable-owner.md) - Prevents token account ownership changes 