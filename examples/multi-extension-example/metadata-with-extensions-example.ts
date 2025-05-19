import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  ExtensionType,
  getMint,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from "../../src/utils/token-builder";

/**
 * Ví dụ tạo token với metadata và nhiều extension khác
 * Sử dụng phương thức mới createTokenWithMetadataAndExtensions
 */
async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  let payer: Keypair;
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  
  try {
    const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    payer = Keypair.fromSecretKey(secretKey);
  } catch (error) {
    payer = Keypair.generate();
    
    const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSignature, 'confirmed');
  }
  
  const balance = await connection.getBalance(payer.publicKey);
  
  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSignature, 'confirmed');
  }

  // 1. Prepare metadata information
  const metadata = {
    name: "Multi Extension Token",
    symbol: "MEXT",
    uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
    additionalMetadata: {
      "description": "Token with metadata and multiple extensions",
      "creator": "Solana Token Extension SDK",
      "website": "https://solana.com",
      "twitter": "@solana",
    }
  };
  
  // 2. Create TokenBuilder from SDK
  const tokenBuilder = new TokenBuilder(connection);
  
  // Create delegate keypair for permanent delegate feature
  const delegateKeypair = Keypair.generate();
  
  // 3. Configure token with multiple features
  tokenBuilder
    // Basic information
    .setTokenInfo(6, payer.publicKey) // 6 decimals instead of 9
    
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
  const { mint, transactionSignature, token } = await tokenBuilder.createToken(payer);
  
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