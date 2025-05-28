import { clusterApiUrl, Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { PermanentDelegateToken, TokenBuilder } from "../../dist";

async function main() {
  // Kết nối tới Solana devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Đọc ví từ file cục bộ - trong ứng dụng thực tế, sẽ sử dụng wallet adapter
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  
  console.log("Địa chỉ ví:", payer.publicKey.toString());

  // Bước 1: Tạo token mới với permanent delegate
  const delegateKeypair = payer;
  const delegatePublicKey = delegateKeypair.publicKey;
  
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)
    .addPermanentDelegate(delegatePublicKey);
  
  // Sử dụng phương thức createTokenInstructions thay vì createToken
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
  
  // Tạo và gửi transaction
  const transaction = new Transaction().add(...instructions);
  const createTokenSignature = await sendAndConfirmTransaction(
    connection, 
    transaction, 
    [payer, ...signers]
  );
  
  console.log(`Token được tạo thành công với mint: ${mint.toString()}`);
  console.log(`Giao dịch: https://explorer.solana.com/tx/${createTokenSignature}?cluster=devnet`);
  
  const permaDelegateToken = new PermanentDelegateToken(connection, mint, delegatePublicKey);

  // Bước 2: Tạo token accounts
  // Sử dụng phương thức createTokenAccountInstructions 
  const { instructions: adminInstructions, address: adminTokenAddress } = 
    await permaDelegateToken.createTokenAccountInstructions(payer.publicKey);
  
  // Tạo và gửi transaction
  if (adminInstructions.length > 0) {
    const adminTransaction = new Transaction().add(...adminInstructions);
    const adminTokenSignature = await sendAndConfirmTransaction(
      connection,
      adminTransaction,
      [payer]
    );
    console.log(`Tài khoản admin đã tạo: ${adminTokenAddress.toString()}`);
  } else {
    console.log(`Tài khoản admin đã tồn tại: ${adminTokenAddress.toString()}`);
  }
  
  // Tạo tài khoản cho user
  const user = Keypair.generate();
  const { instructions: userInstructions, address: userTokenAddress } =
    await permaDelegateToken.createTokenAccountInstructions(user.publicKey, payer.publicKey);

  // Tạo và gửi transaction
  const userTransaction = new Transaction().add(...userInstructions);
  const userTokenSignature = await sendAndConfirmTransaction(
    connection,
    userTransaction,
    [payer]
  );

  // Bước 3: Chuyển token với quyền delegate
  const amount = BigInt(50_000_000_000);
  
  try {
    // Tạo instruction chuyển khoản
    const transferInstruction = permaDelegateToken.createTransferAsDelegateInstruction(
      delegatePublicKey,
      userTokenAddress,
      adminTokenAddress,
      amount
    );
    
    // Tạo và gửi transaction
    const transferTransaction = new Transaction().add(transferInstruction);
    const transferSignature = await sendAndConfirmTransaction(
      connection,
      transferTransaction,
      [payer]  // Vì payer là delegate
    );
    
    console.log(`Đã chuyển ${Number(amount) / 10**9} tokens từ user đến admin với quyền delegate`);
    console.log(`Giao dịch: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  } catch (error: any) {
    console.log("Lỗi chuyển khoản:", error.message);
    // Chuyển khoản có thể thất bại nếu không có tokens trong tài khoản user
  }
  
  // Bước 4: Kiểm tra trạng thái permanent delegate
  try {
    const isPermanentDelegate = await permaDelegateToken.isPermanentDelegate(delegatePublicKey);
    console.log(`Địa chỉ ${delegatePublicKey.toString()} có phải là permanent delegate: ${isPermanentDelegate ? "Có" : "Không"}`);
    
    const permanentDelegate = await permaDelegateToken.getPermanentDelegate();
    console.log(`Permanent delegate của token: ${permanentDelegate ? permanentDelegate.toString() : "Không có"}`);
  } catch (error: any) {
    console.log("Lỗi khi kiểm tra permanent delegate:", error.message);
  }
  
  console.log(`Tóm tắt:`);
  console.log(`- Token Mint: ${mint.toString()}`);
  console.log(`- Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
}

main()
  .then(() => console.log("Thành công"))
  .catch((error) => {
    console.error("Lỗi:", error);
    process.exit(1);
  }); 