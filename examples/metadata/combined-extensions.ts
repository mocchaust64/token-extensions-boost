import {
  Connection,
  Keypair,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getMint,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from "../../src/utils/token-builder";

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
  
  
  // 3. Cấu hình token với nhiều tính năng
  tokenBuilder
    // Thông tin cơ bản
    .setTokenInfo(6, payer.publicKey) // 6 decimals
    .addTokenMetadata(
      metadata.name,
      metadata.symbol,
      metadata.uri,
      metadata.additionalMetadata
    )
    .addNonTransferable();
    
    
  // 4. Sử dụng phương thức để tạo token
  // Lưu ý: Nên luôn sử dụng createToken() thay vì các phương thức khác đã bị deprecated
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
  
  // 6. Thử chuyển token NonTransferable để kiểm tra extension
  console.log("\n===== Thử chuyển token để kiểm tra NonTransferable =====");

  try {
    // Tạo ví đích ngẫu nhiên
    const destinationWallet = Keypair.generate();
    console.log(`Đang thử chuyển token từ ${payer.publicKey.toString()} đến ${destinationWallet.publicKey.toString()}`);
    
    // Sử dụng hàm transfer từ instance token đã tạo (đã có sẵn trong SDK)
    const transferAmount = BigInt(1000000); // 1 token với 6 decimals
    
    // Trước hết cần tạo hoặc lấy source token account
    const { address: sourceAddress } = await token.createOrGetTokenAccount(
      payer,
      payer.publicKey
    );
    
    // Mint token vào tài khoản nguồn
    console.log("Đang mint token vào tài khoản nguồn...");
    await token.mintTo(
      sourceAddress,
      payer,
      transferAmount
    );
    console.log(`Đã mint ${Number(transferAmount) / 10**6} token vào tài khoản nguồn`);
    
    // Tạo hoặc lấy destination token account
    const { address: destinationAddress } = await token.createOrGetTokenAccount(
      payer,
      destinationWallet.publicKey
    );
    
    console.log(`Đang thử chuyển ${Number(transferAmount) / 10**6} token...`);
    
    // Sử dụng phương thức transfer của token instance đã tạo với đầy đủ tham số
    const transferSignature = await token.transfer(
      sourceAddress,                // source
      destinationAddress,           // destination
      payer,                        // owner
      transferAmount,               // amount
      6                             // decimals
    );
    
    console.log("Chuyển token thành công!");
    console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
    console.log("⚠️ Token có thể chuyển -> NonTransferable không hoạt động hoặc không được áp dụng");
  } catch (error) {
    console.error("Lỗi khi chuyển token:", error);
    
    // Kiểm tra xem lỗi có phải do NonTransferable không
    const errorString = error instanceof Error 
      ? error.toString() 
      : String(error);
      
    if (errorString.includes("NonTransferable") || 
        errorString.includes("0x75") ||  // Mã lỗi NonTransferable
        errorString.includes("non-transferable")) {
      console.log("✅ Xác nhận: Token KHÔNG thể chuyển -> NonTransferable extension hoạt động đúng!");
    } else {
      console.log("❌ Lỗi khác, không liên quan đến NonTransferable:");
      console.log(errorString);
    }
  }
  
  console.log("\n===== TEST COMPLETE =====");
}

main().catch(error => {
  console.error("Error:", error);
}); 