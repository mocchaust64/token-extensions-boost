/**
 * Ví dụ về cách tạo và sử dụng NonTransferableToken (Token không thể chuyển nhượng)
 * 
 * Token không thể chuyển nhượng hữu ích cho các trường hợp như:
 * - Chứng chỉ và chứng nhận
 * - Soulbound tokens (Token gắn liền với người dùng)
 * - Huy hiệu và phù hiệu
 * - Membership tokens
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import { NonTransferableToken } from '../../src/extensions/non-transferable';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Kết nối đến Solana Devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // Tải keypair từ filesystem thay vì tạo mới
  let payer: Keypair;
  const walletPath = path.join(process.env.HOME!, '.config', 'solana', 'id.json');
  
  try {
    // Đọc private key từ file config của Solana
    const secretKeyString = fs.readFileSync(walletPath, { encoding: 'utf8' });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    payer = Keypair.fromSecretKey(secretKey);
    console.log(`Sử dụng ví local: ${payer.publicKey.toString()}`);
  } catch (error) {
    console.error("Không thể đọc ví local. Tạo keypair mới...");
    payer = Keypair.generate();
    console.log(`Sử dụng keypair mới: ${payer.publicKey.toString()}`);
    
    // Thử airdrop SOL
    console.log('Requesting airdrop for payer...');
    try {
      const signature = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature);
      console.log(`Airdrop confirmed: ${signature}`);
    } catch (error) {
      console.error("Airdrop failed:", error);
      return;
    }
  }

  // Kiểm tra số dư
  try {
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Số dư ví: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.5 * LAMPORTS_PER_SOL) {
      console.error("Số dư không đủ để thực hiện các giao dịch test. Cần tối thiểu 0.5 SOL");
      return;
    }
  } catch (error) {
    console.error("Không thể kiểm tra số dư:", error);
    return;
  }

  // Tạo Non-Transferable Token
  console.log('Creating Non-Transferable Token...');
  const nonTransferableToken = await NonTransferableToken.create(
    connection,
    payer,
    {
      decimals: 9,
      mintAuthority: payer.publicKey,
      freezeAuthority: payer.publicKey,
    }
  );

  console.log(`Non-Transferable Token created with mint: ${nonTransferableToken.getMint().toBase58()}`);

  // Kiểm tra token có thuộc tính NonTransferable
  const isNonTransferable = await nonTransferableToken.isNonTransferable();
  console.log(`Token has NonTransferable extension: ${isNonTransferable}`);

  // Tạo token account và mint token
  console.log('Creating token account and minting tokens...');
  const recipientKeypair = Keypair.generate();
  const tokenAccount = await nonTransferableToken.createAccountAndMintTo(
    recipientKeypair.publicKey,
    payer,
    BigInt(1_000_000_000), // 1 token with 9 decimals
    payer
  );

  console.log(`Token account created: ${tokenAccount.toBase58()}`);
  console.log(`Minted 1 token to ${recipientKeypair.publicKey.toBase58()}`);

  // Thử chuyển token (để chứng minh rằng token không thể chuyển)
  console.log('Attempting to transfer tokens (this should fail)...');
  try {
    const destinationKeypair = Keypair.generate();
    // Tạo token account cho người nhận
    const destAccount = await nonTransferableToken.createOrGetTokenAccount(
      payer,
      destinationKeypair.publicKey
    );

    // Thử chuyển token - điều này sẽ thất bại vì token không thể chuyển
    await nonTransferableToken.attemptTransfer(
      tokenAccount,
      destAccount.address,
      recipientKeypair,
      BigInt(100_000_000), // 0.1 token
      9
    );
  } catch (error: any) {
    console.log(`Transfer failed as expected: ${error.message}`);
  }

  // Lấy thông tin về token
  const nonTransferableInfo = await nonTransferableToken.getNonTransferableInfo();
  console.log('Non-Transferable Token Info:');
  console.log(nonTransferableInfo);

  // Kiểm tra khả năng chuyển token
  const canTransfer = await nonTransferableToken.canTransferTokens(tokenAccount);
  console.log(`Can this token be transferred? ${canTransfer ? 'Yes' : 'No'}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 