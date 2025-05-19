# Transfer Hook Extension

Transfer Hook is a powerful extension of SPL-Token 2022 that allows you to execute custom code every time a token is transferred. This extension opens up many possibilities such as:

- Enforcing ownership validation or whitelist/blacklist checks
- Collecting fees automatically in different tokens
- Enforcing NFT royalties
- Accumulating token transfer data
- Creating events when tokens are transferred
- Many other use cases...

## How It Works

1. Create a Token with the Transfer Hook Extension, specifying the address of a Transfer Hook program
2. When a user transfers the token, the Token 2022 program will make a CPI (Cross-Program Invocation) to the specified Transfer Hook program
3. The Transfer Hook program can:
   - Perform side actions
   - Store data
   - Check conditions
   - Reject the transaction if conditions are not met

## Usage Guide

### 1. Creating a token with Transfer Hook

```typescript
// Create an actual Transfer Hook Program and deploy it
const transferHookProgramId = new PublicKey("YOUR_HOOK_PROGRAM_ID");

// Initialize TokenBuilder
const tokenBuilder = new TokenBuilder(connection);

// Create token with Transfer Hook
const { mint, token } = await tokenBuilder
  .setTokenInfo(9, payer.publicKey)
  .addTransferHook(transferHookProgramId)
  .createToken(payer);
```

### 2. Transferring tokens with Transfer Hook

```typescript
// Create token account for the recipient
const { address: recipientTokenAccount } = await transferHookToken.createOrGetTokenAccount(
  payer,
  recipient.publicKey
);

// Transfer tokens
const transferSignature = await transferHookToken.transfer(
  ownerTokenAccount,
  recipientTokenAccount,
  payer,
  transferAmount,
  decimals,
  extraAccounts // Optional: Additional accounts for the transfer hook
);
```

### 3. Combining Transfer Hook with other extensions

You can combine Transfer Hook with other extensions like Metadata:

```typescript
const { mint } = await tokenBuilder
  .setTokenInfo(9, payer.publicKey)
  .addTransferHook(transferHookProgramId)
  .addTokenMetadata(
    "Hook Token",
    "HOOK",
    "https://example.com/metadata/hook-token.json",
    {
      "description": "A token with transfer hook and metadata"
    }
  )
  .createToken(payer);
```

## Implementing a Transfer Hook Program

To fully use the Transfer Hook feature, you need to:

1. **Build and deploy a Transfer Hook Program** that implements the SPL Transfer Hook Interface
2. **Create an ExtraAccountMetaList PDA** to store additional accounts required for the Transfer Hook
3. **Initialize any additional accounts** (if needed) for the Transfer Hook Program

A simple example of a Transfer Hook Program using the Anchor Framework can be found at:
https://github.com/solana-labs/solana-program-library/tree/master/token/transfer-hook/example

## Important Notes

- Transfer Hooks can only execute code in the program specified when the token is created
- The Transfer Hook program cannot be changed after the token is created (unless you specify change authority)
- The source and destination accounts are passed to the Transfer Hook as read-only and cannot be modified
- When using Transfer Hooks with existing UIs/wallets, transaction signers need to support resolving the ExtraAccountMetaList

## Examples

See the full examples in [examples/transfer-hook/index.ts](./index.ts) and [examples/multi-extension-example/metadata-with-extensions-example.ts](../multi-extension-example/metadata-with-extensions-example.ts) 