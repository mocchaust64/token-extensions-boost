# Permanent Delegate Token Extension

This example demonstrates how to use `PermanentDelegateToken` from the SDK to create and manage tokens with a permanent delegate - an entity that can move tokens from any account without requiring consent.

## Key Features

- Creating tokens with a permanent delegate
- Transferring tokens from any account without the owner's consent
- Checking and validating permanent delegate authority
- Creating and managing token accounts

## How to Run the Example

```bash
# Install dependencies
npm install

# Run the example
npx ts-node index.ts
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
const token = await PermanentDelegateToken.create(
  connection,
  payer,
  {
    decimals: 9,
    mintAuthority: payer.publicKey,
    permanentDelegate: delegatePublicKey
  }
);

// Create a token account
const userTokenAccount = await token.createTokenAccount(
  payer,
  userPublicKey
);

// Transfer tokens using permanent delegate authority
const signature = await token.transferAsDelegate(
  delegateKeypair, 
  sourceAccount, 
  destinationAccount, 
  amount
);

// Check if an address is the permanent delegate
const isDelegate = await token.isPermanentDelegate(address);

// Get the permanent delegate address of the token
const delegate = await token.getPermanentDelegate();

// Create or get an existing token account
const { address, signature } = await token.createOrGetTokenAccount(
  payer,
  ownerPublicKey
);
```

## Use Cases

Permanent Delegate is useful in the following scenarios:

1. **Educational or credential tokens** - Can be revoked if users do not meet requirements

2. **Governance tokens** - Allow administrative intervention when necessary

3. **Regulatory compliant tokens** - Allow regulators to interact with tokens when needed

4. **Anti-fraud applications** - Allow revoking tokens from compromised accounts

## Security Considerations

The Permanent Delegate has the authority to transfer tokens without the owner's consent, so:

- Only use for cases where it's truly necessary
- The permanent delegate should be secured and tightly controlled
- Users should be clearly informed about the existence of a permanent delegate
- In many cases, consider using multi-signature or DAO mechanisms to control permanent delegate authority 