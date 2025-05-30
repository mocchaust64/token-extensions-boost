import { 
  Connection, 
  Keypair, 
  PublicKey, 
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import * as fs from "fs";
import * as path from "path";
import { TokenBuilder, Token } from "../../src";

import { 
  TOKEN_2022_PROGRAM_ID,
  createTransferCheckedInstruction
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
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
  
  // Tạo và ký transaction
  const transaction = new Transaction().add(...instructions);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = payer.publicKey;
  
  // Ký và gửi transaction
  transaction.sign(...signers, payer);
  const transactionSignature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: false }
  );
  
  // Đợi xác nhận
  await connection.confirmTransaction({
    signature: transactionSignature,
    blockhash,
    lastValidBlockHeight
  });
  
  console.log(`Token đã được tạo: ${mint.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
  
  // Tạo đối tượng Token từ mint address
  const token = new Token(connection, mint);
  
  // Đợi một chút để đảm bảo transaction được xác nhận
  console.log("Đợi để xác nhận transaction...");
  await sleep(3000);
  
  // Tạo tài khoản token cho người dùng
  console.log("Tạo tài khoản token cho người dùng...");
  const { instructions: createAccountIx, address: userTokenAddress, accountExists } = 
    await token.createTokenAccountInstructions(payer.publicKey, payer.publicKey);
  
  if (!accountExists) {
    // Nếu tài khoản chưa tồn tại, tạo transaction để tạo mới
    const createAccountTx = new Transaction().add(...createAccountIx);
    createAccountTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    createAccountTx.feePayer = payer.publicKey;
    
    // Ký và gửi transaction
    const userTokenSignature = await sendAndConfirmTransaction(
      connection,
      createAccountTx,
      [payer]
    );
    
    console.log(`Tài khoản token người dùng: ${userTokenAddress.toString()}`);
    console.log(`Giao dịch tạo tài khoản: https://explorer.solana.com/tx/${userTokenSignature}?cluster=devnet`);
  } else {
    console.log(`Tài khoản token người dùng đã tồn tại: ${userTokenAddress.toString()}`);
  }
  
  // Đợi một chút để đảm bảo transaction được xác nhận
  await sleep(2000);
  
  // Mint một số token cho người dùng
  const mintAmount = BigInt(1000_000_000_000);  // 1000 tokens với 9 decimals
  
  // Tạo một tài khoản khác để chuyển token đến
  const recipient = Keypair.generate();
  console.log(`Người nhận: ${recipient.publicKey.toString()}`);
  
  console.log("Tạo tài khoản token cho người nhận...");
  // Sử dụng phương thức getOrCreateTokenAccount từ SDK
  const recipientTokenAccount = await token.getOrCreateTokenAccount(
    payer,
    recipient.publicKey,
    false,
    "confirmed",
    { skipPreflight: true }
  );
  console.log(`Tài khoản token người nhận: ${recipientTokenAccount.address.toString()}`);
  
  // Đợi một chút để đảm bảo transaction được xác nhận
  await sleep(2000);
  
  // Mint tokens - sử dụng phương thức createMintToInstructions của SDK
  console.log(`\n=== Mint ${Number(mintAmount) / 1e9} tokens ===`);
  
  try {
    // Tạo instructions để mint
    const { instructions: mintInstructions } = token.createMintToInstructions(
      userTokenAddress,
      payer.publicKey,
      mintAmount
    );
    
    // Tạo và gửi transaction
    const mintTx = new Transaction().add(...mintInstructions);
    mintTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    mintTx.feePayer = payer.publicKey;
    
    const mintSignature = await sendAndConfirmTransaction(
      connection,
      mintTx,
      [payer]
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
  
  // Chuyển tokens - sử dụng phương thức createTransferInstructions của SDK
  console.log(`\n=== Chuyển tokens ===`);
  const transferAmount = BigInt(500_000_000_000);  // 500 tokens
  
  try {
    // Tạo instructions để chuyển token
    const transferInstructions = [
      createTransferCheckedInstruction(
        userTokenAddress,                   // source
        mint,                               // mint
        recipientTokenAccount.address,      // destination
        payer.publicKey,                    // owner
        transferAmount,                     // amount
        9,                                  // decimals
        [],                                 // multisigners
        TOKEN_2022_PROGRAM_ID               // program ID
      )
    ];
    
    // Thêm memo nếu cần
    const memoId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    transferInstructions.push({
      keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
      programId: memoId,
      data: Buffer.from("Chuyển token từ ví dụ token-extensions-boost", "utf-8")
    });
    
    // Tạo và gửi transaction
    const transferTx = new Transaction().add(...transferInstructions);
    transferTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transferTx.feePayer = payer.publicKey;
    
    const transferSignature = await sendAndConfirmTransaction(
      connection,
      transferTx,
      [payer]
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
    console.error(`Chi tiết lỗi:`, error);
  }
  
  // Burn tokens - sử dụng phương thức createBurnInstructions của SDK
  console.log(`\n=== Burn tokens ===`);
  const burnAmount = BigInt(200_000_000_000);  // 200 tokens
  
  try {
    // Tạo instructions để đốt token
    const { instructions: burnInstructions } = token.createBurnInstructions(
      userTokenAddress,
      payer.publicKey,
      burnAmount,
      9 // decimals
    );
    
    // Tạo và gửi transaction
    const burnTx = new Transaction().add(...burnInstructions);
    burnTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    burnTx.feePayer = payer.publicKey;
    
    const burnSignature = await sendAndConfirmTransaction(
      connection,
      burnTx,
      [payer]
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
    
    // Tạo instructions để chuyển token bằng permanent delegate
    const delegateTransferInstructions = [
      createTransferCheckedInstruction(
        recipientTokenAccount.address,      // source
        mint,                               // mint
        userTokenAddress,                   // destination
        payer.publicKey,                    // owner (permanent delegate)
        delegateTransferAmount,             // amount
        9,                                  // decimals
        [],                                 // multisigners
        TOKEN_2022_PROGRAM_ID               // program ID
      )
    ];
    
    // Thêm memo nếu cần
    const memoId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    delegateTransferInstructions.push({
      keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
      programId: memoId,
      data: Buffer.from("Chuyển bởi permanent delegate", "utf-8")
    });
    
    // Tạo và gửi transaction
    const delegateTx = new Transaction().add(...delegateTransferInstructions);
    delegateTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    delegateTx.feePayer = payer.publicKey;
    
    const delegateTransferSignature = await sendAndConfirmTransaction(
      connection,
      delegateTx,
      [payer]
    );
    
    console.log(`Permanent Delegate đã chuyển ${Number(delegateTransferAmount) / 1e9} tokens từ tài khoản của người nhận về cho người dùng!`);
    console.log(`Giao dịch delegate: https://explorer.solana.com/tx/${delegateTransferSignature}?cluster=devnet`);
  } catch (error: any) {
    console.error(`Lỗi khi sử dụng permanent delegate: ${error.message}`);
    console.error(`Chi tiết lỗi:`, error);
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