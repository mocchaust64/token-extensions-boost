# PermanentDelegate Extension Guide

## Overview

The PermanentDelegate extension allows token issuers to designate an authority that can transfer tokens from any holder's account without requiring the holder's consent. This extension provides administrative control and intervention capabilities that can be useful for managed tokens, regulatory compliance, and certain financial applications.

## Key Features

- **Administrative Control**: Delegate can transfer tokens from any account without owner consent
- **Protocol Enforcement**: Authority is enforced at the protocol level and cannot be revoked
- **Full Transfer Rights**: Delegate can move any amount of tokens between any accounts
- **Backward Compatibility**: Works with legacy token accounts and wallets

## Use Cases

- **Regulatory Compliance**: Allow regulatory intervention when required by law
- **Managed Investment Tokens**: Enable portfolio rebalancing by fund managers
- **Educational Tokens**: Allow revoking credentials if requirements are not met
- **Anti-Fraud Systems**: Enable recovery of tokens from compromised accounts
- **Service Tokens**: Allow service providers to adjust token balances based on usage
- **Corporate Treasury Tokens**: Enable central management of tokens across departments

## Creating a Token with PermanentDelegate

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
    "Managed Token",
    "MGTK",
    "https://example.com/token-metadata.json",
    { "type": "managed", "issuer": "Example Financial Services" }
  )
  // Add permanent delegate
  .addPermanentDelegate(delegatePublicKey);

// Get instructions to create token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);

// Create and send transaction
const transaction = new Transaction().add(...instructions);
// (Sign and send transaction - code omitted for brevity)

console.log(`Token with permanent delegate created: ${mint.toBase58()}`);
```

## Creating a PermanentDelegateToken Instance

The SDK provides a dedicated `PermanentDelegateToken` class for working with tokens that have the permanent delegate extension:

```typescript
import { PermanentDelegateToken } from 'token-extensions-boost';

// Create a PermanentDelegateToken instance from an existing mint
const permanentDelegateToken = new PermanentDelegateToken(
  connection, 
  mint, 
  delegatePublicKey // optional, can be fetched from the mint if not provided
);

// Check if an address is the permanent delegate
const isDelegate = await permanentDelegateToken.isPermanentDelegate(address);

// Get the permanent delegate address
const delegate = await permanentDelegateToken.getPermanentDelegate();
```

## Transferring Tokens as Permanent Delegate

The permanent delegate can transfer tokens from any holder's account:

```typescript
import { createTransferCheckedInstruction, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Create transfer instruction using permanent delegate authority
const transferInstruction = createTransferCheckedInstruction(
  sourceTokenAccount,     // source account (can be any holder's account)
  mint,                   // mint address
  destinationTokenAccount, // destination account
  delegatePublicKey,      // authority (delegate)
  transferAmount,         // amount to transfer
  decimals,               // token decimals
  [],                     // additional signers
  TOKEN_2022_PROGRAM_ID   // program ID
);

// Create and send transaction
const transaction = new Transaction().add(transferInstruction);
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [delegateKeypair] // delegate must sign the transaction
);

console.log(`Transferred tokens using permanent delegate authority: ${signature}`);
```

## Important Considerations

1. **Powerful Authority**: The permanent delegate has complete authority to move tokens from any account.

2. **Cannot Be Revoked**: Once set, the permanent delegate cannot be changed or removed.

3. **Transparency**: Users should be clearly informed if a token has a permanent delegate.

4. **Security Implications**: The permanent delegate keypair should be highly secured, potentially with multi-signature or hardware wallet protection.

5. **Disclosure Requirements**: Token issuers should disclose the existence and purpose of the permanent delegate in their documentation.

## Verifying PermanentDelegate Status

You can check if a token has a permanent delegate and who it is:

```typescript
import { getMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Get mint account data
const mintInfo = await getMint(
  connection,
  mintAddress,
  'confirmed',
  TOKEN_2022_PROGRAM_ID
);

// Check if the token has a permanent delegate
if (mintInfo.permanentDelegate) {
  console.log(`Token has permanent delegate: ${mintInfo.permanentDelegate.toString()}`);
} else {
  console.log("Token does not have a permanent delegate");
}
```

## Security Best Practices

When using the PermanentDelegate extension:

1. **Multi-Signature Control**: Consider using a multi-signature wallet as the permanent delegate.

2. **Transparent Disclosure**: Clearly disclose the existence and powers of the permanent delegate to token holders.

3. **Documented Policies**: Create clear policies about when and how the permanent delegate authority will be used.

4. **Audit Trail**: Maintain detailed records of all permanent delegate transactions.

5. **Secure Key Management**: Use hardware security modules or custodial solutions for delegate key storage.

## Combining with Other Extensions

PermanentDelegate works well with many other extensions:

### PermanentDelegate + InterestBearing (for managed savings tokens)

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(6, payer.publicKey)
  .addTokenMetadata(
    "Managed Savings Token",
    "SAVE",
    "https://example.com/savings-token.json",
    { "type": "savings" }
  )
  .addInterestBearing(
    200, // 2% interest rate (basis points)
    rateAuthority.publicKey
  )
  .addPermanentDelegate(managerPublicKey);
```

### PermanentDelegate + TransferFee (for regulated tokens)

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(6, payer.publicKey)
  .addTokenMetadata(
    "Regulated Token",
    "REGTK",
    "https://example.com/regulated-token.json",
    { "type": "regulated" }
  )
  .addTransferFee(
    50, // 0.5% fee (basis points)
    BigInt(500000), // max fee (0.5 token with 6 decimals)
    payer.publicKey, // fee authority
    feeRecipient.publicKey // fee recipient
  )
  .addPermanentDelegate(regulatorPublicKey);
```

## Complete Example

A complete example of creating and using tokens with the permanent delegate extension is available in the examples directory:
- [Permanent Delegate Example](../examples/permanent-delegate/index.ts)

## Related Extensions

- [DefaultAccountState](./default-account-state.md) - Set default state for token accounts
- [NonTransferable](./non-transferable.md) - Creates non-transferable tokens
- [TransferFee](./transfer-fee.md) - Adds transfer fees to token transactions 