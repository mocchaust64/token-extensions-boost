# Token Groups Extension

Token Groups allow for the creation of token collections or families where tokens can be grouped together and have their membership status managed. This enables various use cases like token classifications, organizations, or themed collections.

## Use Cases

- **NFT Collections**: Group related NFTs into a collection with shared properties
- **Organizational Tokens**: Create tokens that represent membership in an organization
- **Token Classification**: Categorize tokens based on specific criteria or purposes
- **Access Control**: Grant or restrict access based on token group membership
- **Themed Collections**: Create sets of tokens with a common theme or purpose

## Getting Started

### Creating a Token Group

```typescript
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { TokenGroupExtension } from 'token-extensions-boost';

// Connect to a Solana cluster
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Set up accounts
const payer = Keypair.generate();
const mintAuthority = Keypair.generate();
const groupAuthority = Keypair.generate();
const updateAuthority = Keypair.generate();

// Create a token group
const { instructions, signers, mint: groupMint } = await TokenGroupExtension.createTokenGroupInstructions(
  connection,
  payer.publicKey,
  mintAuthority.publicKey,
  groupAuthority.publicKey,
  updateAuthority.publicKey,
  'My Token Group',
  'MTG',
  6 // 6 decimals
);

// Create and send transaction
const transaction = new Transaction().add(...instructions);
const signature = await sendAndConfirmTransaction(connection, transaction, [payer, ...signers]);

console.log('Token group created:', groupMint.toBase58());
```

### Creating a Token Group Member

```typescript
// Create a TokenGroupExtension instance
const tokenGroup = new TokenGroupExtension(connection, groupMint);

// Create a member token
const memberAuthority = Keypair.generate();

const { instructions, signers, mint: memberMint } = await tokenGroup.createTokenGroupMemberInstructions(
  payer.publicKey,
  mintAuthority.publicKey,
  memberAuthority.publicKey,
  6 // 6 decimals
);

// Create and send transaction
const transaction = new Transaction().add(...instructions);
const signature = await sendAndConfirmTransaction(connection, transaction, [payer, ...signers]);

console.log('Token group member created:', memberMint.toBase58());
```

### Managing Member Status

```typescript
import { TokenGroupMemberStatus } from 'token-extensions-boost';

// Update member status to ACTIVE
const updateStatusInstruction = tokenGroup.createUpdateMemberStatusInstruction(
  memberMint,
  memberAuthority.publicKey,
  TokenGroupMemberStatus.ACTIVE
);

// Create and send transaction
const transaction = new Transaction().add(updateStatusInstruction);
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [payer, memberAuthority] // The member authority must sign
);

console.log('Member status updated:', signature);
```

### Checking Member Status and Group Information

```typescript
// Check if a mint is a member of the group
const isMember = await tokenGroup.isMember(memberMint);
console.log('Is member of group:', isMember);

// Get member status
const memberStatus = await tokenGroup.getMemberStatus(memberMint);
console.log('Member status:', 
  memberStatus === TokenGroupMemberStatus.ACTIVE ? 'Active' : 
  memberStatus === TokenGroupMemberStatus.FROZEN ? 'Frozen' : 'None'
);

// Get token group information
const groupInfo = await tokenGroup.getTokenGroupInfo();
console.log('Group name:', groupInfo.name);
console.log('Group symbol:', groupInfo.symbol);
console.log('Group authority:', groupInfo.groupAuthority?.toBase58() || 'None');
console.log('Update authority:', groupInfo.updateAuthority?.toBase58() || 'None');
```

### Updating Token Group Information

```typescript
// Update token group name and symbol
const updateGroupInstruction = tokenGroup.createUpdateTokenGroupInstruction(
  updateAuthority.publicKey,
  'Updated Group Name',
  'UGN'
);

// Create and send transaction
const transaction = new Transaction().add(updateGroupInstruction);
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [payer, updateAuthority] // The update authority must sign
);

console.log('Token group updated:', signature);
```

## API Reference

### `TokenGroupExtension`

The main class for working with Token Groups.

#### Constructor

```typescript
constructor(connection: Connection, mint: PublicKey)
```

#### Static Methods

- `createTokenGroupInstructions(connection: Connection, payer: PublicKey, mintAuthority: PublicKey, groupAuthority: PublicKey, updateAuthority: PublicKey | null, name: string, symbol: string, decimals: number = 6): Promise<{ instructions: TransactionInstruction[], signers: Keypair[], mint: PublicKey }>`
- `createInitializeTokenGroupInstruction(mint: PublicKey, payer: PublicKey, groupAuthority: PublicKey, updateAuthority: PublicKey | null = null, name: string, symbol: string, programId = TOKEN_2022_PROGRAM_ID): TransactionInstruction`
- `createUpdateTokenGroupInstruction(mint: PublicKey, updateAuthority: PublicKey, name: string, symbol: string, programId = TOKEN_2022_PROGRAM_ID): TransactionInstruction`
- `createInitializeTokenGroupMemberInstruction(memberMint: PublicKey, groupMint: PublicKey, payer: PublicKey, memberAuthority: PublicKey, programId = TOKEN_2022_PROGRAM_ID): TransactionInstruction`
- `createUpdateTokenGroupMemberInstruction(memberMint: PublicKey, memberAuthority: PublicKey, status: TokenGroupMemberStatus, programId = TOKEN_2022_PROGRAM_ID): TransactionInstruction`

#### Instance Methods

- `getTokenGroupInfo(): Promise<{ name: string, symbol: string, maxSize?: number, memberCount?: number, groupAuthority: PublicKey | null, updateAuthority: PublicKey | null }>`
- `isMember(memberMint: PublicKey): Promise<boolean>`
- `getMemberStatus(memberMint: PublicKey): Promise<TokenGroupMemberStatus>`
- `createTokenGroupMemberInstructions(payer: PublicKey, mintAuthority: PublicKey, memberAuthority: PublicKey, decimals: number = 6): Promise<{ instructions: TransactionInstruction[], signers: Keypair[], mint: PublicKey }>`
- `createUpdateTokenGroupInstruction(updateAuthority: PublicKey, name: string, symbol: string): TransactionInstruction`
- `createUpdateMemberStatusInstruction(memberMint: PublicKey, memberAuthority: PublicKey, status: TokenGroupMemberStatus): TransactionInstruction`
- `listMembers(): Promise<PublicKey[]>`

### `TokenGroupMemberStatus`

An enum representing the status of a token group member:

```typescript
enum TokenGroupMemberStatus {
  NONE = 0,
  ACTIVE = 1 << 0,
  FROZEN = 1 << 1,
}
```

## Example

See the complete example in [examples/create-token-group.ts](../examples/create-token-group.ts).