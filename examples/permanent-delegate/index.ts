import { clusterApiUrl, Connection, Keypair, Transaction, sendAndConfirmTransaction, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { PermanentDelegateToken, TokenBuilder } from "../../src";
import { 
  TOKEN_2022_PROGRAM_ID, 
  createMintToInstruction, 
  getMint,
  createTransferCheckedInstruction,
  getAccount,
  ExtensionType
} from "@solana/spl-token";

/**
 * Example of creating and using a token with a Permanent Delegate
 * Permanent Delegates can transfer tokens from any account without the owner's consent
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

    // TOKEN CREATION: Create token with permanent delegate
    console.log("\nCreating token with permanent delegate...");
    const delegateKeypair = payer;
    const delegatePublicKey = delegateKeypair.publicKey;
    console.log(`Permanent delegate address: ${delegatePublicKey.toString()}`);
    
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        6, // 6 decimals for compatibility (changed from 9)
        payer.publicKey // mint authority
      )
      .addTokenMetadata(
        "Managed Token",
        "MGTKN",
        "https://example.com/token-metadata.json",
        { 
          "description": "A token with permanent delegate authority",
          "type": "managed"
        }
      )
      .addPermanentDelegate(delegatePublicKey);
    
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
    
    console.log(`Token created successfully!`);
    console.log(`Mint address: ${mint.toString()}`);
    console.log(`Transaction: https://explorer.solana.com/tx/${createTokenSignature}?cluster=devnet`);
    
    // VERIFY TOKEN: Check token data and confirm permanent delegate
    console.log("\nVerifying token data...");
    try {
      const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
      
      console.log(`Token details:`);
      console.log(`- Address: ${mintInfo.address.toString()}`);
      console.log(`- Mint authority: ${mintInfo.mintAuthority?.toString() || "None"}`);
      console.log(`- Decimals: ${mintInfo.decimals}`);
      console.log(`- Supply: ${mintInfo.supply.toString()}`);
      console.log(`- Permanent delegate: ${mintInfo.permanentDelegate?.toString() || "None"}`);
      
      if (mintInfo.permanentDelegate?.equals(delegatePublicKey)) {
        console.log("✓ Permanent delegate confirmed");
      } else {
        console.log("✗ Permanent delegate mismatch or not set");
      }
    } catch (error) {
      console.error("Error verifying token data:", error);
    }
    
    // Create PermanentDelegateToken instance
    const permanentDelegateToken = new PermanentDelegateToken(connection, mint, delegatePublicKey);

    // CREATE TOKEN ACCOUNTS: Create accounts for admin and user
    console.log("\nCreating token accounts...");
    
    // Create admin token account
    const { instructions: adminInstructions, address: adminTokenAddress } = 
      await permanentDelegateToken.createTokenAccountInstructions(payer.publicKey, payer.publicKey);
    
    if (adminInstructions.length > 0) {
      const adminTransaction = new Transaction().add(...adminInstructions);
      const adminTokenSignature = await sendAndConfirmTransaction(
        connection,
        adminTransaction,
        [payer]
      );
      console.log(`Admin token account created: ${adminTokenAddress.toString()}`);
    } else {
      console.log(`Admin token account already exists: ${adminTokenAddress.toString()}`);
    }
    
    // Create user token account
    const user = Keypair.generate();
    console.log(`User address: ${user.publicKey.toString()}`);
    
    const { instructions: userInstructions, address: userTokenAddress } =
      await permanentDelegateToken.createTokenAccountInstructions(payer.publicKey, user.publicKey);

    const userTransaction = new Transaction().add(...userInstructions);
    const userTokenSignature = await sendAndConfirmTransaction(
      connection,
      userTransaction,
      [payer]
    );
    console.log(`User token account created: ${userTokenAddress.toString()}`);

    // MINT TOKENS: Mint tokens to user account
    console.log("\nMinting tokens to user...");
    const mintAmount = BigInt(100_000_000); // 100 tokens (6 decimals)
    const mintInstruction = createMintToInstruction(
      mint,
      userTokenAddress,
      payer.publicKey, // mint authority
      mintAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    );
    
    const mintTransaction = new Transaction().add(mintInstruction);
    await sendAndConfirmTransaction(connection, mintTransaction, [payer]);
    console.log(`Minted ${Number(mintAmount) / 10**6} tokens to user`);
    
    // Check user's balance
    const userAccount = await getAccount(connection, userTokenAddress, "confirmed", TOKEN_2022_PROGRAM_ID);
    console.log(`User balance: ${Number(userAccount.amount) / 10**6} tokens`);

    // DELEGATE TRANSFER: Transfer tokens using permanent delegate authority
    console.log("\nTransferring tokens using permanent delegate authority...");
    const transferAmount = BigInt(50_000_000); // 50 tokens (6 decimals)
    
    // Get token decimals
    const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    const decimals = mintInfo.decimals;
    
    // Create transfer instruction using permanent delegate authority
    const transferInstruction = createTransferCheckedInstruction(
      userTokenAddress,      // source
      mint,                  // mint address
      adminTokenAddress,     // destination
      delegatePublicKey,     // authority (delegate)
      transferAmount,        // amount
      decimals,              // decimals
      [],                    // additional signers
      TOKEN_2022_PROGRAM_ID  // program ID
    );
    
    // Create and send transaction
    const transferTransaction = new Transaction().add(transferInstruction);
    const transferSignature = await sendAndConfirmTransaction(
      connection,
      transferTransaction,
      [payer]  // payer is the delegate
    );
    
    console.log(`Transferred ${Number(transferAmount) / 10**6} tokens from user to admin using permanent delegate authority`);
    console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
    
    // VERIFY BALANCES: Check balances after transfer
    console.log("\nVerifying balances after transfer...");
    const userAccountAfter = await getAccount(connection, userTokenAddress, "confirmed", TOKEN_2022_PROGRAM_ID);
    console.log(`User balance after transfer: ${Number(userAccountAfter.amount) / 10**6} tokens`);
    
    const adminAccountAfter = await getAccount(connection, adminTokenAddress, "confirmed", TOKEN_2022_PROGRAM_ID);
    console.log(`Admin balance after transfer: ${Number(adminAccountAfter.amount) / 10**6} tokens`);
    
    // SUMMARY
    console.log("\nPermanent Delegate Example Summary:");
    console.log("1. Created a token with permanent delegate authority");
    console.log("2. Created token accounts for admin and user");
    console.log("3. Minted tokens to the user's account");
    console.log("4. Transferred tokens from user to admin using permanent delegate authority");
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