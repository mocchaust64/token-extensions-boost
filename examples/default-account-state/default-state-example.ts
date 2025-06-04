import { Connection, Keypair, clusterApiUrl,  Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TokenBuilder } from '../../src';
import { 
  AccountState, 
  getAssociatedTokenAddress, 
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example of creating a token with DefaultAccountState and checking token account status
 */
async function main() {
  try {
    // Connect to Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Read keypair from file
    console.log('Reading keypair from file...');
    const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
    const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf-8"});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);
    console.log(`Wallet address: ${payer.publicKey.toBase58()}`);

    // 1. Create token with DefaultAccountState.Frozen
    console.log('\nCreating token with DefaultAccountState.Frozen...');
    
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        9, // decimals
        payer.publicKey, // mint authority
        payer.publicKey // freeze authority
      )
      .addMetadata(
        "Frozen by Default Token",
        "FROZ",
        "https://example.com/metadata.json",
        { "description": "Token with DefaultAccountState.Frozen" }
      )
      // Set default state as Frozen
      .addDefaultAccountState(AccountState.Frozen);
    
    // Create token using the new API
    console.log('Creating token...');
    
    // Get instructions instead of directly creating token
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
    const transactionSignature = await connection.sendRawTransaction(
      tokenTransaction.serialize(),
      { skipPreflight: false }
    );
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature: transactionSignature,
      blockhash,
      lastValidBlockHeight
    });

    // Add console.log after successful transaction
    console.log(`Token created successfully!`);
    console.log(`Mint address: ${mint.toBase58()}`);
    console.log(`Transaction signature: ${transactionSignature}`);
    console.log(`Solana Explorer link: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    
    // 2. Create token account
    console.log('\nCreating token account for token with DefaultAccountState.Frozen...');
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mint,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Instead of using token.createOrGetTokenAccount, use Token core method
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAddress,
        payer.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );

    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer],
        { commitment: 'confirmed' }
      );
      console.log(`Token account created at: ${associatedTokenAddress.toBase58()}`);
      console.log(`Transaction signature: ${signature}`);
    } catch (error: any) {
      if (error.message.includes("account already exists")) {
        console.log(`Token account already exists: ${associatedTokenAddress.toBase58()}`);
      } else {
        throw error;
      }
    }

    // 3. Mint tokens to the account
    console.log('\nMinting tokens to the token account...');
    const mintAmount = BigInt(1_000_000_000); // 1 token with 9 decimals
    
    // Use Token core
    const mintTx = new Transaction();
    mintTx.add(
      createMintToInstruction(
        mint,
        associatedTokenAddress,
        payer.publicKey,
        mintAmount
      )
    );
    
    try {
      const mintSig = await sendAndConfirmTransaction(
        connection,
        mintTx,
        [payer],
        { commitment: 'confirmed' }
      );
      console.log(`Minted ${Number(mintAmount) / 1e9} tokens to the account`);
      console.log(`Transaction signature: ${mintSig}`);
    } catch (error) {
      console.error('Error minting tokens:', error);
    }

    // 4. Check token account state
    console.log('\nChecking token account state...');
    try {
      const accountInfo = await getAccount(
        connection,
        associatedTokenAddress,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      );
      
      console.log('Token account information:');
      console.log(`- State: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      console.log(`- Balance: ${accountInfo.amount}`);
      
      if (accountInfo.isFrozen) {
        console.log('✅ DefaultAccountState works correctly! New account was created with Frozen state.');
      } else {
        console.log('❌ DefaultAccountState is not working as expected. Account is not in Frozen state.');
      }
    } catch (error) {
      console.error('Error checking token account:', error);
    }

    // 5. Create another token with DefaultAccountState.Initialized for comparison
    console.log('\nCreating token with DefaultAccountState.Initialized for comparison...');
    
    const initializedTokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        9, // decimals
        payer.publicKey, // mint authority
        payer.publicKey  // freeze authority
      )
      .addMetadata(
        "Initialized by Default Token",
        "INIT",
        "https://example.com/metadata.json",
        { "description": "Token with DefaultAccountState.Initialized" }
      )
      // Set default state as Initialized
      .addDefaultAccountState(AccountState.Initialized);
    
    // Create second token using the new API
    console.log('Creating second token...');
    
    // Get instructions instead of directly creating token
    const { instructions: secondInstructions, signers: secondSigners, mint: secondMint } = 
      await initializedTokenBuilder.createTokenInstructions(payer.publicKey);
    
    // Create and sign transaction
    const secondTokenTx = new Transaction().add(...secondInstructions);
    const secondBlockhashInfo = await connection.getLatestBlockhash();
    secondTokenTx.recentBlockhash = secondBlockhashInfo.blockhash;
    secondTokenTx.lastValidBlockHeight = secondBlockhashInfo.lastValidBlockHeight;
    secondTokenTx.feePayer = payer.publicKey;
    
    // Sign and send transaction
    secondTokenTx.sign(...secondSigners, payer);
    const secondTokenSignature = await connection.sendRawTransaction(
      secondTokenTx.serialize(),
      { skipPreflight: false }
    );
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature: secondTokenSignature,
      blockhash: secondBlockhashInfo.blockhash,
      lastValidBlockHeight: secondBlockhashInfo.lastValidBlockHeight
    });
    
    console.log(`Second token created successfully! Mint address: ${secondMint.toBase58()}`);

    // 6. Create token account for second token
    console.log('\nCreating token account for second token with DefaultAccountState.Initialized...');
    
    const secondTokenAddress = await getAssociatedTokenAddress(
      secondMint,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Instead of using token.createOrGetTokenAccount, use Token core method
    const txSecond = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        secondTokenAddress,
        payer.publicKey,
        secondMint,
        TOKEN_2022_PROGRAM_ID
      )
    );

    try {
      const sigSecond = await sendAndConfirmTransaction(
        connection,
        txSecond,
        [payer],
        { commitment: 'confirmed' }
      );
      console.log(`Second token account created at: ${secondTokenAddress.toBase58()}`);
      console.log(`Transaction signature: ${sigSecond}`);
    } catch (error: any) {
      if (error.message.includes("account already exists")) {
        console.log(`Second token account already exists: ${secondTokenAddress.toBase58()}`);
      } else {
        throw error;
      }
    }

    // 7. Check second token account state
    console.log('\nChecking second token account state...');
    try {
      const accountInfo = await getAccount(
        connection,
        secondTokenAddress,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      );
      
      console.log('Second token account information:');
      console.log(`- State: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      console.log(`- Balance: ${accountInfo.amount}`);
      
      if (!accountInfo.isFrozen) {
        console.log('✅ DefaultAccountState works correctly! New account was created with Initialized state.');
      } else {
        console.log('❌ DefaultAccountState is not working as expected. Account is not in Initialized state.');
      }
    } catch (error) {
      console.error('Error checking second token account:', error);
    }

    console.log('\nDefaultAccountState example completed!');
    
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Run the main function
main(); 