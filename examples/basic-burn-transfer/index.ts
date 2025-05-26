import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { TokenBuilder, Token } from "../../src";

import { 
  getOrCreateAssociatedTokenAccount, 
  TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";

// Hàm trợ giúp để đợi một khoảng thời gian
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Kết nối đến Solana devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Đọc keypair từ tệp solana config
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  
  console.log("=== Tạo token với nhiều extension ===");
  
  // Tạo token mới với nhiều extension
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)  // 9 decimals
    .addMetadata(                      // Thêm extension Metadata
      "Multi-Feature Test Token", 
      "MFTT", 
      "https://example.com/token.json",
      {
        "description": "Token demonstrating multiple extensions",
        "creator": payer.publicKey.toString(),
        "website": "https://example.com"
      }
    )
    .addTransferFee(                   // Thêm extension TransferFee
      100,                            // 1% phí (100 basis points)
      BigInt(1000000000),             // Phí tối đa 1 token (với 9 decimals)
      payer.publicKey,                // Authority để thay đổi phí
      payer.publicKey                 // Authority để rút phí
    )
    .addPermanentDelegate(             // Thêm extension PermanentDelegate
      payer.publicKey                 // Permanent delegate
    );
  
  console.log("Đang tạo token với nhiều extension...");
  const { mint, token, transactionSignature } = await tokenBuilder.createToken(payer);
  
  console.log(`Token đã được tạo: ${mint.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
  
  // Đợi một chút để đảm bảo transaction được xác nhận
  console.log("Đợi để xác nhận transaction...");
  await sleep(3000);
  
  // Tạo tài khoản token cho người dùng - sử dụng phương thức từ lớp Token
  console.log("Tạo tài khoản token cho người dùng...");
  const { address: userTokenAddress, signature: userTokenSignature } = await token.createOrGetTokenAccount(
    payer,
    payer.publicKey
  );
  console.log(`Tài khoản token người dùng: ${userTokenAddress.toString()}`);
  if (userTokenSignature) {
    console.log(`Giao dịch tạo tài khoản: https://explorer.solana.com/tx/${userTokenSignature}?cluster=devnet`);
  }
  
  // Đợi một chút để đảm bảo transaction được xác nhận
  await sleep(2000);
  
  // Mint một số token cho người dùng
  const mintAmount = BigInt(1000_000_000_000);  // 1000 tokens với 9 decimals
  
  // Tạo một tài khoản khác để chuyển token đến
  const recipient = Keypair.generate();
  console.log(`Người nhận: ${recipient.publicKey.toString()}`);
  
  console.log("Tạo tài khoản token cho người nhận...");
  // Sử dụng getOrCreateAssociatedTokenAccount vì cần recipient public key
  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipient.publicKey,
    false, 
    "confirmed", 
    { skipPreflight: true },
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`Tài khoản token người nhận: ${recipientTokenAccount.address.toString()}`);
  
  // Đợi một chút để đảm bảo transaction được xác nhận
  await sleep(2000);
  
  // Mint tokens - sử dụng phương thức mintTo từ token instance
  console.log(`\n=== Mint ${Number(mintAmount) / 1e9} tokens ===`);
  
  try {
    // Sử dụng phương thức mintTo từ lớp Token
    const mintSignature = await token.mintTo(
      userTokenAddress,
      payer,
      mintAmount
    );
    
    console.log(`Đã mint ${Number(mintAmount) / 1e9} tokens vào tài khoản ${userTokenAddress.toString()}`);
    console.log(`Giao dịch mint: https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);
    
    // Đợi một chút để đảm bảo transaction được xác nhận
    console.log("Đợi để xác nhận transaction...");
    await sleep(2000);
    
  } catch (error: any) {
    console.error(`Lỗi khi mint tokens: ${error.message}`);
    process.exit(1);
  }
  
  // Chuyển tokens - sử dụng phương thức transfer từ token instance
  console.log(`\n=== Chuyển tokens ===`);
  const transferAmount = BigInt(500_000_000_000);  // 500 tokens
  
  try {
    // Sử dụng phương thức transfer từ lớp Token
    const transferSignature = await token.transfer(
      userTokenAddress,
      recipientTokenAccount.address,
      payer,
      transferAmount,
      9 // decimals
    );
    
    console.log(`Đã chuyển ${Number(transferAmount) / 1e9} tokens tới ${recipient.publicKey.toString()}`);
    console.log(`Giao dịch chuyển: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
    
    // Do sử dụng TransferFee extension, phí chuyển khoản sẽ được thu
    console.log(`Phí chuyển khoản ước tính: ${Number(transferAmount) * 0.01} tokens (1%)`);
    
    // Đợi một chút để đảm bảo transaction được xác nhận
    console.log("Đợi để xác nhận transaction...");
    await sleep(2000);
    
  } catch (error: any) {
    console.error(`Lỗi khi chuyển tokens: ${error.message}`);
  }
  
  // Burn tokens - sử dụng phương thức burnTokens từ token instance
  console.log(`\n=== Burn tokens ===`);
  const burnAmount = BigInt(200_000_000_000);  // 200 tokens
  
  try {
    // Sử dụng phương thức burnTokens từ lớp Token
    const burnSignature = await token.burnTokens(
      userTokenAddress,
      payer,
      burnAmount
    );
    
    console.log(`Đã burn ${Number(burnAmount) / 1e9} tokens từ ${userTokenAddress.toString()}`);
    console.log(`Giao dịch burn: https://explorer.solana.com/tx/${burnSignature}?cluster=devnet`);
  } catch (error: any) {
    console.error(`Lỗi khi burn tokens: ${error.message}`);
  }
  
  // Thử nghiệm chuyển token bằng permanent delegate
  console.log(`\n=== Chuyển tokens bằng Permanent Delegate ===`);
  
  try {
    const delegateTransferAmount = BigInt(50_000_000_000); // 50 tokens
    
    // Lưu ý: Permanent delegate có thể chuyển tokens từ bất kỳ tài khoản nào mà không cần chữ ký của chủ sở hữu
    const delegateTransferSignature = await token.transfer(
      recipientTokenAccount.address, // Nguồn (tài khoản người nhận trước đó)
      userTokenAddress, // Đích (chuyển lại cho người dùng)
      payer, // Permanent delegate
      delegateTransferAmount,
      9 // decimals
    );
    
    console.log(`Permanent Delegate đã chuyển ${Number(delegateTransferAmount) / 1e9} tokens từ tài khoản của người nhận về cho người dùng!`);
    console.log(`Giao dịch delegate: https://explorer.solana.com/tx/${delegateTransferSignature}?cluster=devnet`);
  } catch (error: any) {
    console.error(`Lỗi khi sử dụng permanent delegate: ${error.message}`);
  }
  
  console.log(`\n=== Thông tin token ===`);
  console.log(`Mint address: ${mint.toString()}`);
  console.log(`Token details: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
  console.log(`Token metadata: https://example.com/token.json`);
  console.log(`Transfer fee: 1% (100 basis points)`);
  console.log(`Permanent delegate: ${payer.publicKey.toString()}`);
}

main()
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  }); 