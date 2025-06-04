# Immutable Owner Extension Guide

## Overview

The Immutable Owner extension prevents the owner of a token account from being changed after the account is created. This provides enhanced security for token accounts by ensuring that ownership cannot be transferred, even by someone who gains access to the account's authority.

## Use Cases

Immutable owner accounts are particularly useful for:

- **Enhanced Security**: Protect against account takeovers by making ownership permanent
- **DeFi Applications**: Ensure permanent account ownership for lending or staking protocols
- **Escrow Services**: Guarantee owner identity throughout the escrow lifecycle
- **Phishing Prevention**: Prevent certain types of phishing attacks that rely on ownership transfers

## Creating Token Accounts with Immutable Owner

There are three ways to create token accounts with the Immutable Owner extension:

### 1. Create a Token Account with Immutable Owner

```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TokenAccount } from 'token-extensions-boost';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Create a TokenAccount instance
const tokenAccount = new TokenAccount(connection, mint, owner.publicKey);

// Create a token account with immutable owner
const { tokenAccount: immutableAccount } = await tokenAccount.createAccountWithImmutableOwner(payer);

console.log(`Immutable owner token account created: ${immutableAccount.toString()}`);
```

### 2. Create an Associated Token Account (ATA)

Associated Token Accounts automatically have the immutable owner extension:

```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TokenAccount } from 'token-extensions-boost';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Create a TokenAccount instance
const tokenAccount = new TokenAccount(connection, mint, owner.publicKey);

// Create an Associated Token Account (automatically has immutable owner)
const { tokenAccount: associatedAccount } = await tokenAccount.createAssociatedTokenAccount(payer);

console.log(`Associated token account created: ${associatedAccount.toString()}`);
```

### 3. Compare with Standard Account

To understand the difference, here's how to create a standard token account where ownership can be changed:

```typescript
// Create a standard token account (owner can be changed)
const { tokenAccount: standardAccount } = await tokenAccount.createAccount(payer);

console.log(`Standard token account created: ${standardAccount.toString()}`);
```

## Immutable Owner Behavior

When you try to change the owner of an account with the Immutable Owner extension, the operation will fail with an error. This is enforced at the protocol level by the Token 2022 program.

```typescript
// This will fail if attempted on an immutable owner account
try {
  await token.setAuthority(
    immutableAccount,
    AuthorityType.AccountOwner,
    newOwner.publicKey,
    owner,
    []
  );
  console.log("Owner changed successfully"); // This will not execute
} catch (error) {
  console.error("Failed to change owner as expected:", error);
}
```

## Important Considerations

1. **Permanent Decision**: Once an account is created with an immutable owner, the ownership can never be changed.

2. **Associated Token Accounts**: All Associated Token Accounts (ATAs) automatically have the immutable owner extension.

3. **Token 2022 Program**: This extension is part of the Token 2022 program, not the legacy Token program.

4. **Authority vs. Owner**: The account's authority can still be changed - only the owner is immutable.

5. **Account Recovery**: If access to the owner's private key is lost, there is no way to recover the account or change ownership.

## Distinguishing Immutable Owner Accounts

To check if a token account has the immutable owner extension:

```typescript
import { getAccountLen, TOKEN_2022_PROGRAM_ID, getExtensionTypes } from '@solana/spl-token';

// Get token account data
const accountInfo = await connection.getAccountInfo(tokenAccountAddress);

if (accountInfo) {
  // Check if it's a Token 2022 account
  if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    // Get extension types for this account
    const extensionTypes = getExtensionTypes(accountInfo.data);
    
    // Check if ImmutableOwner extension is present
    const hasImmutableOwner = extensionTypes.includes(ExtensionType.ImmutableOwner);
    
    console.log(`Account has immutable owner: ${hasImmutableOwner}`);
  }
}
```

## Complete Example

A complete example of creating and testing immutable owner accounts is available in the examples directory:
- [Immutable Owner Example](../examples/immutable-owner-example/token-account-immutable.ts)

## Related Extensions

- [NonTransferable](./non-transferable.md) - Makes tokens themselves non-transferable
- [PermanentDelegate](./permanent-delegate.md) - Creates a permanent delegate authority for the token
- [DefaultAccountState](./default-account-state.md) - Sets default state for token accounts 