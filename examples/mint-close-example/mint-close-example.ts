import { 
  Connection, 
  Keypair, 
  clusterApiUrl, 
  Transaction, 
} from '@solana/web3.js';
import { TokenBuilder, MintCloseAuthorityExtension } from '../../src';
import { 
  TOKEN_2022_PROGRAM_ID, 
  getMint,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example of creating a token with MintCloseAuthority and closing the mint account
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

    // Create token with MintCloseAuthority
    console.log('\nCreating token with MintCloseAuthority...');
    
    // Use TokenBuilder from SDK to create token with MintCloseAuthority
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        9, // decimals
        payer.publicKey, // mint authority
        null // freeze authority not needed
      )
      // Add metadata
      .addTokenMetadata(
        "Closeable Mint Token",
        "CLOSE",
        "https://example.com/metadata.json",
        { "description": "Token with MintCloseAuthority" }
      )
      // Add MintCloseAuthority - allows closing the mint account later
      .addMintCloseAuthority(payer.publicKey);
    
    // Create token using the new API
    console.log('Creating token...');
    
    // Get instructions to create token
    const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
    
    // Create and send transaction
    const transaction = tokenBuilder.buildTransaction(instructions, payer.publicKey);
    
    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Sign transaction with all signers
    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }
    transaction.partialSign(payer);
    
    // Send transaction
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

    console.log(`Token created successfully!`);
    console.log(`Mint address: ${mint.toBase58()}`);
    console.log(`Transaction signature: ${transactionSignature}`);
    console.log(`Solana Explorer link: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);

    // Check mint information
    console.log('\nChecking mint information...');
    try {
      const mintInfo = await getMint(
        connection, 
        mint,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      );
      
      console.log('Mint information:');
      console.log(`- Supply: ${mintInfo.supply}`);
      console.log(`- Decimals: ${mintInfo.decimals}`);
      console.log(`- Mint Authority: ${mintInfo.mintAuthority?.toString() || 'None'}`);
      console.log(`- Freeze Authority: ${mintInfo.freezeAuthority?.toString() || 'None'}`);
      
      // MintCloseAuthority information will be in tlvData
      console.log(`- Has Extension Data: ${mintInfo.tlvData && mintInfo.tlvData.length > 0 ? 'Yes' : 'No'}`);
      console.log(`  Number of extensions: ${mintInfo.tlvData ? mintInfo.tlvData.length : 0}`);
      console.log('  Includes MintCloseAuthority with authority: ' + payer.publicKey.toString());
    } catch (error) {
      console.error('Error checking mint information:', error);
    }

    console.log('\nNote: To actually close the mint account, you need to ensure:');
    console.log('1. The token supply is 0');
    console.log('2. You are the MintCloseAuthority');
    console.log('3. The token has no accounts holding it');
    
    // Add the mint account closing section
    console.log('\n----- Performing mint account closure -----');
    
    // Check mint information again
    const mintInfoBeforeClose = await getMint(
      connection, 
      mint,
      'confirmed',
      TOKEN_2022_PROGRAM_ID
    );
    
    // Check if we can close the mint
    if (mintInfoBeforeClose.supply > 0) {
      console.log('Cannot close mint: Token supply is not 0');
    } else {
      console.log('Token supply is 0, mint account can be closed');
      
      try {
        // Use MintCloseAuthorityExtension.createCloseAccountInstruction from SDK to close the mint
        const closeInstruction = MintCloseAuthorityExtension.createCloseAccountInstruction(
          mint,                // Account to close (mint)
          payer.publicKey,     // Destination for lamports
          payer.publicKey,     // Authority that can close the account
          []                   // Multisig signers (default empty array)
        );
        
        // Create and sign transaction
        const closeTransaction = new Transaction().add(closeInstruction);
        const { blockhash: closeBh, lastValidBlockHeight: closeHeight } = await connection.getLatestBlockhash();
        closeTransaction.recentBlockhash = closeBh;
        closeTransaction.lastValidBlockHeight = closeHeight;
        closeTransaction.feePayer = payer.publicKey;
        
        // Sign and send transaction
        closeTransaction.sign(payer);
        const closeSignature = await connection.sendRawTransaction(
          closeTransaction.serialize(),
          { skipPreflight: false }
        );
        
        // Wait for confirmation
        await connection.confirmTransaction({
          signature: closeSignature,
          blockhash: closeBh,
          lastValidBlockHeight: closeHeight
        });
        
        console.log('\nMint account closed successfully!');
        console.log(`Close transaction signature: ${closeSignature}`);
        console.log(`Solana Explorer link: https://explorer.solana.com/tx/${closeSignature}?cluster=devnet`);
        
        // Try to check if the mint account still exists
        try {
          await getMint(
            connection, 
            mint,
            'confirmed',
            TOKEN_2022_PROGRAM_ID
          );
          console.log('Mint account still exists - there might be an issue!');
        } catch (e) {
          console.log('Confirmed mint account no longer exists - closure successful!');
        }
      } catch (error) {
        // Improved error handling
        if (error instanceof Error) {
          console.error('Error closing mint account:', error.message);
          
          if (error.message.includes('not a mint account')) {
            console.log('The account may have already been closed or is not a valid mint account.');
          } else if (error.message.includes('authority mismatch')) {
            console.log('You are not the MintCloseAuthority for this token.');
          } else if (error.message.includes('insufficient funds')) {
            console.log('Not enough SOL in the account to pay transaction fees.');
          }
        } else {
          console.error('Unknown error closing mint account:', error);
        }
      }
    }
    
    console.log('\nMintCloseAuthority example completed!');
    
  } catch (error) {
    // Improved general error handling
    if (error instanceof Error) {
      console.error('Error executing example:', error.message);
      
      if (error.message.includes('FetchError')) {
        console.log('Network error: Check your internet connection or try a different RPC endpoint.');
      } else if (error.message.includes('TokenAccountNotFoundError')) {
        console.log('Token account not found: The specified account does not exist or is not a token account.');
      } else if (error.message.includes('unauthorized')) {
        console.log('Authorization error: You do not have permission to perform this action.');
      }
    } else {
      console.error('Unknown error:', error);
    }
  }
}

// Run the main function
main(); 