# Basic Token Burn and Transfer Example

This example demonstrates how to use Solana Token Extensions for basic token operations, including burning tokens and transferring tokens with transfer fee and permanent delegate extensions.

## Features

This example showcases:
- Creating a token with multiple extensions (Metadata, TransferFee, PermanentDelegate)
- Creating token accounts for different users
- Minting tokens to a user's account
- Transferring tokens between accounts with transfer fees
- Burning tokens to reduce supply
- Using the Permanent Delegate extension to transfer tokens on behalf of another account

## Prerequisites

- Solana CLI installed with a configured wallet
- Node.js and npm/yarn
- A funded wallet on Solana devnet

## Installation

```bash
# Clone the repository (if not already done)
git clone https://github.com/mocchaust64/token-extensions-boost.git
cd token-extensions-boost

# Install dependencies
npm install
```

## Running the Example

```bash
npx ts-node examples/basic-burn-transfer/index.ts
```

## Code Walkthrough

### 1. Create Token with Extensions

The example creates a new token with three extensions:

```typescript
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(9, payer.publicKey)  // 9 decimals
  .addMetadata(                      // Add Metadata extension
    "Multi-Feature Test Token", 
    "MFTT", 
    "https://example.com/token.json",
    {
      "description": "Token demonstrating multiple extensions",
      "creator": payer.publicKey.toString(),
      "website": "https://example.com"
    }
  )
  .addTransferFee(                   // Add TransferFee extension
    100,                            // 1% fee (100 basis points)
    BigInt(1000000000),             // Maximum fee of 1 token (with 9 decimals)
    payer.publicKey,                // Authority to change fee
    payer.publicKey                 // Authority to withdraw fee
  )
  .addPermanentDelegate(             // Add PermanentDelegate extension
    payer.publicKey                 // Permanent delegate
  );
```

### 2. Create Token Accounts

The example creates two token accounts: one for the user and another for a recipient:

```typescript
// Create token account for user
const { instructions: createAccountIx, address: userTokenAddress } = 
  await token.createTokenAccountInstructions(payer.publicKey, payer.publicKey);

// Create token account for recipient
const recipientTokenAccount = await token.getOrCreateTokenAccount(
  payer,
  recipient.publicKey,
  false,
  "confirmed",
  { skipPreflight: true }
);
```

### 3. Mint Tokens

Mint 1000 tokens to the user's account:

```typescript
const mintAmount = BigInt(1000_000_000_000);  // 1000 tokens with 9 decimals

const { instructions: mintInstructions } = token.createMintToInstructions(
  userTokenAddress,
  payer.publicKey,
  mintAmount
);
```

### 4. Transfer Tokens

The SDK now provides a seamless way to transfer tokens that is fully compatible with Token-2022:

```typescript
// Using the SDK's improved createTransferInstructions method
const { instructions: transferInstructions } = await token.createTransferInstructions(
  userTokenAddress,
  recipientTokenAccount.address,
  payer.publicKey,
  transferAmount,
  9, // decimals
  {
    memo: "Transfer token from token-extensions-boost example",
    createDestinationIfNeeded: true,
    allowOwnerOffCurve: true, // Allow addresses that may be off-curve
  }
);
```

The method handles all the necessary setup and properly works with Token-2022 extensions like transfer fees without the need for manual workarounds.

### 5. Burn Tokens

Burn 200 tokens from the user's account using our SDK:

```typescript
const burnAmount = BigInt(200_000_000_000);  // 200 tokens

const { instructions: burnInstructions } = token.createBurnInstructions(
  userTokenAddress,
  payer.publicKey,
  burnAmount,
  9 // decimals
);
```

### 6. Use Permanent Delegate

The permanent delegate can transfer tokens from any account holding this token without the account owner's signature. Our SDK now provides a clean way to handle this:

```typescript
// Using the SDK's improved permanent delegate method
const { instructions: delegateTransferInstructions } = await token.createPermanentDelegateTransferInstructions(
  recipientTokenAccount.address,
  userTokenAddress,
  payer.publicKey, // permanent delegate
  delegateTransferAmount,
  {
    memo: "Transfer by permanent delegate",
    createDestinationIfNeeded: true,
    decimals: 9, // Provide decimals to avoid blockchain query
    allowOwnerOffCurve: true, // Allow addresses that may be off-curve
    verifySourceBalance: true // Verify balance before transfer
  }
);
```

## SDK Improvements

The token-extensions-boost SDK has been enhanced to work seamlessly with Solana Token-2022:

1. **Direct Use of SPL-Token Instructions**: The SDK now uses the standard `createTransferCheckedInstruction` directly without manual owner checks.

2. **Handling of Token Extensions**: Properly handles tokens with extensions such as TransferFee and PermanentDelegate.

3. **Decimals Management**: Improved handling of token decimals through `getDecimals()` and `setDecimals()` methods.

4. **Destination Account Creation**: Automatic creation of destination accounts when needed.

## Wallet Adapter Integration

The instructions created by the token-extensions-boost SDK are fully compatible with the Solana Wallet Adapter:

```typescript
// Example of using with wallet adapter
const { instructions } = await token.createTransferInstructions(
  sourceTokenAccount,
  destinationTokenAccount,
  publicKey, // connected wallet
  amount,
  decimals
);

await wallet.sendTransaction(
  new Transaction().add(...instructions),
  connection
);
```

## Token Extensions Used

### 1. Metadata Extension

Provides on-chain metadata for the token, including:
- Token name: "Multi-Feature Test Token" 
- Symbol: "MFTT"
- URI: "https://example.com/token.json"
- Additional fields in metadata JSON

### 2. Transfer Fee Extension

Automatically collects a fee on each token transfer:
- Fee rate: 1% (100 basis points)
- Maximum fee per transfer: 1 token
- Fee authorities: The payer's wallet

### 3. Permanent Delegate Extension

Assigns a permanent delegate address that can transfer tokens from any account holding this token:
- Delegate: The payer's wallet
- This allows the delegate to move tokens from any holder's account without their signature

## Key Concepts

1. **Burning Tokens**: Permanently reduces token supply by removing tokens from circulation
2. **Transfer Fees**: Automatically collects a percentage of transferred tokens
3. **Permanent Delegate**: Allows a designated address to transfer tokens from any holder
4. **Token Extensions**: Enhances token functionality beyond the basic SPL Token capabilities

## Notes

- The example uses the Solana devnet for testing
- Each operation includes a delay to ensure transaction confirmation
- The example includes error handling for each operation
- The code demonstrates how to build, sign, and send transactions with these operations 