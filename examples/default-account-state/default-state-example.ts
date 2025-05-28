import { Connection, Keypair, clusterApiUrl,  Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TokenBuilder } from '../../src';
import { 
  AccountState, 
  getAssociatedTokenAddress, 
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ví dụ tạo token với DefaultAccountState và kiểm tra trạng thái tài khoản token
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

    // 1. Tạo token với DefaultAccountState.Frozen
    console.log('\nTạo token với DefaultAccountState.Frozen...');
    
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        9, // decimals
        payer.publicKey, // mint authority
        payer.publicKey // freeze authority
      )
      .addMetadata(
        "Frozen by Default Token",
        "FROZ",
        "https://example.com/metadata.json",
        { "description": "Token với DefaultAccountState.Frozen" }
      )
      // Đặt trạng thái mặc định là Frozen
      .addDefaultAccountState(AccountState.Frozen);
    
    // Tạo token sử dụng API mới
    console.log('Đang tạo token...');
    
    // Lấy instructions thay vì tạo token trực tiếp
    const { instructions, signers, mint } = 
      await tokenBuilder.createTokenInstructions(payer.publicKey);
    
    // Tạo và ký transaction
    const tokenTransaction = new Transaction().add(...instructions);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tokenTransaction.recentBlockhash = blockhash;
    tokenTransaction.lastValidBlockHeight = lastValidBlockHeight;
    tokenTransaction.feePayer = payer.publicKey;
    
    // Ký và gửi transaction
    tokenTransaction.sign(...signers, payer);
    const transactionSignature = await connection.sendRawTransaction(
      tokenTransaction.serialize(),
      { skipPreflight: false }
    );
    
    // Đợi xác nhận
    await connection.confirmTransaction({
      signature: transactionSignature,
      blockhash,
      lastValidBlockHeight
    });

    // Thêm console.log sau transaction thành công
    console.log(`Token tạo thành công!`);
    console.log(`Địa chỉ mint: ${mint.toBase58()}`);
    console.log(`Chữ ký giao dịch: ${transactionSignature}`);
    console.log(`Link Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    
    // 2. Tạo tài khoản token
    console.log('\nTạo tài khoản token cho token với DefaultAccountState.Frozen...');
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mint,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Thay vì sử dụng token.createOrGetTokenAccount, dùng phương thức của Token core
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAddress,
        payer.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );

    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer],
        { commitment: 'confirmed' }
      );
      console.log(`Tài khoản token được tạo tại: ${associatedTokenAddress.toBase58()}`);
      console.log(`Transaction signature: ${signature}`);
    } catch (error: any) {
      if (error.message.includes("account already exists")) {
        console.log(`Tài khoản token đã tồn tại: ${associatedTokenAddress.toBase58()}`);
      } else {
        throw error;
      }
    }

    // 3. Mint token vào tài khoản
    console.log('\nMint token vào tài khoản token...');
    const mintAmount = BigInt(1_000_000_000); // 1 token với 9 decimals
    
    // Sử dụng Token core
    const mintTx = new Transaction();
    mintTx.add(
      createMintToInstruction(
        mint,
        associatedTokenAddress,
        payer.publicKey,
        mintAmount
      )
    );
    
    try {
      const mintSig = await sendAndConfirmTransaction(
        connection,
        mintTx,
        [payer],
        { commitment: 'confirmed' }
      );
      console.log(`Đã mint ${Number(mintAmount) / 1e9} token vào tài khoản`);
      console.log(`Transaction signature: ${mintSig}`);
    } catch (error) {
      console.error('Lỗi khi mint token:', error);
    }

    // 4. Kiểm tra trạng thái của tài khoản token
    console.log('\nKiểm tra trạng thái tài khoản token...');
    try {
      const accountInfo = await getAccount(
        connection,
        associatedTokenAddress,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      );
      
      console.log('Thông tin tài khoản token:');
      console.log(`- Trạng thái: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      console.log(`- Số dư: ${accountInfo.amount}`);
      
      if (accountInfo.isFrozen) {
        console.log('✅ DefaultAccountState hoạt động đúng! Tài khoản mới được tạo ra với trạng thái Frozen.');
      } else {
        console.log('❌ DefaultAccountState không hoạt động như mong đợi. Tài khoản không ở trạng thái Frozen.');
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra tài khoản token:', error);
    }

    // 5. Tạo thêm một token với DefaultAccountState.Initialized để so sánh
    console.log('\nTạo token với DefaultAccountState.Initialized để so sánh...');
    
    const initializedTokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        9, // decimals
        payer.publicKey, // mint authority
        payer.publicKey  // freeze authority
      )
      .addMetadata(
        "Initialized by Default Token",
        "INIT",
        "https://example.com/metadata.json",
        { "description": "Token với DefaultAccountState.Initialized" }
      )
      // Đặt trạng thái mặc định là Initialized
      .addDefaultAccountState(AccountState.Initialized);
    
    // Tạo token thứ hai sử dụng API mới
    console.log('Đang tạo token thứ hai...');
    
    // Lấy instructions thay vì tạo token trực tiếp
    const { instructions: secondInstructions, signers: secondSigners, mint: secondMint } = 
      await initializedTokenBuilder.createTokenInstructions(payer.publicKey);
    
    // Tạo và ký transaction
    const secondTokenTx = new Transaction().add(...secondInstructions);
    const secondBlockhashInfo = await connection.getLatestBlockhash();
    secondTokenTx.recentBlockhash = secondBlockhashInfo.blockhash;
    secondTokenTx.lastValidBlockHeight = secondBlockhashInfo.lastValidBlockHeight;
    secondTokenTx.feePayer = payer.publicKey;
    
    // Ký và gửi transaction
    secondTokenTx.sign(...secondSigners, payer);
    const secondTokenSignature = await connection.sendRawTransaction(
      secondTokenTx.serialize(),
      { skipPreflight: false }
    );
    
    // Đợi xác nhận
    await connection.confirmTransaction({
      signature: secondTokenSignature,
      blockhash: secondBlockhashInfo.blockhash,
      lastValidBlockHeight: secondBlockhashInfo.lastValidBlockHeight
    });
    
    console.log(`Token thứ hai tạo thành công! Mint address: ${secondMint.toBase58()}`);

    // 6. Tạo tài khoản token cho token thứ hai
    console.log('\nTạo tài khoản token cho token thứ hai với DefaultAccountState.Initialized...');
    
    const secondTokenAddress = await getAssociatedTokenAddress(
      secondMint,
      payer.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Thay vì sử dụng token.createOrGetTokenAccount, dùng phương thức của Token core
    const txSecond = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        secondTokenAddress,
        payer.publicKey,
        secondMint,
        TOKEN_2022_PROGRAM_ID
      )
    );

    try {
      const sigSecond = await sendAndConfirmTransaction(
        connection,
        txSecond,
        [payer],
        { commitment: 'confirmed' }
      );
      console.log(`Tài khoản token thứ hai được tạo tại: ${secondTokenAddress.toBase58()}`);
      console.log(`Transaction signature: ${sigSecond}`);
    } catch (error: any) {
      if (error.message.includes("account already exists")) {
        console.log(`Tài khoản token thứ hai đã tồn tại: ${secondTokenAddress.toBase58()}`);
      } else {
        throw error;
      }
    }

    // 7. Kiểm tra trạng thái của tài khoản token thứ hai
    console.log('\nKiểm tra trạng thái tài khoản token thứ hai...');
    try {
      const accountInfo = await getAccount(
        connection,
        secondTokenAddress,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      );
      
      console.log('Thông tin tài khoản token thứ hai:');
      console.log(`- Trạng thái: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      console.log(`- Số dư: ${accountInfo.amount}`);
      
      if (!accountInfo.isFrozen) {
        console.log('✅ DefaultAccountState hoạt động đúng! Tài khoản mới được tạo ra với trạng thái Initialized.');
      } else {
        console.log('❌ DefaultAccountState không hoạt động như mong đợi. Tài khoản không ở trạng thái Initialized.');
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra tài khoản token thứ hai:', error);
    }

    console.log('\nVí dụ DefaultAccountState đã hoàn tất!');
    
  } catch (error) {
    console.error('Lỗi khi thực hiện ví dụ:', error);
  }
}

// Chạy hàm main
main(); 