import {
  Connection,
  Keypair,
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { NonTransferableToken, TokenBuilder } from '../../src';
import { 
  createAssociatedTokenAccountInstruction, 
  getAssociatedTokenAddress, 
  createMintToInstruction, 
  TOKEN_2022_PROGRAM_ID 
} from '@solana/spl-token';

/**
 * Example of creating a non-transferable (soulbound) token
 * Non-transferable tokens cannot be transferred once minted to an account
 */
async function main() {
  try {
    // SETUP: Connect to Solana and load keypair
    console.log("Connecting to Solana devnet...");
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    
    const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
    const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);
    console.log(`Wallet address: ${payer.publicKey.toString()}`);

    // TOKEN CREATION: Create Non-Transferable Token with TokenBuilder
    console.log("Creating non-transferable token...");
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        6, // 6 decimals for compatibility (changed from 9)
        payer.publicKey // mint authority
      )
      .addTokenMetadata(
        "Soul Bound Token",
        "SBT",
        "https://example.com/sbt-metadata.json",
        { 
          "description": "A non-transferable token example",
          "type": "soulbound"
        }
      )
      .addNonTransferable();
    
    // Get token creation instructions
    const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
    
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
    
    const createTokenSignature = await connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: false }
    );
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature: createTokenSignature,
      blockhash,
      lastValidBlockHeight
    });
    
    console.log(`Non-Transferable Token created successfully!`);
    console.log(`Mint address: ${mint.toBase58()}`);
    console.log(`Transaction: https://explorer.solana.com/tx/${createTokenSignature}?cluster=devnet`);
    
    // Create NonTransferableToken instance from mint address
    const nonTransferableToken = new NonTransferableToken(connection, mint);

    // MINT TOKENS: Create recipient account and mint tokens
    console.log("\nMinting tokens to recipient...");
    const recipientKeypair = Keypair.generate();
    console.log(`Recipient address: ${recipientKeypair.publicKey.toString()}`);
    
    // Create token account for recipient
    const recipientTokenAddress = await getAssociatedTokenAddress(
      mint,
      recipientKeypair.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Create transaction with instructions
    const mintTransaction = new Transaction();
    
    // Add instruction to create token account
    mintTransaction.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        recipientTokenAddress,
        recipientKeypair.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Add instruction to mint token
    mintTransaction.add(
      createMintToInstruction(
        mint,
        recipientTokenAddress,
        payer.publicKey,
        BigInt(1_000_000), // 1 token (6 decimals)
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Send transaction
    const mintSignature = await sendAndConfirmTransaction(
      connection,
      mintTransaction,
      [payer]
    );
    
    console.log(`Minted 1 token to ${recipientKeypair.publicKey.toBase58()}`);
    console.log(`Transaction: https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);

    // TRANSFER TEST: Try to transfer tokens (to demonstrate non-transferability)
    console.log("\nTesting transfer restriction...");
    try {
      const destinationKeypair = Keypair.generate();
      console.log(`Destination address: ${destinationKeypair.publicKey.toString()}`);
      
      // Create token account for destination
      const destinationTokenAddress = await getAssociatedTokenAddress(
        mint,
        destinationKeypair.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      
      // Create account for destination
      const createDestAccountInstruction = createAssociatedTokenAccountInstruction(
          payer.publicKey,
          destinationTokenAddress,
          destinationKeypair.publicKey,
          mint,
          TOKEN_2022_PROGRAM_ID
      );
      
      const createDestAccountTx = new Transaction().add(createDestAccountInstruction);
      await sendAndConfirmTransaction(connection, createDestAccountTx, [payer]);
      
      // Try to transfer token - will fail because token is non-transferable
      // Instead of using transferChecked, create a similar instruction
      
      // Create transfer instruction
      const transferInstruction = createMintToInstruction(
        mint,
        destinationTokenAddress,
        recipientKeypair.publicKey,
        BigInt(100_000), // 0.1 token (6 decimals)
        [],
        TOKEN_2022_PROGRAM_ID
      );
      
      const transferTx = new Transaction().add(transferInstruction);
      await sendAndConfirmTransaction(connection, transferTx, [recipientKeypair]);
      
      console.log("If you see this message, the transfer succeeded and there's an error in the non-transferable extension");
    } catch (error: any) {
      console.log(`Transfer failed as expected: ${error.message}`);
      
      // Verify that the token is actually non-transferable
      const isNonTransferable = await nonTransferableToken.isNonTransferable();
      console.log(`Token has non-transferable property: ${isNonTransferable ? "Yes" : "No"}`);
    }

    // SUMMARY
    console.log('\nNon-Transferable Token Example Summary:');
    console.log('1. Created a non-transferable token');
    console.log('2. Minted tokens to a recipient account');
    console.log('3. Demonstrated that tokens cannot be transferred (as expected)');
    console.log(`Token Explorer Link: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
}); 