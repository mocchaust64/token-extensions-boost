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
  Mint as SplMint,
} from "@solana/spl-token";

import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from "../../src/utils/token-builder";

/**
 * Ví dụ tạo token với nhiều extension kết hợp với metadata
 * Chúng ta sẽ tạo một token với các extension sau:
 * 1. Metadata - Thông tin mô tả token
 * 2. TransferFee - Phí chuyển khoản
 * 3. InterestBearing - Lãi suất tự động
 * 4. PermanentDelegate - Ủy quyền vĩnh viễn
 */
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

    // Tạo token với nhiều extension
    console.log("\n===== Tạo token với nhiều extension =====");

    // 1. Chuẩn bị thông tin metadata
    const metadata = {
      name: "Multi-Extension Token",
      symbol: "MULTI",
      uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
      additionalMetadata: {
        "description": "Token với nhiều extension: Metadata, TransferFee, InterestBearing và PermanentDelegate",
        "creator": "Solana Token Extension SDK",
        "website": "https://solana.com",
      }
    };

    console.log("Đang tạo token với TokenBuilder...");
    
    // 2. Tạo TokenBuilder từ SDK
    const tokenBuilder = new TokenBuilder(connection);
    
    // Tạo delegate keypair (cho tính năng permanent delegate)
    const delegateKeypair = Keypair.generate();
    console.log(`Permanent delegate address: ${delegateKeypair.publicKey.toString()}`);
    
    // 3. Cấu hình token với nhiều tính năng
    tokenBuilder
      // Thông tin cơ bản
      .setTokenInfo(6, payer.publicKey) // 6 decimals
      
      // Extension 1: Metadata
      .addTokenMetadata(
        metadata.name,
        metadata.symbol,
        metadata.uri,
        metadata.additionalMetadata
      )
      
      // Extension 2: TransferFee (phí chuyển khoản 1%)
      .addTransferFee(
        100, // 1% (100 = 1%, vì 10000 = 100%)
        BigInt(1000000), // maxFee (1 token với 6 decimals)
        payer.publicKey, // transferFeeConfigAuthority
        payer.publicKey  // withdrawWithheldAuthority
      )
      
      // Extension 3: InterestBearing (lãi suất 5%)
      .addInterestBearing(
        500, // 5% (500 = 5%, vì 10000 = 100%)
        payer.publicKey // Rate authority
      )
      
      // Extension 4: PermanentDelegate (ủy quyền vĩnh viễn)
      .addPermanentDelegate(
        delegateKeypair.publicKey
      );
    
    // 4. Build token
    try {
      console.log("Đang gửi transaction để tạo token...");
      
      // Sử dụng phương thức createTokenWithExtensions mới
      const { mint, transactionSignature, token } = await tokenBuilder.createTokenWithExtensions(payer);
      
      console.log(`Token tạo thành công!`);
      console.log(`Mint address: ${mint.toString()}`);
      console.log(`Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
      
      // 5. Đọc thông tin token
      console.log("\n===== Thông tin token =====");
      
      // Đọc metadata
      try {
        const tokenMetadata = await getTokenMetadata(connection, mint, "confirmed");
        
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
      } catch (metadataError) {
        console.error("Không thể đọc metadata:", metadataError);
      }
      
      // Đọc các extension khác
      try {
        const mintInfo = await getMint(connection, mint, "confirmed") as any;
        
        console.log("\nThông tin các extension khác:");
        
        // Kiểm tra TransferFee
        if (mintInfo.transferFeeConfig) {
          console.log("TransferFee Extension:");
          console.log(`  Transfer Fee Authority: ${mintInfo.transferFeeConfig.transferFeeConfigAuthority?.toString() || 'None'}`);
          console.log(`  Fee BPS: ${mintInfo.transferFeeConfig.transferFeeBasisPoints}`);
          console.log(`  Maximum Fee: ${mintInfo.transferFeeConfig.maximumFee.toString()}`);
        }
        
        // Kiểm tra InterestBearing
        if (mintInfo.interestBearingConfig) {
          console.log("InterestBearing Extension:");
          console.log(`  Rate Authority: ${mintInfo.interestBearingConfig.rateAuthority?.toString() || 'None'}`);
          console.log(`  Interest Rate BPS: ${mintInfo.interestBearingConfig.currentRate}`);
        }
        
        // Kiểm tra PermanentDelegate
        if (mintInfo.permanentDelegate) {
          console.log("PermanentDelegate Extension:");
          console.log(`  Delegate: ${mintInfo.permanentDelegate.toString()}`);
        }
      } catch (mintError) {
        console.error("Không thể đọc thông tin mint:", mintError);
      }
      
      console.log("\n===== SUMMARY =====");
      console.log(`Token: ${mint.toString()}`);
      console.log(`Xem trên Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    } catch (buildError) {
      console.error("Lỗi khi tạo token:", buildError);
    }
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