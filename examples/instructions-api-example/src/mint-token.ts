/**
 * Ví dụ mint token sử dụng API mới (instructions-based)
 * 
 * Ví dụ này minh họa cách tạo token account và mint token sử dụng phương thức
 * createAccountAndMintToInstructions() thay vì createAccountAndMintTo()
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import { TransferFeeToken } from '../../../src';
import bs58 from 'bs58';

// Bước 1: Thiết lập môi trường và tải thông tin token đã tạo
async function main() {
  // Tạo kết nối đến Solana devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Đọc thông tin mint address từ tham số dòng lệnh hoặc hardcode cho ví dụ này
  // Trong ứng dụng thực tế bạn sẽ nhận mint address từ UI hoặc DB
  let mintAddress: string;
  let payerSecretKey: string;
  
  if (process.argv.length >= 4) {
    mintAddress = process.argv[2];
    payerSecretKey = process.argv[3];
  } else {
    // Sử dụng giá trị mặc định nếu không có tham số 
    // (Thay thế bằng địa chỉ mint của riêng bạn khi test)
    mintAddress = 'MINT_ADDRESS_HERE';
    payerSecretKey = 'PAYER_SECRET_KEY_HERE';
    
    console.log('Thiếu tham số mint address và payer secret key.');
    console.log('Sử dụng: ts-node mint-token.ts <mint-address> <payer-secret-key>');
    return;
  }
  
  // Khôi phục keypair từ secret key (chỉ dùng cho ví dụ)
  // Trong ứng dụng thực tế, sử dụng wallet adapter thay vì lưu secretKey
  const payerKeypair = Keypair.fromSecretKey(bs58.decode(payerSecretKey));
  const mint = new PublicKey(mintAddress);
  
  console.log(`Mint address: ${mint.toString()}`);
  console.log(`Payer address: ${payerKeypair.publicKey.toString()}`);
  
  // Bước 2: Khởi tạo TransferFeeToken với mint address
  // Lưu ý rằng chúng ta đã khởi tạo token ban đầu với transfer fee extension
  const transferFeeToken = new TransferFeeToken(connection, mint, {
    feeBasisPoints: 100, // 1%
    maxFee: BigInt(1_000_000_000), // 1 token với 9 decimals
    transferFeeConfigAuthority: payerKeypair.publicKey,
    withdrawWithheldAuthority: payerKeypair.publicKey,
  });
  
  // Tạo một địa chỉ đích ngẫu nhiên để mint token vào
  // Trong ứng dụng thực tế, đây sẽ là địa chỉ wallet của người dùng
  const destinationOwner = Keypair.generate();
  console.log(`Destination owner: ${destinationOwner.publicKey.toString()}`);
  
  // Số lượng token để mint (100 tokens với 9 decimals)
  const amount = BigInt(100_000_000_000);
  
  try {
    console.log('Đang tạo instructions để mint token...');
    
    // Bước 3: Tạo instructions thay vì thực thi trực tiếp
    // Sử dụng phương thức createAccountAndMintToInstructions thay vì createAccountAndMintTo
    const { instructions, address } = await transferFeeToken.createAccountAndMintToInstructions(
      destinationOwner.publicKey,  // owner của token account
      payerKeypair.publicKey,      // người trả phí giao dịch
      amount,                      // số lượng token để mint
      payerKeypair.publicKey       // mint authority
    );
    
    console.log(`Token account address: ${address.toString()}`);
    console.log(`Số lượng instructions: ${instructions.length}`);
    
    // Bước 4: Tạo và gửi transaction
    // Trong ứng dụng web thực tế, bước này sẽ được thực hiện qua wallet adapter
    const transaction = new Transaction();
    instructions.forEach(ix => transaction.add(ix));
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payerKeypair], // Chỉ cần payer ký, vì chúng ta không cần thêm signers nào khác
      { commitment: 'confirmed' }
    );
    
    console.log(`Mint token thành công! Transaction: ${signature}`);
    console.log(`Explorer URL: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log(`Token account: https://explorer.solana.com/address/${address.toString()}?cluster=devnet`);
    
    return { tokenAccount: address };
    
  } catch (error) {
    console.error('Lỗi khi mint token:', error);
  }
}

// Chỉ chạy main nếu là file chạy trực tiếp (không phải import)
if (require.main === module) {
  main().catch(console.error);
}

export default main; 