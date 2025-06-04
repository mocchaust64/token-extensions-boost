# TransferFee Extension Guide

## Overview

The TransferFee extension allows token creators to automatically collect fees whenever the token is transferred. This extension adds the capability to specify a fee rate (basis points) and maximum fee amount that will be withheld from each transfer and can later be claimed by a designated fee recipient.

## Key Features

- **Automatic Fee Collection**: Fees are automatically calculated and withheld during each transfer
- **Configurable Fee Structure**: Set fee percentage (basis points) and maximum fee amount
- **Fee Management**: Specialized methods for harvesting withheld fees and withdrawing them
- **Fee Authority**: Designated authorities for fee configuration and withdrawal
- **Transparent Fee Display**: Clear indication of fees in token accounts

## Use Cases

- **Protocol Revenue**: Generate sustainable revenue for protocol operations and development
- **DAO Treasury**: Fund community-governed treasuries through token transaction activity
- **Creator Royalties**: Implement royalties for token creators on secondary transfers
- **Marketplace Fees**: Enable decentralized marketplaces to collect transaction fees
- **Liquidity Provider Rewards**: Distribute fees to liquidity providers in DeFi protocols
- **Deflationary Mechanisms**: Burn a portion of fees to create deflationary token economics

## Creating a Token with TransferFee

```typescript
import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TokenBuilder } from 'token-extensions-boost';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Initialize token builder
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    6, // decimals
    mintAuthority.publicKey // mint authority
  )
  // Add token metadata (optional)
  .addTokenMetadata(
    "Fee Token",
    "FEE",
    "https://example.com/token-metadata.json",
    { "description": "A token with transfer fee" }
  )
  // Add transfer fee extension
  .addTransferFee(
    100, // 1% fee (100 basis points)
    BigInt(10_000_000), // max fee of 10 tokens (with 6 decimals)
    feeConfigAuthority.publicKey, // authority that can change fee settings
    withdrawAuthority.publicKey // authority that can withdraw collected fees
  );

// Get instructions to create token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);

// Create and send transaction
const transaction = new Transaction().add(...instructions);
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [payer, ...signers]
);

console.log(`Token created: ${mint.toString()}`);
```

## Creating a TransferFeeToken Instance

The SDK provides a dedicated `TransferFeeToken` class for working with tokens that have the transfer fee extension:

```typescript
import { TransferFeeToken } from 'token-extensions-boost';

// Create a TransferFeeToken instance from an existing mint
const transferFeeToken = new TransferFeeToken(
  connection,
  mint,
  {
    feeBasisPoints: 100, // 1% fee
    maxFee: BigInt(10_000_000), // max fee of 10 tokens (with 6 decimals)
    transferFeeConfigAuthority: feeConfigAuthority.publicKey,
    withdrawWithheldAuthority: withdrawAuthority.publicKey
  }
);

// Calculate fee for a specific amount
const transferAmount = BigInt(500_000_000); // 500 tokens (with 6 decimals)
const fee = transferFeeToken.calculateFee(transferAmount);
console.log(`Fee for ${transferAmount} would be ${fee}`);
```

## Transferring Tokens with Fees

When transferring tokens with the TransferFee extension, fees are automatically calculated and withheld:

```typescript
// Create a transfer instruction
const transferInstruction = transferFeeToken.createTransferInstruction(
  sourceTokenAccount,
  destinationTokenAccount,
  ownerPublicKey,
  transferAmount,
  6 // decimals
);

// Create and send transaction
const transferTransaction = new Transaction().add(transferInstruction);
const signature = await sendAndConfirmTransaction(
  connection,
  transferTransaction,
  [owner] // owner must sign the transaction
);

console.log(`Transferred ${transferAmount} tokens with fee ${fee}`);
```

## Harvesting and Withdrawing Fees

Fees are initially withheld in the destination account and need to be collected in two steps:

### 1. Harvest Fees from Accounts to the Mint

```typescript
// Find accounts with withheld fees
const accountsWithFees = await transferFeeToken.findAccountsWithWithheldFees();

// Create harvest instruction
const harvestInstruction = transferFeeToken.createHarvestWithheldTokensToMintInstruction(
  accountsWithFees
);

// Create and send transaction
const harvestTransaction = new Transaction().add(harvestInstruction);
const harvestSignature = await sendAndConfirmTransaction(
  connection,
  harvestTransaction,
  [payer]
);

console.log(`Harvested fees to mint`);
```

### 2. Withdraw Fees from Mint to Recipient

```typescript
// Create recipient token account if it doesn't exist
const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  mint,
  recipientPublicKey,
  false,
  "confirmed",
  { skipPreflight: true },
  TOKEN_2022_PROGRAM_ID
);

// Create withdraw instruction
const withdrawInstruction = transferFeeToken.createWithdrawFeesFromMintInstruction(
  recipientTokenAccount.address,
  withdrawAuthority.publicKey
);

// Create and send transaction
const withdrawTransaction = new Transaction().add(withdrawInstruction);
const withdrawSignature = await sendAndConfirmTransaction(
  connection,
  withdrawTransaction,
  [withdrawAuthority] // withdraw authority must sign
);

console.log(`Fees withdrawn to ${recipientTokenAccount.address.toString()}`);
```

## Managing Multiple Accounts with Fees

For applications with many accounts, you can batch process fees:

```typescript
// Find all accounts with withheld fees
const accountsWithFees = await transferFeeToken.findAccountsWithWithheldFees();
console.log(`Found ${accountsWithFees.length} accounts with withheld fees`);

// Harvest fees from all accounts at once (up to transaction size limit)
const harvestInstruction = transferFeeToken.createHarvestWithheldTokensToMintInstruction(
  accountsWithFees.slice(0, 10) // Process in batches if needed
);

// Process the harvest transaction
// ... (similar to above)
```

## Important Considerations

1. **Fee Calculation**: Fees are calculated as a percentage of the transfer amount, with a maximum cap.

2. **Account Storage**: Fees are initially withheld in the recipient's account and need to be harvested.

3. **Two-Step Collection**: Collecting fees requires both harvesting to the mint and withdrawing to a recipient.

4. **Transaction Size Limits**: When harvesting from many accounts, batch processing may be necessary.

5. **Authority Management**: Keep fee configuration and withdrawal authority keys secure.

## Token Account Information

To check the withheld fees in a token account:

```typescript
import { getAccount, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Get account information
const accountInfo = await getAccount(
  connection,
  tokenAccountAddress,
  'confirmed',
  TOKEN_2022_PROGRAM_ID
);

// Check withheld fees
if (accountInfo.extensions.transferFeeAmount) {
  console.log(`Withheld fees: ${accountInfo.extensions.transferFeeAmount.withheldAmount}`);
}
```

## Changing Fee Parameters

Fee parameters can be updated by the fee configuration authority:

```typescript
import { createTransferFeeConfig, setTransferFee, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Update fee percentage (basis points)
const newFeeInstruction = setTransferFee(
  mint,
  feeConfigAuthority.publicKey,
  [], // multi-signers
  200, // New fee: 2% (200 basis points)
  BigInt(20_000_000) // New max fee: 20 tokens (with 6 decimals)
);

const updateTransaction = new Transaction().add(newFeeInstruction);
// Sign and send transaction...
```

## Combining with Other Extensions

TransferFee works well with many other extensions:

### TransferFee + Metadata (for marketplace tokens)

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(6, payer.publicKey)
  .addTokenMetadata(
    "Marketplace Token",
    "MKTPL",
    "https://example.com/marketplace-token.json",
    { "type": "marketplace", "platform": "Example Marketplace" }
  )
  .addTransferFee(
    200, // 2% fee (200 basis points)
    BigInt(1000_000_000), // max fee (1000 tokens with 6 decimals)
    feeConfigAuthority.publicKey,
    withdrawAuthority.publicKey
  );
```

### TransferFee + DefaultAccountState (for regulated tokens)

```typescript
import { AccountState } from '@solana/spl-token';

const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(6, payer.publicKey, freezeAuthority.publicKey)
  .addTokenMetadata(
    "Regulated Fee Token",
    "REGT",
    "https://example.com/regulated-token.json",
    { "type": "regulated" }
  )
  .addDefaultAccountState(AccountState.Initialized)
  .addTransferFee(
    50, // 0.5% fee (50 basis points)
    BigInt(100_000_000), // max fee (100 tokens with 6 decimals)
    feeConfigAuthority.publicKey,
    withdrawAuthority.publicKey
  );
```

## Complete Examples

Complete examples of creating and using tokens with the transfer fee extension are available in the examples directory:
- [Basic Transfer Fee Example](../examples/transfer-fee/index.ts)
- [Multi-Account Transfer Fee Example](../examples/transfer-fee/multi-account.ts)

## Related Extensions

- [PermanentDelegate](./permanent-delegate.md) - Allow an authority to transfer tokens from any account
- [TransferHook](./transfer-hook.md) - Execute custom code when tokens are transferred
- [Metadata](./metadata.md) - Add metadata to tokens 