import { Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { TransferHookToken,TokenBuilder } from "solana-token-extension-boost";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);

  // Step 1: Create token with Transfer Hook
  const dummyTransferHookProgram = Keypair.generate();  
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)
    .addTransferHook(dummyTransferHookProgram.publicKey);
  const {mint} = await tokenBuilder.createToken(payer);
  const transferHookToken = new TransferHookToken(connection, mint, dummyTransferHookProgram.publicKey);
  // Step 2: Mint tokens to owner
  const mintAmount = BigInt(100_000_000_000); // 100 tokens
  const ownerTokenAccount = await transferHookToken.createAccountAndMintTo(
    payer.publicKey,
    payer,
    mintAmount,
    payer
  );
  
  console.log(`Minted ${Number(mintAmount) / 10**9} tokens to ${ownerTokenAccount.toString()}`);
  
  // Step 3: Create recipient and try to transfer tokens
  const recipient = Keypair.generate();
  
  const { address: recipientTokenAccount } = await transferHookToken.createOrGetTokenAccount(
    payer,
    recipient.publicKey
  );
  
  const transferAmount = BigInt(10_000_000_000); // 10 tokens
  
  try {
    const transferSignature = await transferHookToken.transfer(
      ownerTokenAccount,
      recipientTokenAccount,
      payer,
      transferAmount,
      9
    );
    
    console.log(`Transfer successful!`);
    console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  } catch (error) {
    console.log("Transfer failed as expected - dummy Transfer Hook program doesn't exist");
  }

  // Step 4: Create token with Transfer Hook and Metadata
  try {
    const metadataTokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
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
    
    const { mint: combinedMint } = await metadataTokenBuilder.createToken(payer);
    
    console.log(`Combined token created with mint: ${combinedMint.toString()}`);
    
  } catch (error) {
    console.error("Error creating combined token:", error);
  }
  
  console.log("Transfer Hook example completed");
}

main()
  .then(() => console.log("Success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 