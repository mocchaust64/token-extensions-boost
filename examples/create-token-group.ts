import { 
  Connection, 
  Keypair, 
  PublicKey, 
  sendAndConfirmTransaction, 
  Transaction 
} from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount, 
  mintTo 
} from '@solana/spl-token';
import { 
  TokenGroupExtension, 
  TokenGroupMemberStatus 
} from '../src/extensions/token-groups';
import { readFileSync } from 'fs';
import path from 'path';

// Load keypair from the default Solana location
function loadLocalWallet(): Keypair {
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
}

async function main() {
  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load payer wallet
  const payer = loadLocalWallet();
  console.log('Using payer:', payer.publicKey.toBase58());
  
  // Generate keypairs for authorities
  const mintAuthority = Keypair.generate();
  const groupAuthority = Keypair.generate();
  const updateAuthority = Keypair.generate();
  
  console.log('Mint authority:', mintAuthority.publicKey.toBase58());
  console.log('Group authority:', groupAuthority.publicKey.toBase58());
  console.log('Update authority:', updateAuthority.publicKey.toBase58());
  
  // Create a token group
  console.log('\nCreating token group...');
  
  const { instructions, signers, mint: groupMint } = await TokenGroupExtension.createTokenGroupInstructions(
    connection,
    payer.publicKey,
    mintAuthority.publicKey,
    groupAuthority.publicKey,
    updateAuthority.publicKey,
    'VietnamTech Token Group',
    'VTG',
    6 // 6 decimals
  );
  
  // Create and send transaction
  const transaction = new Transaction().add(...instructions);
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, ...signers]
  );
  
  console.log('Token group created successfully!');
  console.log('Group mint address:', groupMint.toBase58());
  console.log('Transaction signature:', signature);
  
  // Create TokenGroupExtension instance
  const tokenGroup = new TokenGroupExtension(connection, groupMint);
  
  // Get group info
  console.log('\nFetching token group info...');
  try {
    const groupInfo = await tokenGroup.getTokenGroupInfo();
    console.log('Group name:', groupInfo.name);
    console.log('Group symbol:', groupInfo.symbol);
    console.log('Group authority:', groupInfo.groupAuthority?.toBase58() || 'None');
    console.log('Update authority:', groupInfo.updateAuthority?.toBase58() || 'None');
  } catch (error) {
    console.error('Error fetching group info:', error);
  }
  
  // Create a member token
  console.log('\nCreating token group member...');
  
  const memberAuthority = Keypair.generate();
  console.log('Member authority:', memberAuthority.publicKey.toBase58());
  
  const { instructions: memberInstructions, signers: memberSigners, mint: memberMint } = 
    await tokenGroup.createTokenGroupMemberInstructions(
      payer.publicKey,
      mintAuthority.publicKey,
      memberAuthority.publicKey,
      6 // 6 decimals
    );
  
  // Create and send transaction
  const memberTransaction = new Transaction().add(...memberInstructions);
  const memberSignature = await sendAndConfirmTransaction(
    connection,
    memberTransaction,
    [payer, ...memberSigners]
  );
  
  console.log('Token group member created successfully!');
  console.log('Member mint address:', memberMint.toBase58());
  console.log('Transaction signature:', memberSignature);
  
  // Check if member belongs to group
  console.log('\nVerifying group membership...');
  const isMember = await tokenGroup.isMember(memberMint);
  console.log('Is member of group:', isMember);
  
  // Get member status
  const memberStatus = await tokenGroup.getMemberStatus(memberMint);
  console.log('Member status:', memberStatus === TokenGroupMemberStatus.ACTIVE ? 'Active' : 
    memberStatus === TokenGroupMemberStatus.FROZEN ? 'Frozen' : 'None');
  
  // Update member status to ACTIVE
  console.log('\nActivating member...');
  const updateStatusInstruction = tokenGroup.createUpdateMemberStatusInstruction(
    memberMint,
    memberAuthority.publicKey,
    TokenGroupMemberStatus.ACTIVE
  );
  
  const updateStatusTransaction = new Transaction().add(updateStatusInstruction);
  const updateStatusSignature = await sendAndConfirmTransaction(
    connection,
    updateStatusTransaction,
    [payer, memberAuthority]
  );
  
  console.log('Member activated successfully!');
  console.log('Transaction signature:', updateStatusSignature);
  
  // Check updated member status
  const updatedStatus = await tokenGroup.getMemberStatus(memberMint);
  console.log('Updated member status:', updatedStatus === TokenGroupMemberStatus.ACTIVE ? 'Active' : 
    updatedStatus === TokenGroupMemberStatus.FROZEN ? 'Frozen' : 'None');
  
  // Update group info
  console.log('\nUpdating token group info...');
  const updateGroupInstruction = tokenGroup.createUpdateTokenGroupInstruction(
    updateAuthority.publicKey,
    'Updated VN Tech Group',
    'UVTG'
  );
  
  const updateGroupTransaction = new Transaction().add(updateGroupInstruction);
  const updateGroupSignature = await sendAndConfirmTransaction(
    connection,
    updateGroupTransaction,
    [payer, updateAuthority]
  );
  
  console.log('Token group updated successfully!');
  console.log('Transaction signature:', updateGroupSignature);
  
  // Get updated group info
  console.log('\nFetching updated token group info...');
  try {
    const updatedGroupInfo = await tokenGroup.getTokenGroupInfo();
    console.log('Updated group name:', updatedGroupInfo.name);
    console.log('Updated group symbol:', updatedGroupInfo.symbol);
  } catch (error) {
    console.error('Error fetching updated group info:', error);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
}); 