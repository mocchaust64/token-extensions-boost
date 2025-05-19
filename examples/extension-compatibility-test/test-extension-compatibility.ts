/**
 * Kiểm tra tính tương thích giữa các extension
 * Script này sẽ thử tạo token với các cặp extension khác nhau để xác định những cặp tương thích
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, ExtensionType } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import { Token2022Factory } from '../../src/utils';
import { ExtensionConfig } from '../../src/utils/multi-extension-token';
import { MetadataHelper } from '../../src/utils/metadata-helper';

// Mảng các cặp extension cần kiểm tra
const extensionPairsToTest = [
  // Cặp 1: NonTransferable + PermanentDelegate (đã thành công)
  {
    name: "NonTransferable + PermanentDelegate",
    extensions: [ExtensionType.NonTransferable, ExtensionType.PermanentDelegate]
  },
  
  // Cặp 2: TransferFee + PermanentDelegate
  {
    name: "TransferFee + PermanentDelegate",
    extensions: [ExtensionType.TransferFeeConfig, ExtensionType.PermanentDelegate]
  },

  // Cặp 3: TransferFee + TransferHook
  {
    name: "TransferFee + TransferHook", 
    extensions: [ExtensionType.TransferFeeConfig, ExtensionType.TransferHook]
  },
  
  // Cặp 4: MetadataPointer + PermanentDelegate (bổ sung từ thử nghiệm trước)
  {
    name: "MetadataPointer + PermanentDelegate",
    extensions: [ExtensionType.MetadataPointer, ExtensionType.PermanentDelegate]
  },
  
  // Cặp 5: NonTransferable + MetadataPointer
  {
    name: "NonTransferable + MetadataPointer",
    extensions: [ExtensionType.NonTransferable, ExtensionType.MetadataPointer]
  }
];

/**
 * Kiểm tra tương thích của các extension trước khi thử tạo token
 */
function checkCompatibility() {
  console.log("Kiểm tra tương thích giữa các extension:");
  console.log("=======================================");
  
  for (const pair of extensionPairsToTest) {
    const result = MetadataHelper.checkExtensionCompatibility(pair.extensions);
    
    console.log(`- ${pair.name}:`);
    if (result.isCompatible) {
      console.log(`  ✅ Tương thích theo lý thuyết`);
    } else {
      console.log(`  ❌ Không tương thích: ${result.reason}`);
      if (result.incompatiblePairs) {
        for (const incompatible of result.incompatiblePairs) {
          console.log(`    - ${ExtensionType[incompatible[0]]} không tương thích với ${ExtensionType[incompatible[1]]}`);
        }
      }
    }
  }
}

/**
 * Thử tạo token với từng cặp extension và ghi lại kết quả
 */
async function testExtensionPairs() {
  // Kết nối đến Solana devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // Tải keypair từ filesystem hoặc tạo mới
  let payer: Keypair;
  const walletPath = path.join(process.env.HOME!, '.config', 'solana', 'id.json');
  
  try {
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
    
    if (balance < 1 * LAMPORTS_PER_SOL) {
      console.error("Số dư không đủ để thực hiện các giao dịch test. Cần tối thiểu 1 SOL");
      return;
    }
  } catch (error) {
    console.error("Không thể kiểm tra số dư:", error);
    return;
  }

  // Tạo factory
  const factory = new Token2022Factory(connection);

  console.log("\nKết quả kiểm tra tạo token với các cặp extension:");
  console.log("==================================================");

  // Tạo token với từng cặp extension
  for (const pair of extensionPairsToTest) {
    console.log(`\nThử nghiệm cặp: ${pair.name}`);
    try {
      // Tạo cấu hình extension tùy thuộc vào loại extension
      const extensionConfig: ExtensionConfig = {};
      
      // Thêm cấu hình cho NonTransferable
      if (pair.extensions.includes(ExtensionType.NonTransferable)) {
        extensionConfig.nonTransferable = true;
      }
      
      // Thêm cấu hình cho PermanentDelegate
      if (pair.extensions.includes(ExtensionType.PermanentDelegate)) {
        extensionConfig.permanentDelegate = payer.publicKey;
      }
      
      // Thêm cấu hình cho TransferFee
      if (pair.extensions.includes(ExtensionType.TransferFeeConfig)) {
        extensionConfig.transferFee = {
          feeBasisPoints: 100, // 1%
          maxFee: BigInt(5_000_000_000), // 5 token
          transferFeeConfigAuthority: payer.publicKey,
          withdrawWithheldAuthority: payer.publicKey
        };
      }
      
      // Thêm cấu hình cho TransferHook
      if (pair.extensions.includes(ExtensionType.TransferHook)) {
        // Tạo một fake program ID để test
        const hookProgramId = Keypair.generate().publicKey;
        extensionConfig.transferHook = {
          programId: hookProgramId,
          authority: payer.publicKey
        };
      }
      
      // Thêm cấu hình cho Metadata
      if (pair.extensions.includes(ExtensionType.MetadataPointer)) {
        extensionConfig.metadata = {
          name: "Test Token",
          symbol: "TEST",
          uri: "https://example.com/token.json",
          additionalMetadata: {
            "description": "A test token for extension compatibility",
            "creator": payer.publicKey.toString()
          }
        };
      }
      
      // Tạo token
      const multiToken = await factory.createMultiExtensionToken(
        payer,
        {
          decimals: 9,
          mintAuthority: payer.publicKey,
          freezeAuthority: payer.publicKey,
          extensions: extensionConfig
        }
      );
      
      console.log(`✅ Thành công! Token created with mint: ${multiToken.getMint()}`);
      console.log(`Extensions: ${multiToken.getExtensions().map(ext => ExtensionType[ext]).join(', ')}`);
    } catch (error: any) {
      console.log(`❌ Thất bại! Lý do: ${error.message}`);
    }
  }
}

async function main() {
  console.log("=== KIỂM TRA TƯƠNG THÍCH GIỮA CÁC TOKEN EXTENSION ===\n");
  
  // Kiểm tra tương thích lý thuyết
  checkCompatibility();
  
  // Thử tạo token với các cặp extension
  await testExtensionPairs();
}

main().catch(error => {
  console.error("Lỗi khi thực hiện kiểm tra:", error);
  process.exit(1);
}); 