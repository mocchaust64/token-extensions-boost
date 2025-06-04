import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, clusterApiUrl } from '@solana/web3.js';
import { createMint, getMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { CpiGuardExtension } from '../src/extensions/cpi-guard';
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
  try {
    // Connect to devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Load payer wallet
    const payer = loadLocalWallet();
    console.log('Using payer:', payer.publicKey.toBase58());
    
    // Create a simple mint first using the regular createMint function
    console.log('Creating token mint...');
    const mintKeypair = Keypair.generate();
    const decimals = 6;
    
    // Create the mint using TOKEN_2022_PROGRAM_ID
    await createMint(
      connection, 
      payer,                   // payer
      payer.publicKey,         // mint authority
      payer.publicKey,         // freeze authority (optional)
      decimals,                // decimals
      mintKeypair,             // optional keypair
      undefined,               // options
      TOKEN_2022_PROGRAM_ID    // explicitly use Token-2022 program
    );
    
    console.log('Token created successfully!');
    console.log('Mint address:', mintKeypair.publicKey.toBase58());
    
    // Now let's try to initialize CPI Guard on this mint
    console.log('\nInitializing CPI Guard...');
    const cpiGuardExtension = new CpiGuardExtension(connection, mintKeypair.publicKey);
    
    // Create initialize CPI Guard instruction
    const initInstruction = CpiGuardExtension.createInitializeCpiGuardInstruction(
      mintKeypair.publicKey,
      payer.publicKey,  // set payer as the CPI Guard authority
      TOKEN_2022_PROGRAM_ID
    );
    
    // Send transaction
    try {
      const initTransaction = new Transaction().add(initInstruction);
      const initSignature = await sendAndConfirmTransaction(
        connection,
        initTransaction,
        [payer]
      );
      
      console.log('CPI Guard initialized successfully!');
      console.log('Transaction signature:', initSignature);
    } catch (error) {
      console.error('Error initializing CPI Guard:', error);
    }
    
    // Check if CPI Guard is enabled
    console.log('\nChecking CPI Guard status...');
    const isEnabled = await cpiGuardExtension.isCpiGuardEnabled();
    console.log('CPI Guard enabled:', isEnabled);
    
    // Get CPI Guard authority
    const authority = await cpiGuardExtension.getCpiGuardAuthority();
    console.log('CPI Guard authority:', authority?.toBase58() || 'None');
    
    // If not enabled, try to enable it
    if (!isEnabled && authority) {
      console.log('\nEnabling CPI Guard...');
      
      try {
        const enableInstruction = cpiGuardExtension.createEnableCpiGuardInstruction(
          authority
        );
        
        const enableTransaction = new Transaction().add(enableInstruction);
        const enableSignature = await sendAndConfirmTransaction(
          connection,
          enableTransaction,
          [payer]
        );
        
        console.log('CPI Guard enabled successfully!');
        console.log('Transaction signature:', enableSignature);
        
        // Verify the CPI Guard is now enabled
        const isNowEnabled = await cpiGuardExtension.isCpiGuardEnabled();
        console.log('CPI Guard is now enabled:', isNowEnabled);
      } catch (error) {
        console.error('Error enabling CPI Guard:', error);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch((error) => {
  console.error('Main error:', error);
  process.exit(1);
}); 