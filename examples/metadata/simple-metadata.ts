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
import { MetadataHelper } from "../../src/utils/metadata-helper";

async function main() {
  // Kết nối đến Solana devnet
  console.log("Kết nối đến Solana devnet...");
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Tạo hoặc load keypair
  let payer: Keypair;
  const keyfilePath = path.resolve('devnet-wallet.json');
  
  try {
    if (fs.existsSync(keyfilePath)) {
      // Load keypair từ file
      const keyfileContent = JSON.parse(fs.readFileSync(keyfilePath, 'utf-8'));
      payer = Keypair.fromSecretKey(new Uint8Array(keyfileContent));
      console.log('Loaded keypair from', keyfilePath);
    } else {
      // Tạo keypair mới
      payer = Keypair.generate();
      fs.writeFileSync(keyfilePath, JSON.stringify(Array.from(payer.secretKey)));
      console.log('Generated new keypair and saved to', keyfilePath);
      
      // Request airdrop
      console.log('Requesting airdrop of 1 SOL...');
      const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSignature, 'confirmed');
      console.log('Airdrop confirmed!');
    }
    
    console.log('Using address:', payer.publicKey.toBase58());
    
    // Kiểm tra balance
    const balance = await connection.getBalance(payer.publicKey);
    console.log('Account balance:', balance / LAMPORTS_PER_SOL, 'SOL');
    
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      console.log('Low balance, requesting airdrop...');
      const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSignature, 'confirmed');
      console.log('Airdrop complete!');
    }

    // Tạo token với metadata đơn giản
    console.log("\n===== Tạo token với metadata tích hợp =====");

    const metadata = {
      name: "Token Metadata Demo",
      symbol: "TMETA",
      uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
      additionalMetadata: {
        "description": "Token với metadata tích hợp sử dụng Solana Token Extension",
        "creator": "Solana Token Extension SDK",
        "website": "https://solana.com",
      }
    };

    console.log("Đang tạo token với metadata...");
    
    const startTime = Date.now();
    
    // Sử dụng API mới để tạo token với metadata
    const result = await MetadataHelper.createTokenWithMetadata(
      connection,
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        ...metadata
      }
    );

    const endTime = Date.now();
    
    console.log(`Token tạo thành công trong ${(endTime - startTime)/1000} giây!`);
    console.log(`Mint address: ${result.mint.toString()}`);
    console.log(`Transaction: https://explorer.solana.com/tx/${result.txId}?cluster=devnet`);
    
    // Đọc metadata từ token
    console.log("\n===== Đọc metadata từ token =====");
    
    const tokenMetadata = await getTokenMetadata(
      connection,
      result.mint,
      "confirmed"
    );
    
    console.log("Token Metadata:");
    console.log(`Name: ${tokenMetadata?.name}`);
    console.log(`Symbol: ${tokenMetadata?.symbol}`);
    console.log(`URI: ${tokenMetadata?.uri}`);
    
    if (tokenMetadata?.additionalMetadata) {
      console.log("Additional Metadata:");
      for (const [key, value] of tokenMetadata.additionalMetadata) {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    // Thử lấy metadata off-chain
    if (tokenMetadata?.uri) {
      try {
        console.log("\n===== Lấy metadata off-chain =====");
        const response = await fetch(tokenMetadata.uri);
        const offchainMetadata = await response.json();
        console.log("Off-chain Metadata:", offchainMetadata);
      } catch (error) {
        console.error("Error fetching off-chain metadata:", error);
      }
    }
    
    console.log("\n===== SUMMARY =====");
    console.log(`Token: ${result.mint.toString()}`);
    console.log(`Xem trên Explorer: https://explorer.solana.com/address/${result.mint.toString()}?cluster=devnet`);
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  }); 