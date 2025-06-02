import { Connection, Keypair, clusterApiUrl, Transaction, sendAndConfirmTransaction, PublicKey, SystemProgram } from '@solana/web3.js';
import { TokenBuilder, TokenFreezeExtension, Token } from '../../src';
import { 
  AccountState, 
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  
  
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test local cho TokenFreezeExtension - sử dụng keypair thay vì wallet adapter
 * để kiểm tra chức năng cơ bản
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

    // 1. Tạo token với DefaultAccountState.Initialized
    console.log('\nTạo token với DefaultAccountState.Initialized...');
    
    const tokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(
        9, // decimals
        payer.publicKey, // mint authority
        payer.publicKey // freeze authority
      )
      .addMetadata(
        "Freeze Example Token",
        "FRZT",
        "https://example.com/metadata.json",
        { "description": "Token để thử nghiệm đóng băng" }
      )
      // Đặt trạng thái mặc định là Initialized (không đóng băng)
      .addDefaultAccountState(AccountState.Initialized);
    
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

    console.log(`Token tạo thành công!`);
    console.log(`Địa chỉ mint: ${mint.toBase58()}`);
    console.log(`Chữ ký giao dịch: ${transactionSignature}`);
    console.log(`Link Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    
    // 2. Tạo tài khoản token
    console.log('\nTạo tài khoản token...');
    const token = new Token(connection, mint);
    
    // Lấy địa chỉ associated token account
    const associatedTokenAddress = await token.getAssociatedAddress(
      payer.publicKey,
      false
    );
    
    const transaction = new Transaction();
    transaction.add(
      token.createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAddress,
        payer.publicKey
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
    
    try {
      // Tạo các instruction cần thiết để mint token
      const { instructions: mintInstructions } = token.createMintToInstructions(
        associatedTokenAddress, // Tài khoản đích
        payer.publicKey,        // Mint authority
        mintAmount              // Số lượng token
      );
      
      // Tạo transaction với các instruction
      const mintTx = new Transaction();
      mintInstructions.forEach(ix => mintTx.add(ix));
      
      // Gửi và xác nhận transaction
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

    // 4. Kiểm tra trạng thái ban đầu của tài khoản token
    console.log('\nKiểm tra trạng thái ban đầu của tài khoản token...');
    try {
      // Sử dụng getAccount từ lớp Token 
      const accountInfo = await token.getAccount(
        associatedTokenAddress,
        'confirmed'
      );
      
      console.log('Thông tin tài khoản token:');
      console.log(`- Trạng thái: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      console.log(`- Số dư: ${accountInfo.amount}`);
    } catch (error) {
      console.error('Lỗi khi kiểm tra tài khoản token:', error);
      return;
    }

    // 5. Đóng băng tài khoản token - Sử dụng API mới
    console.log('\nĐóng băng tài khoản token...');
    try {
      // Tạo instruction đóng băng
      const freezeInstruction = TokenFreezeExtension.createFreezeAccountInstruction(
        associatedTokenAddress,
        mint,
        payer.publicKey
      );
      
      // Tạo transaction từ instruction
      const freezeTx = TokenFreezeExtension.buildTransaction(
        [freezeInstruction],
        payer.publicKey
      );
      
      // Lấy blockhash
      const freezeBlockhash = await connection.getLatestBlockhash();
      freezeTx.recentBlockhash = freezeBlockhash.blockhash;
      freezeTx.lastValidBlockHeight = freezeBlockhash.lastValidBlockHeight;
      
      // Ký và gửi transaction
      const freezeSig = await sendAndConfirmTransaction(
        connection,
        freezeTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Tài khoản token đã được đóng băng!`);
      console.log(`Transaction signature: ${freezeSig}`);
    } catch (error) {
      console.error('Lỗi khi đóng băng tài khoản token:', error);
      return;
    }

    // 6. Kiểm tra trạng thái sau khi đóng băng
    console.log('\nKiểm tra trạng thái sau khi đóng băng tài khoản token...');
    try {
      const accountInfo = await token.getAccount(
        associatedTokenAddress,
        'confirmed'
      );
      
      console.log('Thông tin tài khoản token:');
      console.log(`- Trạng thái: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      console.log(`- Số dư: ${accountInfo.amount}`);
      
      if (accountInfo.isFrozen) {
        console.log('✅ Đóng băng tài khoản token thành công!');
      } else {
        console.log('❌ Đóng băng tài khoản token thất bại.');
        return;
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra tài khoản token:', error);
      return;
    }

    // 7. Mở đóng băng tài khoản token - Sử dụng phương thức chuẩn bị transaction
    console.log('\nMở đóng băng tài khoản token...');
    try {
      // Sử dụng phương thức tiện ích để chuẩn bị transaction
      const thawTx = TokenFreezeExtension.prepareThawAccountTransaction(
        associatedTokenAddress,
        mint,
        payer.publicKey,
        payer.publicKey
      );
      
      // Lấy blockhash
      const thawBlockhash = await connection.getLatestBlockhash();
      thawTx.recentBlockhash = thawBlockhash.blockhash;
      thawTx.lastValidBlockHeight = thawBlockhash.lastValidBlockHeight;
      
      // Ký và gửi transaction
      const thawSig = await sendAndConfirmTransaction(
        connection,
        thawTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Tài khoản token đã được mở đóng băng!`);
      console.log(`Transaction signature: ${thawSig}`);
    } catch (error) {
      console.error('Lỗi khi mở đóng băng tài khoản token:', error);
      return;
    }

    // 8. Kiểm tra trạng thái sau khi mở đóng băng
    console.log('\nKiểm tra trạng thái sau khi mở đóng băng tài khoản token...');
    try {
      const accountInfo = await token.getAccount(
        associatedTokenAddress,
        'confirmed'
      );
      
      console.log('Thông tin tài khoản token:');
      console.log(`- Trạng thái: ${accountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      console.log(`- Số dư: ${accountInfo.amount}`);
      
      if (!accountInfo.isFrozen) {
        console.log('✅ Mở đóng băng tài khoản token thành công!');
      } else {
        console.log('❌ Mở đóng băng tài khoản token thất bại.');
        return;
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra tài khoản token:', error);
      return;
    }

    // 9. Cập nhật trạng thái mặc định của token sang Frozen
    console.log('\nCập nhật trạng thái mặc định của token sang Frozen...');
    try {
      // Sử dụng phương thức tiện ích để chuẩn bị transaction
      const updateTx = TokenFreezeExtension.prepareUpdateDefaultAccountStateTransaction(
        mint,
        AccountState.Frozen,
        payer.publicKey,
        payer.publicKey
      );
      
      // Lấy blockhash
      const updateBlockhash = await connection.getLatestBlockhash();
      updateTx.recentBlockhash = updateBlockhash.blockhash;
      updateTx.lastValidBlockHeight = updateBlockhash.lastValidBlockHeight;
      
      // Ký và gửi transaction
      const updateSig = await sendAndConfirmTransaction(
        connection,
        updateTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Trạng thái mặc định của token đã được cập nhật sang Frozen!`);
      console.log(`Transaction signature: ${updateSig}`);
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái mặc định của token:', error);
      return;
    }

    // 10. Tạo tài khoản token mới để kiểm tra trạng thái mặc định
    const receiver = Keypair.generate();
    console.log(`\nTạo tài khoản hệ thống cho người nhận mới: ${receiver.publicKey.toBase58()}`);
    
    // Chuyển SOL cho tài khoản mới
    const fundTx = new Transaction().add(
      // Transfer 0.01 SOL
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: receiver.publicKey,
        lamports: 10000000
      })
    );
    
    await sendAndConfirmTransaction(
      connection,
      fundTx,
      [payer],
      { commitment: 'confirmed' }
    );
    
    // Tạo tài khoản token mới
    console.log('\nTạo tài khoản token mới sau khi cập nhật trạng thái mặc định...');
    const newTokenAddress = await token.getAssociatedAddress(
      receiver.publicKey,
      false
    );
    
    const newAccountTx = new Transaction().add(
      token.createAssociatedTokenAccountInstruction(
        payer.publicKey,
        newTokenAddress,
        receiver.publicKey
      )
    );

    try {
      const newAccountSig = await sendAndConfirmTransaction(
        connection,
        newAccountTx,
        [payer],
        { commitment: 'confirmed' }
      );
      console.log(`Tài khoản token mới được tạo tại: ${newTokenAddress.toBase58()}`);
      console.log(`Transaction signature: ${newAccountSig}`);
    } catch (error: any) {
      console.error('Lỗi khi tạo tài khoản token mới:', error);
      return;
    }

    // 11. Kiểm tra trạng thái của tài khoản token mới
    console.log('\nKiểm tra trạng thái của tài khoản token mới...');
    try {
      const newAccountInfo = await token.getAccount(
        newTokenAddress,
        'confirmed'
      );
      
      console.log('Thông tin tài khoản token mới:');
      console.log(`- Trạng thái: ${newAccountInfo.isFrozen ? 'Frozen' : 'Initialized'}`);
      
      if (newAccountInfo.isFrozen) {
        console.log('✅ Cập nhật trạng thái mặc định thành công! Tài khoản mới được tạo ra với trạng thái Frozen.');
      } else {
        console.log('❌ Cập nhật trạng thái mặc định thất bại. Tài khoản mới không ở trạng thái Frozen.');
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra tài khoản token mới:', error);
      return;
    }

    console.log('\nVí dụ TokenFreezeExtension đã hoàn tất!');
    
  } catch (error) {
    console.error('Lỗi khi thực hiện ví dụ:', error);
  }
}

// Chạy hàm main
main(); 