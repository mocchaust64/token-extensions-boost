import { clusterApiUrl, Connection, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

import { TransferFeeToken, TokenBuilder } from "solana-token-extension-boost";

async function main() {
  // Kết nối tới Solana devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Đọc ví từ file cục bộ - trong ứng dụng thực tế, sẽ sử dụng wallet adapter
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  
  console.log("Địa chỉ ví:", payer.publicKey.toString());
  
  // 1. Tạo instructions cho token với 1% phí chuyển khoản
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey, payer.publicKey)
    .addTransferFee(
      100, // 1% (100 basis points)
      BigInt(10_000_000_000), // 10 tokens max fee
      payer.publicKey, // transferFeeConfigAuthority
      payer.publicKey  // withdrawWithheldAuthority
    );
  
  // Lấy instructions thay vì thực hiện transaction trực tiếp
  const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(payer.publicKey);
  
  // Tạo và gửi transaction
  const transaction = new Transaction().add(...instructions);
  const createTokenSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, ...signers]
  );
  
  console.log(`Token đã được tạo: ${mint.toString()}`);
  console.log(`Giao dịch: https://explorer.solana.com/tx/${createTokenSignature}?cluster=devnet`);
  
  const transferFeeToken = new TransferFeeToken(connection, mint, {
    feeBasisPoints: 100,
    maxFee: BigInt(10_000_000_000),
    transferFeeConfigAuthority: payer.publicKey,
    withdrawWithheldAuthority: payer.publicKey
  });
  
  // 2. Tạo token account và mint tokens
  const mintAmount = BigInt(1000_000_000_000);
  
  // Tạo instructions thay vì thực hiện trực tiếp
  const { instructions: mintInstructions, address: ownerTokenAddress } = 
    await transferFeeToken.createAccountAndMintToInstructions(
      payer.publicKey,
    payer.publicKey,
    mintAmount,
      payer.publicKey
    );
  
  // Tạo và gửi transaction
  const mintTransaction = new Transaction().add(...mintInstructions);
  const mintSignature = await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [payer]
  );
  
  console.log(`Đã mint ${Number(mintAmount) / 1e9} tokens đến ${ownerTokenAddress.toString()}`);
  console.log(`Giao dịch: https://explorer.solana.com/tx/${mintSignature}?cluster=devnet`);
  
  const recipient = Keypair.generate();
  
  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    recipient.publicKey,
    false,
    "confirmed",
    { skipPreflight: true },
    transferFeeToken.getProgramId()
  );
  
  // 3. Chuyển tokens với 1% phí
  const transferAmount = BigInt(100_000_000_000);
  const expectedFee = transferFeeToken.calculateFee(transferAmount);
  
  // Tạo instruction chuyển khoản thay vì thực hiện trực tiếp
  const transferInstruction = transferFeeToken.createTransferInstruction(
    ownerTokenAddress,
    recipientTokenAccount.address,
    payer.publicKey,
    transferAmount,
    9
  );
  
  // Tạo và gửi transaction
  const transferTransaction = new Transaction().add(transferInstruction);
  const transferSignature = await sendAndConfirmTransaction(
    connection,
    transferTransaction,
    [payer]
  );
  
  console.log(`Đã chuyển ${Number(transferAmount) / 1e9} tokens với ${Number(expectedFee) / 1e9} phí`);
  console.log(`Giao dịch: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  
  try {
    // 4. Thu thập phí từ các tài khoản vào mint
    const harvestInstruction = transferFeeToken.createHarvestWithheldTokensToMintInstruction(
      [recipientTokenAccount.address]
    );
    
    const harvestTransaction = new Transaction().add(harvestInstruction);
    const harvestSignature = await sendAndConfirmTransaction(
      connection,
      harvestTransaction,
      [payer]
    );
    
    console.log(`Đã thu thập phí vào mint`);
    console.log(`Giao dịch: https://explorer.solana.com/tx/${harvestSignature}?cluster=devnet`);
    
    // 5. Rút phí từ mint vào ví
    const feeRecipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey,
      false,
      "confirmed",
      { skipPreflight: true },
      transferFeeToken.getProgramId()
    );
    
    const withdrawInstruction = transferFeeToken.createWithdrawFeesFromMintInstruction(
      feeRecipientTokenAccount.address,
      payer.publicKey
    );
    
    const withdrawTransaction = new Transaction().add(withdrawInstruction);
    const withdrawSignature = await sendAndConfirmTransaction(
      connection,
      withdrawTransaction,
      [payer]
    );
    
    console.log(`Đã rút phí đến ${feeRecipientTokenAccount.address.toString()}`);
    console.log(`Giao dịch: https://explorer.solana.com/tx/${withdrawSignature}?cluster=devnet`);
  } catch (error: any) {
    console.log("Lỗi xử lý phí:", error.message);
    // Lỗi xử lý phí có thể xảy ra nếu không có phí để thu thập
  }
  
  console.log(`Chi tiết token: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
}

main()
  .then(() => console.log("Thành công"))
  .catch(error => {
    console.error("Lỗi:", error);
    process.exit(1);
  }); 