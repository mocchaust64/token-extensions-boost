

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import { TokenBuilder } from '../../../src';
import { ExtensionType } from '@solana/spl-token';
import bs58 from 'bs58';

// Bước 1: Thiết lập môi trường
async function main() {
  // Tạo kết nối đến Solana devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // Tạo keypair để test (trong môi trường thực tế, đây sẽ là wallet của người dùng)
  const payer = Keypair.generate();

  // Nạp SOL vào tài khoản kiểm thử từ devnet faucet
  console.log(`Địa chỉ ví: ${payer.publicKey.toString()}`);
  console.log('Đang nạp SOL từ devnet faucet...');
  
  try {
    const airdropSignature = await connection.requestAirdrop(payer.publicKey, 2 * 10 ** 9);
    await connection.confirmTransaction(airdropSignature, 'confirmed');
    console.log('Đã nạp 2 SOL thành công!');
  } catch (err) {
    console.error('Lỗi khi nạp SOL:', err);
    return;
  }

  // Bước 2: Khởi tạo TokenBuilder với các extensions
  console.log('Đang thiết lập TokenBuilder với các extensions...');
  
  const tokenName = 'Example Token';
  const tokenSymbol = 'EX';
  const tokenUri = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
  
  const tokenBuilder = new TokenBuilder(connection);
  
  // Thiết lập thông tin cơ bản
  tokenBuilder.setTokenInfo(
    9, // Decimals
    payer.publicKey, // Mint Authority
    null // Freeze Authority (null)
  );
  
  // Thêm metadata
  tokenBuilder.addMetadata(
    tokenName,
    tokenSymbol,
    tokenUri,
    {
      description: 'This is an example token created using the new instruction-based API',
      creator: payer.publicKey.toString()
    }
  );
  
  // Thêm Transfer Fee (1%)
  tokenBuilder.addTransferFee(
    100, // 1% (100 basis points)
    BigInt(1_000_000_000), // Max fee: 1 token with 9 decimals
    payer.publicKey, // Transfer fee config authority
    payer.publicKey // Withdraw withheld authority
  );
  
  // Bước 3: Tạo instructions và transaction (không thực thi trực tiếp)
  console.log('Tạo instructions để tạo token...');
  
  try {
    // Sử dụng phương thức createTokenInstructions thay vì createToken
    const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(
      payer.publicKey
    );
    
    console.log(`Mint address: ${mint.toString()}`);
    console.log(`Số lượng instructions: ${instructions.length}`);
    console.log(`Số lượng signers: ${signers.length}`);
    
    // Bước 4: Tạo transaction từ instructions
    const transaction = new Transaction();
    instructions.forEach(ix => transaction.add(ix));
    
    // Bước 5: Ký và gửi transaction
    // Chú ý: Trong ứng dụng web thực tế, bước này sẽ được thực hiện bởi wallet adapter
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, ...signers],
      { commitment: 'confirmed' }
    );
    
    console.log(`Token tạo thành công! Transaction: ${signature}`);
    console.log(`Explorer URL: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    
    // Lưu mint address vào file để sử dụng cho các ví dụ tiếp theo
    const mintInfoForExport = {
      mint: mint.toString(),
      payer: bs58.encode(payer.secretKey),
    };
    
    // Sử dụng cách này trong ví dụ để đơn giản, trong thực tế không nên lưu private key!
    console.log('Token info saved for next examples. NEVER store private keys in production!');
    console.log(JSON.stringify(mintInfoForExport));
    
    return { mint, payer };
    
  } catch (error) {
    console.error('Lỗi khi tạo token:', error);
  }
}

// Chỉ chạy main nếu là file chạy trực tiếp (không phải import)
if (require.main === module) {
  main().catch(console.error);
}

export default main; 