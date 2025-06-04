import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getTokenMetadata, 
} from "@solana/spl-token";

import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from "../../src";
import { TokenMetadataToken } from "../../src/extensions/token-metadata";

/**
 * Mock wallet adapter interface
 */
interface MockWalletAdapter {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
}

/**
 * Get SOL balance of an address
 */
async function getBalance(connection: Connection, address: PublicKey): Promise<number> {
  const balance = await connection.getBalance(address);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Utility function to print token metadata
 */
async function printTokenMetadata(connection: Connection, mint: PublicKey) {
  try {
    const tokenMetadata = await getTokenMetadata(
      connection,
      mint,
      "confirmed"
    );
    
    console.log("-".repeat(50));
    console.log(`Token name: ${tokenMetadata?.name}`);
    console.log(`Token symbol: ${tokenMetadata?.symbol}`);
    console.log(`Token URI: ${tokenMetadata?.uri}`);
    
    if (tokenMetadata?.additionalMetadata && tokenMetadata.additionalMetadata.length > 0) {
      console.log("Additional metadata:");
      for (const [key, value] of tokenMetadata.additionalMetadata) {
        console.log(`  ${key}: ${value}`);
      }
    }
    console.log("-".repeat(50));
  } catch (error) {
    console.error("Could not fetch token metadata:", error);
  }
}

/**
 * Test the optimized method for cost-effective metadata updates
 * Combining test cases to evaluate the effectiveness of improvements
 */
async function testMetadataOptimization() {
  console.log("🚀 STARTING METADATA OPTIMIZATION TEST");
  console.log("=".repeat(80));

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  try {
    // Load keypair from file for testing
    let wallet: Keypair;
    
    // Try loading from default location first
    try {
      const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
      const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf-8"});
      const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
      wallet = Keypair.fromSecretKey(secretKey);
    } catch (e) {
      // Try loading from current directory if failed
      try {
        const secretKeyString = fs.readFileSync("keypair.json", {encoding: "utf-8"});
        const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
        wallet = Keypair.fromSecretKey(secretKey);
      } catch (e2) {
        // Create new keypair if not found
        console.log("⚠️ Keypair not found, creating new keypair for testing...");
        wallet = Keypair.generate();
        
        // Write new keypair to file for future use
        fs.writeFileSync('keypair.json', JSON.stringify(Array.from(wallet.secretKey)));
      }
    }
    
    console.log(`🔑 Using wallet: ${wallet.publicKey.toString()}`);
    
    // Check initial balance
    const initialBalance = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Initial balance: ${initialBalance.toFixed(6)} SOL`);
    
    // If balance too low, request token transfer
    if (initialBalance < 0.1) {
      console.log(`⚠️ Insufficient balance to run tests. Please transfer at least 0.1 SOL to address: ${wallet.publicKey.toString()}`);
      console.log("Press Ctrl+C to exit and try again after adding SOL.");
      return;
    }
    
    // Create mock wallet adapter
    const mockWallet: MockWalletAdapter = {
      publicKey: wallet.publicKey,
      signTransaction: async (transaction: Transaction) => {
        // Simulate signing transaction like a real wallet
        transaction.sign(wallet);
        return transaction;
      }
    };
    
    console.log("✅ Mock wallet adapter created");
    
    // Step 1: Create test token with metadata
    console.log("\n📝 STEP 1: Creating test token with metadata...");
    
    const tokenBuilder = new TokenBuilder(connection);
    tokenBuilder
      .setTokenInfo(6, wallet.publicKey)
      .addTokenMetadata(
        "Optimized Test Token",
        "OTT",
        "https://example.com/optimized-metadata.json",
        {
          "description": "Token to test metadata update optimization"
        }
      );
    
    console.log("⏳ Creating token...");
    
    // Get instructions to create token
    const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(wallet.publicKey);
    
    // Create and send transaction
    const createTx = new Transaction().add(...instructions);
    createTx.feePayer = wallet.publicKey;
    createTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    const createTokenSignature = await sendAndConfirmTransaction(
      connection,
      createTx,
      [wallet, ...signers],
      { commitment: 'confirmed', skipPreflight: true }
    );
    
    console.log(`✅ Token created: ${mint.toString()}`);
    console.log(`📊 Transaction: https://explorer.solana.com/tx/${createTokenSignature}?cluster=devnet`);
    
    // Print initial metadata
    await printTokenMetadata(connection, mint);
    
    // Record balance after token creation
    const balanceAfterCreate = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Balance after token creation: ${balanceAfterCreate.toFixed(6)} SOL (Cost: ${(initialBalance - balanceAfterCreate).toFixed(6)} SOL)`);
    
    // Load token with metadata extension
    const tokenWithMetadata = await TokenMetadataToken.fromMint(connection, mint);
    if (!tokenWithMetadata) {
      throw new Error("Token not found or does not have metadata extension");
    }
    
    // TEST CASE 1: Update with shorter value (no additional allocation needed)
    console.log("\n🧪 TEST CASE 1: Update with shorter value...");
    const balanceBeforeCase1 = await getBalance(connection, wallet.publicKey);
    
    // Update description with shorter value
    const shorterDescription = "Short test";
    const case1Result = await tokenWithMetadata.updateMetadataOptimized(
      connection,
      mockWallet,
      "description",
      shorterDescription,
      { priorityLevel: 'low', allocateStorage: true }
    );
    
    console.log(`✅ Updated description to "${shorterDescription}"`);
    console.log(`📊 Transaction: https://explorer.solana.com/tx/${case1Result.signature}?cluster=devnet`);
    
    const balanceAfterCase1 = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Cost to update SHORTER value: ${(balanceBeforeCase1 - balanceAfterCase1).toFixed(6)} SOL`);
    
    // Print metadata after update
    await printTokenMetadata(connection, mint);

    // TEST CASE 2: Update with longer value (additional allocation needed)
    console.log("\n🧪 TEST CASE 2: Update with longer value...");
    const balanceBeforeCase2 = await getBalance(connection, wallet.publicKey);
    
    // Update description with longer value
    const longerDescription = "This is a much longer description to test additional space allocation. With the optimized algorithm, we only pay for the additional increase.";
    const case2Result = await tokenWithMetadata.updateMetadataOptimized(
      connection,
      mockWallet,
      "description",
      longerDescription,
      { priorityLevel: 'low', allocateStorage: true }
    );
    
    console.log(`✅ Updated description to longer value`);
    console.log(`📊 Transaction: https://explorer.solana.com/tx/${case2Result.signature}?cluster=devnet`);
    
    const balanceAfterCase2 = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Cost to update LONGER value: ${(balanceBeforeCase2 - balanceAfterCase2).toFixed(6)} SOL`);
    
    // Print metadata after update
    await printTokenMetadata(connection, mint);

    // TEST CASE 3: Add new metadata field (additional allocation needed)
    console.log("\n🧪 TEST CASE 3: Add new metadata field...");
    const balanceBeforeCase3 = await getBalance(connection, wallet.publicKey);
    
    // Add new website field
    const website = "https://example.com/token";
    const case3Result = await tokenWithMetadata.updateMetadataOptimized(
      connection,
      mockWallet,
      "website",
      website,
      { priorityLevel: 'low', allocateStorage: true }
    );
    
    console.log(`✅ Added website field`);
    console.log(`📊 Transaction: https://explorer.solana.com/tx/${case3Result.signature}?cluster=devnet`);
    
    const balanceAfterCase3 = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Cost to add NEW field: ${(balanceBeforeCase3 - balanceAfterCase3).toFixed(6)} SOL`);
    
    // Print metadata after update
    await printTokenMetadata(connection, mint);

    // TEST CASE 4: Update field with equivalent value length (no additional allocation needed)
    console.log("\n🧪 TEST CASE 4: Update field with equivalent value length...");
    const balanceBeforeCase4 = await getBalance(connection, wallet.publicKey);
    
    // Update website with value of equivalent length
    const newWebsite = "https://tokenui.example.org";
    const case4Result = await tokenWithMetadata.updateMetadataOptimized(
      connection,
      mockWallet,
      "website",
      newWebsite,
      { priorityLevel: 'low', allocateStorage: true }
    );
    
    console.log(`✅ Updated website field to "${newWebsite}"`);
    console.log(`📊 Transaction: https://explorer.solana.com/tx/${case4Result.signature}?cluster=devnet`);
    
    const balanceAfterCase4 = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Cost to update EQUIVALENT length value: ${(balanceBeforeCase4 - balanceAfterCase4).toFixed(6)} SOL`);
    
    // Print metadata after update
    await printTokenMetadata(connection, mint);

    // TEST CASE 5: Update multiple fields at once
    console.log("\n🧪 TEST CASE 5: Update multiple fields at once...");
    const balanceBeforeCase5 = await getBalance(connection, wallet.publicKey);
    
    // Fields to update
    const fieldsToUpdate = {
      "twitter": "@storage_test_token",
      "telegram": "@storage_test_group",
      "discord": "https://discord.gg/storage_test",
      "github": "https://github.com/storage_test",
    };
    
    // Use batch update method
    const case5Result = await tokenWithMetadata.updateMetadataBatchOptimized(
      connection,
      mockWallet,
      fieldsToUpdate,
      { priorityLevel: 'low', allocateStorage: true, maxFieldsPerTransaction: 4 }
    );
    
    console.log(`✅ Updated ${Object.keys(fieldsToUpdate).length} metadata fields`);
    for (const [index, signature] of case5Result.signatures.entries()) {
      console.log(`   Transaction ${index + 1}: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    }
    
    const balanceAfterCase5 = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Cost to update MULTIPLE fields: ${(balanceBeforeCase5 - balanceAfterCase5).toFixed(6)} SOL`);
    console.log(`💰 Average cost per field: ${((balanceBeforeCase5 - balanceAfterCase5) / Object.keys(fieldsToUpdate).length).toFixed(6)} SOL`);
    
    // Print metadata after batch update
    await printTokenMetadata(connection, mint);

    // COST SUMMARY
    console.log("\n📊 COST SUMMARY AFTER OPTIMIZATION:");
    console.log("-".repeat(50));
    console.log(`• Token creation cost: ${(initialBalance - balanceAfterCreate).toFixed(6)} SOL`);
    console.log(`• Update shorter value: ${(balanceBeforeCase1 - balanceAfterCase1).toFixed(6)} SOL`);
    console.log(`• Update longer value: ${(balanceBeforeCase2 - balanceAfterCase2).toFixed(6)} SOL`);
    console.log(`• Add new field: ${(balanceBeforeCase3 - balanceAfterCase3).toFixed(6)} SOL`);
    console.log(`• Update equivalent value: ${(balanceBeforeCase4 - balanceAfterCase4).toFixed(6)} SOL`);
    console.log(`• Update multiple fields: ${(balanceBeforeCase5 - balanceAfterCase5).toFixed(6)} SOL`);
    console.log(`• Average cost per field: ${((balanceBeforeCase5 - balanceAfterCase5) / Object.keys(fieldsToUpdate).length).toFixed(6)} SOL`);
    console.log("-".repeat(50));

    const totalCost = (
      (balanceBeforeCase1 - balanceAfterCase1) +
      (balanceBeforeCase2 - balanceAfterCase2) +
      (balanceBeforeCase3 - balanceAfterCase3) +
      (balanceBeforeCase4 - balanceAfterCase4) +
      (balanceBeforeCase5 - balanceAfterCase5)
    );
    
    console.log(`🏁 TOTAL TEST COST: ${totalCost.toFixed(6)} SOL`);
    console.log("\n✅ All test cases completed successfully!");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run test
testMetadataOptimization().catch(err => {
  console.error("❌ Critical error:", err);
  process.exit(1);
}); 