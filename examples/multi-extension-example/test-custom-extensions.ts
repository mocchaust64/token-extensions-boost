import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Token2022Factory } from "../../src/utils/token-factory";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Kết nối đến Solana devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Khởi tạo Token2022Factory
  const factory = new Token2022Factory(connection);
  
  // Đọc keypair từ file
  let payer: Keypair;
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  
  try {
    const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    payer = Keypair.fromSecretKey(secretKey);
    console.log(`Using wallet: ${payer.publicKey.toString()}`);
  } catch (error) {
    console.error("Could not read wallet. Creating a new keypair...");
    payer = Keypair.generate();
    console.log(`Using generated wallet: ${payer.publicKey.toString()}`);
    
    // Airdrop SOL cho ví mới
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      2 * 10 ** 9
    );
    await connection.confirmTransaction(airdropSignature);
  }

  // Ví dụ 1: Token với TransferFee và PermanentDelegate
  console.log("\n=== Ví dụ 1: Token với TransferFee và PermanentDelegate ===");
  try {
    const result1 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          transferFee: {
            feeBasisPoints: 100, // 1%
            maxFee: BigInt(1_000_000_000),
            transferFeeConfigAuthority: payer.publicKey,
            withdrawWithheldAuthority: payer.publicKey
          },
          permanentDelegate: payer.publicKey
        }
      }
    );
    
    console.log(`Token 1 created with mint: ${result1.mint.toString()}`);
    console.log(`Transaction signature: ${result1.transactionSignature}`);
    console.log(`Transaction link: https://explorer.solana.com/tx/${result1.transactionSignature}?cluster=devnet`);
  } catch (error) {
    console.error("Error creating token 1:", error);
  }

  // Ví dụ 2: Token với TransferFee
  console.log("\n=== Ví dụ 2: Token với TransferFee ===");
  try {
    const result2 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          transferFee: {
            feeBasisPoints: 50, // 0.5%
            maxFee: BigInt(500_000_000),
            transferFeeConfigAuthority: payer.publicKey,
            withdrawWithheldAuthority: payer.publicKey
          }
        }
      }
    );
    
    console.log(`Token 2 created with mint: ${result2.mint.toString()}`);
    console.log(`Transaction signature: ${result2.transactionSignature}`);
    console.log(`Transaction link: https://explorer.solana.com/tx/${result2.transactionSignature}?cluster=devnet`);
  } catch (error) {
    console.error("Error creating token 2:", error);
  }

  // Ví dụ 3: Token với TransferHook
  console.log("\n=== Ví dụ 3: Token với TransferHook ===");
  try {
    // Tạo một dummy program ID cho transfer hook
    const dummyProgramId = Keypair.generate().publicKey;
    
    const result3 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          transferHook: {
            programId: dummyProgramId
          }
        }
      }
    );
    
    console.log(`Token 3 created with mint: ${result3.mint.toString()}`);
    console.log(`Transaction signature: ${result3.transactionSignature}`);
    console.log(`Transfer Hook Program ID: ${dummyProgramId.toString()}`);
    console.log(`Transaction link: https://explorer.solana.com/tx/${result3.transactionSignature}?cluster=devnet`);
  } catch (error) {
    console.error("Error creating token 3:", error);
  }

  // Ví dụ 4: Token với NonTransferable
  console.log("\n=== Ví dụ 4: Token với NonTransferable ===");
  try {
    const result4 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          nonTransferable: true
        }
      }
    );
    
    console.log(`Token 4 created with mint: ${result4.mint.toString()}`);
    console.log(`Transaction signature: ${result4.transactionSignature}`);
    console.log(`Transaction link: https://explorer.solana.com/tx/${result4.transactionSignature}?cluster=devnet`);
    
    // Lấy đối tượng NonTransferableToken để kiểm tra
    const nonTransferableToken = factory.getNonTransferableToken(result4.mint);
    console.log("Mint address:", nonTransferableToken.getMint().toString());
  } catch (error) {
    console.error("Error creating token 4:", error);
  }
  
  // Ví dụ 5: Token với PermanentDelegate
  console.log("\n=== Ví dụ 5: Token với PermanentDelegate ===");
  try {
    const result5 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          permanentDelegate: payer.publicKey
        }
      }
    );
    
    console.log(`Token 5 created with mint: ${result5.mint.toString()}`);
    console.log(`Transaction signature: ${result5.transactionSignature}`);
    console.log(`Permanent Delegate: ${payer.publicKey.toString()}`);
    console.log(`Transaction link: https://explorer.solana.com/tx/${result5.transactionSignature}?cluster=devnet`);
  } catch (error) {
    console.error("Error creating token 5:", error);
  }
  
  // Ví dụ 6: Token với TransferFee và TransferHook
  console.log("\n=== Ví dụ 6: Token với TransferFee và TransferHook ===");
  try {
    const dummyProgramId = Keypair.generate().publicKey;
    
    const result6 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          transferFee: {
            feeBasisPoints: 75, // 0.75%
            maxFee: BigInt(750_000_000),
            transferFeeConfigAuthority: payer.publicKey,
            withdrawWithheldAuthority: payer.publicKey
          },
          transferHook: {
            programId: dummyProgramId
          }
        }
      }
    );
    
    console.log(`Token 6 created with mint: ${result6.mint.toString()}`);
    console.log(`Transaction signature: ${result6.transactionSignature}`);
    console.log(`Transfer Hook Program ID: ${dummyProgramId.toString()}`);
    console.log(`Transaction link: https://explorer.solana.com/tx/${result6.transactionSignature}?cluster=devnet`);
  } catch (error) {
    console.error("Error creating token 6:", error);
  }
  
  // Ví dụ 7: Token với NonTransferable và PermanentDelegate
  console.log("\n=== Ví dụ 7: Token với NonTransferable và PermanentDelegate ===");
  try {
    const result7 = await factory.createToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        extensions: {
          nonTransferable: true,
          permanentDelegate: payer.publicKey
        }
      }
    );
    
    console.log(`Token 7 created with mint: ${result7.mint.toString()}`);
    console.log(`Transaction signature: ${result7.transactionSignature}`);
    console.log(`Permanent Delegate: ${payer.publicKey.toString()}`);
    console.log(`Transaction link: https://explorer.solana.com/tx/${result7.transactionSignature}?cluster=devnet`);
  } catch (error) {
    console.error("Error creating token 7:", error);
  }
}

main()
  .then(() => console.log("\nAll examples completed"))
  .catch((error) => {
    console.error("Error in main:", error);
    process.exit(1);
  }); 