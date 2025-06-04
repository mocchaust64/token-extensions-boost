import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { TokenBuilder } from '../../src';
import * as fs from 'fs';
import * as path from 'path';
import { AccountState, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

/**
 * Example of creating a token with specialized extensions:
 * - DefaultAccountState
 * - MintCloseAuthority
 * - TokenMetadata
 */
async function main() {
  try {
    // SETUP: Connect to Solana and load keypair
    console.log("Connecting to Solana devnet...");
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
    const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf-8"});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);
    console.log(`Wallet address: ${payer.publicKey.toBase58()}`);
    
    // TOKEN CREATION: Build token with extensions
    console.log("Creating token with specialized extensions...");
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        6, // 6 decimals for compatibility (changed from 9)
        payer.publicKey, // mint authority
        payer.publicKey // freeze authority
      )
      // Add TokenMetadata
      .addTokenMetadata(
        "Extended Token",
        "EXT",
        "https://example.com/metadata.json",
        { "creator": "Solana SDK Extension Example" }
      )
      // Add DefaultAccountState - set default state for token accounts
      .addDefaultAccountState(AccountState.Initialized)
      
      // Add MintCloseAuthority - allows closing the mint account later
      .addMintCloseAuthority(payer.publicKey);
    
    // Get token creation instructions
    console.log('Creating token...');
    const { instructions, signers, mint } = 
      await tokenBuilder.createTokenInstructions(payer.publicKey);
    
    // Create and configure transaction
    const transaction = new Transaction().add(...instructions);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = payer.publicKey;
    
    // Sign and send transaction
    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }
    transaction.partialSign(payer);
    
    const transactionSignature = await connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: false }
    );
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature: transactionSignature,
      blockhash,
      lastValidBlockHeight
    });
    
    // VERIFICATION: Verify the token has been created successfully
    console.log(`Token created successfully!`);
    console.log(`Mint address: ${mint.toBase58()}`);
    console.log(`Transaction signature: ${transactionSignature}`);
    console.log(`Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    
    // Information about extensions
    console.log('\nExtensions added:');
    console.log(`- DefaultAccountState: All new token accounts will be in Initialized state`);
    console.log(`- MintCloseAuthority: ${payer.publicKey.toBase58()}`);
    console.log(`- TokenMetadata: Name, symbol, and URI added`);
    
    // TESTING: Create a token account and mint tokens for testing
    console.log('\nCreating a test token account...');
    
    // Use spl-token directly to create a token account
    const { 
      getAssociatedTokenAddress, 
      createAssociatedTokenAccountInstruction,
      mintTo: mintToAccount
    } = require('@solana/spl-token');
    
    // Create token account
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mint,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Create transaction for token account
    const accountTransaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAddress,
        payer.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Send transaction
    try {
      const createAccountSignature = await sendAndConfirmTransaction(
        connection,
        accountTransaction,
        [payer]
      );
      console.log(`Token account created successfully: ${associatedTokenAddress.toBase58()}`);
    } catch (error) {
      // Handle error if account already exists
      if (error instanceof Error && error.message.includes('account already exists')) {
        console.log(`Token account already exists: ${associatedTokenAddress.toBase58()}`);
      } else {
        throw error;
      }
    }
    
    console.log(`Token account address: ${associatedTokenAddress.toBase58()}`);
    
    // Mint tokens for testing
    console.log('\nMinting tokens to the account...');
    const amount = BigInt(1_000_000); // 1 token with 6 decimals
    
    // Mint tokens
    const mintSignature = await mintToAccount(
      connection,
      payer,
      mint,
      associatedTokenAddress,
      payer,
      amount,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log(`Minted ${Number(amount) / 1e6} tokens to the account`);
    
    console.log('\nNotes:');
    console.log('1. New token accounts will default to Initialized state');
    console.log('2. The mint account can be closed by the MintCloseAuthority');
    
  } catch (error) {
    console.error('Error creating token:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 