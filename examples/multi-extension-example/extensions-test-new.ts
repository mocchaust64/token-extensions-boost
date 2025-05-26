import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { TokenBuilder } from '../../src';
import * as fs from 'fs';
import * as path from 'path';
import { AccountState, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

/**
 * Ví dụ tạo token với các extension mới:
 * - Default Account State
 * - Mint Close Authority
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
    
    console.log('Tạo token với các extension mới...');
    
    // Tạo token với các extension mới
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        9, // decimals
        payer.publicKey, // mint authority
        payer.publicKey // freeze authority
      )
      // Thêm metadata
      .addMetadata(
        "Extended Token",
        "EXT",
        "https://example.com/metadata.json",
        { "creator": "Solana SDK Extension Example" }
      )
      // Thêm DefaultAccountState - thiết lập trạng thái mặc định cho tài khoản token
      .addDefaultAccountState(AccountState.Initialized)
      
      // Thêm MintCloseAuthority - cho phép đóng mint account sau này
      .addMintCloseAuthority(payer.publicKey);
    
    // Tạo token
    console.log('Đang tạo token...');
    const { mint, transactionSignature, token } = 
      await tokenBuilder.createToken(payer);
    
    console.log(`Token tạo thành công!`);
    console.log(`Địa chỉ mint: ${mint.toBase58()}`);
    console.log(`Chữ ký giao dịch: ${transactionSignature}`);
    console.log(`Link Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    
    // Thông tin về các extension
    console.log('\nThông tin về token:');
    console.log(`- Token có DefaultAccountState: Mọi tài khoản token mới sẽ ở trạng thái Initialized`);
    console.log(`- Token có MintCloseAuthority: ${payer.publicKey.toBase58()}`);
    
    // Tạo một tài khoản token
    console.log('\nTạo một tài khoản token để test...');
    
    // Sử dụng spl-token trực tiếp để tạo tài khoản token
    const { 
      getAssociatedTokenAddress, 
      createAssociatedTokenAccountInstruction,
      mintTo: mintToAccount
    } = require('@solana/spl-token');
    
    // Tạo tài khoản token
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mint,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Tạo transaction tạo tài khoản
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAddress,
        payer.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Gửi transaction
    try {
      const createAccountSignature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer]
      );
      console.log(`Tài khoản token đã tạo thành công: ${associatedTokenAddress.toBase58()}`);
    } catch (error) {
      // Xử lý lỗi nếu tài khoản đã tồn tại
      if (error instanceof Error && error.message.includes('account already exists')) {
        console.log(`Tài khoản token đã tồn tại: ${associatedTokenAddress.toBase58()}`);
      } else {
        throw error;
      }
    }
    
    console.log(`Địa chỉ tài khoản token: ${associatedTokenAddress.toBase58()}`);
    
    // Mint một số token để test
    console.log('\nMint token vào tài khoản...');
    const amount = BigInt(1_000_000_000); // 1 token với 9 decimals
    
    // Mint token
    const mintSignature = await mintToAccount(
      connection,
      payer,
      mint,
      associatedTokenAddress,
      payer,
      amount,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log(`Đã mint ${Number(amount) / 1e9} token vào tài khoản`);
    
    console.log('\nChú ý:');
    console.log('1. Tài khoản token mới được tạo sẽ mặc định ở trạng thái Initialized');
    console.log('2. Mint account có thể được đóng bởi MintCloseAuthority');
    
  } catch (error) {
    console.error('Lỗi khi tạo token:', error);
  }
}

// Chạy hàm main
main(); 