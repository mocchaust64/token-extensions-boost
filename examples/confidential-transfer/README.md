# Confidential Transfer Token Extension

This example demonstrates how to use `ConfidentialTransferToken` from the SDK to create and manage tokens with confidential transfer capabilities.

## Key Features

- Creating tokens with Confidential Transfer extension
- Setting up accounts for confidential transfers
- Minting tokens with confidential amounts
- Performing transfers without disclosing amounts

## How to Run the Example

```bash
# Install dependencies
npm install

# Run the example
npx ts-node index.ts
```

## Code Explanation

The `index.ts` file demonstrates the basic process:
1. Creating a token with the extension that enables confidential transfers
2. Configuring accounts for both sender and recipient
3. Minting tokens to the sender
4. Performing confidential transfers between accounts

## Key APIs

```typescript
// Create a new token with confidential transfer extension
const { mint, token } = await new TokenBuilder(connection)
  .setTokenInfo(9, payer.publicKey)
  .addConfidentialTransfer(true)
  .createToken(payer);

const confidentialToken = new ConfidentialTransferToken(connection, mint);

// Configure an account for confidential transfers
await confidentialToken.configureAccount(
  payer, // transaction fee payer
  accountOwner // owner of the account
);

// Mint tokens with confidential amount
await confidentialToken.mintToConfidential(
  payer,
  mintAuthority,
  destinationAccount,
  amount
);

// Perform a confidential transfer
await confidentialToken.confidentialTransfer(
  payer,
  sourceAccount,
  destinationAccount,
  owner,
  amount
);

// Check if an account is configured for confidential transfers
const isConfigured = await confidentialToken.isConfiguredForConfidentialTransfers(tokenAccount);
```

## Important Notes

This example only demonstrates the API on a simplified implementation. In real-world environments, confidential transfers require advanced cryptographic techniques such as Zero-Knowledge Proofs, Bulletproofs, or zk-SNARKs.

Note: The confidential transfer implementation in SPL Token 2022 is still in development and may not be fully supported by all wallets and explorers. 