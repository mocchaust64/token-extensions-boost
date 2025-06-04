import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { TransferHookToken, TokenBuilder } from "../../src";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

async function main() {
  // Connect to Solana devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);

  console.log("Wallet address:", payer.publicKey.toString());

  // Step 1: Create token with Transfer Hook
  const dummyTransferHookProgram = Keypair.generate();  
  console.log("Transfer Hook Program address:", dummyTransferHookProgram.publicKey.toString());
  
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(6, payer.publicKey)
    .addTransferHook(dummyTransferHookProgram.publicKey);
  
  // Use createTokenInstructions method instead of createToken
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
  
  // Create and send transaction
  const transaction = new Transaction().add(...instructions);
  const createTokenSignature = await sendAndConfirmTransaction(
    connection, 
    transaction, 
    [payer, ...signers]
  );
  
  console.log(`Token with Transfer Hook created: ${mint.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${createTokenSignature}?cluster=devnet`);
  
  const transferHookToken = new TransferHookToken(
    connection, 
    mint, 
    dummyTransferHookProgram.publicKey
  );
  
  // Step 2: Mint tokens to owner
  const mintAmount = BigInt(100_000_000); // 100 tokens with 6 decimals
  
  // Find token account address
  const ownerTokenAccount = await getAssociatedTokenAddress(
    mint,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  // Create transaction to create account and mint tokens
  const mintTx = new Transaction();
  
  // Add instruction to create token account
  mintTx.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ownerTokenAccount,
      payer.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  // Add instruction to mint tokens
  mintTx.add(
    createMintToInstruction(
      mint,
      ownerTokenAccount,
      payer.publicKey,
    mintAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  // Send transaction
  const mintSignature = await sendAndConfirmTransaction(
    connection,
    mintTx,
    [payer]
  );
  
  console.log(`Minted ${Number(mintAmount) / 10**6} tokens to ${ownerTokenAccount.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);
  
  // Step 3: Create recipient and try to transfer tokens
  const recipient = Keypair.generate();
  
  // Create token account for recipient
  const recipientTokenAccount = await getAssociatedTokenAddress(
    mint,
    recipient.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  // Create transaction to create account for recipient
  const createRecipientTx = new Transaction();
  createRecipientTx.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      recipientTokenAccount,
      recipient.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  const createRecipientSignature = await sendAndConfirmTransaction(
    connection,
    createRecipientTx,
    [payer]
  );
  
  console.log(`Recipient account created: ${recipientTokenAccount.toString()}`);
  
  const transferAmount = BigInt(10_000_000); // 10 tokens with 6 decimals
  
  try {
    // Create transfer instruction
    const transferInstruction = transferHookToken.createTransferInstruction(
      ownerTokenAccount,
      recipientTokenAccount,
      payer.publicKey,
      transferAmount,
      6
    );
    
    // Create and send transaction
    const transferTx = new Transaction().add(transferInstruction);
    const transferSignature = await sendAndConfirmTransaction(
      connection,
      transferTx,
      [payer]
    );
    
    console.log(`Transfer successful!`);
    console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  } catch (error: any) {
    console.log(`Transfer failed as expected - Transfer Hook program doesn't exist: ${error.message}`);
  }

  // Step 4: Create token with Transfer Hook and Metadata
  try {
    const metadataTokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(6, payer.publicKey)
      .addTransferHook(dummyTransferHookProgram.publicKey)
      .addTokenMetadata(
        "Hook Token",
        "HOOK",
        "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
        {
          "description": "Token with transfer hook and metadata extensions",
          "creator": payer.publicKey.toString(),
          "website": "https://example.com"
        }
      );
    
    // Use createTokenInstructions method
    const { instructions: combinedInstructions, signers: combinedSigners, mint: combinedMint } = 
      await metadataTokenBuilder.createTokenInstructions(payer.publicKey);
    
    // Create and send transaction
    const combinedTx = new Transaction().add(...combinedInstructions);
    const combinedSignature = await sendAndConfirmTransaction(
      connection,
      combinedTx,
      [payer, ...combinedSigners]
    );
    
    console.log(`Combined token created: ${combinedMint.toString()}`);
    console.log(`Transaction: https://explorer.solana.com/tx/${combinedSignature}?cluster=devnet`);
    
  } catch (error: any) {
    console.error("Error creating combined token:", error.message);
  }
  
  console.log("Transfer Hook example completed");
}

main()
  .then(() => console.log("Success"))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  }); 