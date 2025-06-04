import {
  Connection,
  Keypair,
  clusterApiUrl,
  Transaction,
} from "@solana/web3.js";
import {
  getTokenMetadata, 
} from "@solana/spl-token";

import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from "../../src";

/**
 * Example of creating a token with metadata and multiple extensions:
 * - TokenMetadata
 * - TransferFee
 * - InterestBearing
 * - PermanentDelegate
 */
async function main() {
  try {
    // SETUP: Connect to Solana and load keypair
    console.log("Connecting to Solana devnet...");
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    
    const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
    const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf-8"});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);
    console.log(`Wallet address: ${payer.publicKey.toString()}`);

    // CONFIGURATION: Set up delegate keypair
    console.log("Configuring token extensions...");
    const delegateKeypair = Keypair.generate();
    
    // TOKEN CREATION: Build token with extensions
    console.log("Creating token with metadata and multiple extensions...");
    const tokenBuilder = new TokenBuilder(connection)
      // Basic information - changed from 9 to 6 decimals
      .setTokenInfo(
        6, // 6 decimals for compatibility
        payer.publicKey // mint authority
      )
      
      // Extension 1: Metadata - Using addTokenMetadata
      .addTokenMetadata(
        "Example Token",
        "EXTKN",
        "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
        {
          "description": "A token with metadata and multiple extensions",
          "website": "https://example.com"
        }
      )
      
      // Extension 2: TransferFee (0.5% transfer fee)
      .addTransferFee(
        50, // 0.5% (50 basis points)
        BigInt(500000), // maxFee (0.5 token with 6 decimals)
        payer.publicKey, // transferFeeConfigAuthority
        payer.publicKey  // withdrawWithheldAuthority
      )
      
      // Extension 3: InterestBearing (0.1% interest rate)
      .addInterestBearing(10, payer.publicKey)
      
      // Extension 4: PermanentDelegate
      .addPermanentDelegate(delegateKeypair.publicKey);
    
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
    console.log(`Mint address: ${mint.toString()}`);
    console.log(`Transaction signature: ${transactionSignature}`);
    console.log(`Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    
    // Display token metadata
    try {
      const tokenMetadata = await getTokenMetadata(
        connection,
        mint,
        "confirmed"
      );
      
      console.log("\nToken metadata:");
      console.log(`Name: ${tokenMetadata?.name}`);
      console.log(`Symbol: ${tokenMetadata?.symbol}`);
      console.log(`URI: ${tokenMetadata?.uri}`);
      
      console.log("\nExtensions added:");
      console.log("- TokenMetadata: Name, symbol, and URI added");
      console.log("- TransferFee: 0.5% fee (50 basis points)");
      console.log("- InterestBearing: 0.1% interest rate (10 basis points)");
      console.log("- PermanentDelegate: Added delegate authority");
    } catch (error) {
      console.error("Error retrieving token metadata:", error);
    }
  } catch (error) {
    console.error("Error creating token:", error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 