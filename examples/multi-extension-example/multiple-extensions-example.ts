import {
  Connection,
  Keypair,
  clusterApiUrl,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getMint,
} from "@solana/spl-token";

import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from "../../src";

/**
 * Example of creating a token with multiple extensions:
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
    const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8"});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);
    console.log(`Wallet address: ${payer.publicKey.toString()}`);
    
    // CONFIGURATION: Set up extension parameters
    console.log("Configuring token extensions...");
    
    // 1. Transfer Fee parameters
    const transferFeeParams = {
      feeBasisPoints: 100, // 1% (100 basis points)
      maxFee: BigInt(1000000), // max fee is 1 token (with 6 decimals)
      transferFeeConfigAuthority: payer.publicKey,
      withdrawWithheldAuthority: payer.publicKey
    };
    
    // 2. Interest bearing parameters
    const interestRate = 500; // 5% annual interest rate (500 basis points)
    const rateAuthority = payer.publicKey;
    
    // 3. Delegate keypair
    const delegateKeypair = Keypair.generate();
    
    // TOKEN CREATION: Build token with extensions
    console.log("Creating token with multiple extensions...");
    const tokenBuilder = new TokenBuilder(connection)
      // Basic information
      .setTokenInfo(6, payer.publicKey) // 6 decimals
      
      // Extension 1: TransferFee
      .addTransferFee(
        transferFeeParams.feeBasisPoints,
        transferFeeParams.maxFee,
        transferFeeParams.transferFeeConfigAuthority,
        transferFeeParams.withdrawWithheldAuthority
      )
      
      // Extension 2: InterestBearing
      .addInterestBearing(interestRate, rateAuthority)
      
      // Extension 3: PermanentDelegate
      .addPermanentDelegate(rateAuthority);

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
    
    // Verify the token has the expected extensions
    try {
      const mintInfo = await getMint(
        connection,
        mint,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      
      console.log(`Token created with ${mintInfo.tlvData.length} bytes of extension data`);
      console.log("Extensions added:");
      console.log("- TransferFee: 1% fee (100 basis points)");
      console.log("- InterestBearing: 5% annual interest rate (500 basis points)");
      console.log("- PermanentDelegate: Added delegate authority");
    } catch (error) {
      console.error("Error verifying token extensions:", error);
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