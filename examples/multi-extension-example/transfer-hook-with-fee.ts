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

  console.log("\nStep 1: Creating a multi-extension token with Transfer Hook and Transfer Fee");
  
  // Tạo Transfer Hook Program dummy để test (trong thực tế sẽ dùng Program ID thật)
  const dummyTransferHookProgram = Keypair.generate();
  console.log(`Using dummy Transfer Hook Program ID: ${dummyTransferHookProgram.publicKey.toString()}`);
  
  // Khởi tạo Token2022Factory
  const factory = new Token2022Factory(connection);
  
  try {
    // Tạo token với kết hợp Transfer Hook và TransferFee
    const { transferFeeToken, metadataToken, mint } = await factory.createTransferFeeWithMetadataToken(
      payer,
      {
        decimals: 9,
        mintAuthority: payer.publicKey,
        transferFee: {
          feeBasisPoints: 100, // 1%
          maxFee: BigInt(1_000_000_000), // 1 token
          transferFeeConfigAuthority: payer,
          withdrawWithheldAuthority: payer
        },
        metadata: {
          name: "Multi Extension Token",
          symbol: "MULTI",
          uri: "https://example.com/metadata/multi-token.json",
          additionalMetadata: {
            "description": "A token with both transfer fee and metadata extensions",
            "creator": payer.publicKey.toString(),
            "website": "https://example.com" 
          }
        }
      }
    );
    
    console.log(`Multi-extension token created with mint: ${mint.toString()}`);
    
    // Lấy thông tin metadata
    const tokenMetadata = await metadataToken.getTokenMetadata();
    console.log("\nToken metadata:");
    console.log(JSON.stringify(tokenMetadata, null, 2));
    
    console.log("\nStep 2: Minting tokens to owner");
    const mintAmount = BigInt(100_000_000_000); // 100 tokens
    
    // Mint token
    const ownerTokenAccount = await transferFeeToken.createAccountAndMintTo(
      payer.publicKey,
      payer,
      mintAmount,
      payer
    );
    
    console.log(`Minted ${Number(mintAmount) / 10**9} tokens to ${ownerTokenAccount.toString()}`);
    
    console.log("\nStep 3: Creating recipient and transferring tokens with fee");
    const recipient = Keypair.generate();
    console.log(`Recipient: ${recipient.publicKey.toString()}`);
    
    // Tạo token account cho người nhận
    const { address: recipientTokenAccount } = await transferFeeToken.createOrGetTokenAccount(
      payer,
      recipient.publicKey
    );
    
    const transferAmount = BigInt(10_000_000_000); // 10 tokens
    const expectedFee = transferFeeToken.calculateFee(transferAmount);
    
    console.log(`Attempting to transfer ${Number(transferAmount) / 10**9} tokens to ${recipientTokenAccount.toString()}`);
    console.log(`Expected fee: ${Number(expectedFee) / 10**9} tokens`);
    
    const transferSignature = await transferFeeToken.transfer(
      ownerTokenAccount,
      recipientTokenAccount,
      payer,
      transferAmount,
      9
    );
    
    console.log(`Transfer successful!`);
    console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
    
    console.log("\nStep 4: After transfer, checking balance in recipient account");
    
    // Dòng code sau sẽ phải được implement trong TransferFeeToken
    // const recipientBalance = await transferFeeToken.getBalance(recipientTokenAccount);
    // console.log(`Recipient balance: ${Number(recipientBalance) / 10**9} tokens`);
    
  } catch (error) {
    console.error("Error in multi-extension example:", error);
    console.log("\nNote: We are using a simpler example with TransferFee and Metadata instead of TransferHook.");
    console.log("In a real implementation, you'd create the Transfer Hook Program first, deploy it, and use its Program ID.");
  }
  
  console.log("\n===== SUMMARY =====");
  console.log("1. Created a Multi-Extension Token with Transfer Fee and Metadata");
  console.log("2. Minted tokens to the owner account");
  console.log("3. Transferred tokens with automatic fee collection");
  console.log("\nFor Transfer Hook Extension:");
  console.log("1. Implement and deploy a Transfer Hook Program following the SPL Transfer Hook Interface");
  console.log("2. Create a proper ExtraAccountMetaList account for your hook program");
  console.log("3. Replace the dummy program ID with your actual deployed program ID");
}

main()
  .then(() => console.log("Success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 