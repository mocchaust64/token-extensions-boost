/**
 * Ví dụ chuyển token sử dụng API mới (instructions-based)
 * 
 * Ví dụ này minh họa cách chuyển token giữa các tài khoản sử dụng phương thức
 * createTransferInstruction() thay vì transfer() để tương thích với wallet adapter
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { TransferFeeToken } from '../../../src';
import bs58 from 'bs58';

// Bước 1: Thiết lập môi trường và tải thông tin token đã tạo
async function main() {
  // Tạo kết nối đến Solana devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Đọc thông tin mint address từ tham số dòng lệnh hoặc hardcode cho ví dụ này
  let mintAddress: string;
  let sourceTokenAccount: string;
  let payerSecretKey: string;
  
  if (process.argv.length >= 5) {
    mintAddress = process.argv[2];
    sourceTokenAccount = process.argv[3];
    payerSecretKey = process.argv[4];
  } else {
    // Sử dụng giá trị mặc định nếu không có tham số
    mintAddress = 'MINT_ADDRESS_HERE';
    sourceTokenAccount = 'SOURCE_TOKEN_ACCOUNT_HERE';
    payerSecretKey = 'PAYER_SECRET_KEY_HERE';
    
    console.log('Thiếu tham số. Cần mint address, source token account và payer secret key.');
    console.log('Sử dụng: ts-node transfer-token.ts <mint-address> <source-token-account> <payer-secret-key>');
    return;
  }
  
  // Khôi phục keypair từ secret key (chỉ dùng cho ví dụ)
  const payerKeypair = Keypair.fromSecretKey(bs58.decode(payerSecretKey));
  const mint = new PublicKey(mintAddress);
  const sourceAccount = new PublicKey(sourceTokenAccount);
  
  console.log(`Mint address: ${mint.toString()}`);
  console.log(`Source token account: ${sourceAccount.toString()}`);
  console.log(`Payer address: ${payerKeypair.publicKey.toString()}`);
  
  // Bước 2: Khởi tạo TransferFeeToken với mint address
  const transferFeeToken = new TransferFeeToken(connection, mint, {
    feeBasisPoints: 100, // 1%
    maxFee: BigInt(1_000_000_000), // 1 token với 9 decimals
    transferFeeConfigAuthority: payerKeypair.publicKey,
    withdrawWithheldAuthority: payerKeypair.publicKey,
  });
  
  // Tạo một địa chỉ đích ngẫu nhiên để nhận token
  const destinationOwner = Keypair.generate();
  console.log(`Destination owner: ${destinationOwner.publicKey.toString()}`);
  
  try {
    // Lấy hoặc tạo tài khoản token đích
    const destinationAccount = await getAssociatedTokenAddress(
      mint,
      destinationOwner.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log(`Destination token account: ${destinationAccount.toString()}`);
    
    // Số lượng token để chuyển (10 tokens với 9 decimals)
    const amount = BigInt(10_000_000_000);
    
    console.log('Đang tạo instructions để chuyển token...');
    
    // Bước 3: Tạo instructions thay vì thực thi trực tiếp
    // Sử dụng phương thức createTransferInstruction thay vì transfer
    const transferInstruction = transferFeeToken.createTransferInstruction(
      sourceAccount,             // từ tài khoản nguồn
      destinationAccount,        // đến tài khoản đích
      payerKeypair.publicKey,    // owner của tài khoản nguồn
      amount,                    // số lượng token để chuyển
      9                          // decimals
    );
    
    // Bước 4: Tạo transaction từ instructions
    const transaction = new Transaction().add(transferInstruction);
    
    // Bước 5: Ký và gửi transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payerKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log(`Chuyển token thành công! Transaction: ${signature}`);
    console.log(`Explorer URL: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Tính phí chuyển khoản đã thu
    const fee = transferFeeToken.calculateFee(amount);
    console.log(`Phí chuyển khoản (1%): ${fee} (${Number(fee) / 10 ** 9} tokens)`);
    
    return { signature, destinationAccount };
    
  } catch (error) {
    console.error('Lỗi khi chuyển token:', error);
  }
}

// Chỉ chạy main nếu là file chạy trực tiếp (không phải import)
if (require.main === module) {
  main().catch(console.error);
}

export default main; 