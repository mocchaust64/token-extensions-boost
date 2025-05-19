import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Token2022Factory } from "../../src/utils/token-factory";
import { TokenBuilder } from "../../src/utils/token-builder";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Kết nối đến Solana devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Khởi tạo Token2022Factory
  const factory = new Token2022Factory(connection);
  
  // Đọc keypair từ file
  let payer: Keypair;
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  
  try {
    const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    payer = Keypair.fromSecretKey(secretKey);
    console.log(`Sử dụng ví: ${payer.publicKey.toString()}`);
  } catch (error) {
    console.error("Không thể đọc file ví. Tạo keypair mới...");
    payer = Keypair.generate();
    console.log(`Sử dụng ví được tạo: ${payer.publicKey.toString()}`);
    
    // Airdrop SOL cho ví mới
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      2 * 10 ** 9
    );
    await connection.confirmTransaction(airdropSignature);
  }

  // Test 1: ConfidentialTransfer đơn lẻ
  console.log("\n=== Test 1: ConfidentialTransfer đơn lẻ ===");
  try {
    const result1 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          confidentialTransfer: {
            autoEnable: true
          }
        }
      }
    );
    
    console.log("✅ Thành công tạo token với ConfidentialTransfer");
    console.log(`Mint address: ${result1.mint.toString()}`);
    console.log(`Transaction signature: ${result1.transactionSignature}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
  
  // Test 2: Kết hợp 3 extension tương thích
  console.log("\n=== Test 2: TransferFee + TransferHook + PermanentDelegate ===");
  try {
    const dummyProgramId = Keypair.generate().publicKey;
    
    const result2 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          transferFee: {
            feeBasisPoints: 100, // 1%
            maxFee: BigInt(1_000_000_000),
            transferFeeConfigAuthority: payer.publicKey,
            withdrawWithheldAuthority: payer.publicKey
          },
          transferHook: {
            programId: dummyProgramId
          },
          permanentDelegate: payer.publicKey
        }
      }
    );
    
    console.log("✅ Thành công tạo token với TransferFee + TransferHook + PermanentDelegate");
    console.log(`Mint address: ${result2.mint.toString()}`);
    console.log(`Transaction signature: ${result2.transactionSignature}`);
    console.log(`Transfer Hook Program ID: ${dummyProgramId.toString()}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
  
  // Test 3: ConfidentialTransfer + PermanentDelegate (dự đoán không tương thích)
  console.log("\n=== Test 3: ConfidentialTransfer + PermanentDelegate (dự đoán không tương thích) ===");
  try {
    await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          confidentialTransfer: {
            autoEnable: true
          },
          permanentDelegate: payer.publicKey
        }
      }
    );
    
    console.log("⚠️ Điều này không nên xảy ra: token được tạo dù có extension không tương thích");
  } catch (error) {
    console.log("✅ Phát hiện lỗi tương thích như mong đợi");
    console.error("Lỗi chi tiết:", error);
  }
  
  // Test 4: TokenBuilder không có extension nào
  console.log("\n=== Test 4: TokenBuilder không có extension ===");
  try {
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey);
    
    const result4 = await builder.build(payer);
    
    console.log("✅ Thành công tạo token không có extension");
    console.log(`Mint address: ${result4.mint.toString()}`);
    console.log(`Transaction signature: ${result4.transactionSignature}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
  
  // Test 5: ConfidentialTransfer + TransferHook (dự đoán không tương thích)
  console.log("\n=== Test 5: ConfidentialTransfer + TransferHook (dự đoán không tương thích) ===");
  try {
    const dummyProgramId = Keypair.generate().publicKey;
    
    await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          confidentialTransfer: {
            autoEnable: true
          },
          transferHook: {
            programId: dummyProgramId
          }
        }
      }
    );
    
    console.log("⚠️ Điều này không nên xảy ra: token được tạo dù có extension không tương thích");
  } catch (error) {
    console.log("✅ Phát hiện lỗi tương thích như mong đợi");
    console.error("Lỗi chi tiết:", error);
  }
  
  // Test 6: NonTransferable + ConfidentialTransfer (dự đoán không tương thích)
  console.log("\n=== Test 6: NonTransferable + ConfidentialTransfer (dự đoán không tương thích) ===");
  try {
    await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          nonTransferable: true,
          confidentialTransfer: {
            autoEnable: true
          }
        }
      }
    );
    
    console.log("⚠️ Điều này không nên xảy ra: token được tạo dù có extension không tương thích");
  } catch (error) {
    console.log("✅ Phát hiện lỗi tương thích như mong đợi");
    console.error("Lỗi chi tiết:", error);
  }
  
  // Test 7: Thử kết hợp 4 extension
  console.log("\n=== Test 7: Thử tạo token với 4 extension cùng lúc (các extension tương thích) ===");
  try {
    const dummyProgramId = Keypair.generate().publicKey;
    
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey, payer.publicKey) // Thêm freezeAuthority
      .addTransferFee(100, BigInt(1_000_000_000), payer.publicKey, payer.publicKey)
      .addTransferHook(dummyProgramId)
      .addPermanentDelegate(payer.publicKey);
    
    // Kiểm tra số lượng extension
    console.log("Số lượng extension: 3 + Mint + Standard (Mint Authority, Decimals, Freeze Authority)");
    
    // Xây dựng token
    const result7 = await builder.build(payer);
    
    console.log("✅ Thành công tạo token với nhiều extension");
    console.log(`Mint address: ${result7.mint.toString()}`);
    console.log(`Transaction signature: ${result7.transactionSignature}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
  
  // Test 8: NonTransferable + PermanentDelegate (dự đoán tương thích)
  console.log("\n=== Test 8: NonTransferable + PermanentDelegate (dự đoán tương thích) ===");
  try {
    const result8 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          nonTransferable: true,
          permanentDelegate: payer.publicKey
        }
      }
    );
    
    console.log("✅ Thành công tạo token với NonTransferable + PermanentDelegate");
    console.log(`Mint address: ${result8.mint.toString()}`);
    console.log(`Transaction signature: ${result8.transactionSignature}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
}

main()
  .then(() => console.log("\nTất cả các test hoàn thành"))
  .catch((error) => {
    console.error("Lỗi trong main:", error);
    process.exit(1);
  }); 