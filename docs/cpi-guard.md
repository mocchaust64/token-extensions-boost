# CPI Guard Extension

The CPI Guard extension protects tokens against Cross-Program Invocation (CPI) attacks by restricting which programs can transfer tokens. When enabled, it prevents other programs from calling into the token program to transfer tokens.

## Use Cases

- **Preventing exploit risk**: Protect tokens from unauthorized transfers by other programs
- **Enhancing security**: Add an extra layer of security for valuable tokens
- **Controlling program interactions**: Restrict which programs can interact with your tokens

## Getting Started

### Creating a token with CPI Guard

```typescript
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { CpiGuardExtension } from 'token-extensions-boost';

// Connect to a Solana cluster
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Set up accounts
const payer = Keypair.generate();
const mintAuthority = Keypair.generate();
const cpiGuardAuthority = Keypair.generate(); // Optional: authority that can enable/disable CPI Guard

// Create a token with CPI Guard
const { instructions, signers, mint } = await CpiGuardExtension.createTokenWithCpiGuardInstructions(
  connection,
  payer.publicKey,
  mintAuthority.publicKey,
  6, // 6 decimals
  cpiGuardAuthority.publicKey // Use null if you don't want an authority
);

// Create and send transaction
const transaction = new Transaction().add(...instructions);
const signature = await sendAndConfirmTransaction(connection, transaction, [payer, ...signers]);

console.log('Token with CPI Guard created:', mint.toBase58());
```

### Enabling CPI Guard

```typescript
// Create CPI Guard extension instance
const cpiGuardExtension = new CpiGuardExtension(connection, mint);

// Create instruction to enable CPI Guard
const enableInstruction = cpiGuardExtension.createEnableCpiGuardInstruction(
  cpiGuardAuthority.publicKey
);

// Create and send transaction
const transaction = new Transaction().add(enableInstruction);
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [payer, cpiGuardAuthority] // The CPI Guard authority must sign
);

console.log('CPI Guard enabled:', signature);
```

### Disabling CPI Guard

```typescript
// Create instruction to disable CPI Guard
const disableInstruction = cpiGuardExtension.createDisableCpiGuardInstruction(
  cpiGuardAuthority.publicKey
);

// Create and send transaction
const transaction = new Transaction().add(disableInstruction);
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [payer, cpiGuardAuthority] // The CPI Guard authority must sign
);

console.log('CPI Guard disabled:', signature);
```

### Checking CPI Guard Status

```typescript
// Check if CPI Guard is enabled
const isEnabled = await cpiGuardExtension.isCpiGuardEnabled();
console.log('CPI Guard enabled:', isEnabled);

// Get the CPI Guard authority (if any)
const authority = await cpiGuardExtension.getCpiGuardAuthority();
console.log('CPI Guard authority:', authority?.toBase58() || 'None');
```

## API Reference

### `CpiGuardExtension`

The main class for working with the CPI Guard extension.

#### Constructor

```typescript
constructor(connection: Connection, mint: PublicKey)
```

#### Static Methods

- `createInitializeCpiGuardInstruction(mint: PublicKey, authority: PublicKey | null = null, programId = TOKEN_2022_PROGRAM_ID): TransactionInstruction`
- `createEnableCpiGuardInstruction(mint: PublicKey, authority: PublicKey, programId = TOKEN_2022_PROGRAM_ID): TransactionInstruction`
- `createDisableCpiGuardInstruction(mint: PublicKey, authority: PublicKey, programId = TOKEN_2022_PROGRAM_ID): TransactionInstruction`
- `isCpiGuardEnabled(connection: Connection, mint: PublicKey, programId = TOKEN_2022_PROGRAM_ID): Promise<boolean>`
- `getCpiGuardAuthority(connection: Connection, mint: PublicKey, programId = TOKEN_2022_PROGRAM_ID): Promise<PublicKey | null>`
- `createTokenWithCpiGuardInstructions(connection: Connection, payer: PublicKey, mintAuthority: PublicKey, decimals: number, cpiGuardAuthority?: PublicKey): Promise<{ instructions: TransactionInstruction[], signers: Keypair[], mint: PublicKey }>`

#### Instance Methods

- `isCpiGuardEnabled(): Promise<boolean>`
- `getCpiGuardAuthority(): Promise<PublicKey | null>`
- `createEnableCpiGuardInstruction(authority: PublicKey): TransactionInstruction`
- `createDisableCpiGuardInstruction(authority: PublicKey): TransactionInstruction`

## Security Considerations

- Once CPI Guard is enabled, token transfers can only be performed directly through the Token-2022 program, not via CPI from other programs.
- If you create a token with a CPI Guard authority, make sure to securely store the authority's keypair.
- If you create a token without a CPI Guard authority, the CPI Guard cannot be toggled after initialization.
- Be aware that enabling CPI Guard may limit interoperability with certain DeFi protocols or other programs that rely on CPI to transfer tokens.

## Example

See the complete example in [examples/create-token-with-cpi-guard.ts](../examples/create-token-with-cpi-guard.ts). 