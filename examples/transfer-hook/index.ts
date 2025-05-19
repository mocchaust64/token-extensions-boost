import { Connection, Keypair } from "@solana/web3.js";
import { Token2022Factory } from "../../src/utils/token-factory";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
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
    
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      2 * 10 ** 9
    );
    await connection.confirmTransaction(airdropSignature);
  }

  console.log("\nStep 1: Creating a simple Transfer Hook token");
  
  // Tạo Transfer Hook Program dummy để test (trong thực tế sẽ dùng Program ID thật)
  const dummyTransferHookProgram = Keypair.generate();
  console.log(`Using dummy Transfer Hook Program ID: ${dummyTransferHookProgram.publicKey.toString()}`);
  
  // Khởi tạo Token2022Factory
  const factory = new Token2022Factory(connection);
  
  // Tạo token với Transfer Hook
  const transferHookToken = await factory.createTransferHookToken(
    payer,
    {
      decimals: 9,
      mintAuthority: payer.publicKey,
      transferHookProgramId: dummyTransferHookProgram.publicKey,
      freezeAuthority: null
    }
  );
  
  console.log(`Token created with mint: ${transferHookToken.getMint().toString()}`);
  
  console.log("\nStep 2: Minting tokens to owner");
  const mintAmount = BigInt(100_000_000_000); // 100 tokens
  
  // Mint token
  const ownerTokenAccount = await transferHookToken.createAccountAndMintTo(
    payer.publicKey,
    payer,
    mintAmount,
    payer
  );
  
  console.log(`Minted ${Number(mintAmount) / 10**9} tokens to ${ownerTokenAccount.toString()}`);
  
  console.log("\nStep 3: Creating recipient and attempting to transfer tokens");
  const recipient = Keypair.generate();
  console.log(`Recipient: ${recipient.publicKey.toString()}`);
  
  // Tạo token account cho người nhận
  const { address: recipientTokenAccount } = await transferHookToken.createOrGetTokenAccount(
    payer,
    recipient.publicKey
  );
  
  const transferAmount = BigInt(10_000_000_000); // 10 tokens
  console.log(`Attempting to transfer ${Number(transferAmount) / 10**9} tokens to ${recipientTokenAccount.toString()}`);
  
  try {
    const transferSignature = await transferHookToken.transfer(
      ownerTokenAccount,
      recipientTokenAccount,
      payer,
      transferAmount,
      9
    );
    
    console.log(`Transfer successful!`);
    console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  } catch (error) {
    console.error("Transfer failed (expected if the transfer hook program doesn't exist):", error);
    console.log("\nNote: Transfer fails because the dummy Transfer Hook Program doesn't exist on the blockchain.");
    console.log("In a real implementation, you'd create the Transfer Hook Program first, deploy it, and use its Program ID.");
  }

  console.log("\nStep 4: Creating a token with Transfer Hook and Metadata");
  
  try {
    // Tạo token với kết hợp Transfer Hook và Metadata
    const { transferHookToken: combinedToken, metadataToken, mint } = await factory.createTransferHookWithMetadataToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        transferHook: {
          programId: dummyTransferHookProgram.publicKey,
        },
        metadata: {
          name: "Hook Token",
          symbol: "HOOK",
          uri: "https://example.com/metadata/hook-token.json",
          additionalMetadata: {
            "description": "A token with both transfer hook and metadata extensions",
            "creator": payer.publicKey.toString(),
            "website": "https://example.com" 
          }
        }
      }
    );
    
    console.log(`Combined token created with mint: ${mint.toString()}`);
    
    // Hiển thị metadata
    const tokenMetadata = await metadataToken.getTokenMetadata();
    console.log("\nToken metadata:");
    console.log(JSON.stringify(tokenMetadata, null, 2));
    
  } catch (error) {
    console.error("Error creating combined token:", error);
  }
  
  console.log("\n===== SUMMARY =====");
  console.log("1. Created a Transfer Hook enabled token");
  console.log("2. Minted tokens to the owner account");
  console.log("3. Attempted to transfer tokens (fails with a dummy program ID)");
  console.log("4. Created a token with both Transfer Hook and Metadata extensions");
  console.log("\nTo create a working Transfer Hook token:");
  console.log("1. Implement and deploy a Transfer Hook Program following SPL Transfer Hook Interface");
  console.log("2. Replace the dummy program ID with your actual deployed program ID");
  console.log("3. Create your token with the real Transfer Hook Program ID");
}

main()
  .then(() => console.log("Success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 