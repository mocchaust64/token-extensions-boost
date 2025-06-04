# Token Freeze & DefaultAccountState Extension Guide

## Overview

The Token Freeze extension allows token issuers to freeze and unfreeze individual token accounts, temporarily preventing transfers from those accounts. Combined with the DefaultAccountState extension, issuers can also set the default frozen state for all newly created accounts. These extensions provide essential tools for regulatory compliance, asset protection, and controlled token ecosystems.

## Key Features

- **Account Freezing**: Freeze individual token accounts to prevent transfers
- **Account Thawing**: Unfreeze previously frozen accounts to re-enable transfers
- **Default Account State**: Set all new token accounts to be initially frozen or unfrozen
- **Freeze Authority**: Designated authority with exclusive rights to freeze/thaw accounts
- **State Change Authority**: Optional authority to update the default account state
- **Backward Compatibility**: Works with existing wallets and applications

## Use Cases

- **Regulatory Compliance**: Temporarily freeze accounts subject to regulatory action
- **Risk Mitigation**: Freeze potentially compromised accounts
- **Staged Token Distributions**: Control when tokens become transferable
- **KYC/AML Enforcement**: Require verification before enabling transfers
- **Emergency Response**: Quick response to security incidents
- **Controlled Ecosystems**: Create token ecosystems where transfers are permissioned
- **Vesting Programs**: Control token release schedules by thawing accounts at specific times

## Creating a Token with DefaultAccountState

```typescript
import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TokenBuilder } from 'token-extensions-boost';
import { AccountState } from '@solana/spl-token';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Initialize token builder
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    6, // decimals
    mintAuthority.publicKey, // mint authority
    freezeAuthority.publicKey // freeze authority (required for freeze/thaw operations)
  )
  // Add token metadata (optional)
  .addTokenMetadata(
    "Frozen Token",
    "FRZT",
    "https://example.com/token-metadata.json",
    { "description": "A token with freeze capabilities" }
  )
  // Set default state for new accounts (Frozen or Initialized)
  .addDefaultAccountState(AccountState.Frozen);

// Get instructions to create token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);

// Create and send transaction
const transaction = new Transaction().add(...instructions);
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [payer, ...signers]
);

console.log(`Token created with default frozen state: ${mint.toString()}`);
```

## Working with the TokenFreezeExtension

The SDK provides a `TokenFreezeExtension` class with utility methods for freezing and thawing accounts:

```typescript
import { TokenFreezeExtension } from 'token-extensions-boost';

// Freeze a token account
async function freezeAccount(
  connection: Connection,
  account: PublicKey,
  mint: PublicKey,
  freezeAuthority: Keypair
) {
  // Create a transaction to freeze the account
  const transaction = TokenFreezeExtension.prepareFreezeAccountTransaction(
    account,
    mint,
    freezeAuthority.publicKey,
    freezeAuthority.publicKey
  );
  
  // Sign and send transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [freezeAuthority]
  );
  
  console.log(`Account frozen: ${signature}`);
  return signature;
}

// Thaw a token account
async function thawAccount(
  connection: Connection,
  account: PublicKey,
  mint: PublicKey,
  freezeAuthority: Keypair
) {
  // Create a transaction to thaw the account
  const transaction = TokenFreezeExtension.prepareThawAccountTransaction(
    account,
    mint,
    freezeAuthority.publicKey,
    freezeAuthority.publicKey
  );
  
  // Sign and send transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [freezeAuthority]
  );
  
  console.log(`Account thawed: ${signature}`);
  return signature;
}
```

## Updating Default Account State

You can update the default state for new token accounts after token creation:

```typescript
// Update default account state to Initialized (unfrozen)
async function updateDefaultState(
  connection: Connection,
  mint: PublicKey,
  freezeAuthority: Keypair
) {
  // Create transaction to update default state
  const transaction = TokenFreezeExtension.prepareUpdateDefaultAccountStateTransaction(
    mint,
    AccountState.Initialized, // New default state (unfrozen)
    freezeAuthority.publicKey,
    freezeAuthority.publicKey
  );
  
  // Sign and send transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [freezeAuthority]
  );
  
  console.log(`Default account state updated: ${signature}`);
  return signature;
}
```

## Creating New Token Accounts

When creating new token accounts for a token with DefaultAccountState, the accounts will inherit the default state:

```typescript
import { Token } from 'token-extensions-boost';
import { getAccount } from '@solana/spl-token';

// Create a new token account
async function createTokenAccount(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: Keypair
) {
  const token = new Token(connection, mint);
  
  // Get associated token address
  const tokenAddress = await token.getAssociatedAddress(owner);
  
  // Create token account
  const transaction = new Transaction().add(
    token.createAssociatedTokenAccountInstruction(
      payer.publicKey,
      tokenAddress,
      owner
    )
  );
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
  );
  
  console.log(`Token account created: ${tokenAddress.toString()}`);
  
  // Check if account was created with the default state
  const accountInfo = await getAccount(
    connection, 
    tokenAddress,
    'confirmed',
    token.getProgramId()
  );
  
  console.log(`Account state: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
  
  return tokenAddress;
}
```

## Important Considerations

1. **Freeze Authority**: Only the designated freeze authority can freeze or thaw accounts.

2. **Immutable Without Authority**: If no freeze authority is set during token creation, accounts can never be frozen.

3. **Default State Authority**: By default, only the freeze authority can change the default account state.

4. **Frozen Account Limitations**: Frozen accounts cannot send tokens, but can still receive tokens.

5. **Freezing the Mint**: The mint account itself cannot be frozen, only token accounts.

6. **Visibility**: The frozen state of an account is publicly visible on-chain.

## Checking Account and Token State

To check if an account is frozen or what the default state is:

```typescript
import { getAccount, getMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

// Check if a token account is frozen
async function isAccountFrozen(
  connection: Connection,
  tokenAccount: PublicKey
) {
  const accountInfo = await getAccount(
    connection,
    tokenAccount,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  
  return accountInfo.isFrozen;
}

// Check the default account state for a token
async function getDefaultAccountState(
  connection: Connection,
  mint: PublicKey
) {
  const mintInfo = await getMint(
    connection,
    mint,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  
  if (mintInfo.extensions.defaultAccountState !== undefined) {
    return mintInfo.extensions.defaultAccountState;
  } else {
    return "Default state extension not present";
  }
}
```

## Using with Wallet Adapter

In a React application with wallet adapter:

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TokenFreezeExtension } from 'token-extensions-boost';

function FreezeButton({ tokenAccount, mint }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const handleFreeze = async () => {
    if (!wallet.publicKey) return;
    
    try {
      // Prepare freeze transaction
      const transaction = TokenFreezeExtension.prepareFreezeAccountTransaction(
        new PublicKey(tokenAccount),
        new PublicKey(mint),
        wallet.publicKey,
        wallet.publicKey
      );
      
      // Sign with wallet adapter
      const signedTx = await wallet.signTransaction(transaction);
      
      // Send signed transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(signature);
      
      console.log(`Account frozen: ${signature}`);
    } catch (error) {
      console.error("Error freezing account:", error);
    }
  };
  
  return (
    <button onClick={handleFreeze} disabled={!wallet.connected}>
      Freeze Account
    </button>
  );
}
```

## Combining with Other Extensions

Token Freeze and DefaultAccountState work well with many other extensions:

### Freeze + PermanentDelegate (for managed tokens)

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    6,
    mintAuthority.publicKey,
    freezeAuthority.publicKey
  )
  .addTokenMetadata(
    "Managed Token",
    "MGTKN",
    "https://example.com/token-metadata.json",
    { "type": "managed" }
  )
  .addDefaultAccountState(AccountState.Initialized)
  .addPermanentDelegate(managerPublicKey);
```

### Freeze + TransferFee (for regulated marketplace tokens)

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    6,
    mintAuthority.publicKey,
    freezeAuthority.publicKey
  )
  .addTokenMetadata(
    "Regulated Marketplace Token",
    "RMKT",
    "https://example.com/marketplace-token.json",
    { "type": "marketplace", "regulated": true }
  )
  .addDefaultAccountState(AccountState.Frozen) // Start frozen until KYC
  .addTransferFee(
    100, // 1% fee
    BigInt(10_000_000), // max fee of 10 tokens
    feeAuthority.publicKey,
    withdrawAuthority.publicKey
  );
```

## Complete Examples

Complete examples of working with token freeze functionality are available in the examples directory:
- [Local Token Freeze Test](../examples/token-freeze/local-test.ts)
- [Wallet Adapter Token Freeze Example](../examples/token-freeze/wallet-adapter-example.ts)

## Related Extensions

- [PermanentDelegate](./permanent-delegate.md) - Allow an authority to transfer tokens from any account
- [NonTransferable](./non-transferable.md) - Make tokens non-transferable
- [TransferFee](./transfer-fee.md) - Add transfer fees to token transactions 