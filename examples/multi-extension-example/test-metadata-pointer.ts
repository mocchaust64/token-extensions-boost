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

  // Test 1: MetadataPointer đơn lẻ
  console.log("\n=== Test 1: MetadataPointer đơn lẻ ===");
  try {
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addMetadata("Test Token", "TEST", "https://example.com/metadata.json");
    
    const result1 = await builder.build(payer);
    
    console.log("✅ Thành công tạo token với MetadataPointer");
    console.log(`Mint address: ${result1.mint.toString()}`);
    console.log(`Transaction signature: ${result1.transactionSignature}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
  
  // Test 2: MetadataPointer + TransferFee (dự đoán tương thích)
  console.log("\n=== Test 2: MetadataPointer + TransferFee ===");
  try {
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addMetadata("Fee Token", "FEE", "https://example.com/fee-token.json")
      .addTransferFee(100, BigInt(1_000_000_000), payer.publicKey, payer.publicKey);
    
    const result2 = await builder.build(payer);
    
    console.log("✅ Thành công tạo token với MetadataPointer + TransferFee");
    console.log(`Mint address: ${result2.mint.toString()}`);
    console.log(`Transaction signature: ${result2.transactionSignature}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }

  // Test 3: MetadataPointer + NonTransferable (dự đoán tương thích)
  console.log("\n=== Test 3: MetadataPointer + NonTransferable ===");
  try {
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addMetadata("Soul Token", "SOUL", "https://example.com/soul-token.json")
      .addNonTransferable();
    
    const result3 = await builder.build(payer);
    
    console.log("✅ Thành công tạo token với MetadataPointer + NonTransferable");
    console.log(`Mint address: ${result3.mint.toString()}`);
    console.log(`Transaction signature: ${result3.transactionSignature}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }

  // Test 4: MetadataPointer + PermanentDelegate (dự đoán tương thích)
  console.log("\n=== Test 4: MetadataPointer + PermanentDelegate ===");
  try {
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addMetadata("Delegate Token", "DELG", "https://example.com/delegate-token.json")
      .addPermanentDelegate(payer.publicKey);
    
    const result4 = await builder.build(payer);
    
    console.log("✅ Thành công tạo token với MetadataPointer + PermanentDelegate");
    console.log(`Mint address: ${result4.mint.toString()}`);
    console.log(`Transaction signature: ${result4.transactionSignature}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }

  // Test 5: MetadataPointer + TransferHook (dự đoán tương thích)
  console.log("\n=== Test 5: MetadataPointer + TransferHook ===");
  try {
    const dummyProgramId = Keypair.generate().publicKey;
    
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addMetadata("Hook Token", "HOOK", "https://example.com/hook-token.json")
      .addTransferHook(dummyProgramId);
    
    const result5 = await builder.build(payer);
    
    console.log("✅ Thành công tạo token với MetadataPointer + TransferHook");
    console.log(`Mint address: ${result5.mint.toString()}`);
    console.log(`Transaction signature: ${result5.transactionSignature}`);
    console.log(`Transfer Hook Program ID: ${dummyProgramId.toString()}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }

  // Test 6: MetadataPointer + ConfidentialTransfer (dự đoán có thể tương thích)
  console.log("\n=== Test 6: MetadataPointer + ConfidentialTransfer ===");
  try {
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addMetadata("Confidential Token", "CONF", "https://example.com/confidential-token.json")
      .addConfidentialTransfer(true);
    
    const result6 = await builder.build(payer);
    
    console.log("✅ Thành công tạo token với MetadataPointer + ConfidentialTransfer");
    console.log(`Mint address: ${result6.mint.toString()}`);
    console.log(`Transaction signature: ${result6.transactionSignature}`);
  } catch (error) {
    console.log("❌ Phát hiện lỗi tương thích");
    console.error("Lỗi chi tiết:", error);
  }

  // Test 7: Thử kết hợp 3 extension với MetadataPointer
  console.log("\n=== Test 7: MetadataPointer + TransferFee + TransferHook ===");
  try {
    const dummyProgramId = Keypair.generate().publicKey;
    
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addMetadata("Complex Token", "CPLX", "https://example.com/complex-token.json")
      .addTransferFee(100, BigInt(1_000_000_000), payer.publicKey, payer.publicKey)
      .addTransferHook(dummyProgramId);
    
    const result7 = await builder.build(payer);
    
    console.log("✅ Thành công tạo token với MetadataPointer + TransferFee + TransferHook");
    console.log(`Mint address: ${result7.mint.toString()}`);
    console.log(`Transaction signature: ${result7.transactionSignature}`);
    console.log(`Transfer Hook Program ID: ${dummyProgramId.toString()}`);
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