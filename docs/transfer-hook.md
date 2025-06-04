# TransferHook Extension Guide

## Overview

The TransferHook extension enables token creators to execute custom logic whenever tokens are transferred. This powerful extension allows a specified program to be called during every token transfer, enabling advanced functionality like complex fee structures, whitelist verification, compliance checks, and other custom behaviors without modifying the token program itself.

## Key Features

- **Custom Program Execution**: Execute a specified program during every token transfer
- **Programmable Token Transfers**: Enable complex logic and validation rules
- **Extensible Framework**: Create custom business rules and behaviors
- **Extra Accounts**: Support for passing additional accounts to the hook program
- **Composable Design**: Can be combined with other token extensions
- **On-Chain Verification**: Enforce rules directly on-chain at transfer time

## Use Cases

- **Compliance & KYC**: Enforce KYC/AML requirements for token transfers
- **Whitelist/Blacklist**: Restrict transfers to/from specific addresses
- **Royalty Enforcement**: Enforce royalty payments for NFTs or creator tokens
- **Dynamic Fees**: Implement complex fee structures based on transfer parameters
- **Transfer Logging**: Record all transfers to a separate database or analytics system
- **Cross-Program Interactions**: Trigger actions in other programs when tokens move
- **Conditional Transfers**: Add conditional logic to token transfers

## Creating a Token with TransferHook

```typescript
import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TokenBuilder } from 'token-extensions-boost';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// The transfer hook program is your custom on-chain program
// that implements the transfer hook interface
const transferHookProgramId = new PublicKey("Your_Deployed_Hook_Program_ID");

// Initialize token builder
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    6, // decimals
    mintAuthority.publicKey // mint authority
  )
  // Add metadata (optional)
  .addTokenMetadata(
    "Hook Token",
    "HOOK",
    "https://example.com/token-metadata.json",
    { "description": "A token with transfer hook" }
  )
  // Add transfer hook extension
  .addTransferHook(transferHookProgramId);

// Get instructions to create token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);

// Create and send transaction
const transaction = new Transaction().add(...instructions);
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [payer, ...signers]
);

console.log(`Token with TransferHook created: ${mint.toString()}`);
```

## Creating a TransferHookToken Instance

The SDK provides a dedicated `TransferHookToken` class for working with tokens that have the transfer hook extension:

```typescript
import { TransferHookToken } from 'token-extensions-boost';

// Create a TransferHookToken instance from an existing mint
const transferHookToken = new TransferHookToken(
  connection,
  mint,
  transferHookProgramId
);

// Get the transfer hook program ID
const hookProgramId = await transferHookToken.getTransferHookProgramId();
console.log(`This token uses hook program: ${hookProgramId.toString()}`);
```

## Transferring Tokens with a Hook

When transferring tokens with a TransferHook extension, the hook program will be called automatically:

```typescript
// Create recipient token account if it doesn't exist
const { address: recipientTokenAccount } = await transferHookToken.createOrGetTokenAccount(
  payer,
  recipient.publicKey
);

// Create transfer instruction
const transferInstruction = transferHookToken.createTransferInstruction(
  sourceTokenAccount,
  recipientTokenAccount,
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

console.log(`Transferred ${transferAmount} tokens with hook program execution`);
```

## Working with Extra Account Metas

Transfer hook programs may require additional accounts. You can include these in your transfers:

```typescript
// Example of providing extra accounts to the transfer hook
const extraAccounts = [
  {
    pubkey: configAccount.publicKey,
    isSigner: false,
    isWritable: false
  },
  {
    pubkey: dataAccount.publicKey,
    isSigner: false, 
    isWritable: true
  }
];

// Create transfer instruction with extra accounts
const transferInstruction = transferHookToken.createTransferInstructionWithExtraAccounts(
  sourceTokenAccount,
  recipientTokenAccount,
  ownerPublicKey,
  transferAmount,
  6, // decimals
  extraAccounts
);

// Create and send transaction as usual
// ...
```

## Creating and Managing Extra Account Meta List

To configure which additional accounts your hook program needs:

```typescript
import { createInitializeExtraAccountMetaListInstruction, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { findExtraAccountMetaListAddress } from 'token-extensions-boost';

// Find the PDA for the extra account meta list
const [extraAccountMetaListPDA] = findExtraAccountMetaListAddress(
  mint,
  transferHookProgramId
);

// Define the extra accounts needed by your hook program
const extraAccounts = [
  {
    pubkey: configAccount.publicKey,
    isSigner: false,
    isWritable: false
  },
  {
    pubkey: logAccount.publicKey,
    isSigner: false,
    isWritable: true
  }
];

// Create instruction to initialize the extra account meta list
const initializeInstruction = createInitializeExtraAccountMetaListInstruction(
  mint,
  payer.publicKey,
  transferHookProgramId,
  extraAccounts,
  TOKEN_2022_PROGRAM_ID
);

// Create and send transaction
const transaction = new Transaction().add(initializeInstruction);
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [payer]
);

console.log(`Extra account meta list initialized: ${extraAccountMetaListPDA.toString()}`);
```

## Implementing a Transfer Hook Program

The transfer hook program must implement the SPL Token-2022 Transfer Hook interface:

```rust
// Rust example of a transfer hook program interface
#[program]
pub mod transfer_hook_example {
    use super::*;
    
    pub fn process_transfer_hook(
        ctx: Context<ProcessTransferHook>,
        amount: u64,
        source_expected_decimals: u8,
        mint_expected_decimals: u8,
        destination_expected_decimals: u8,
    ) -> Result<()> {
        // Hook code executed during transfers
        // You can:
        // - Check conditions
        // - Update state
        // - Perform additional actions
        // - Return an error to fail the transfer
        
        // Example: Only allow transfers to whitelisted accounts
        let whitelist = &ctx.accounts.whitelist;
        let is_whitelisted = whitelist.is_address_whitelisted(&ctx.accounts.destination_owner.key());
        
        if !is_whitelisted {
            return Err(ProgramError::Custom(1).into());
        }
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ProcessTransferHook<'info> {
    /// The mint of the token being transferred
    pub mint: Account<'info, Mint>,
    /// The source account of the transfer
    pub source: Account<'info, TokenAccount>,
    /// The destination account of the transfer
    pub destination: Account<'info, TokenAccount>,
    /// The owner of the source account
    pub source_owner: AccountInfo<'info>,
    /// The owner of the destination account
    pub destination_owner: AccountInfo<'info>,
    /// Additional account: Whitelist program account
    pub whitelist: Account<'info, Whitelist>,
    /// The token program
    pub token_program: Program<'info, Token2022>,
}
```

## Important Considerations

1. **Program Deployment**: You must deploy your transfer hook program before creating tokens that use it.

2. **Execution Context**: The hook executes in a separate program context and has its own permissions.

3. **Transaction Fees**: The caller of the transfer pays for the execution of the hook program.

4. **Testing**: Thoroughly test your hook program to ensure it works as expected and doesn't fail legitimate transfers.

5. **Immutability**: Once set, the hook program cannot be changed for existing tokens.

6. **Extra Accounts**: Extra accounts must be properly initialized and maintained.

7. **Wallet Compatibility**: Not all wallets support transfer hooks yet; check compatibility.

## Querying Transfer Hook Information

To check if a token has a transfer hook and which program it uses:

```typescript
import { getMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Get mint account data
const mintInfo = await getMint(
  connection,
  mintAddress,
  'confirmed',
  TOKEN_2022_PROGRAM_ID
);

// Check if the token has a transfer hook
if (mintInfo.transferHookProgramId) {
  console.log(`Token has transfer hook: ${mintInfo.transferHookProgramId.toString()}`);
} else {
  console.log("Token does not have a transfer hook");
}
```

## Combining with Other Extensions

TransferHook works well with many other extensions:

### TransferHook + Metadata + NonTransferable (for credential tokens)

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(6, payer.publicKey)
  .addTokenMetadata(
    "Credential Token",
    "CRED",
    "https://example.com/credential-token.json",
    { 
      "type": "credential",
      "issuer": "Example Organization"
    }
  )
  .addNonTransferable()
  .addTransferHook(credentialVerificationProgramId);
```

### TransferHook + TransferFee (for complex marketplace fees)

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(6, payer.publicKey)
  .addTokenMetadata(
    "Advanced Fee Token",
    "AFEE",
    "https://example.com/advanced-fee-token.json",
    { "type": "marketplace" }
  )
  .addTransferFee(
    100, // 1% base fee
    BigInt(10_000_000), // max fee of 10 tokens
    feeAuthority.publicKey,
    withdrawAuthority.publicKey
  )
  .addTransferHook(advancedFeeLogicProgramId);
```

## Complete Examples

Complete examples of creating and using tokens with the transfer hook extension are available in the examples directory:
- [Basic Transfer Hook Example](../examples/transfer-hook/index.ts)
- [Combined Extensions Example](../examples/multi-extension-example/metadata-with-extensions-example.ts)

## Related Extensions

- [TransferFee](./transfer-fee.md) - Add fixed-rate fees to token transfers
- [PermanentDelegate](./permanent-delegate.md) - Allow an authority to transfer tokens from any account
- [DefaultAccountState](./default-account-state.md) - Set default state for token accounts 