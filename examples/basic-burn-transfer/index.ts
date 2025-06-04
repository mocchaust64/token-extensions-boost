import { 
  Connection, 
  Keypair,  
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as fs from "fs";
import * as path from "path";
import { TokenBuilder, Token } from "../../src";


// Helper function to wait for a specific time
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Connect to Solana devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Read keypair from solana config file
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  
  console.log("=== Creating token with multiple extensions ===");
  
  // Create a new token with multiple extensions
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)  // 9 decimals
    .addMetadata(                      // Add Metadata extension
      "Multi-Feature Test Token", 
      "MFTT", 
      "https://example.com/token.json",
      {
        "description": "Token demonstrating multiple extensions",
        "creator": payer.publicKey.toString(),
        "website": "https://example.com"
      }
    )
    .addTransferFee(                   // Add TransferFee extension
      100,                            // 1% fee (100 basis points)
      BigInt(1000000000),             // Maximum fee of 1 token (with 9 decimals)
      payer.publicKey,                // Authority to change fee
      payer.publicKey                 // Authority to withdraw fee
    )
    .addPermanentDelegate(             // Add PermanentDelegate extension
      payer.publicKey                 // Permanent delegate
    );
  
  console.log("Creating token with multiple extensions...");
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
  
  // Create and sign transaction
  const transaction = new Transaction().add(...instructions);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = payer.publicKey;
  
  // Sign and send transaction
  transaction.sign(...signers, payer);
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
  
  console.log(`Token has been created: ${mint.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
  
  // Create Token object from mint address
  const token = new Token(connection, mint);
  
  // Set decimals (hardcoded for this example)
  token.setDecimals(9);
  
  // Wait a bit to ensure transaction is confirmed
  console.log("Waiting to confirm transaction...");
  await sleep(3000);
  
  // Create token account for user
  console.log("Creating token account for user...");
  const { instructions: createAccountIx, address: userTokenAddress, accountExists } = 
    await token.createTokenAccountInstructions(payer.publicKey, payer.publicKey);
  
  if (!accountExists) {
    // If account doesn't exist, create transaction to create new one
    const createAccountTx = new Transaction().add(...createAccountIx);
    createAccountTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    createAccountTx.feePayer = payer.publicKey;
    
    // Sign and send transaction
    const userTokenSignature = await sendAndConfirmTransaction(
      connection,
      createAccountTx,
      [payer]
    );
    
    console.log(`User token account: ${userTokenAddress.toString()}`);
    console.log(`Account creation transaction: https://explorer.solana.com/tx/${userTokenSignature}?cluster=devnet`);
  } else {
    console.log(`User token account already exists: ${userTokenAddress.toString()}`);
  }
  
  // Wait a bit to ensure transaction is confirmed
  await sleep(2000);
  
  // Create another account to transfer tokens to
  const recipient = Keypair.generate();
  console.log(`Recipient: ${recipient.publicKey.toString()}`);
  
  console.log("Creating token account for recipient...");
  // Use getOrCreateTokenAccount method from SDK
  const recipientTokenAccount = await token.getOrCreateTokenAccount(
    payer,
    recipient.publicKey,
    false,
    "confirmed",
    { skipPreflight: true }
  );
  console.log(`Recipient token account: ${recipientTokenAccount.address.toString()}`);
  
  // Mint some tokens for the user
  const mintAmount = BigInt(1000_000_000_000);  // 1000 tokens with 9 decimals
  
  // Mint tokens - using createMintToInstructions method from SDK
  console.log(`\n=== Minting ${Number(mintAmount) / 1e9} tokens ===`);
  
  try {
    // Create mint instructions
    const { instructions: mintInstructions } = token.createMintToInstructions(
      userTokenAddress,
      payer.publicKey,
      mintAmount
    );
    
    // Create and send transaction
    const mintTx = new Transaction().add(...mintInstructions);
    mintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    mintTx.feePayer = payer.publicKey;
    
    const mintSignature = await sendAndConfirmTransaction(
      connection,
      mintTx,
      [payer]
    );
    
    console.log(`Minted ${Number(mintAmount) / 1e9} tokens to account ${userTokenAddress.toString()}`);
    console.log(`Mint transaction: https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);
    
    // Wait a bit to ensure transaction is confirmed
    console.log("Waiting to confirm transaction...");
    await sleep(2000);
    
  } catch (error: any) {
    console.error(`Error minting tokens: ${error.message}`);
    process.exit(1);
  }
  
  // Transfer tokens using SDK method that has been fixed
  console.log(`\n=== Transferring tokens ===`);
  const transferAmount = BigInt(500_000_000_000);  // 500 tokens
  
  try {
    // Use the improved createTransferInstructions method from SDK
    // Transfer to the created token account rather than wallet address
    const { instructions: transferInstructions } = await token.createTransferInstructions(
      userTokenAddress,
      recipientTokenAccount.address, // Use the token account that was created
      payer.publicKey,
      transferAmount,
      9, // decimals
      {
        memo: "Transfer token from token-extensions-boost example",
        createDestinationIfNeeded: true,
        allowOwnerOffCurve: true, // Allow addresses that may be off-curve
      }
    );
    
    // Create and send transaction
    const transferTx = new Transaction().add(...transferInstructions);
    transferTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transferTx.feePayer = payer.publicKey;
    
    const transferSignature = await sendAndConfirmTransaction(
      connection,
      transferTx,
      [payer]
    );
    
    console.log(`Transferred ${Number(transferAmount) / 1e9} tokens to ${recipient.publicKey.toString()}`);
    console.log(`Transfer transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
    
    // Due to TransferFee extension, transfer fees will be collected
    console.log(`Estimated transfer fee: ${Number(transferAmount) * 0.01} tokens (1%)`);
    
    // Wait a bit to ensure transaction is confirmed
    console.log("Waiting to confirm transaction...");
    await sleep(2000);
    
  } catch (error: any) {
    console.error(`Error transferring tokens: ${error.message}`);
    console.error(`Error details:`, error);
    
    // No longer need fallback methods as the SDK has been improved
    console.log("If you're still experiencing issues, check your Token, Mint and Associated Token Account configuration");
  }
  
  // Burn tokens - using token.createBurnInstructions method from SDK
  console.log(`\n=== Burning tokens ===`);
  const burnAmount = BigInt(200_000_000_000);  // 200 tokens
  
  try {
    // Create instructions to burn tokens using the SDK
    const { instructions: burnInstructions } = token.createBurnInstructions(
      userTokenAddress,
      payer.publicKey,
      burnAmount,
      9 // decimals
    );
    
    // Create and send transaction
    const burnTx = new Transaction().add(...burnInstructions);
    burnTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    burnTx.feePayer = payer.publicKey;
    
    const burnSignature = await sendAndConfirmTransaction(
      connection,
      burnTx,
      [payer]
    );
    
    console.log(`Burned ${Number(burnAmount) / 1e9} tokens from ${userTokenAddress.toString()}`);
    console.log(`Burn transaction: https://explorer.solana.com/tx/${burnSignature}?cluster=devnet`);
  } catch (error: any) {
    console.error(`Error burning tokens: ${error.message}`);
  }
  
  // Mint additional tokens to recipient to demonstrate permanent delegate
  console.log(`\n=== Minting tokens to recipient for permanent delegate demo ===`);
  try {
    const recipientMintAmount = BigInt(100_000_000_000);  // 100 tokens with 9 decimals
    
    const { instructions: recipientMintInstructions } = token.createMintToInstructions(
      recipientTokenAccount.address,
      payer.publicKey,
      recipientMintAmount
    );
    
    const recipientMintTx = new Transaction().add(...recipientMintInstructions);
    recipientMintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    recipientMintTx.feePayer = payer.publicKey;
    
    const recipientMintSignature = await sendAndConfirmTransaction(
      connection,
      recipientMintTx,
      [payer]
    );
    
    console.log(`Minted ${Number(recipientMintAmount) / 1e9} tokens to recipient for permanent delegate demo`);
    await sleep(2000);
  } catch (error: any) {
    console.error(`Error minting tokens to recipient: ${error.message}`);
  }
  
  // Test transferring tokens using permanent delegate with improved SDK method
  console.log(`\n=== Transferring tokens using Permanent Delegate ===`);
  
  try {
    const delegateTransferAmount = BigInt(50_000_000_000); // 50 tokens
    
    // Use the improved createPermanentDelegateTransferInstructions method from SDK
    const { instructions: delegateTransferInstructions } = await token.createPermanentDelegateTransferInstructions(
      recipientTokenAccount.address,
      userTokenAddress, // Use token account address directly
      payer.publicKey, // permanent delegate
      delegateTransferAmount,
      {
        memo: "Transfer by permanent delegate",
        createDestinationIfNeeded: true,
        decimals: 9, // Provide decimals to avoid blockchain queries
        allowOwnerOffCurve: true, // Allow addresses that may be off-curve
        verifySourceBalance: true // Verify balance before transfer
      }
    );
    
    // Create and send transaction
    const delegateTx = new Transaction().add(...delegateTransferInstructions);
    delegateTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    delegateTx.feePayer = payer.publicKey;
    
    const delegateTransferSignature = await sendAndConfirmTransaction(
      connection,
      delegateTx,
      [payer]
    );
    
    console.log(`Permanent Delegate transferred ${Number(delegateTransferAmount) / 1e9} tokens from recipient's account back to user!`);
    console.log(`Delegate transaction: https://explorer.solana.com/tx/${delegateTransferSignature}?cluster=devnet`);
  } catch (error: any) {
    console.error(`Error using permanent delegate SDK method: ${error.message}`);
    console.error(`Error details:`, error);
  }
  
  console.log(`\n=== Token information ===`);
  console.log(`Mint address: ${mint.toString()}`);
  console.log(`Token details: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
  console.log(`Token metadata: https://example.com/token.json`);
  console.log(`Transfer fee: 1% (100 basis points)`);
  console.log(`Permanent delegate: ${payer.publicKey.toString()}`);
}

main()
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  }); 