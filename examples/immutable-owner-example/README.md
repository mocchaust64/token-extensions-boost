# Immutable Owner Token Account Example

This directory contains examples of how to use the Immutable Owner Extension for token accounts in SPL Token 2022. This extension ensures that the owner of a token account cannot be changed after creation.

## Use Cases

Immutable owner accounts are useful for:
- Enhanced security against account takeovers
- DeFi applications requiring permanent account ownership
- Escrow services with guaranteed owner identity
- Preventing certain types of phishing attacks

## Key Features

- Creating token accounts with immutable owner extension
- Demonstrating the difference between standard and immutable owner accounts
- Showing how ownership change is prevented

## How to Run the Example

```bash
# Install dependencies
npm install

# Run the example
npx ts-node token-account-immutable.ts
```

## Code Explanation

The `token-account-immutable.ts` file demonstrates:
1. Creating a standard token account (owner can be changed)
2. Creating a token account with immutable owner (owner cannot be changed)
3. Creating an Associated Token Account (which automatically has immutable owner)
4. Demonstrating the difference in behavior when trying to change owners

## Key APIs

```typescript
// Create a TokenAccount instance
const tokenAccount = new TokenAccount(connection, mint, owner.publicKey);

// Create a standard token account (owner can be changed)
const { tokenAccount: standardAccount } = await tokenAccount.createAccount(payer);

// Create a token account with immutable owner
const { tokenAccount: immutableAccount } = await tokenAccount.createAccountWithImmutableOwner(payer);

// Create an Associated Token Account (automatically has immutable owner)
const { tokenAccount: associatedAccount } = await tokenAccount.createAssociatedTokenAccount(payer);
```

## Important Notes

- Associated Token Accounts (ATAs) automatically have the immutable owner extension
- Once an account is created with an immutable owner, any attempt to change the owner will fail
- The immutable owner property is enforced at the protocol level by the Token 2022 program
- This extension applies to token accounts, not to the token mint itself 