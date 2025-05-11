import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { MetadataPointerToken } from "../src/extensions/metadata-pointer";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  let payer: Keypair;
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  
  try {
    const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    payer = Keypair.fromSecretKey(secretKey);
    console.log(`Using wallet: ${payer.publicKey.toString()}`);
  } catch (error) {
    console.error("Could not read wallet. Creating a new keypair...");
    payer = Keypair.generate();
    console.log(`Using generated wallet: ${payer.publicKey.toString()}`);
    
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      2 * 10 ** 9
    );
    await connection.confirmTransaction(airdropSignature);
  }

  console.log("Step 1: Creating a token with metadata pointer extension");
  const metadataConfig = {
    name: "Example Metadata Token",
    symbol: "EMT",
    uri: "https://example.com/metadata.json",
    additionalMetadata: {
      "description": "A token with metadata pointer extension",
      "website": "https://example.com",
      "creator": payer.publicKey.toString()
    }
  };
  
  const token = await MetadataPointerToken.create(connection, payer, {
    decimals: 9,
    mintAuthority: payer.publicKey,
    metadata: metadataConfig
  });
  
  console.log(`Created token with mint: ${token.getMint().toString()}`);

  console.log("Step 2: Retrieving metadata pointer");
  const metadataPointer = await token.getMetadataPointer();
  console.log("Metadata pointer:", metadataPointer);

  console.log("Step 3: Retrieving token metadata");
  const tokenMetadata = await token.getTokenMetadata();
  console.log("Token metadata:", tokenMetadata);

  console.log("Step 4: Updating metadata field");
  const updateTxSignature = await token.updateMetadataField(
    payer,
    "description",
    "Updated description for the metadata token"
  );
  console.log(`Updated metadata field, transaction: ${updateTxSignature}`);

  console.log("Step 5: Retrieving updated token metadata");
  const updatedTokenMetadata = await token.getTokenMetadata();
  console.log("Updated token metadata:", updatedTokenMetadata);

  console.log("Step 6: Adding new metadata field");
  const addTxSignature = await token.updateMetadataField(
    payer,
    "social_twitter",
    "@example_token"
  );
  console.log(`Added new metadata field, transaction: ${addTxSignature}`);

  console.log("Step 7: Removing metadata field");
  const removeTxSignature = await token.removeMetadataField(
    payer,
    "website"
  );
  console.log(`Removed metadata field, transaction: ${removeTxSignature}`);

  console.log("Step 8: Final token metadata");
  const finalTokenMetadata = await token.getTokenMetadata();
  console.log("Final token metadata:", finalTokenMetadata);
  
  console.log("Step 9: Creating a new authority keypair");
  const newAuthority = Keypair.generate();
  console.log(`New authority public key: ${newAuthority.publicKey.toString()}`);
  
  console.log("Step 10: Updating metadata authority");
  try {
    const updateAuthorityTxSignature = await token.updateMetadataAuthority(
      payer,
      newAuthority.publicKey
    );
    console.log(`Updated metadata authority, transaction: ${updateAuthorityTxSignature}`);

    const metadataAfterAuthorityUpdate = await token.getTokenMetadata();
    console.log("Metadata after authority update:", metadataAfterAuthorityUpdate);

    console.log("Airdropping SOL to new authority...");
    const airdropSignature = await connection.requestAirdrop(
      newAuthority.publicKey,
      1 * 10 ** 9 
    );
    await connection.confirmTransaction(airdropSignature);

    console.log("Step 11: Testing update with new authority");
    const updateWithNewAuthTxSignature = await token.updateMetadataField(
      newAuthority,
      "updated_by",
      "new_authority"
    );
    console.log(`Updated with new authority, transaction: ${updateWithNewAuthTxSignature}`);
    
    const finalMetadata = await token.getTokenMetadata();
    console.log("Final metadata after new authority update:", finalMetadata);
  } catch (error) {
    console.error("Error updating metadata authority:", error);
  }
}

main()
  .then(() => console.log("Success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 