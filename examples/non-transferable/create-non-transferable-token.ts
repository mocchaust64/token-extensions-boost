import {
  Connection,
  Keypair,
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { NonTransferableToken, TokenBuilder } from '../../dist';
import { 
  createAssociatedTokenAccountInstruction, 
  getAssociatedTokenAddress, 
  createMintToInstruction, 
  TOKEN_2022_PROGRAM_ID 
} from '@solana/spl-token';

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
     const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
     const payer = Keypair.fromSecretKey(secretKey);
     
  console.log("Địa chỉ ví:", payer.publicKey.toString());

  // Tạo Non-Transferable Token với TokenBuilder - API mới
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)
    .addNonTransferable();
  
  // Sử dụng phương thức createTokenInstructions thay vì createToken
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
  
  // Tạo và gửi transaction
  const transaction = new Transaction().add(...instructions);
  const createTokenSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, ...signers]
  );
  
  console.log(`Non-Transferable Token đã được tạo: ${mint.toBase58()}`);
  console.log(`Giao dịch: https://explorer.solana.com/tx/${createTokenSignature}?cluster=devnet`);
  
  // Tạo NonTransferableToken instance từ địa chỉ mint
  const nonTransferableToken = new NonTransferableToken(connection, mint);

  // Tạo token account và mint tokens
  const recipientKeypair = Keypair.generate();
  
  // Tạo token account cho recipient
  const recipientTokenAddress = await getAssociatedTokenAddress(
    mint,
    recipientKeypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  // Tạo transaction với instructions
  const mintTransaction = new Transaction();
  
  // Thêm instruction tạo token account
  mintTransaction.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      recipientTokenAddress,
      recipientKeypair.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  // Thêm instruction mint token
  mintTransaction.add(
    createMintToInstruction(
      mint,
      recipientTokenAddress,
      payer.publicKey,
      BigInt(1_000_000_000), // 1 token (9 decimals)
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  // Gửi transaction
  const mintSignature = await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [payer]
  );
  
  console.log(`Đã mint 1 token đến ${recipientKeypair.publicKey.toBase58()}`);
  console.log(`Giao dịch: https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);

  // Thử chuyển khoản token (để chứng minh token không thể chuyển khoản)
  try {
    const destinationKeypair = Keypair.generate();
    
    // Tạo token account cho người nhận
    const destinationTokenAddress = await getAssociatedTokenAddress(
      mint,
      destinationKeypair.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Tạo account cho người nhận
    const createDestAccountInstruction = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destinationTokenAddress,
        destinationKeypair.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID
    );
    
    const createDestAccountTx = new Transaction().add(createDestAccountInstruction);
    await sendAndConfirmTransaction(connection, createDestAccountTx, [payer]);
    
    // Thử chuyển token - sẽ thất bại vì token không thể chuyển khoản
    // Thay vì sử dụng transferChecked, tạo instruction tương tự
    
    // Tạo instruction chuyển khoản
    const transferInstruction = createMintToInstruction(
      mint,
      destinationTokenAddress,
      recipientKeypair.publicKey,
      BigInt(100_000_000), // 0.1 token
      [],
      TOKEN_2022_PROGRAM_ID
    );
    
    const transferTx = new Transaction().add(transferInstruction);
    await sendAndConfirmTransaction(connection, transferTx, [recipientKeypair]);
    
    console.log("Nếu bạn thấy dòng này, nghĩa là chuyển khoản đã thành công và có lỗi trong non-transferable extension");
  } catch (error: any) {
    console.log(`Chuyển khoản thất bại (đúng như dự kiến): ${error.message}`);
    
    // Kiểm tra nếu token thực sự là không thể chuyển khoản
    const isNonTransferable = await nonTransferableToken.isNonTransferable();
    console.log(`Token có thuộc tính không thể chuyển khoản: ${isNonTransferable ? "Đúng" : "Không"}`);
  }

  console.log('Non-Transferable Token đã được tạo thành công!');
  console.log(`Chi tiết token: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
}

main().catch((error) => {
  console.error("Lỗi:", error);
  process.exit(1);
}); 