# Non-Transferable Token Extension

This directory contains examples of how to use the Non-Transferable Extension from SPL Token 2022. Non-transferable tokens, also known as "soulbound tokens," cannot be transferred once received by an account.

## Use Cases

Non-transferable tokens are useful for:
- Credentials and certificates
- Soulbound tokens 
- Badges and achievements
- Membership tokens
- Identity tokens

## Key Features

- Creating tokens with the non-transferable extension
- Minting non-transferable tokens to accounts
- Demonstration of transfer restrictions

## How to Run the Example

```bash
# Install dependencies
npm install

# Run the example
npx ts-node create-non-transferable-token.ts
```

## Code Explanation

The `create-non-transferable-token.ts` file demonstrates the basic process:
1. Creating a token with the non-transferable extension
2. Creating a recipient token account
3. Minting tokens to the recipient
4. Demonstrating that tokens cannot be transferred (fails with an error)

## Key APIs

```typescript
// Create a new token with non-transferable extension
const { mint } = await new TokenBuilder(connection)
  .setTokenInfo(9, payer.publicKey)
  .addNonTransferable()
  .createToken(payer);

const nonTransferableToken = new NonTransferableToken(connection, mint);

// Mint tokens to an account
// Note: After minting, these tokens cannot be transferred
```

## Important Notes

- Once a token is received in an account, it cannot be transferred to any other account
- Non-transferable tokens are not compatible with certain other extensions like TransferFee and TransferHook
- The non-transferable property is enforced at the protocol level and cannot be bypassed 