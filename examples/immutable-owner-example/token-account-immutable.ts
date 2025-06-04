import {
  Connection,
  Keypair,
  clusterApiUrl,
  Transaction,
} from '@solana/web3.js';
import { 
  TOKEN_2022_PROGRAM_ID,  
  mintTo, 
  AuthorityType, 
  setAuthority,
} from '@solana/spl-token';
import { TokenAccount } from '../../src';
import fs from 'fs';
import path from 'path';
import { TokenBuilder } from '../../src';

// Main function
async function main() {
   const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const walletPath = path.join(process.env.HOME! , ".config","solana", "id.json");
      const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8"});
      const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
      const payer = Keypair.fromSecretKey(secretKey);
      
    
    // ============== Create token for example ==============
    console.log('\n1. Creating new token...');
    
    // Create TokenBuilder with connection
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        9, // decimals
        payer.publicKey, // mint authority
        null // freeze authority not needed
      );
    
    // Create token with metadata and other extensions
    console.log('Creating token...');
    
    // Create token using new API
    // Get instructions instead of creating token directly
    const { instructions, signers, mint } = 
      await tokenBuilder.createTokenInstructions(payer.publicKey);
    
    // Create and sign transaction
    const tokenTransaction = new Transaction().add(...instructions);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tokenTransaction.recentBlockhash = blockhash;
    tokenTransaction.lastValidBlockHeight = lastValidBlockHeight;
    tokenTransaction.feePayer = payer.publicKey;
    
    // Sign and send transaction
    tokenTransaction.sign(...signers, payer);
    const tokenSignature = await connection.sendRawTransaction(
      tokenTransaction.serialize(),
      { skipPreflight: false }
    );
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature: tokenSignature,
      blockhash,
      lastValidBlockHeight
    });
    
    // ============== Create standard token account ==============
    console.log('\n2. Creating standard token account...');
    
    const tokenAccount = new TokenAccount(connection, mint, payer.publicKey);
    const { tokenAccount: standardAccount, signature } = await tokenAccount.createAccount(payer);
    
    console.log(`Standard token account created: ${standardAccount.toBase58()}`);
    console.log('Transaction signature:', signature);
    
    // Mint tokens to account
    console.log('\nMint 100 tokens to account...');
    await mintTo(
      connection,
      payer,
      mint,
      standardAccount,
      payer,
      100 * (10 ** 9), // 100 tokens with 9 decimals
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log('Tokens minted successfully');
    
    // Try changing the owner of the account
    console.log('\nTrying to change owner of standard account...');
    
    try {
      const newOwner = Keypair.generate().publicKey;
      await setAuthority(
        connection,
        payer,
        standardAccount,
        payer.publicKey,
        AuthorityType.AccountOwner,
        newOwner,
        [],
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID
      );
      console.log(`Standard account owner changed successfully to: ${newOwner.toBase58()}`);
    } catch (error) {
      console.log('Error changing standard account owner');
    }
    
    // ============== Create token account with ImmutableOwner ==============
    console.log('\n3. Creating token account with ImmutableOwner...');
    
    const { tokenAccount: immutableAccount, signature: immutableSig } = 
      await tokenAccount.createAccountWithImmutableOwner(payer);
    
    console.log(`Immutable owner token account created: ${immutableAccount.toBase58()}`);
    console.log('Transaction signature:', immutableSig);
    
    // Mint tokens to immutable account
    console.log('\nMint 100 tokens to immutable account...');
    await mintTo(
      connection,
      payer,
      mint,
      immutableAccount,
      payer,
      100 * (10 ** 9), // 100 tokens with 9 decimals
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log('Tokens minted successfully');
    
    // Try changing the owner of immutable account
    console.log('\nTrying to change owner of account with ImmutableOwner...');
    
    try {
      const newOwner = Keypair.generate().publicKey;
      await setAuthority(
        connection,
        payer,
        immutableAccount,
        payer.publicKey,
        AuthorityType.AccountOwner,
        newOwner,
        [],
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID
      );
      console.log('Immutable account owner changed - unexpected');
    } catch (error) {
      console.log('Immutable account owner change rejected as expected');
    }
    
    // ============== Create Associated Token Account ==============
    console.log('\n4. Creating Associated Token Account...');
    
    const { tokenAccount: associatedAccount, signature: ataSig } = 
      await tokenAccount.createAssociatedTokenAccount(payer);
    
    console.log(`Associated Token Account created: ${associatedAccount.toBase58()}`);
    console.log('Transaction signature:', ataSig);
    
    // Mint tokens to ATA
    console.log('\nMint 100 tokens to Associated Token Account...');
    await mintTo(
      connection,
      payer,
      mint,
      associatedAccount,
      payer,
      100 * (10 ** 9), // 100 tokens with 9 decimals
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log('Tokens minted successfully');
    
    // Try changing owner of Associated account (ATA already has ImmutableOwner built-in)
    console.log('\nTrying to change owner of Associated Token Account...');
    
    try {
      const newOwner = Keypair.generate().publicKey;
      await setAuthority(
        connection,
        payer,
        associatedAccount,
        payer.publicKey,
        AuthorityType.AccountOwner,
        newOwner,
        [],
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID
      );
      console.log('ATA owner changed - unexpected');
    } catch (error) {
      console.log('ATA owner change rejected as expected');
    }
    
    console.log('\nExample completed successfully!');
    console.log('Created 3 types of token accounts and demonstrated ImmutableOwner working correctly.');
  
}

// Run the example
main(); 