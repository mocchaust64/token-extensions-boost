import { Connection, Keypair, clusterApiUrl, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import { TokenBuilder, TokenFreezeExtension, Token } from '../../src';
import { 
  AccountState, 
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Local test for TokenFreezeExtension - using keypair instead of wallet adapter
 * to test basic functionality
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

    // 1. Create token with DefaultAccountState.Initialized
    console.log('\nCreating token with DefaultAccountState.Initialized...');
    
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        6, // decimals (changed from 9 to 6)
        payer.publicKey, // mint authority
        payer.publicKey // freeze authority
      )
      .addTokenMetadata(
        "Freeze Example Token",
        "FRZT",
        "https://example.com/metadata.json",
        { "description": "Token for testing freeze functionality" }
      )
      // Set default state to Initialized (not frozen)
      .addDefaultAccountState(AccountState.Initialized);
    
    // Create token using new API
    console.log('Creating token...');
    
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

    console.log(`Token created successfully!`);
    console.log(`Mint address: ${mint.toBase58()}`);
    console.log(`Transaction signature: ${transactionSignature}`);
    console.log(`Solana Explorer link: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    
    // 2. Create token account
    console.log('\nCreating token account...');
    const token = new Token(connection, mint);
    
    // Get associated token account address
    const associatedTokenAddress = await token.getAssociatedAddress(
      payer.publicKey,
      false
    );
    
    const transaction = new Transaction();
    transaction.add(
      token.createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAddress,
        payer.publicKey
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

    // 3. Mint tokens to account
    console.log('\nMinting tokens to token account...');
    const mintAmount = BigInt(1_000_000); // 1 token with 6 decimals
    
    try {
      // Create necessary instructions to mint tokens
      const { instructions: mintInstructions } = token.createMintToInstructions(
        associatedTokenAddress, // Destination account
        payer.publicKey,        // Mint authority
        mintAmount              // Token amount
      );
      
      // Create transaction with instructions
      const mintTx = new Transaction();
      mintInstructions.forEach(ix => mintTx.add(ix));
      
      // Send and confirm transaction
      const mintSig = await sendAndConfirmTransaction(
        connection,
        mintTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Minted ${Number(mintAmount) / 1e6} tokens to account`);
      console.log(`Transaction signature: ${mintSig}`);
    } catch (error) {
      console.error('Error minting tokens:', error);
    }

    // 4. Check initial state of token account
    console.log('\nChecking initial state of token account...');
    try {
      // Use getAccount from Token class
      const accountInfo = await token.getAccount(
        associatedTokenAddress,
        'confirmed'
      );
      
      console.log('Token account information:');
      console.log(`- State: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      console.log(`- Balance: ${accountInfo.amount}`);
    } catch (error) {
      console.error('Error checking token account:', error);
      return;
    }

    // 5. Freeze token account - Using new API
    console.log('\nFreezing token account...');
    try {
      // Create freeze instruction
      const freezeInstruction = TokenFreezeExtension.createFreezeAccountInstruction(
        associatedTokenAddress,
        mint,
        payer.publicKey
      );
      
      // Create transaction from instruction
      const freezeTx = TokenFreezeExtension.buildTransaction(
        [freezeInstruction],
        payer.publicKey
      );
      
      // Get blockhash
      const freezeBlockhash = await connection.getLatestBlockhash();
      freezeTx.recentBlockhash = freezeBlockhash.blockhash;
      freezeTx.lastValidBlockHeight = freezeBlockhash.lastValidBlockHeight;
      
      // Sign and send transaction
      const freezeSig = await sendAndConfirmTransaction(
        connection,
        freezeTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Token account has been frozen!`);
      console.log(`Transaction signature: ${freezeSig}`);
    } catch (error) {
      console.error('Error freezing token account:', error);
      return;
    }

    // 6. Check state after freezing
    console.log('\nChecking state after freezing...');
    try {
      const accountInfo = await token.getAccount(
        associatedTokenAddress,
        'confirmed'
      );
      
      console.log('Token account information:');
      console.log(`- State: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      console.log(`- Balance: ${accountInfo.amount}`);
    } catch (error) {
      console.error('Error checking token account:', error);
      return;
    }
    
    // 7. Try to transfer from frozen account (should fail)
    console.log('\nTrying to transfer from frozen account (should fail)...');
    
    // Create a new account to receive the transfer
    const recipient = Keypair.generate();
    console.log(`Recipient address: ${recipient.publicKey.toString()}`);
    
    // Create recipient token account
    const recipientTokenAccount = await getAssociatedTokenAddress(
      mint,
      recipient.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Create the account if it doesn't exist
    const createAccountTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        recipientTokenAccount,
        recipient.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    await sendAndConfirmTransaction(
      connection,
      createAccountTx,
      [payer],
      { commitment: 'confirmed' }
    );
    
    console.log(`Recipient token account: ${recipientTokenAccount.toString()}`);
    
    try {
      // Create transfer instruction
      const transferAmount = BigInt(100_000); // 0.1 tokens with 6 decimals
      const transferTx = new Transaction().add(
        createTransferCheckedInstruction(
          associatedTokenAddress,
          mint,
          recipientTokenAccount,
          payer.publicKey,
          transferAmount,
          6,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // Send transaction
      await sendAndConfirmTransaction(
        connection,
        transferTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log('ERROR: Transfer from frozen account succeeded when it should have failed!');
    } catch (error: any) {
      console.log('Transfer from frozen account failed as expected');
      console.log(`Error message: ${error.message}`);
    }
    
    // 8. Thaw the account
    console.log('\nThawing token account...');
    try {
      // Create thaw instruction
      const thawInstruction = TokenFreezeExtension.createThawAccountInstruction(
        associatedTokenAddress,
        mint,
        payer.publicKey
      );
      
      // Create transaction from instruction
      const thawTx = TokenFreezeExtension.buildTransaction(
        [thawInstruction],
        payer.publicKey
      );
      
      // Get blockhash
      const thawBlockhash = await connection.getLatestBlockhash();
      thawTx.recentBlockhash = thawBlockhash.blockhash;
      thawTx.lastValidBlockHeight = thawBlockhash.lastValidBlockHeight;
      
      // Sign and send transaction
      const thawSig = await sendAndConfirmTransaction(
        connection,
        thawTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Token account has been thawed!`);
      console.log(`Transaction signature: ${thawSig}`);
    } catch (error) {
      console.error('Error thawing token account:', error);
      return;
    }
    
    // 9. Check state after thawing
    console.log('\nChecking state after thawing...');
    try {
      const accountInfo = await token.getAccount(
        associatedTokenAddress,
        'confirmed'
      );
      
      console.log('Token account information:');
      console.log(`- State: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      console.log(`- Balance: ${accountInfo.amount}`);
    } catch (error) {
      console.error('Error checking token account:', error);
      return;
    }
    
    // 10. Try to transfer from thawed account (should succeed)
    console.log('\nTrying to transfer from thawed account...');
    try {
      // Create transfer instruction
      const transferAmount = BigInt(100_000); // 0.1 tokens with 6 decimals
      const transferTx = new Transaction().add(
        createTransferCheckedInstruction(
          associatedTokenAddress,
          mint,
          recipientTokenAccount,
          payer.publicKey,
          transferAmount,
          6,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // Send transaction
      const transferSig = await sendAndConfirmTransaction(
        connection,
        transferTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Transfer from thawed account succeeded!`);
      console.log(`Transferred ${Number(transferAmount) / 1e6} tokens`);
      console.log(`Transaction signature: ${transferSig}`);
    } catch (error: any) {
      console.error('Error transferring from thawed account:', error);
      console.error(`Error message: ${error.message}`);
    }
    
    console.log('\nToken Freeze Extension example completed!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run main function
main(); 