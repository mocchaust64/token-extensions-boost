import { clusterApiUrl, Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { TokenBuilder, TransferFeeToken } from "../../src";
import * as fs from "fs";
import * as path from "path";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

async function main() {
  // Connect to Solana devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Read wallet from local file
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8"});
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  
  console.log("Wallet address:", payer.publicKey.toString());
  
  // 1. Create token with 1% transfer fee
  console.log("\n1. Creating token with 1% transfer fee");
  
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(
      6, // decimals
      payer.publicKey // mint authority
    )
    .addTokenMetadata(
      "Fee Token",
      "FEE",
      "https://example.com/token-metadata.json",
      { "description": "A token with 1% transfer fee" }
    )
    .addTransferFee(
      100, // 1% (100 basis points)
      BigInt(10_000_000), // 10 tokens max fee (with 6 decimals)
      payer.publicKey, // transferFeeConfigAuthority
      payer.publicKey  // withdrawWithheldAuthority
    );

  // Get instructions to create token
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
  
  // Create and send transaction
  const transaction = new Transaction().add(...instructions);
  const createTokenSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, ...signers]
  );

  console.log(`Token created: ${mint.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${createTokenSignature}?cluster=devnet`);
  
  // Create TransferFeeToken instance
  const transferFeeToken = new TransferFeeToken(connection, mint, {
        feeBasisPoints: 100,
    maxFee: BigInt(10_000_000),
    transferFeeConfigAuthority: payer.publicKey,
    withdrawWithheldAuthority: payer.publicKey
  });
  
  // 2. Minting tokens to owner
  console.log("\n2. Minting tokens to owner");
  
  const mintAmount = BigInt(1000_000_000); // 1000 tokens with 6 decimals
  
  // Create instructions for minting tokens
  const { instructions: mintInstructions, address: ownerTokenAddress } = 
    await transferFeeToken.createAccountAndMintToInstructions(
      payer.publicKey, // fee payer
      payer.publicKey, // token account owner
      mintAmount,      // amount to mint
      payer.publicKey  // mint authority
    );
  
  // Create and send transaction
  const mintTransaction = new Transaction().add(...mintInstructions);
  const mintSignature = await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [payer]
  );
  
  console.log(`Minted ${Number(mintAmount) / 1e6} tokens to ${ownerTokenAddress.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);
  
  // Create recipients
  const recipients = [
    Keypair.generate(),
    Keypair.generate(),
    Keypair.generate()
  ];
  
  // 3. Creating token accounts for recipients
  console.log("\n3. Creating token accounts for recipients");
  
  const recipientAccounts: { address: PublicKey }[] = [];
  for (const recipient of recipients) {
    console.log(`Recipient: ${recipient.publicKey.toString()}`);
    
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient.publicKey,
      false,
      "confirmed",
      { skipPreflight: true },
      transferFeeToken.getProgramId()
    );
    
    recipientAccounts.push(recipientTokenAccount);
    console.log(`Recipient token account: ${recipientTokenAccount.address.toString()}`);
  }
  
  // 4. Transferring tokens with 1% fee to multiple recipients
  console.log("\n4. Transferring tokens with 1% fee to multiple recipients");
  
  const transferredAccounts: PublicKey[] = [];
  
  for (let i = 0; i < recipientAccounts.length; i++) {
    const transferAmount = BigInt((100_000_000 * (i + 1))); // 100, 200, 300 tokens
    
    const expectedFee = transferFeeToken.calculateFee(transferAmount);
    console.log(`Transfer ${i+1}: ${Number(transferAmount) / 1e6} tokens with fee: ${Number(expectedFee) / 1e6} tokens`);
    
    try {
      // Create transfer instruction
      const transferInstruction = transferFeeToken.createTransferInstruction(
        ownerTokenAddress,
        recipientAccounts[i].address,
        payer.publicKey,
        transferAmount,
        6
      );
      
      // Create and send transaction
      const transferTransaction = new Transaction().add(transferInstruction);
      const transferSignature = await sendAndConfirmTransaction(
        connection,
        transferTransaction,
        [payer]
      );
      
      console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
      transferredAccounts.push(recipientAccounts[i].address);
    } catch (error: any) {
      console.error(`Transfer failed: ${error.message}`);
    }
  }
  
  // 5. Finding accounts with withheld fees
  console.log("\n5. Finding accounts with withheld fees");
  
  try {
    const accountsWithFees = await transferFeeToken.findAccountsWithWithheldFees();
    
    console.log(`Found ${accountsWithFees.length} accounts with withheld fees:`);
    for (const account of accountsWithFees) {
      console.log(`- ${account.toString()}`);
    }
    
    if (accountsWithFees.length > 0) {
      // 6. Harvesting fees from accounts to mint
      console.log("\n6. Harvesting fees from accounts to mint");
      
      const harvestInstruction = transferFeeToken.createHarvestWithheldTokensToMintInstruction(
        accountsWithFees
      );
      
      const harvestTransaction = new Transaction().add(harvestInstruction);
      const harvestSignature = await sendAndConfirmTransaction(
        connection,
        harvestTransaction,
        [payer]
      );
      
      console.log(`Fees harvested to mint`);
      console.log(`Transaction: https://explorer.solana.com/tx/${harvestSignature}?cluster=devnet`);
      
      // 7. Withdrawing fees from mint
      console.log("\n7. Withdrawing fees from mint");
      
      const feeRecipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey,
        false,
        "confirmed",
        { skipPreflight: true },
        transferFeeToken.getProgramId()
      );
      
      const withdrawInstruction = transferFeeToken.createWithdrawFeesFromMintInstruction(
        feeRecipientTokenAccount.address,
        payer.publicKey
      );
      
      const withdrawTransaction = new Transaction().add(withdrawInstruction);
      const withdrawSignature = await sendAndConfirmTransaction(
        connection,
        withdrawTransaction,
        [payer]
      );
      
      console.log(`Fees withdrawn to ${feeRecipientTokenAccount.address.toString()}`);
      console.log(`Transaction: https://explorer.solana.com/tx/${withdrawSignature}?cluster=devnet`);
    }
  } catch (error: any) {
    console.error(`Failed to process fees: ${error.message}`);
  }
  
  // Summary
  console.log("\n===== SUMMARY =====");
  console.log(`- Token Address: ${mint.toString()}`);
  console.log(`- Owner Token Account: ${ownerTokenAddress.toString()}`);
  console.log(`- View details on Solana Explorer (devnet):`);
  console.log(`  https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
}

main()
  .then(() => console.log("Success"))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  });