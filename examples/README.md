# Solana Token Extension SDK Examples

This directory contains examples of how to use the Solana Token Extension SDK in real-world scenarios.

## Installation

Before running the examples, make sure you have installed the dependencies:

```bash
npm install
```

## Transfer Fee Extension Examples

The SDK provides two examples that demonstrate how to create and use tokens with the Transfer Fee extension:

### 1. basic-transfer-fee-example.ts

A basic example illustrating the core features of the Transfer Fee extension with a single recipient.

#### Features Demonstrated

- Creating a token with 1% transfer fee
- Minting tokens to an address
- Transferring tokens with automatic fee deduction
- Harvesting fees from recipient accounts to the mint
- Withdrawing fees from the mint to a destination account

#### How to Run

```bash
# Build SDK
npm run build

# Run example
npx ts-node examples/basic-transfer-fee-example.ts
```

### 2. multi-account-transfer-fee-example.ts

An advanced example illustrating how to handle multiple recipients and find/collect fees from multiple accounts.

#### Features Demonstrated

- Creating a token with 1% transfer fee
- Minting tokens to the owner
- Transferring tokens to multiple recipients
- Finding accounts with withheld fees
- Harvesting fees from accounts and withdrawing them to the owner

#### How to Run

```bash
# Build SDK
npm run build

# Run example
npx ts-node examples/multi-account-transfer-fee-example.ts
```

### 3. transfer-fee-with-metadata-example.ts

An example demonstrating how to combine Transfer Fee and Metadata Pointer extensions in a single token.

#### Features Demonstrated

- Creating a token with both Transfer Fee and Metadata Pointer extensions
- Setting up token metadata with name, symbol, URI, and additional custom fields
- Minting tokens to the owner
- Transferring tokens with automatic fee deduction
- Harvesting fees from recipient accounts to the mint
- Withdrawing fees from the mint to a destination account
- Updating metadata fields after token creation

#### How to Run

```bash
# Build SDK
npm run build

# Run example
npx ts-node examples/transfer-fee-with-metadata-example.ts
```

## Metadata Pointer Extension Example

The SDK also provides an example for working with the Metadata Pointer extension:

### metadata-pointer-example.ts

This example demonstrates how to create and manage tokens with metadata.

#### Features Demonstrated

- Creating a token with metadata pointer extension
- Setting token metadata (name, symbol, URI)
- Adding custom metadata fields
- Retrieving token metadata
- Updating metadata fields
- Removing metadata fields
- Updating metadata authority
- Testing updates with new authority

#### How to Run

```bash
npx ts-node examples/metadata-pointer-example.ts
```

## Requirements

- Solana CLI connection: `solana config set --url devnet`
- Account with SOL on devnet: `solana airdrop 1 <wallet address> --url devnet`

## Sample Output

When running the basic example successfully, you will see output similar to the following:

```
Using wallet: 5YourWalletAddressHere123456789
Balance: 1.5 SOL

1. Creating token with 1% transfer fee
Token created: TokenAddressHere123456789

2. Minting tokens to owner
Minted 1000 tokens to TokenAccountAddressHere123456789

Recipient: RecipientAddressHere123456789
Recipient token account: RecipientTokenAccountHere123456789

3. Transferring tokens with 1% fee
Expected fee: 1 tokens
Transferred 100 tokens
Transaction: https://explorer.solana.com/tx/TransactionSignatureHere123456789?cluster=devnet

4. Harvesting fees from accounts to mint
Fees harvested to mint
Transaction: https://explorer.solana.com/tx/HarvestTransactionSignatureHere123456789?cluster=devnet

5. Withdrawing fees from mint to wallet
Fees withdrawn to FeeRecipientTokenAccountHere123456789
Transaction: https://explorer.solana.com/tx/WithdrawTransactionSignatureHere123456789?cluster=devnet

===== SUMMARY =====
- Token Address: TokenAddressHere123456789
- Owner Token Account: TokenAccountAddressHere123456789
- Recipient Token Account: RecipientTokenAccountHere123456789
- View details on Solana Explorer (devnet):
  https://explorer.solana.com/address/TokenAddressHere123456789?cluster=devnet
```

## Notes

- These examples use the Solana devnet by default
- The examples attempt to use your Solana CLI wallet at the default location (~/.config/solana/id.json)
- If a wallet is not found, the examples will generate a new keypair and request an airdrop 