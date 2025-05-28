 import {
  Connection,
  Keypair,
  clusterApiUrl,
} from "@solana/web3.js";
import fs from 'fs';
import path from 'path';
import { TokenBuilder, TokenMetadataToken } from "../../dist"; // Import từ SDK của chúng ta

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
     const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8"});
     const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
     const payer = Keypair.fromSecretKey(secretKey);

    // Create token with simple metadata
    const metadata = {
      name: "OPOS",
      symbol: "OPOS",
      uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
      additionalMetadata: {
           "trait_type": "Item",
      "value": "Developer Portal"
      }
};

    // Use TokenBuilder to create token with metadata
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addTokenMetadata(
        metadata.name,
        metadata.symbol,
        metadata.uri,
        metadata.additionalMetadata
      );
    
  // Tạo instructions và transaction
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
  const transaction = tokenBuilder.buildTransaction(instructions, payer.publicKey);
  
  // Gửi transaction
  const signature = await connection.sendTransaction(
    transaction, 
    [payer, ...signers],
    { skipPreflight: true }
  );
  await connection.confirmTransaction(signature, "confirmed");
    
    console.log(`Token created successfully!`);
    console.log(`Mint address: ${mint.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
  // Tạo instance của token để đọc metadata
  const tokenMetadataToken = new TokenMetadataToken(connection, mint, metadata);
  
  try {
    // Cố gắng đọc metadata từ blockchain
    const tokenMetadata = await tokenMetadataToken.getTokenMetadata();
    
    console.log(`Token name: ${tokenMetadata.name}`);
    console.log(`Token symbol: ${tokenMetadata.symbol}`);
    console.log(`Token URI: ${tokenMetadata.uri}`);
    
    if (tokenMetadata.additionalMetadata) {
      console.log("Additional Metadata:");
      for (const [key, value] of tokenMetadata.additionalMetadata) {
        console.log(`  ${key}: ${value}`);
      }
    }
  } catch (error) {
    console.error("Lỗi khi đọc metadata từ blockchain:", error);
    console.log("Sử dụng metadata đã biết:");
    console.log(`Token name: ${metadata.name}`);
    console.log(`Token symbol: ${metadata.symbol}`);
    console.log(`Token URI: ${metadata.uri}`);
    if (metadata.additionalMetadata) {
      console.log("Additional Metadata:");
      for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
        console.log(`  ${key}: ${value}`);
      }
    }
  }
}

main()
  .then(() => console.log("Success"))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  }); 