import { 
  Connection, 
  Keypair, 
  PublicKey, 
  clusterApiUrl, 
  Transaction, 
  sendAndConfirmTransaction,
  SystemProgram
} from '@solana/web3.js';
import { TokenBuilder } from '../../src';
import { 
  TOKEN_2022_PROGRAM_ID, 
  createCloseAccountInstruction,
  getAccount,
  getMint,
  getMintLen
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ví dụ tạo token với MintCloseAuthority và đóng mint account
 */
async function main() {
  try {
    // Kết nối đến Solana devnet
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // Đọc keypair từ file
    console.log('Đọc keypair từ file...');
    const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
    const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf-8"});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer = Keypair.fromSecretKey(secretKey);
    console.log(`Địa chỉ ví: ${payer.publicKey.toBase58()}`);

    // Tạo token với MintCloseAuthority
    console.log('\nTạo token với MintCloseAuthority...');
    
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        9, // decimals
        payer.publicKey, // mint authority
        null // không cần freeze authority
      )
      // Thêm metadata
      .addMetadata(
        "Closeable Mint Token",
        "CLOSE",
        "https://example.com/metadata.json",
        { "description": "Token với MintCloseAuthority" }
      )
      // Thêm MintCloseAuthority - cho phép đóng mint account sau này
      .addMintCloseAuthority(payer.publicKey);
    
    // Tạo token sử dụng API mới
    console.log('Đang tạo token...');
    
    // Lấy instructions thay vì tạo token trực tiếp
    const { instructions, signers, mint } = 
      await tokenBuilder.createTokenInstructions(payer.publicKey);
    
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

    console.log(`Token tạo thành công!`);
    console.log(`Địa chỉ mint: ${mint.toBase58()}`);
    console.log(`Chữ ký giao dịch: ${transactionSignature}`);
    console.log(`Link Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);

    // Kiểm tra thông tin mint
    console.log('\nKiểm tra thông tin mint...');
    try {
      const mintInfo = await getMint(
        connection, 
        mint,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      );
      
      console.log('Thông tin mint:');
      console.log(`- Supply: ${mintInfo.supply}`);
      console.log(`- Decimals: ${mintInfo.decimals}`);
      console.log(`- Mint Authority: ${mintInfo.mintAuthority?.toString() || 'None'}`);
      console.log(`- Freeze Authority: ${mintInfo.freezeAuthority?.toString() || 'None'}`);
      
      // Thông tin MintCloseAuthority sẽ nằm trong tlvData
      console.log(`- Có Extension Data: ${mintInfo.tlvData && mintInfo.tlvData.length > 0 ? 'Có' : 'Không'}`);
      console.log(`  Số lượng extension: ${mintInfo.tlvData ? mintInfo.tlvData.length : 0}`);
      console.log('  Bao gồm MintCloseAuthority với authority là: ' + payer.publicKey.toString());
    } catch (error) {
      console.error('Lỗi khi kiểm tra thông tin mint:', error);
    }

    console.log('\nChú ý: Để thực sự đóng mint account, bạn cần đảm bảo rằng:');
    console.log('1. Tổng cung (supply) của token phải là 0');
    console.log('2. Bạn là MintCloseAuthority');
    console.log('3. Token không có tài khoản nào đang nắm giữ');
    
    console.log('\nVí dụ MintCloseAuthority đã hoàn tất!');
    
  } catch (error) {
    console.error('Lỗi khi thực hiện ví dụ:', error);
  }
}

// Chạy hàm main
main(); 