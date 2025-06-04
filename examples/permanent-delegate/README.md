# Permanent Delegate Token Extension

This example demonstrates how to use the PermanentDelegate extension from the Token Extensions Boost SDK to create and manage tokens with a permanent delegate - an entity that can move tokens from any account without requiring the owner's consent.

## Key Features

- Creating tokens with a permanent delegate
- Transferring tokens from any account without the owner's consent
- Checking and validating permanent delegate authority
- Creating and managing token accounts

## How to Run the Example

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run the example
npx ts-node examples/permanent-delegate/index.ts
```

## Code Explanation

The `index.ts` file demonstrates the basic process:
1. Creating a token with a permanent delegate (typically an administrative authority)
2. Creating token accounts for users
3. Transferring tokens from a user's account under permanent delegate authority
4. Checking permanent delegate information

## Key APIs

```typescript
// Create a new token with a permanent delegate
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(6, payer.publicKey)
  .addPermanentDelegate(delegatePublicKey);

// Get instructions to create token
const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);

// Create and send transaction
const transaction = new Transaction().add(...instructions);
await sendAndConfirmTransaction(connection, transaction, [payer, ...signers]);

// Create PermanentDelegateToken instance
const permanentDelegateToken = new PermanentDelegateToken(connection, mint, delegatePublicKey);

// Create a token account
const { instructions: tokenAccountInstructions, address: tokenAccountAddress } = 
  await permanentDelegateToken.createTokenAccountInstructions(payer.publicKey, ownerPublicKey);

// Transfer tokens using permanent delegate authority
const transferInstruction = createTransferCheckedInstruction(
  sourceAccount,
  mint,
  destinationAccount,
  delegatePublicKey,
  amount,
  decimals,
  [],
  TOKEN_2022_PROGRAM_ID
);

// Check if an address is the permanent delegate
const isDelegate = await permanentDelegateToken.isPermanentDelegate(address);

// Get the permanent delegate address of the token
const delegate = await permanentDelegateToken.getPermanentDelegate();
```

## Use Cases

Permanent Delegate is useful in the following scenarios:

1. **Educational or credential tokens** - Can be revoked if users do not meet requirements

2. **Governance tokens** - Allow administrative intervention when necessary

3. **Regulatory compliant tokens** - Allow regulators to interact with tokens when needed

4. **Anti-fraud applications** - Allow revoking tokens from compromised accounts

5. **Managed investment tokens** - Allow portfolio managers to rebalance token allocations

6. **Service tokens** - Allow service providers to adjust token balances based on service usage

## Security Considerations

The Permanent Delegate has the authority to transfer tokens without the owner's consent, so:

- Only use for cases where it's truly necessary
- The permanent delegate should be secured and tightly controlled
- Users should be clearly informed about the existence of a permanent delegate
- In many cases, consider using multi-signature or DAO mechanisms to control permanent delegate authority
- Document the permanent delegate authority in your token's terms of service 