import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Token2022Factory } from "../../src/utils/token-factory";
import { TokenBuilder } from "../../src/utils/token-builder";
import * as fs from "fs";
import * as path from "path";
import { ExtensionType } from "@solana/spl-token";

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
    console.log(`Using wallet: ${payer.publicKey.toString()}`);
  } catch (error) {
    console.error("Could not read wallet. Creating a new keypair...");
    payer = Keypair.generate();
    console.log(`Using generated wallet: ${payer.publicKey.toString()}`);
    
    // Airdrop SOL cho ví mới
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      2 * 10 ** 9
    );
    await connection.confirmTransaction(airdropSignature);
  }

  // Test 1: Tạo token với kết hợp hợp lệ - TransferFee + PermanentDelegate
  console.log("\n=== Test 1: Kết hợp hợp lệ - TransferFee + PermanentDelegate ===");
  try {
    const result1 = await factory.createToken(
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
          permanentDelegate: payer.publicKey
        }
      }
    );
    
    console.log("✅ Thành công tạo token với TransferFee + PermanentDelegate");
    console.log(`Mint address: ${result1.mint.toString()}`);
    console.log(`Transaction signature: ${result1.transactionSignature}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
  
  // Test 2: Sử dụng trực tiếp TokenBuilder để kiểm tra tương thích
  console.log("\n=== Test 2: Sử dụng TokenBuilder để kiểm tra tương thích trước ===");
  try {
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addTransferFee(50, BigInt(500_000_000), payer.publicKey, payer.publicKey)
      .addPermanentDelegate(payer.publicKey);
    
    // Kiểm tra và in ra các extension đã thêm
    console.log("Các extension đã thêm:");
    console.log("- TransferFee");
    console.log("- PermanentDelegate");
    
    // Xây dựng token
    const result2 = await builder.build(payer);
    
    console.log("✅ Thành công sử dụng TokenBuilder để tạo token");
    console.log(`Mint address: ${result2.mint.toString()}`);
    console.log(`Transaction signature: ${result2.transactionSignature}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
  
  // Test 3: Thử kết hợp không hợp lệ - NonTransferable + TransferFee
  console.log("\n=== Test 3: Kết hợp không hợp lệ - NonTransferable + TransferFee ===");
  try {
    const builder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addNonTransferable()
      .addTransferFee(50, BigInt(500_000_000), payer.publicKey, payer.publicKey);
    
    // Xây dựng token
    const result3 = await builder.build(payer);
    
    console.log("⚠️ Điều này không nên xảy ra: token được tạo dù có extension không tương thích");
    console.log(`Mint address: ${result3.mint.toString()}`);
  } catch (error) {
    console.log("✅ Phát hiện lỗi tương thích như mong đợi");
    console.error("Lỗi chi tiết:", error);
  }
  
  // Test 4: Thử kết hợp không hợp lệ khác - NonTransferable + TransferHook
  console.log("\n=== Test 4: Kết hợp không hợp lệ - NonTransferable + TransferHook ===");
  try {
    const dummyProgramId = Keypair.generate().publicKey;
    
    await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          nonTransferable: true,
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
  
  // Test 5: Thử một kết hợp hợp lệ phức tạp hơn
  console.log("\n=== Test 5: Kết hợp hợp lệ - PermanentDelegate + TransferHook ===");
  try {
    const dummyProgramId = Keypair.generate().publicKey;
    
    const result5 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          permanentDelegate: payer.publicKey,
          transferHook: {
            programId: dummyProgramId
          }
        }
      }
    );
    
    console.log("✅ Thành công tạo token với PermanentDelegate + TransferHook");
    console.log(`Mint address: ${result5.mint.toString()}`);
    console.log(`Transaction signature: ${result5.transactionSignature}`);
    console.log(`Transfer Hook Program ID: ${dummyProgramId.toString()}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
  
  // Test 6: Thử kết hợp hợp lệ - TransferFee + TransferHook
  console.log("\n=== Test 6: Kết hợp hợp lệ - TransferFee + TransferHook ===");
  try {
    const dummyProgramId = Keypair.generate().publicKey;
    
    const result6 = await factory.createToken(
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
          }
        }
      }
    );
    
    console.log("✅ Thành công tạo token với TransferFee + TransferHook");
    console.log(`Mint address: ${result6.mint.toString()}`);
    console.log(`Transaction signature: ${result6.transactionSignature}`);
    console.log(`Transfer Hook Program ID: ${dummyProgramId.toString()}`);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
  
  // Test 7: Thử kết hợp không hợp lệ - Ba extension cùng lúc, bao gồm hai không tương thích
  console.log("\n=== Test 7: Kết hợp không hợp lệ - TransferFee + NonTransferable + PermanentDelegate ===");
  try {
    await factory.createToken(
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
          nonTransferable: true,
          permanentDelegate: payer.publicKey
        }
      }
    );
    
    console.log("⚠️ Điều này không nên xảy ra: token được tạo dù có extension không tương thích");
  } catch (error) {
    console.log("✅ Phát hiện lỗi tương thích như mong đợi");
    console.error("Lỗi chi tiết:", error);
  }
}

main()
  .then(() => console.log("\nTất cả các test hoàn thành"))
  .catch((error) => {
    console.error("Lỗi trong main:", error);
    process.exit(1);
  }); 