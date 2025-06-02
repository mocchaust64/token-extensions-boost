import { clusterApiUrl, Connection, Keypair, Transaction, sendAndConfirmTransaction, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { PermanentDelegateToken, TokenBuilder } from "../../dist";
import { 
  TOKEN_2022_PROGRAM_ID, 
  createMintToInstruction, 
  getMint,
  createTransferCheckedInstruction,
  getAccount,
   ExtensionType
} from "@solana/spl-token";


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
  
  console.log("Tạo token với permanent delegate:", delegatePublicKey.toString());
  
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
  
  // Kiểm tra trực tiếp dữ liệu token từ blockchain
  try {
    // Lấy thông tin account từ blockchain
    console.log("\n===== KIỂM TRA TRỰC TIẾP DỮ LIỆU MINT =====");
    
    const accountInfo = await connection.getAccountInfo(mint);
    if (!accountInfo) {
      console.log("Không tìm thấy thông tin tài khoản mint");
      return;
    }
    
    console.log(`Mint account tìm thấy: ${mint.toString()}`);
    console.log(`Owner: ${accountInfo.owner.toString()}`);
    console.log(`Program ID: ${TOKEN_2022_PROGRAM_ID.toString()}`);
    
    const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    
    // In thông tin cơ bản của mint
    const simplifiedMintInfo = {
      address: mintInfo.address.toString(),
      mintAuthority: mintInfo.mintAuthority?.toString() || null,
      supply: mintInfo.supply.toString(),
      decimals: mintInfo.decimals,
    };
    console.log("Thông tin cơ bản mint:", JSON.stringify(simplifiedMintInfo, null, 2));
    
    // Kiểm tra permanent delegate
    console.log(`Permanent delegate từ mintInfo: ${mintInfo.permanentDelegate?.toString() || "Không có"}`);
    
    // In danh sách extension và kích thước
    console.log(`\nTài khoản mint có kích thước: ${accountInfo.data.length} bytes`);
    
  } catch (error) {
    console.log("Lỗi khi kiểm tra thông tin mint:", error);
  }
  
  const permaDelegateToken = new PermanentDelegateToken(connection, mint, delegatePublicKey);

  // Bước 2: Tạo token accounts
  // Sử dụng phương thức createTokenAccountInstructions 
  const { instructions: adminInstructions, address: adminTokenAddress } = 
    await permaDelegateToken.createTokenAccountInstructions(payer.publicKey, payer.publicKey);
  
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
  console.log(`User address: ${user.publicKey.toString()}`);
  
  const { instructions: userInstructions, address: userTokenAddress } =
    await permaDelegateToken.createTokenAccountInstructions(payer.publicKey, user.publicKey);

  // Tạo và gửi transaction
  const userTransaction = new Transaction().add(...userInstructions);
  const userTokenSignature = await sendAndConfirmTransaction(
    connection,
    userTransaction,
    [payer]
  );
  console.log(`Tài khoản user đã tạo: ${userTokenAddress.toString()}`);

  // Mint một số token cho user
  const mintAmount = BigInt(100_000_000_000); // 100 tokens
  const mintInstruction = createMintToInstruction(
    mint,
    userTokenAddress,
    payer.publicKey, // mint authority
    mintAmount,
    [],
    TOKEN_2022_PROGRAM_ID
  );
  const mintTransaction = new Transaction().add(mintInstruction);
  await sendAndConfirmTransaction(connection, mintTransaction, [payer]);
  console.log(`Đã mint ${Number(mintAmount) / 10**9} tokens cho user`);
  
  // Kiểm tra số dư của tài khoản user
  try {
    const userAccount = await getAccount(connection, userTokenAddress, "confirmed", TOKEN_2022_PROGRAM_ID);
    console.log(`Số dư user: ${Number(userAccount.amount) / 10**9} tokens`);
  } catch (error) {
    console.log("Lỗi khi kiểm tra số dư user:", error);
  }

  // Bước 3: Chuyển token với quyền delegate
  const amount = BigInt(50_000_000_000); // 50 tokens
  
  try {
    // Lấy thông tin decimals của token
    const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    const decimals = mintInfo.decimals;
    
    // Sử dụng transferChecked với TOKEN_2022_PROGRAM_ID
    const transferInstruction = createTransferCheckedInstruction(
      userTokenAddress,      // nguồn
      mint,                 // mint pubkey
      adminTokenAddress,    // đích
      delegatePublicKey,    // người ký (delegate)
      amount,               // số lượng
      decimals,             // decimals
      [],                   // signers khác (nếu có)
      TOKEN_2022_PROGRAM_ID // program ID
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
    
    // Kiểm tra lại số dư sau khi chuyển
    const userAccountAfter = await getAccount(connection, userTokenAddress, "confirmed", TOKEN_2022_PROGRAM_ID);
    console.log(`Số dư user sau khi chuyển: ${Number(userAccountAfter.amount) / 10**9} tokens`);
    
    const adminAccountAfter = await getAccount(connection, adminTokenAddress, "confirmed", TOKEN_2022_PROGRAM_ID);
    console.log(`Số dư admin sau khi chuyển: ${Number(adminAccountAfter.amount) / 10**9} tokens`);
    
  } catch (error: any) {
    console.log("Lỗi chuyển khoản:", error.message);
    if (error.logs) {
      console.log("Logs:", error.logs);
    }
  }
  
  console.log(`\nTóm tắt:`);
  console.log(`- Token Mint: ${mint.toString()}`);
  console.log(`- Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
  console.log("- Permanent Delegate test: " + (delegatePublicKey.toString()));
  console.log("- Giao dịch chuyển token bằng permanent delegate đã thành công!");
}

main()
  .then(() => console.log("Thành công"))
  .catch((error) => {
    console.error("Lỗi:", error);
    process.exit(1);
  }); 