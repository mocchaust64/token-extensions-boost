import { clusterApiUrl, Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

import { TransferFeeToken, TokenBuilder } from "../../src";

async function main() {
  // Connect to Solana devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Read wallet from local file - in a real application, would use a wallet adapter
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  
  console.log("Wallet address:", payer.publicKey.toString());
  
  // 1. Create instructions for token with 1% transfer fee
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(6, payer.publicKey, payer.publicKey)
    .addTransferFee(
      100, // 1% (100 basis points)
      BigInt(10_000_000), // 10 tokens max fee (with 6 decimals)
      payer.publicKey, // transferFeeConfigAuthority
      payer.publicKey  // withdrawWithheldAuthority
    );
  
  // Get instructions instead of performing transaction directly
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
  
  const transferFeeToken = new TransferFeeToken(connection, mint, {
    feeBasisPoints: 100,
    maxFee: BigInt(10_000_000),
    transferFeeConfigAuthority: payer.publicKey,
    withdrawWithheldAuthority: payer.publicKey
  });
  
  // 2. Create token account and mint tokens
  const mintAmount = BigInt(1000_000_000);
  
  // Create instructions instead of performing directly
  const { instructions: mintInstructions, address: ownerTokenAddress } = 
    await transferFeeToken.createAccountAndMintToInstructions(
      payer.publicKey,
    payer.publicKey,
    mintAmount,
      payer.publicKey
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
  
  const recipient = Keypair.generate();
  
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
  
  // 3. Transfer tokens with 1% fee
  const transferAmount = BigInt(100_000_000);
  const expectedFee = transferFeeToken.calculateFee(transferAmount);
  
  // Create transfer instruction instead of performing directly
  const transferInstruction = transferFeeToken.createTransferInstruction(
    ownerTokenAddress,
    recipientTokenAccount.address,
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
  
  console.log(`Transferred ${Number(transferAmount) / 1e6} tokens with ${Number(expectedFee) / 1e6} fee`);
  console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  
  try {
    // 4. Harvest fees from accounts to mint
    const harvestInstruction = transferFeeToken.createHarvestWithheldTokensToMintInstruction(
      [recipientTokenAccount.address]
    );
    
    const harvestTransaction = new Transaction().add(harvestInstruction);
    const harvestSignature = await sendAndConfirmTransaction(
      connection,
      harvestTransaction,
      [payer]
    );
    
    console.log(`Fees harvested to mint`);
    console.log(`Transaction: https://explorer.solana.com/tx/${harvestSignature}?cluster=devnet`);
    
    // 5. Withdraw fees from mint to wallet
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
  } catch (error: any) {
    console.log("Error processing fees:", error.message);
    // Fee processing errors may occur if there are no fees to harvest
  }
  
  console.log(`Token details: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
}

main()
  .then(() => console.log("Success"))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  }); 