# Token Burn and Transfer Operations Guide

## Overview

This guide covers the core operations for managing tokens using the Token Extensions Boost SDK, focusing on burning tokens and transferring tokens with extensions like TransferFee and PermanentDelegate.

## Key Operations

### Creating Token Accounts

Before you can receive, transfer, or burn tokens, you need to create token accounts:

```typescript
import { Token } from 'token-extensions-boost';
import { Connection, PublicKey } from '@solana/web3.js';

// Connect to Solana
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Initialize a token instance
const token = new Token(connection, mintAddress);

// Create token account for the owner
const { instructions: createAccountIx, address: ownerTokenAddress } = 
  await token.createTokenAccountInstructions(payer.publicKey, owner.publicKey);

// Or get or create a token account (creates if it doesn't exist)
const recipientTokenAccount = await token.getOrCreateTokenAccount(
  payer,
  recipient.publicKey,
  false, // allowOwnerOffCurve
  "confirmed", // commitment
  { skipPreflight: true } // options
);
```

### Transferring Tokens

The SDK provides a seamless way to transfer tokens that is fully compatible with Token-2022 extensions:

```typescript
// Basic token transfer
const transferAmount = BigInt(100_000_000_000); // 100 tokens with 9 decimals

const { instructions: transferInstructions } = await token.createTransferInstructions(
  sourceTokenAddress,
  destinationTokenAddress,
  owner.publicKey, // authority
  transferAmount,
  9, // decimals
  {
    memo: "Basic token transfer", // Optional memo
    createDestinationIfNeeded: true, // Create destination account if it doesn't exist
    allowOwnerOffCurve: false, // Allow non-ed25519 destination owners
  }
);

// Create and send transaction
const transaction = new Transaction().add(...transferInstructions);
// Sign and send transaction...
```

### Burning Tokens

Burning tokens permanently reduces the token supply:

```typescript
// Burn tokens
const burnAmount = BigInt(200_000_000_000); // 200 tokens with 9 decimals

const { instructions: burnInstructions } = token.createBurnInstructions(
  ownerTokenAddress,
  owner.publicKey, // authority
  burnAmount,
  9 // decimals
);

// Create and send transaction
const burnTransaction = new Transaction().add(...burnInstructions);
// Sign and send transaction...
```

## Working with Token Extensions

### TransferFee Extension

When transferring tokens with the TransferFee extension, fees are automatically calculated and handled:

```typescript
// The same transfer method works with tokens that have TransferFee extension
// Fees will be automatically calculated and withheld according to the token's configuration
const { instructions: feeTransferInstructions } = await token.createTransferInstructions(
  sourceTokenAddress,
  destinationTokenAddress,
  owner.publicKey,
  transferAmount,
  9
);
```

### PermanentDelegate Extension

The PermanentDelegate extension allows a designated address to transfer tokens from any holder's account:

```typescript
// Transfer as permanent delegate
const { instructions: delegateTransferInstructions } = await token.createPermanentDelegateTransferInstructions(
  sourceTokenAddress,
  destinationTokenAddress,
  permanentDelegate.publicKey, // must be the permanent delegate
  transferAmount,
  {
    memo: "Transfer by permanent delegate",
    createDestinationIfNeeded: true,
    decimals: 9,
    allowOwnerOffCurve: true,
    verifySourceBalance: true // Check if source has enough tokens before sending
  }
);
```

## Complete Example

Here's a complete example of creating a token with extensions, minting, transferring, and burning:

```typescript
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  TokenBuilder,
  Token,
  MintCloseAuthorityExtension 
} from 'token-extensions-boost';

// Connect to Solana
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// 1. Create token with extensions
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(9, payer.publicKey)
  .addTokenMetadata(
    "Example Token",
    "XMPL",
    "https://example.com/token.json",
    { "description": "Example token for demonstration" }
  )
  .addTransferFee(
    100, // 1% fee
    BigInt(1000000000), // Max fee: 1 token
    payer.publicKey,
    payer.publicKey
  )
  .addPermanentDelegate(payer.publicKey);

const { mint, signers } = await tokenBuilder.createToken(payer);

// 2. Create token instance
const token = new Token(connection, mint);

// 3. Create token accounts
const userTokenAccount = await token.getOrCreateTokenAccount(
  payer,
  user.publicKey
);

const recipientTokenAccount = await token.getOrCreateTokenAccount(
  payer,
  recipient.publicKey
);

// 4. Mint tokens to user
const mintAmount = BigInt(1000_000_000_000); // 1000 tokens
await token.mintTo(
  userTokenAccount.address,
  payer,
  mintAmount
);

// 5. Transfer tokens (with fee automatically handled)
const transferAmount = BigInt(100_000_000_000); // 100 tokens
const { instructions: transferInstructions } = await token.createTransferInstructions(
  userTokenAccount.address,
  recipientTokenAccount.address,
  user.publicKey,
  transferAmount,
  9
);

const transferTransaction = new Transaction().add(...transferInstructions);
await sendAndConfirmTransaction(connection, transferTransaction, [user]);

// 6. Burn tokens
const burnAmount = BigInt(50_000_000_000); // 50 tokens
const { instructions: burnInstructions } = token.createBurnInstructions(
  userTokenAccount.address,
  user.publicKey,
  burnAmount,
  9
);

const burnTransaction = new Transaction().add(...burnInstructions);
await sendAndConfirmTransaction(connection, burnTransaction, [user]);

// 7. Transfer as permanent delegate
const delegateAmount = BigInt(10_000_000_000); // 10 tokens
const { instructions: delegateInstructions } = await token.createPermanentDelegateTransferInstructions(
  recipientTokenAccount.address,
  userTokenAccount.address,
  payer.publicKey, // permanent delegate
  delegateAmount,
  { decimals: 9 }
);

const delegateTransaction = new Transaction().add(...delegateInstructions);
await sendAndConfirmTransaction(connection, delegateTransaction, [payer]);
```

## Best Practices

1. **Check Balances**: Always verify token balances before operations to ensure sufficient funds.

2. **Error Handling**: Implement proper error handling for transaction failures.

3. **Decimal Handling**: Be consistent with decimal places in amount calculations.

4. **Transaction Confirmation**: Wait for transaction confirmations before proceeding with dependent operations.

5. **Fee Awareness**: Be aware of transfer fees when calculating amounts to send.

## Common Errors and Solutions

### "Insufficient funds"
- **Cause**: Attempting to transfer or burn more tokens than available
- **Solution**: Check balance before operation or handle the error gracefully

### "Missing authority signature"
- **Cause**: The transaction is not signed by the token account owner
- **Solution**: Ensure the owner signs the transaction

### "Account not initialized"
- **Cause**: Trying to transfer to a non-existent token account
- **Solution**: Use `createDestinationIfNeeded: true` in transfer options

## Complete Example Code

A complete example implementation is available in the examples directory:
- [Basic Burn and Transfer Example](../examples/basic-burn-transfer/index.ts)

## Related Guides

- [Metadata Extension](./metadata.md) - Add metadata to your tokens
- [TransferFee Extension](./transfer-fee.md) - Add fees to token transfers
- [PermanentDelegate Extension](./permanent-delegate.md) - Delegate authority for token operations