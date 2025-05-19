/**
 * Ví dụ về cách tạo và sử dụng token không thể chuyển nhượng (NonTransferable)
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
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from '../../src/utils/token-builder';
import { NonTransferableToken } from '../../src/extensions/non-transferable';
import { 
  createAssociatedTokenAccountInstruction, 
  getAssociatedTokenAddress, 
  createMintToInstruction, 
  transferChecked, 
  TOKEN_2022_PROGRAM_ID 
} from '@solana/spl-token';

async function main() {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  let payer: Keypair;
  const walletPath = path.join(process.env.HOME!, '.config', 'solana', 'id.json');
  
  try {
    const secretKeyString = fs.readFileSync(walletPath, { encoding: 'utf8' });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    payer = Keypair.fromSecretKey(secretKey);
  } catch (error) {
    payer = Keypair.generate();
    
    const signature = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);
  }

  const balance = await connection.getBalance(payer.publicKey);
  
  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    console.error("Insufficient balance to perform transactions");
    return;
  }

  // Create Non-Transferable Token with TokenBuilder
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)
    .addNonTransferable();
  
  const { mint, transactionSignature } = await tokenBuilder.createToken(payer);

  console.log(`Non-Transferable Token created: ${mint.toBase58()}`);
  
  // Create NonTransferableToken instance from mint address
  const nonTransferableToken = new NonTransferableToken(connection, mint);

  // Create token account and mint tokens
  const recipientKeypair = Keypair.generate();
  
  // Create token account
  const recipientTokenAddress = await getAssociatedTokenAddress(
    mint,
    recipientKeypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  // Create and send transaction
  const transaction = new Transaction();
  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      recipientTokenAddress,
      recipientKeypair.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID
    ),
    createMintToInstruction(
      mint,
      recipientTokenAddress,
      payer.publicKey,
      BigInt(1_000_000_000), // 1 token (9 decimals)
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  const mintSignature = await connection.sendTransaction(transaction, [payer]);
  await connection.confirmTransaction(mintSignature);
  
  console.log(`Minted 1 token to ${recipientKeypair.publicKey.toBase58()}`);

  // Try to transfer token (to demonstrate that token cannot be transferred)
  try {
    const destinationKeypair = Keypair.generate();
    // Create token account for recipient
    const destinationTokenAddress = await getAssociatedTokenAddress(
      mint,
      destinationKeypair.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    // Create account for recipient
    const createDestAccountTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destinationTokenAddress,
        destinationKeypair.publicKey,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    await connection.sendTransaction(createDestAccountTx, [payer]);
    
    // Try to transfer token - will fail because token is non-transferable
    await transferChecked(
      connection,
      recipientKeypair, // payer
      recipientTokenAddress, // source
      mint, // mint
      destinationTokenAddress, // destination
      recipientKeypair, // owner
      BigInt(100_000_000), // amount (0.1 token) 
      9, // decimals
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
  } catch (error: any) {
    console.log(`Transfer failed (as expected): ${error.message}`);
  }

  console.log('Non-Transferable Token created successfully!');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 