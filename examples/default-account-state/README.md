# Default Account State Token Extension

## Overview

The `DefaultAccountState` extension enables token issuers to set a default state for all newly created token accounts. This provides greater control over token distribution and access. When this extension is enabled, all new token accounts are automatically set to the specified state (either `Initialized` or `Frozen`).

## Key Features

- **Default Frozen Accounts**: Configure your token to have all new accounts created in a `Frozen` state by default
- **Controlled Distribution**: Require explicit authorization before users can transfer tokens
- **Compliance Controls**: Implement KYC or other verification requirements before enabling token transfers
- **Thawing Mechanism**: Maintain ability to thaw (unfreeze) accounts after verification

## Use Cases

- **Regulated Assets**: Ensure only verified wallets can hold or transfer tokens
- **KYC-Required Tokens**: Freeze accounts until KYC verification is completed
- **Controlled Token Distribution**: Prevent secondary transfers until certain conditions are met
- **Compliance with Regulations**: Comply with regulatory requirements for controlled distribution

## Installation

```bash
# Install the SDK
npm install solana-token-extension-boost

# Or using yarn
yarn add solana-token-extension-boost
```

## API Usage

### Creating a Token with DefaultAccountState.Frozen

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { TokenBuilder } from 'solana-token-extension-boost';
import { AccountState } from '@solana/spl-token';

// Connect to Solana cluster
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Initialize token builder
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    9, // decimals
    mintAuthority.publicKey, // mint authority
    freezeAuthority.publicKey // freeze authority (required for DefaultAccountState)
  )
  // Add metadata (optional)
  .addMetadata(
    "Frozen By Default Token",
    "FROZ",
    "https://example.com/metadata.json",
    { "description": "Token with DefaultAccountState.Frozen" }
  )
  // Set default state as Frozen
  .addDefaultAccountState(AccountState.Frozen);

// Create token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
// Build and send transaction...
```

### Creating a Token with DefaultAccountState.Initialized

```typescript
// Initialize token builder
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    9, // decimals
    mintAuthority.publicKey,
    freezeAuthority.publicKey
  )
  // Set default state as Initialized (same as normal tokens)
  .addDefaultAccountState(AccountState.Initialized);

// Create token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
// Build and send transaction...
```

### Unfreezing (Thawing) Token Accounts

When accounts are created in a frozen state, they need to be thawed before tokens can be transferred:

```typescript
import { thawAccount } from '@solana/spl-token';

// Thaw a frozen token account
await thawAccount(
  connection,
  payer, // Transaction fee payer
  tokenAccountAddress, // Address of token account to thaw
  mintAddress, // Token mint
  freezeAuthority, // Freeze authority of the token
  [], // Additional signers (if needed)
  { commitment: 'confirmed' }, // Confirmation options
  TOKEN_2022_PROGRAM_ID // Token-2022 program ID
);
```

### Updating the Default State

The freeze authority can update the default state of a token after creation:

```typescript
import { updateDefaultAccountState } from '@solana/spl-token';

// Update default account state for new token accounts
await updateDefaultAccountState(
  connection,
  payer, // Transaction fee payer
  mintAddress, // Mint to modify
  AccountState.Initialized, // New state for future accounts (or AccountState.Frozen)
  freezeAuthority, // Freeze authority
  [], // Additional signers (if needed)
  { commitment: 'confirmed' }, // Confirmation options
  TOKEN_2022_PROGRAM_ID // Token-2022 program ID
);
```

## Important Considerations

1. **Freeze Authority Required**: A freeze authority must be specified when creating a token with the DefaultAccountState extension.

2. **Existing Token Accounts**: Changing the default state only affects new token accounts, not existing ones.

3. **Backwards Compatibility**: DefaultAccountState works with both Token-2022 and legacy wallets, but legacy wallets won't automatically know that accounts are frozen.

4. **Transaction Failures**: Attempting to transfer tokens from a frozen account will result in transaction failures with the error message "Account is frozen".

5. **Extension Compatibility**: DefaultAccountState is compatible with most other token extensions.

## Example Implementation

The [default-state-example.ts](./default-state-example.ts) file demonstrates:

1. Creating a token with DefaultAccountState.Frozen
2. Creating a token account (which will be frozen by default)
3. Attempting to mint tokens to the frozen account (will fail unless thawed)
4. Creating a token with DefaultAccountState.Initialized for comparison
5. Checking and verifying account states

## Running the Example

```bash
# Navigate to the example directory
cd examples/default-account-state

# Run the example
npx ts-node default-state-example.ts
```

## Additional Resources

- [Solana Token Extensions Documentation](https://spl.solana.com/token-2022/extensions)
- [Default Account State Extension Guide](https://solana.com/developers/guides/token-extensions/default-account-state)