# MintCloseAuthority Extension Guide

This guide explains how to use the MintCloseAuthority extension in the token-extensions-boost SDK to create tokens with the ability to close mint accounts when they are no longer needed.

## Overview

The MintCloseAuthority extension allows a designated authority to close a token's mint account when it's no longer needed. This is useful for:
- Reclaiming rent (SOL) from tokens that are no longer in use
- Cleaning up obsolete token mints from your projects
- Managing temporary or limited-use tokens

## Requirements to Close a Mint Account

Before a mint account can be closed, all of these conditions must be met:
1. The token supply must be zero (no tokens in circulation)
2. The account trying to close the mint must be the designated MintCloseAuthority
3. There must be no token accounts holding the token

## Creating a Token with MintCloseAuthority

To create a token with MintCloseAuthority:

```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TokenBuilder } from 'token-extensions-boost';

// Connect to a Solana cluster
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Create a token builder instance
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    9, // decimals
    payer.publicKey, // mint authority
    null // freeze authority (optional)
  )
  // Add metadata
  .addTokenMetadata(
    "My Token with Close Authority",
    "CLOSE",
    "https://example.com/metadata.json",
    { "description": "Token with MintCloseAuthority" }
  )
  // Add MintCloseAuthority - allows closing the mint account later
  .addMintCloseAuthority(payer.publicKey);

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

// Send transaction
const transactionSignature = await connection.sendRawTransaction(
  transaction.serialize(),
  { skipPreflight: false }
);

// Wait for confirmation
await connection.confirmTransaction({
  signature: transactionSignature,
  blockhash,
  lastValidBlockHeight
});

console.log(`Token created with mint address: ${mint.toBase58()}`);
```

## Closing a Mint Account

After your token is no longer needed and meets the requirements above, you can close the mint account:

```typescript
import { MintCloseAuthorityExtension } from 'token-extensions-boost';
import { Connection, Transaction } from '@solana/web3.js';
import { getMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// First, check if the mint can be closed
const mintInfo = await getMint(
  connection, 
  mint, // mint address
  'confirmed',
  TOKEN_2022_PROGRAM_ID
);

// Verify token supply is 0
if (mintInfo.supply > 0) {
  console.log('Cannot close mint: Token supply is not 0');
  return;
}

// Create close instruction
const closeInstruction = MintCloseAuthorityExtension.createCloseAccountInstruction(
  mint,                // Account to close (mint)
  payer.publicKey,     // Destination for lamports
  payer.publicKey,     // Authority that can close the account
  []                   // Multisig signers (default empty array)
);

// Create and sign transaction
const closeTransaction = new Transaction().add(closeInstruction);
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
closeTransaction.recentBlockhash = blockhash;
closeTransaction.lastValidBlockHeight = lastValidBlockHeight;
closeTransaction.feePayer = payer.publicKey;

// Sign and send transaction
closeTransaction.sign(payer);
const closeSignature = await connection.sendRawTransaction(
  closeTransaction.serialize(),
  { skipPreflight: false }
);

// Wait for confirmation
await connection.confirmTransaction({
  signature: closeSignature,
  blockhash,
  lastValidBlockHeight
});

console.log('Mint account closed successfully!');
```

## Complete Example

A complete example is available in the examples directory:
- [Mint Close Example](../examples/mint-close-example/mint-close-example.ts)

## Common Errors and Solutions

### "Token supply is not 0"
- **Cause**: You cannot close a mint account if there are tokens still in circulation.
- **Solution**: Burn all tokens before attempting to close the mint.

### "Authority mismatch"
- **Cause**: The account trying to close the mint is not the designated MintCloseAuthority.
- **Solution**: Use the correct authority account that was designated when creating the token.

### "Account not a mint account"
- **Cause**: The account is not a valid mint account or may have already been closed.
- **Solution**: Verify the mint address is correct and has not been closed already.

### "Token accounts still exist"
- **Cause**: There are still token accounts associated with this mint.
- **Solution**: Close all token accounts associated with this mint before closing the mint account.

## Additional Notes

- MintCloseAuthority is part of the Token-2022 program, not the legacy Token program
- The MintCloseAuthority can be different from the MintAuthority
- Closing a mint account is permanent and cannot be undone
- Make sure to properly back up any important token information before closing the mint

## Related Extensions

- [PermanentDelegate](./permanent-delegate.md) - Creates a permanent delegate authority for the token
- [TransferFeeConfig](./transfer-fee.md) - Adds transfer fees to token transactions
- [DefaultAccountState](./default-account-state.md) - Sets default account state for token accounts