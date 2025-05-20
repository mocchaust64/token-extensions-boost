import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getMint,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from "solana-token-extension-boost";

/**
 * Ví dụ tạo token với metadata và nhiều extension khác
 */
async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
     const walletPath = path.join(process.env.HOME! , ".config","solana", "id.json");
     const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8"});
     const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
     const payer = Keypair.fromSecretKey(secretKey);
     

  // Tạo token với metadata và nhiều extension
  console.log("\n===== Tạo token với metadata và nhiều extension =====");

  // 1. Chuẩn bị thông tin metadata
  const metadata = {
    name: "OPOS",
    symbol: "OPOS",
    uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",

    additionalMetadata: {
         "trait_type": "Item",
    "value": "Developer Portal"
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
    
    // Extension 3: PermanentDelegate (ủy quyền vĩnh viễn)
    .addPermanentDelegate(
      delegateKeypair.publicKey
    );

  // 4. Sử dụng phương thức mới để tạo token
  const startTime = Date.now();
  
  console.log("Đang tạo token với metadata và các extension...");
  const { mint, transactionSignature, token } = await tokenBuilder.createToken(payer);
  
  const endTime = Date.now();
  
  console.log(`Token tạo thành công trong ${(endTime - startTime)/1000} giây!`);
  console.log(`Mint address: ${mint.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
  
  // 5. Kiểm tra thông tin token
  console.log("\n===== Kiểm tra thông tin token =====");
  
  // Đọc metadata
  console.log("Đang đọc metadata...");
  const tokenMetadata = await getTokenMetadata(
    connection,
    mint,
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
  
  // Đọc thông tin mint
  console.log("\nĐang đọc thông tin mint...");
  try {
    const mintInfo = await getMint(
      connection,
      mint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID  // Quan trọng: Chỉ định đúng TOKEN_2022_PROGRAM_ID
    );
    
    console.log("Mint Info:");
    console.log(`Decimals: ${mintInfo.decimals}`);
    console.log(`Mint Authority: ${mintInfo.mintAuthority?.toString()}`);
    console.log(`Supply: ${mintInfo.supply}`);
    
    // Đọc thông tin extensions
    console.log("\nExtensions:");
    console.log(`Number of extensions: ${mintInfo.tlvData.length}`);
    
    // Hiển thị các extensions dựa trên tlvData
    if (mintInfo.tlvData && mintInfo.tlvData.length > 0) {
      console.log('Extension data found:');
      
      // Liệt kê tên các extensions đã biết
      const extensionNames = {
        0: "TransferFee (Config)",
        1: "TransferFee (Amount)",
        2: "MintCloseAuthority",
        3: "ConfidentialTransfer (Mint)",
        4: "ConfidentialTransfer (Account)",
        5: "DefaultAccountState",
        6: "ImmutableOwner",
        7: "MemoTransfer",
        8: "NonTransferable",
        9: "InterestBearing",
        10: "CpiGuard",
        11: "PermanentDelegate",
        12: "NonTransferableAccount",
        13: "TransferHook",
        14: "MetadataPointer",
        15: "TokenMetadata"
      };
      
      // Phân tích dữ liệu TLV để xác định các extensions
      let offset = 0;
      while (offset < mintInfo.tlvData.length) {
        // Đảm bảo có đủ dữ liệu để đọc type (4 bytes)
        if (offset + 4 > mintInfo.tlvData.length) break;
        
        // Đọc type (4 bytes)
        const type = mintInfo.tlvData.readUInt32LE(offset);
        const extensionName = extensionNames[type as keyof typeof extensionNames] || `Unknown Extension (${type})`;
        console.log(`- ${extensionName} (Type: ${type})`);
        
        // Đọc length (4 bytes)
        if (offset + 8 > mintInfo.tlvData.length) break;
        const length = mintInfo.tlvData.readUInt32LE(offset + 4);
        
        // Chuyển đến extension tiếp theo
        // Cấu trúc: type (4 bytes) + length (4 bytes) + value (length bytes)
        offset += 8 + length;
      }
    } else {
      console.log('No extension data found');
    }
  } catch (error) {
    console.error("Error reading mint info:", error);
    console.log("\nHiển thị lỗi từ mint info. Tuy nhiên, metadata đã được đọc thành công.");
    console.log("Bạn có thể kiểm tra trực tiếp trên Solana Explorer:");
    console.log(`https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
  }
  
  console.log("\n===== TEST COMPLETE =====");
}

main().catch(error => {
  console.error("Error:", error);
}); 