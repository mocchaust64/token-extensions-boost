import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import { 
  TOKEN_2022_PROGRAM_ID, 
  createMint, 
  mintTo, 
  AuthorityType, 
  setAuthority 
} from '@solana/spl-token';
import { TokenAccount } from '../../src/extensions/token-account';
import fs from 'fs';
import path from 'path';

// Hàm main
async function main() {
  // Kết nối đến Solana devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Tạo hoặc load keypair
  let payer: Keypair;
  const keyfilePath = path.resolve('devnet-wallet.json');
  
  try {
    if (fs.existsSync(keyfilePath)) {
      // Load keypair từ file
      const keyfileContent = JSON.parse(fs.readFileSync(keyfilePath, 'utf-8'));
      payer = Keypair.fromSecretKey(new Uint8Array(keyfileContent));
      console.log('Loaded keypair from', keyfilePath);
    } else {
      // Tạo keypair mới
      payer = Keypair.generate();
      fs.writeFileSync(keyfilePath, JSON.stringify(Array.from(payer.secretKey)));
      console.log('Generated new keypair and saved to', keyfilePath);
      
      // Request airdrop
      console.log('Requesting airdrop of 1 SOL...');
      const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSignature, 'confirmed');
      console.log('Airdrop confirmed!');
    }
    
    console.log('Using address:', payer.publicKey.toBase58());
    
    // Kiểm tra balance
    const balance = await connection.getBalance(payer.publicKey);
    console.log('Account balance:', balance / LAMPORTS_PER_SOL, 'SOL');
    
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      console.log('Low balance, requesting airdrop...');
      const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSignature, 'confirmed');
      console.log('Airdrop complete!');
    }
    
    // ============== Tạo token cho ví dụ ==============
    console.log('\n1. Tạo token mới...');
    
    const mintKeypair = Keypair.generate();
    
    // Tạo token mint
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey, // mint authority
      null, // freeze authority (none)
      9, // decimals
      mintKeypair,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log('Token created with mint address:', mint.toBase58());
    
    // ============== Tạo token account thông thường ==============
    console.log('\n2. Tạo token account thông thường...');
    
    const tokenAccount = new TokenAccount(connection, mint, payer.publicKey);
    const { tokenAccount: standardAccount, signature } = await tokenAccount.createAccount(payer);
    
    console.log('Standard token account created:', standardAccount.toBase58());
    console.log('Transaction signature:', signature);
    
    // Mint tokens đến account
    console.log('\nMint 100 tokens to account...');
    await mintTo(
      connection,
      payer,
      mint,
      standardAccount,
      payer,
      100 * (10 ** 9), // 100 tokens với 9 decimals
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log('Tokens minted successfully');
    
    // Thử thay đổi owner của account
    console.log('\nThử thay đổi owner của account thông thường...');
    
    try {
      const newOwner = Keypair.generate().publicKey;
      await setAuthority(
        connection,
        payer,
        standardAccount,
        payer.publicKey,
        AuthorityType.AccountOwner,
        newOwner,
        [],
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID
      );
      console.log('Owner changed successfully to:', newOwner.toBase58());
    } catch (error) {
      console.log('Error changing owner: Token Account Owner change is not restricted');
    }
    
    // ============== Tạo token account với ImmutableOwner ==============
    console.log('\n3. Tạo token account với ImmutableOwner...');
    
    const { tokenAccount: immutableAccount, signature: immutableSig } = 
      await tokenAccount.createAccountWithImmutableOwner(payer);
    
    console.log('Token account with ImmutableOwner created:', immutableAccount.toBase58());
    console.log('Transaction signature:', immutableSig);
    
    // Mint tokens đến immutable account
    console.log('\nMint 100 tokens to immutable account...');
    await mintTo(
      connection,
      payer,
      mint,
      immutableAccount,
      payer,
      100 * (10 ** 9), // 100 tokens với 9 decimals
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log('Tokens minted successfully');
    
    // Thử thay đổi owner của immutable account
    console.log('\nThử thay đổi owner của account với ImmutableOwner...');
    
    try {
      const newOwner = Keypair.generate().publicKey;
      await setAuthority(
        connection,
        payer,
        immutableAccount,
        payer.publicKey,
        AuthorityType.AccountOwner,
        newOwner,
        [],
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID
      );
      console.log('Owner changed successfully - Lỗi, không nên thay đổi được');
    } catch (error) {
      console.log('Owner change rejected as expected: Owner immutable');
    }
    
    // ============== Tạo Associated Token Account ==============
    console.log('\n4. Tạo Associated Token Account...');
    
    const { tokenAccount: associatedAccount, signature: ataSig } = 
      await tokenAccount.createAssociatedTokenAccount(payer);
    
    console.log('Associated Token Account created:', associatedAccount.toBase58());
    console.log('Transaction signature:', ataSig);
    
    // Mint tokens đến ATA
    console.log('\nMint 100 tokens to Associated Token Account...');
    await mintTo(
      connection,
      payer,
      mint,
      associatedAccount,
      payer,
      100 * (10 ** 9), // 100 tokens với 9 decimals
      [],
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    console.log('Tokens minted successfully');
    
    // Thử thay đổi owner của Associated account (ATA đã có ImmutableOwner tích hợp sẵn)
    console.log('\nThử thay đổi owner của Associated Token Account...');
    
    try {
      const newOwner = Keypair.generate().publicKey;
      await setAuthority(
        connection,
        payer,
        associatedAccount,
        payer.publicKey,
        AuthorityType.AccountOwner,
        newOwner,
        [],
        { commitment: 'confirmed' },
        TOKEN_2022_PROGRAM_ID
      );
      console.log('Owner changed successfully - Lỗi, không nên thay đổi được');
    } catch (error) {
      console.log('Owner change rejected as expected: Owner immutable');
    }
    
    console.log('\nVí dụ hoàn thành thành công!');
    console.log('Đã tạo 3 loại token account và chứng minh ImmutableOwner hoạt động đúng.');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Chạy ví dụ
main(); 