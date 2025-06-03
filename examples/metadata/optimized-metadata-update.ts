import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getTokenMetadata, 
} from "@solana/spl-token";

import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from "../../src";
import { TokenMetadataToken } from "../../src/extensions/token-metadata";

/**
 * Giả lập wallet adapter interface
 */
interface MockWalletAdapter {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
}

/**
 * Lấy số dư SOL của một địa chỉ
 */
async function getBalance(connection: Connection, address: PublicKey): Promise<number> {
  const balance = await connection.getBalance(address);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Hàm tiện ích để in ra metadata của token
 */
async function printTokenMetadata(connection: Connection, mint: PublicKey) {
  try {
    const tokenMetadata = await getTokenMetadata(
      connection,
      mint,
      "confirmed"
    );
    
    console.log("-".repeat(50));
    console.log(`Tên token: ${tokenMetadata?.name}`);
    console.log(`Ký hiệu token: ${tokenMetadata?.symbol}`);
    console.log(`URI token: ${tokenMetadata?.uri}`);
    
    if (tokenMetadata?.additionalMetadata && tokenMetadata.additionalMetadata.length > 0) {
      console.log("Metadata bổ sung:");
      for (const [key, value] of tokenMetadata.additionalMetadata) {
        console.log(`  ${key}: ${value}`);
      }
    }
    console.log("-".repeat(50));
  } catch (error) {
    console.error("Không thể lấy metadata token:", error);
  }
}

/**
 * Kiểm tra phương thức cải tiến tối ưu hóa chi phí cập nhật metadata
 * Kết hợp các test case để đánh giá hiệu quả của các cải tiến
 */
async function testMetadataOptimization() {
  console.log("🚀 BẮT ĐẦU TEST TỐI ƯU HÓA CẬP NHẬT METADATA");
  console.log("=".repeat(80));

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  try {
    // Tải keypair từ file để test
    let wallet: Keypair;
    
    // Thử load từ vị trí mặc định trước
    try {
      const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
      const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf-8"});
      const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
      wallet = Keypair.fromSecretKey(secretKey);
    } catch (e) {
      // Thử load từ thư mục hiện tại nếu thất bại
      try {
        const secretKeyString = fs.readFileSync("keypair.json", {encoding: "utf-8"});
        const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
        wallet = Keypair.fromSecretKey(secretKey);
      } catch (e2) {
        // Tạo keypair mới nếu không tìm thấy
        console.log("⚠️ Không tìm thấy keypair, tạo mới keypair để test...");
        wallet = Keypair.generate();
        
        // Ghi keypair mới vào file để sử dụng lại sau này
        fs.writeFileSync('keypair.json', JSON.stringify(Array.from(wallet.secretKey)));
      }
    }
    
    console.log(`🔑 Sử dụng wallet: ${wallet.publicKey.toString()}`);
    
    // Kiểm tra số dư ban đầu
    const initialBalance = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Số dư ban đầu: ${initialBalance.toFixed(6)} SOL`);
    
    // Nếu số dư quá thấp, yêu cầu chuyển token
    if (initialBalance < 0.1) {
      console.log(`⚠️ Số dư không đủ để chạy test. Vui lòng chuyển ít nhất 0.1 SOL đến địa chỉ: ${wallet.publicKey.toString()}`);
      console.log("Nhấn Ctrl+C để thoát và thử lại sau khi đã nạp SOL.");
      return;
    }
    
    // Tạo mock wallet adapter
    const mockWallet: MockWalletAdapter = {
      publicKey: wallet.publicKey,
      signTransaction: async (transaction: Transaction) => {
        // Giả lập việc ký transaction như một wallet thật
        transaction.sign(wallet);
        return transaction;
      }
    };
    
    console.log("✅ Mock wallet adapter đã được tạo");
    
    // Bước 1: Tạo token test với metadata
    console.log("\n📝 BƯỚC 1: Tạo token test với metadata...");
    
    const tokenBuilder = new TokenBuilder(connection);
    tokenBuilder
      .setTokenInfo(6, wallet.publicKey)
      .addTokenMetadata(
        "Optimized Test Token",
        "OTT",
        "https://example.com/optimized-metadata.json",
        {
          "description": "Token để kiểm thử tối ưu hóa cập nhật metadata"
        }
      );
    
    console.log("⏳ Đang tạo token...");
    
    // Lấy instructions để tạo token
    const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(wallet.publicKey);
    
    // Tạo và gửi transaction
    const createTx = new Transaction().add(...instructions);
    createTx.feePayer = wallet.publicKey;
    createTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    const createTokenSignature = await sendAndConfirmTransaction(
      connection,
      createTx,
      [wallet, ...signers],
      { commitment: 'confirmed', skipPreflight: true }
    );
    
    console.log(`✅ Token đã được tạo: ${mint.toString()}`);
    console.log(`📊 Giao dịch: https://explorer.solana.com/tx/${createTokenSignature}?cluster=devnet`);
    
    // In ra metadata ban đầu
    await printTokenMetadata(connection, mint);
    
    // Ghi nhận số dư sau khi tạo token
    const balanceAfterCreate = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Số dư sau khi tạo token: ${balanceAfterCreate.toFixed(6)} SOL (Chi phí: ${(initialBalance - balanceAfterCreate).toFixed(6)} SOL)`);
    
    // Tải token với metadata extension
    const tokenWithMetadata = await TokenMetadataToken.fromMint(connection, mint);
    if (!tokenWithMetadata) {
      throw new Error("Token không tìm thấy hoặc không có metadata extension");
    }
    
    // TEST CASE 1: Cập nhật giá trị ngắn hơn (không cần cấp phát thêm)
    console.log("\n🧪 TEST CASE 1: Cập nhật với giá trị ngắn hơn...");
    const balanceBeforeCase1 = await getBalance(connection, wallet.publicKey);
    
    // Cập nhật description với giá trị ngắn hơn
    const shorterDescription = "Test ngắn";
    const case1Result = await tokenWithMetadata.updateMetadataOptimized(
      connection,
      mockWallet,
      "description",
      shorterDescription,
      { priorityLevel: 'low', allocateStorage: true }
    );
    
    console.log(`✅ Đã cập nhật description thành "${shorterDescription}"`);
    console.log(`📊 Giao dịch: https://explorer.solana.com/tx/${case1Result.signature}?cluster=devnet`);
    
    const balanceAfterCase1 = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Chi phí cập nhật giá trị NGẮN hơn: ${(balanceBeforeCase1 - balanceAfterCase1).toFixed(6)} SOL`);
    
    // In ra metadata sau khi cập nhật
    await printTokenMetadata(connection, mint);

    // TEST CASE 2: Cập nhật giá trị dài hơn (cần cấp phát thêm)
    console.log("\n🧪 TEST CASE 2: Cập nhật với giá trị dài hơn...");
    const balanceBeforeCase2 = await getBalance(connection, wallet.publicKey);
    
    // Cập nhật description với giá trị dài hơn
    const longerDescription = "Đây là mô tả dài hơn nhiều để kiểm tra việc cấp phát thêm không gian. Với thuật toán tối ưu, chúng ta chỉ cần trả phí cho phần tăng thêm.";
    const case2Result = await tokenWithMetadata.updateMetadataOptimized(
      connection,
      mockWallet,
      "description",
      longerDescription,
      { priorityLevel: 'low', allocateStorage: true }
    );
    
    console.log(`✅ Đã cập nhật description thành giá trị dài hơn`);
    console.log(`📊 Giao dịch: https://explorer.solana.com/tx/${case2Result.signature}?cluster=devnet`);
    
    const balanceAfterCase2 = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Chi phí cập nhật giá trị DÀI hơn: ${(balanceBeforeCase2 - balanceAfterCase2).toFixed(6)} SOL`);
    
    // In ra metadata sau khi cập nhật
    await printTokenMetadata(connection, mint);

    // TEST CASE 3: Thêm trường metadata mới (cần cấp phát thêm)
    console.log("\n🧪 TEST CASE 3: Thêm trường metadata mới...");
    const balanceBeforeCase3 = await getBalance(connection, wallet.publicKey);
    
    // Thêm trường website mới
    const website = "https://example.com/token";
    const case3Result = await tokenWithMetadata.updateMetadataOptimized(
      connection,
      mockWallet,
      "website",
      website,
      { priorityLevel: 'low', allocateStorage: true }
    );
    
    console.log(`✅ Đã thêm trường website`);
    console.log(`📊 Giao dịch: https://explorer.solana.com/tx/${case3Result.signature}?cluster=devnet`);
    
    const balanceAfterCase3 = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Chi phí thêm trường MỚI: ${(balanceBeforeCase3 - balanceAfterCase3).toFixed(6)} SOL`);
    
    // In ra metadata sau khi cập nhật
    await printTokenMetadata(connection, mint);

    // TEST CASE 4: Cập nhật lại trường website với giá trị dài tương đương (không cần cấp phát thêm)
    console.log("\n🧪 TEST CASE 4: Cập nhật trường với giá trị tương đương...");
    const balanceBeforeCase4 = await getBalance(connection, wallet.publicKey);
    
    // Cập nhật website với giá trị tương đương về độ dài
    const newWebsite = "https://tokenui.example.org";
    const case4Result = await tokenWithMetadata.updateMetadataOptimized(
      connection,
      mockWallet,
      "website",
      newWebsite,
      { priorityLevel: 'low', allocateStorage: true }
    );
    
    console.log(`✅ Đã cập nhật trường website thành "${newWebsite}"`);
    console.log(`📊 Giao dịch: https://explorer.solana.com/tx/${case4Result.signature}?cluster=devnet`);
    
    const balanceAfterCase4 = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Chi phí cập nhật giá trị TƯƠNG ĐƯƠNG: ${(balanceBeforeCase4 - balanceAfterCase4).toFixed(6)} SOL`);
    
    // In ra metadata sau khi cập nhật
    await printTokenMetadata(connection, mint);

    // TEST CASE 5: Cập nhật nhiều trường cùng lúc
    console.log("\n🧪 TEST CASE 5: Cập nhật nhiều trường cùng lúc...");
    const balanceBeforeCase5 = await getBalance(connection, wallet.publicKey);
    
    // Các trường cần cập nhật
    const fieldsToUpdate = {
      "twitter": "@storage_test_token",
      "telegram": "@storage_test_group",
      "discord": "https://discord.gg/storage_test",
      "github": "https://github.com/storage_test",
    };
    
    // Sử dụng phương thức cập nhật batch
    const case5Result = await tokenWithMetadata.updateMetadataBatchOptimized(
      connection,
      mockWallet,
      fieldsToUpdate,
      { priorityLevel: 'low', allocateStorage: true, maxFieldsPerTransaction: 4 }
    );
    
    console.log(`✅ Đã cập nhật ${Object.keys(fieldsToUpdate).length} trường metadata`);
    for (const [index, signature] of case5Result.signatures.entries()) {
      console.log(`   Giao dịch ${index + 1}: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    }
    
    const balanceAfterCase5 = await getBalance(connection, wallet.publicKey);
    console.log(`💰 Chi phí cập nhật NHIỀU TRƯỜNG: ${(balanceBeforeCase5 - balanceAfterCase5).toFixed(6)} SOL`);
    console.log(`💰 Chi phí trung bình mỗi trường: ${((balanceBeforeCase5 - balanceAfterCase5) / Object.keys(fieldsToUpdate).length).toFixed(6)} SOL`);
    
    // In ra metadata sau khi cập nhật batch
    await printTokenMetadata(connection, mint);

    // TỔNG KẾT CHI PHÍ
    console.log("\n📊 TỔNG KẾT CHI PHÍ SAU CẢI TIẾN:");
    console.log("-".repeat(50));
    console.log(`• Chi phí tạo token: ${(initialBalance - balanceAfterCreate).toFixed(6)} SOL`);
    console.log(`• Cập nhật giá trị ngắn hơn: ${(balanceBeforeCase1 - balanceAfterCase1).toFixed(6)} SOL`);
    console.log(`• Cập nhật giá trị dài hơn: ${(balanceBeforeCase2 - balanceAfterCase2).toFixed(6)} SOL`);
    console.log(`• Thêm trường mới: ${(balanceBeforeCase3 - balanceAfterCase3).toFixed(6)} SOL`);
    console.log(`• Cập nhật giá trị tương đương: ${(balanceBeforeCase4 - balanceAfterCase4).toFixed(6)} SOL`);
    console.log(`• Cập nhật nhiều trường: ${(balanceBeforeCase5 - balanceAfterCase5).toFixed(6)} SOL`);
    console.log(`• Chi phí trung bình mỗi trường: ${((balanceBeforeCase5 - balanceAfterCase5) / Object.keys(fieldsToUpdate).length).toFixed(6)} SOL`);
    console.log("-".repeat(50));

    const totalCost = (
      (balanceBeforeCase1 - balanceAfterCase1) +
      (balanceBeforeCase2 - balanceAfterCase2) +
      (balanceBeforeCase3 - balanceAfterCase3) +
      (balanceBeforeCase4 - balanceAfterCase4) +
      (balanceBeforeCase5 - balanceAfterCase5)
    );
    
    console.log(`🏁 TỔNG CHI PHÍ TEST: ${totalCost.toFixed(6)} SOL`);
    console.log("\n✅ Tất cả các test case đã hoàn thành thành công!");
    
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
}

// Chạy test
testMetadataOptimization().catch(err => {
  console.error("❌ Lỗi nghiêm trọng:", err);
  process.exit(1);
}); 