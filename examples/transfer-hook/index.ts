import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { TransferHookToken, TokenBuilder } from "solana-token-extension-boost";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);

  console.log("Địa chỉ ví:", payer.publicKey.toString());

  // Bước 1: Tạo token với Transfer Hook
  const dummyTransferHookProgram = Keypair.generate();  
  console.log("Địa chỉ Transfer Hook Program:", dummyTransferHookProgram.publicKey.toString());
  
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)
    .addTransferHook(dummyTransferHookProgram.publicKey);
  
  // Sử dụng phương thức createTokenInstructions thay vì createToken
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
  
  // Tạo và gửi transaction
  const transaction = new Transaction().add(...instructions);
  const createTokenSignature = await sendAndConfirmTransaction(
    connection, 
    transaction, 
    [payer, ...signers]
  );
  
  console.log(`Token với Transfer Hook đã được tạo: ${mint.toString()}`);
  console.log(`Giao dịch: https://explorer.solana.com/tx/${createTokenSignature}?cluster=devnet`);
  
  const transferHookToken = new TransferHookToken(
    connection, 
    mint, 
    dummyTransferHookProgram.publicKey
  );
  
  // Bước 2: Mint tokens cho owner
  const mintAmount = BigInt(100_000_000_000); // 100 tokens
  
  // Tìm địa chỉ token account
  const ownerTokenAccount = await getAssociatedTokenAddress(
    mint,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  // Tạo transaction để tạo tài khoản và mint tokens
  const mintTx = new Transaction();
  
  // Thêm instruction tạo token account
  mintTx.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ownerTokenAccount,
      payer.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  // Thêm instruction mint tokens
  mintTx.add(
    createMintToInstruction(
      mint,
      ownerTokenAccount,
      payer.publicKey,
    mintAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  // Gửi transaction
  const mintSignature = await sendAndConfirmTransaction(
    connection,
    mintTx,
    [payer]
  );
  
  console.log(`Đã mint ${Number(mintAmount) / 10**9} tokens đến ${ownerTokenAccount.toString()}`);
  console.log(`Giao dịch: https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);
  
  // Bước 3: Tạo người nhận và thử chuyển tokens
  const recipient = Keypair.generate();
  
  // Tạo token account cho người nhận
  const recipientTokenAccount = await getAssociatedTokenAddress(
    mint,
    recipient.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  // Tạo transaction để tạo tài khoản cho người nhận
  const createRecipientTx = new Transaction();
  createRecipientTx.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      recipientTokenAccount,
      recipient.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  const createRecipientSignature = await sendAndConfirmTransaction(
    connection,
    createRecipientTx,
    [payer]
  );
  
  console.log(`Đã tạo tài khoản cho người nhận: ${recipientTokenAccount.toString()}`);
  
  const transferAmount = BigInt(10_000_000_000); // 10 tokens
  
  try {
    // Tạo instruction chuyển khoản
    const transferInstruction = transferHookToken.createTransferInstruction(
      ownerTokenAccount,
      recipientTokenAccount,
      payer.publicKey,
      transferAmount,
      9
    );
    
    // Tạo và gửi transaction
    const transferTx = new Transaction().add(transferInstruction);
    const transferSignature = await sendAndConfirmTransaction(
      connection,
      transferTx,
      [payer]
    );
    
    console.log(`Chuyển khoản thành công!`);
    console.log(`Giao dịch: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  } catch (error: any) {
    console.log(`Chuyển khoản thất bại như dự kiến - chương trình Transfer Hook không tồn tại: ${error.message}`);
  }

  // Bước 4: Tạo token với Transfer Hook và Metadata
  try {
    const metadataTokenBuilder = new TokenBuilder(connection)
      .setTokenInfo(9, payer.publicKey)
      .addTransferHook(dummyTransferHookProgram.publicKey)
      .addTokenMetadata(
        "Hook Token",
        "HOOK",
        "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
        {
          "description": "Token với các extension transfer hook và metadata",
          "creator": payer.publicKey.toString(),
          "website": "https://example.com"
        }
      );
    
    // Sử dụng phương thức createTokenInstructions
    const { instructions: combinedInstructions, signers: combinedSigners, mint: combinedMint } = 
      await metadataTokenBuilder.createTokenInstructions(payer.publicKey);
    
    // Tạo và gửi transaction
    const combinedTx = new Transaction().add(...combinedInstructions);
    const combinedSignature = await sendAndConfirmTransaction(
      connection,
      combinedTx,
      [payer, ...combinedSigners]
    );
    
    console.log(`Token kết hợp đã được tạo: ${combinedMint.toString()}`);
    console.log(`Giao dịch: https://explorer.solana.com/tx/${combinedSignature}?cluster=devnet`);
    
  } catch (error: any) {
    console.error("Lỗi khi tạo token kết hợp:", error.message);
  }
  
  console.log("Ví dụ Transfer Hook đã hoàn thành");
}

main()
  .then(() => console.log("Thành công"))
  .catch((error) => {
    console.error("Lỗi:", error);
    process.exit(1);
  }); 