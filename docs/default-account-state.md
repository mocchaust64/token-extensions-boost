# DefaultAccountState Extension Guide

## Overview

The DefaultAccountState extension allows token issuers to set a default state for all newly created token accounts. This provides greater control over token distribution and access by automatically configuring new token accounts to be either in an `Initialized` or `Frozen` state.

## Key Features

- **Default Frozen Accounts**: Configure your token to have all new accounts created in a `Frozen` state by default
- **Controlled Distribution**: Require explicit authorization before users can transfer tokens
- **Compliance Controls**: Implement KYC or other verification requirements before enabling token transfers
- **Thawing Mechanism**: Maintain ability to thaw (unfreeze) accounts after verification

## Use Cases

- **Regulated Assets**: Ensure only verified wallets can hold or transfer tokens
- **KYC-Required Tokens**: Freeze accounts until KYC verification is completed
- **Controlled Token Distribution**: Prevent secondary transfers until certain conditions are met
- **Compliance with Regulations**: Comply with regulatory requirements for controlled distribution

## Creating a Token with DefaultAccountState

### Frozen Default State

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { TokenBuilder } from 'token-extensions-boost';
import { AccountState } from '@solana/spl-token';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Initialize token builder
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    9, // decimals
    mintAuthority.publicKey, // mint authority
    freezeAuthority.publicKey // freeze authority (required for DefaultAccountState)
  )
  // Add metadata (optional)
  .addTokenMetadata(
    "Frozen By Default Token",
    "FROZ",
    "https://example.com/metadata.json",
    { "description": "Token with DefaultAccountState.Frozen" }
  )
  // Set default state as Frozen
  .addDefaultAccountState(AccountState.Frozen);

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

### Initialized Default State

```typescript
// Initialize token builder with Initialized state
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    9, // decimals
    mintAuthority.publicKey,
    freezeAuthority.publicKey
  )
  // Set default state as Initialized (same as normal tokens)
  .addDefaultAccountState(AccountState.Initialized);
```

## Unfreezing (Thawing) Token Accounts

When accounts are created in a frozen state, they need to be thawed before tokens can be transferred:

```typescript
import { thawAccount, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Thaw a frozen token account
await thawAccount(
  connection,
  payer, // Transaction fee payer
  tokenAccountAddress, // Address of token account to thaw
  mintAddress, // Token mint
  freezeAuthority, // Freeze authority of the token
  [], // Additional signers (if needed)
  { commitment: 'confirmed' }, // Confirmation options
  TOKEN_2022_PROGRAM_ID // Token-2022 program ID
);
```

## Updating the Default State

The freeze authority can update the default state of a token after creation:

```typescript
import { updateDefaultAccountState, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Update default account state for new token accounts
await updateDefaultAccountState(
  connection,
  payer, // Transaction fee payer
  mintAddress, // Mint to modify
  AccountState.Initialized, // New state for future accounts (or AccountState.Frozen)
  freezeAuthority, // Freeze authority
  [], // Additional signers (if needed)
  { commitment: 'confirmed' }, // Confirmation options
  TOKEN_2022_PROGRAM_ID // Token-2022 program ID
);
```

## Important Considerations

1. **Freeze Authority Required**: A freeze authority must be specified when creating a token with the DefaultAccountState extension.

2. **Existing Token Accounts**: Changing the default state only affects new token accounts, not existing ones.

3. **Backwards Compatibility**: DefaultAccountState works with both Token-2022 and legacy wallets, but legacy wallets won't automatically know that accounts are frozen.

4. **Transaction Failures**: Attempting to transfer tokens from a frozen account will result in transaction failures with the error message "Account is frozen".

5. **Extension Compatibility**: DefaultAccountState is compatible with most other token extensions.

## Common Errors and Solutions

### "Missing freeze authority"
- **Cause**: The token was created without a freeze authority.
- **Solution**: Always specify a freeze authority when creating a token with DefaultAccountState.

### "Account is frozen"
- **Cause**: Attempting to transfer tokens from a frozen account.
- **Solution**: The freeze authority must thaw the account before transfers can occur.

### "Authority mismatch"
- **Cause**: The account trying to thaw or update default state is not the freeze authority.
- **Solution**: Use the correct freeze authority for these operations.

## Complete Example

A complete example is available in the examples directory:
- [Default Account State Example](../examples/default-account-state/default-state-example.ts)

## Related Extensions

- [PermanentDelegate](./permanent-delegate.md) - Creates a permanent delegate authority for the token
- [TransferFeeConfig](./transfer-fee.md) - Adds transfer fees to token transactions
- [MintCloseAuthority](./mint-close-authority.md) - Enables closing the mint account when no longer needed 