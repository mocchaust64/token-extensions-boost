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
import { TokenBuilder } from "solana-token-extension-boost";

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
     const walletPath = path.join(process.env.HOME! , ".config","solana", "id.json");
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
    
    const { mint } = await tokenBuilder.createToken(payer);
    
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

}

main()
  .then(() => console.log("Success"))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  }); 