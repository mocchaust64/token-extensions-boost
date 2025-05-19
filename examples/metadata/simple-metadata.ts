import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getTokenMetadata,
} from "@solana/spl-token";

import fs from 'fs';
import path from 'path';
import { TokenBuilder } from "../../src/utils/token-builder";

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  let payer: Keypair;
  const keyfilePath = path.resolve('devnet-wallet.json');
  
  try {
    if (fs.existsSync(keyfilePath)) {
      const keyfileContent = JSON.parse(fs.readFileSync(keyfilePath, 'utf-8'));
      payer = Keypair.fromSecretKey(new Uint8Array(keyfileContent));
    } else {
      payer = Keypair.generate();
      fs.writeFileSync(keyfilePath, JSON.stringify(Array.from(payer.secretKey)));
      
      const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSignature, 'confirmed');
    }
    
    const balance = await connection.getBalance(payer.publicKey);
    
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSignature, 'confirmed');
    }

    // Create token with simple metadata
    const metadata = {
      name: "Token Metadata Demo",
      symbol: "TMETA",
      uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
      additionalMetadata: {
        "description": "Token with integrated metadata using Solana Token Extension",
        "creator": "Solana Token Extension SDK",
        "website": "https://solana.com",
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
    
    const { mint, transactionSignature } = await tokenBuilder.createToken(payer);
    
    console.log(`Token created successfully!`);
    console.log(`Mint address: ${mint.toString()}`);
    console.log(`Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    
    // Read metadata from token
    const tokenMetadata = await getTokenMetadata(
      connection,
      mint,
      "confirmed"
    );
    
    console.log(`Token name: ${tokenMetadata?.name}`);
    console.log(`Token symbol: ${tokenMetadata?.symbol}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => console.log("Success"))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  }); 