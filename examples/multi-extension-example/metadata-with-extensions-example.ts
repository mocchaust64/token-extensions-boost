import {
  Connection,
  Keypair,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getTokenMetadata, 
} from "@solana/spl-token";

import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from "solana-token-extension-boost";

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath,{encoding: "utf-8"});
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey)


  // 1. Prepare metadata information
  const metadata = {
    name: "OPOS",
    symbol: "OPOS",
    uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",

    additionalMetadata: {
         "trait_type": "Item",
    "value": "Developer Portal"
    }
};
  // 2. Create TokenBuilder from SDK
  const tokenBuilder = new TokenBuilder(connection);
  
  // Create delegate keypair for permanent delegate feature
  const delegateKeypair = Keypair.generate();
  
  // 3. Configure token with multiple features
  tokenBuilder
    // Basic information
    .setTokenInfo(9, payer.publicKey) // 6 decimals instead of 9
    
    // Extension 1: Metadata - Using addTokenMetadata
    .addTokenMetadata(
      metadata.name,
      metadata.symbol,
      metadata.uri,
      metadata.additionalMetadata
    )
    
    // Extension 2: TransferFee (0.5% transfer fee)
    .addTransferFee(
      50, // 0.5% (50 basis points)
      BigInt(500000), // maxFee (0.5 token with 6 decimals)
      payer.publicKey, // transferFeeConfigAuthority
      payer.publicKey  // withdrawWithheldAuthority
    )
    
    // Extension 3: PermanentDelegate
    .addPermanentDelegate(
      delegateKeypair.publicKey
    );

  // 4. Create token with the new method
  const { mint } = await tokenBuilder.createToken(payer);
  
  console.log(`Token created successfully!`);
  console.log(`Mint address: ${mint.toString()}`);
  console.log(`Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
  
  // Display token metadata
  try {
    const tokenMetadata = await getTokenMetadata(
      connection,
      mint,
      "confirmed"
    );
    
    console.log(`Token name: ${tokenMetadata?.name}`);
    console.log(`Token symbol: ${tokenMetadata?.symbol}`);
  } catch (error) {
    // Handle error silently
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 