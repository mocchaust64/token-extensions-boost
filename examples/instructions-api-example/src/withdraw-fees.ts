/**
 * Ví dụ rút phí từ token account sử dụng API mới (instructions-based)
 * 
 * Ví dụ này minh họa cách rút phí đã giữ lại từ các token account
 * sử dụng phương thức createWithdrawFeesFromAccountsInstruction()
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
  let payerSecretKey: string;
  
  if (process.argv.length >= 4) {
    mintAddress = process.argv[2];
    payerSecretKey = process.argv[3];
  } else {
    // Sử dụng giá trị mặc định nếu không có tham số
    mintAddress = 'MINT_ADDRESS_HERE';
    payerSecretKey = 'PAYER_SECRET_KEY_HERE';
    
    console.log('Thiếu tham số. Cần mint address và payer secret key.');
    console.log('Sử dụng: ts-node withdraw-fees.ts <mint-address> <payer-secret-key>');
    return;
  }
  
  // Khôi phục keypair từ secret key (chỉ dùng cho ví dụ)
  const payerKeypair = Keypair.fromSecretKey(bs58.decode(payerSecretKey));
  const mint = new PublicKey(mintAddress);
  
  console.log(`Mint address: ${mint.toString()}`);
  console.log(`Payer/Authority address: ${payerKeypair.publicKey.toString()}`);
  
  // Bước 2: Khởi tạo TransferFeeToken với mint address
  const transferFeeToken = new TransferFeeToken(connection, mint, {
    feeBasisPoints: 100, // 1%
    maxFee: BigInt(1_000_000_000), // 1 token với 9 decimals
    transferFeeConfigAuthority: payerKeypair.publicKey,
    withdrawWithheldAuthority: payerKeypair.publicKey,
  });
  
  try {
    // Tạo token account mới để nhận phí rút về
    const feeDestinationOwner = payerKeypair.publicKey; // Rút về chính tài khoản của mình
    const feeDestinationAccount = await getAssociatedTokenAddress(
      mint,
      feeDestinationOwner,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log(`Fee destination account: ${feeDestinationAccount.toString()}`);
    
    // Bước 3: Tìm tất cả các tài khoản có phí giữ lại
    console.log('Đang tìm các token account có phí giữ lại...');
    const accountsWithFees = await transferFeeToken.findAccountsWithWithheldFees();
    
    if (accountsWithFees.length === 0) {
      console.log('Không tìm thấy tài khoản nào có phí giữ lại.');
      return;
    }
    
    console.log(`Tìm thấy ${accountsWithFees.length} tài khoản có phí giữ lại.`);
    
    // Tính tổng phí có thể rút được
    const totalWithheld = await transferFeeToken.getTotalWithheldAmount(accountsWithFees);
    console.log(`Tổng phí giữ lại: ${totalWithheld} (${Number(totalWithheld) / 10 ** 9} tokens)`);
    
    // Bước 4: Tạo instructions rút phí từ các tài khoản
    console.log('Đang tạo instructions để rút phí...');
    
    // Sử dụng phương thức createWithdrawFeesFromAccountsInstruction thay vì withdrawFeesFromAccounts
    const withdrawInstruction = transferFeeToken.createWithdrawFeesFromAccountsInstruction(
      accountsWithFees,         // Danh sách tài khoản có phí để rút
      feeDestinationAccount,    // Tài khoản đích để nhận phí
      payerKeypair.publicKey    // Authority để rút phí
    );
    
    // Bước 5: Tạo transaction từ instructions
    const transaction = new Transaction().add(withdrawInstruction);
    
    // Bước 6: Ký và gửi transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payerKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log(`Rút phí thành công! Transaction: ${signature}`);
    console.log(`Explorer URL: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return { signature, totalWithdrawn: totalWithheld };
    
  } catch (error) {
    console.error('Lỗi khi rút phí:', error);
  }
}

// Chỉ chạy main nếu là file chạy trực tiếp (không phải import)
if (require.main === module) {
  main().catch(console.error);
}

export default main; 