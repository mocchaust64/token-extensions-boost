import {
  Connection,
  Keypair,
  clusterApiUrl,
  Commitment,
  ConfirmOptions,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import * as fs from 'fs';
import * as path from 'path';
import {
  TokenBuilder, 
  NonTransferableToken 
} from "../../src";

/**
 * Example of creating a token with metadata and various extensions
 */
async function main() {
  // Connection configuration
  const commitment: Commitment = "confirmed";
  const confirmOptions: ConfirmOptions = {
    skipPreflight: true, // Skip preflight check to reduce errors
    commitment,
    maxRetries: 5,
  };
  
  // Connect to Solana devnet with alternative endpoint and longer timeout
  console.log("Connecting to Solana devnet...");
  const connection = new Connection(clusterApiUrl("devnet"), {
    commitment,
    confirmTransactionInitialTimeout: 60000, // 60 seconds
    disableRetryOnRateLimit: false,
  });
  
  // Load wallet from local file
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
     const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8"});
     const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
     const payer = Keypair.fromSecretKey(secretKey);
     
  console.log("Wallet address:", payer.publicKey.toString());
  console.log("\n===== Creating token with metadata and extensions =====");

  // Metadata configuration
  const metadata = {
    name: "OPOS",
    symbol: "OPOS",
    uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
    additionalMetadata: {
         "trait_type": "Item",
    "value": "Developer Portal"
    }
};

  console.log("Creating token with TokenBuilder...");
  
  // Create TokenBuilder - Version 1: Only with NonTransferable
  console.log("--- Test 1: Token with NonTransferable Extension ---");
  const tokenBuilder1 = new TokenBuilder(connection)
    .setTokenInfo(6, payer.publicKey)
    .addNonTransferable();
  
  // Create TokenBuilder - Version 2: Only with Metadata
  console.log("--- Test 2: Token with Metadata Extension ---");
  const tokenBuilder2 = new TokenBuilder(connection)
    .setTokenInfo(6, payer.publicKey)
    .addTokenMetadata(
      metadata.name,
      metadata.symbol,
      metadata.uri,
      metadata.additionalMetadata
    );
  
  // Create delegate keypair for PermanentDelegate extension
  const delegateKeypair = Keypair.generate();
  console.log("Delegate public key:", delegateKeypair.publicKey.toString());
  
  // Create TokenBuilder - Version 3: Combining multiple extensions
  console.log("--- Test 3: Token with multiple combined Extensions ---");
  const tokenBuilder3 = new TokenBuilder(connection)
    .setTokenInfo(6, payer.publicKey)
    // Extension 1: Metadata
    .addTokenMetadata(
      metadata.name,
      metadata.symbol,
      metadata.uri,
      metadata.additionalMetadata
    )
    // Extension 2: TransferFee (0.5% transfer fee)
    .addTransferFee(
      50, // 0.5% (50 basis points)
      BigInt(500000), // maxFee (0.5 token with 6 decimals)
      payer.publicKey, // transferFeeConfigAuthority
      payer.publicKey  // withdrawWithheldAuthority
    )
    // Extension 3: PermanentDelegate
    .addPermanentDelegate(
      delegateKeypair.publicKey
    )
    // Extension 4: InterestBearing (0.1% interest rate)
    .addInterestBearing(
      0.1, // 0.1% interest rate
      payer.publicKey // rateAuthority
    );

  // Create TokenBuilder - Version 4: Combining Metadata and NonTransferable (non-transferable)
  console.log("--- Test 4: Token with Metadata, NonTransferable and other extensions ---");
  const tokenBuilder4 = new TokenBuilder(connection)
    .setTokenInfo(6, payer.publicKey)
    // Extension 1: NonTransferable - Token cannot be transferred
    .addNonTransferable()
    // Extension 2: Metadata - Token description information
    .addTokenMetadata(
      metadata.name,
      metadata.symbol,
      metadata.uri,
      metadata.additionalMetadata
    )
    // Extension 3: PermanentDelegate - Permanent delegation
    // Although the token cannot be transferred by the owner, permanent delegate still has special rights
    .addPermanentDelegate(
      delegateKeypair.publicKey
    )
    // Extension 4: InterestBearing - Token can generate interest
    // Non-transferable token can still generate interest
    .addInterestBearing(
      0.2, // 0.2% interest rate
      payer.publicKey // rateAuthority
    );
  
  // Execute test 1: Only NonTransferable
  const startTime = Date.now();
  
  // Create and test token with NonTransferable
  await createAndTestToken(tokenBuilder1, payer, connection, "NonTransferable", startTime);
  
  // Execute test 2: Only Metadata
  const startTime2 = Date.now();
  await createAndTestToken(tokenBuilder2, payer, connection, "Metadata", startTime2);
  
  // Execute test 3: Combining multiple extensions (transferable)
  const startTime3 = Date.now();
  await createAndTestToken(tokenBuilder3, payer, connection, "Multiple combined Extensions", startTime3);

  // Execute test 4: Combining Metadata and NonTransferable
  const startTime4 = Date.now();
  await createAndTestToken(tokenBuilder4, payer, connection, "Metadata+NonTransferable", startTime4);
}

/**
 * Test the NonTransferable feature of the token
 */
async function testNonTransferable(connection: Connection, mint: PublicKey, payer: Keypair) {
  console.log("\n===== Testing NonTransferable feature =====");
  
  try {
    // Create instance of NonTransferableToken
    const nonTransferableToken = new NonTransferableToken(connection, mint);
    
    // Create destination wallet
    const destinationWallet = Keypair.generate();
    console.log(`Trying to transfer token from ${payer.publicKey.toString()} to ${destinationWallet.publicKey.toString()}`);
    
    const transferAmount = BigInt(1000000); // 1 token with 6 decimals
    
    // Mint tokens into source account
    console.log("Minting tokens into source account...");
    
    try {
      // Create token account and mint tokens
      // First create a token account for the source
      const { instructions: createAccountInstructions, address: sourceAddress } = 
        await nonTransferableToken.createTokenAccountInstructions(payer.publicKey, payer.publicKey);
      
      // Mint tokens to the source account
      const { instructions: mintInstructions } = 
        await nonTransferableToken.createMintToInstructions(
          sourceAddress,
          payer.publicKey,
          transferAmount
        );
      
      // Create combined instructions
      const allInstructions = [...createAccountInstructions, ...mintInstructions];
      
      // Create transaction
      const transaction = new Transaction().add(...allInstructions);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      
      // Send transaction
      console.log("Sending transaction to create token...");
      const mintSignature = await connection.sendTransaction(
        transaction, 
        [payer], 
        { skipPreflight: true }
      );
      
      console.log(`Mint transaction sent: ${mintSignature}`);
      try {
        // Confirm transaction with simpler approach
        await connection.confirmTransaction(mintSignature, "confirmed");
        console.log(`Minted ${Number(transferAmount) / 10**6} tokens to account: ${sourceAddress.toString()}`);
      } catch (mintConfirmError) {
        console.warn("Could not confirm mint transaction:", mintConfirmError);
        // Check transaction status
        const status = await connection.getSignatureStatus(mintSignature);
        if (status && status.value && !status.value.err) {
          console.log("Mint transaction seems to be successful even though it could not be confirmed!");
          console.log(`Minted ${Number(transferAmount) / 10**6} tokens to account: ${sourceAddress.toString()}`);
        } else {
          throw new Error("Mint transaction was not successful");
        }
      }
      
      // Create destination token account
      console.log("Creating destination account...");
      const { instructions: destInstructions, address: destinationAddress } = 
        await nonTransferableToken.createTokenAccountInstructions(
          payer.publicKey,
          destinationWallet.publicKey
        );
        
      // Create transaction - payer will pay fees and sign transaction, no need for destinationWallet to sign
      const destTx = new Transaction().add(...destInstructions);
      const destBlockhash = await connection.getLatestBlockhash();
      destTx.recentBlockhash = destBlockhash.blockhash;
      destTx.lastValidBlockHeight = destBlockhash.lastValidBlockHeight;
      destTx.feePayer = payer.publicKey; // Ensure payer is the fee payer
      
      // Send transaction
      console.log("Sending transaction to create destination account...");
      const destSignature = await connection.sendTransaction(
        destTx, 
        [payer], // Only payer needs to sign, not destinationWallet
        { skipPreflight: true }
      );
      
      console.log(`Destination transaction sent: ${destSignature}`);
      try {
        // Confirm transaction with simpler approach
        await connection.confirmTransaction(destSignature, "confirmed");
        console.log(`Created destination account: ${destinationAddress.toString()}`);
      } catch (destConfirmError) {
        console.warn("Could not confirm account creation transaction:", destConfirmError);
        // Check transaction status
        const status = await connection.getSignatureStatus(destSignature);
        if (status && status.value && !status.value.err) {
          console.log("Account creation transaction seems to be successful even though it could not be confirmed!");
          console.log(`Created destination account: ${destinationAddress.toString()}`);
        } else {
          throw new Error("Account creation transaction was not successful");
        }
      }
      
      // Try to transfer tokens
      console.log(`Trying to transfer ${Number(transferAmount) / 10**6} tokens...`);
      
      try {
        // Create token transfer transaction
        const { instructions: transferInstructions } = await nonTransferableToken.createTransferInstructions(
          sourceAddress,
          destinationAddress,
          payer.publicKey,
          transferAmount,
          6
        );
        
        // Create and setup transaction
        const transferTx = new Transaction().add(...transferInstructions);
        const transferBlockhash = await connection.getLatestBlockhash();
        transferTx.recentBlockhash = transferBlockhash.blockhash;
        transferTx.lastValidBlockHeight = transferBlockhash.lastValidBlockHeight;
        transferTx.feePayer = payer.publicKey;
        
        // Send transaction
        console.log("Sending token transfer transaction...");
        console.log(`Transferring ${Number(transferAmount) / 10**6} tokens from ${sourceAddress.toString()} to ${destinationAddress.toString()}`);
        
        const transferSignature = await connection.sendTransaction(
          transferTx, 
          [payer], 
          { skipPreflight: true }
        );
        
        console.log(`Transfer transaction sent: ${transferSignature}`);
        
        try {
          // Confirm transaction with simpler approach
          await connection.confirmTransaction(transferSignature, "confirmed");
          
          // Check detailed status of the transaction
          const txInfo = await connection.getTransaction(transferSignature, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed"
          });
          
          if (txInfo && txInfo.meta && txInfo.meta.err) {
            // Transaction has an error - this is expected with NonTransferable
            console.log("✅ Transaction failed as expected: ", JSON.stringify(txInfo.meta.err));
            console.log("✅ NonTransferable is working correctly! Token CANNOT be transferred.");
            
            // Check if it's a NonTransferable error (0x25)
            const errorString = JSON.stringify(txInfo.meta.err);
            if (errorString.includes("0x25")) {
              console.log("✅ Confirmed: Error 0x25 - NonTransferableTokenError");
            }
          } else {
            // Transaction succeeded - this should not happen with NonTransferable token
            console.log("⚠️ Token could be transferred -> NonTransferable NOT working!");
            console.log(`Explorer: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
          }
        } catch (confirmError) {
          console.log("Could not confirm token transfer transaction:", confirmError);
          
          // Check transaction status
          const status = await connection.getSignatureStatus(transferSignature);
          if (status && status.value && status.value.err) {
            console.log("Transaction failed:", status.value.err);
            
            const errorString = JSON.stringify(status.value.err);
            if (errorString.includes("NonTransferable") || 
                errorString.includes("0x75") || 
                errorString.includes("non-transferable")) {
              console.log("✅ Confirmed: Token CANNOT be transferred -> NonTransferable working correctly!");
            } else {
              console.log("❌ Different error, not related to NonTransferable:");
              console.log(errorString);
            }
          }
        }
      } catch (transferError) {
        console.error("Error creating/sending token transfer transaction:", transferError);
        
        const errorString = transferError instanceof Error ? 
          transferError.toString() : String(transferError);
      
        if (errorString.includes("NonTransferable") || 
            errorString.includes("0x75") || 
            errorString.includes("non-transferable")) {
          console.log("✅ Confirmed: Token CANNOT be transferred -> NonTransferable working correctly!");
        } else {
          console.log("❌ Different error, not related to NonTransferable:");
          console.log(errorString);
        }
      }
    } catch (mintError) {
      console.error("Error when minting token:", mintError);
    }
  } catch (error) {
    console.error("Error testing NonTransferable:", error);
  }
  
  console.log("\n===== TEST COMPLETED =====");
}

/**
 * Function to create and test token with specific extensions
 */
async function createAndTestToken(
  tokenBuilder: any, 
  payer: Keypair, 
  connection: Connection, 
  testName: string,
  startTime: number
) {
  console.log(`\n===== Creating token with ${testName} extension =====`);
  
  try {
    // Create instructions and signers
    console.log("Creating token instructions...");
    const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
    
    // Create and sign transaction
    console.log("Creating transaction...");
    const transaction = tokenBuilder.buildTransaction(instructions, payer.publicKey);
    
    // Get new blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Send transaction
    console.log("Sending token creation transaction...");
    const signature = await connection.sendTransaction(
      transaction, 
      [payer, ...signers],
      { skipPreflight: true }
    );
    
    console.log(`Transaction sent: ${signature}`);
    console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Confirm transaction
    console.log("Waiting for transaction confirmation...");
    try {
      // Confirm transaction with simpler approach
      await connection.confirmTransaction(signature, "confirmed");
      
      console.log("Transaction confirmed successfully!");
      console.log(`Token created successfully!`);
      console.log(`Mint address: ${mint.toString()}`);
      console.log(`Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
      
      const endTime = Date.now();
      console.log(`Total time: ${(endTime - startTime)/1000} seconds`);
      
      // If it's a NonTransferable token, test this feature
      if (testName === "NonTransferable") {
        await testNonTransferable(connection, mint, payer);
      }
      
      return mint;
    } catch (confirmError) {
      console.warn("Could not confirm transaction:", confirmError);
      
      // Manually check transaction status
      console.log("Checking transaction status...");
      
      try {
        const status = await connection.getSignatureStatus(signature);
        console.log("Transaction status:", status);
        
        if (status && status.value && !status.value.err) {
          console.log("Transaction seems to be successful even though it could not be confirmed!");
          console.log(`Token may have been created successfully.`);
          console.log(`Mint address: ${mint.toString()}`);
          console.log(`Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
          
          // If it's a NonTransferable token, test this feature
          if (testName === "NonTransferable") {
            await testNonTransferable(connection, mint, payer);
          }
          
          return mint;
        }
      } catch (statusError) {
        console.error("Could not check transaction status:", statusError);
      }
    }
  } catch (error) {
    console.error(`Error creating token ${testName}:`, error);
  }
  
  return null;
}

main().catch(error => {
  console.error("General error:", error);
}); 