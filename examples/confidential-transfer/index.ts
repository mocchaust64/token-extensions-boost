import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { TokenBuilder } from "../../src/utils/token-builder";
import { ConfidentialTransferToken } from "../../src/extensions/confidential-transfer";

async function main() {
  // Kết nối đến Solana devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  
  console.log("===== Confidential Transfer Demo =====");
  console.log("Lưu ý: Đây là phiên bản demo, chức năng ZK Proofs đã được đơn giản hóa");
  console.log("Trên môi trường thực tế, cần triển khai đầy đủ ZK Proofs\n");

  // 1. Tạo token với confidential transfer extension
  console.log("1. Tạo token với confidential transfer extension...");
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)
    .addConfidentialTransfer(true); // autoApprove = true
  
  const { mint, transactionSignature, token } = await tokenBuilder.createToken(payer);
  console.log(`   Token created: ${mint.toString()}`);
  console.log(`   Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet\n`);
  
  // Khởi tạo ConfidentialTransferToken từ mint address
  const confidentialToken = new ConfidentialTransferToken(connection, mint);
  
  // 2. Tạo recipient keypair để demo transfer
  console.log("2. Tạo recipient account...");
  const recipient = Keypair.generate();
  console.log(`   Recipient public key: ${recipient.publicKey.toString()}`);
  
  // Fund recipient với một ít SOL để trả phí giao dịch
  const airdropSignature = await connection.requestAirdrop(
    recipient.publicKey,
    1 * 10 ** 9 // 1 SOL
  );
  await connection.confirmTransaction(airdropSignature);
  console.log(`   Airdrop 1 SOL to recipient: ${airdropSignature}\n`);
  
  // 3. Cấu hình token accounts cho confidential transfers
  console.log("3. Cấu hình token accounts cho confidential transfer...");
  
  // Cấu hình account cho payer (sender)
  let signature = await confidentialToken.configureAccount(
    payer,
    payer
  );
  console.log(`   Configured sender account: ${signature}`);
  
  // Cấu hình account cho recipient
  signature = await confidentialToken.configureAccount(
    payer,
    recipient
  );
  console.log(`   Configured recipient account: ${signature}\n`);
  
  // 4. Mint tokens và deposit vào confidential balance
  console.log("4. Mint tokens và deposit vào confidential balance...");
  const payerTokenAccount = await getAssociatedTokenAddress(
    mint,
    payer.publicKey,
    false
  );
  
  const mintAmount = BigInt(100_000_000_000); // 100 tokens (với 9 decimals)
  signature = await confidentialToken.mintToConfidential(
    payer,
    payer,
    payerTokenAccount,
    mintAmount
  );
  console.log(`   Minted ${Number(mintAmount) / 10**9} tokens và deposit vào confidential balance`);
  console.log(`   Transaction: ${signature}\n`);
  
  // 5. Thực hiện confidential transfer
  console.log("5. Thực hiện confidential transfer...");
  const recipientTokenAccount = await getAssociatedTokenAddress(
    mint,
    recipient.publicKey,
    false
  );
  
  const transferAmount = BigInt(25_000_000_000); // 25 tokens (với 9 decimals)
  try {
    signature = await confidentialToken.confidentialTransfer(
      payer,
      payerTokenAccount,
      recipientTokenAccount,
      payer,
      transferAmount
    );
    console.log(`   Đã chuyển ${Number(transferAmount) / 10**9} tokens từ sender đến recipient`);
    console.log(`   Mô phỏng transaction: ${signature}\n`);
  } catch (error) {
    console.log(`   Confidential transfer yêu cầu triển khai ZK Proofs đầy đủ`);
    console.log(`   Demo này chỉ mô phỏng luồng hoạt động của quy trình\n`);
  }
  
  console.log("===== Tóm tắt Confidential Transfer =====");
  console.log(`Mint address: ${mint.toString()}`);
  console.log(`Sender token account: ${payerTokenAccount.toString()}`);
  console.log(`Recipient token account: ${recipientTokenAccount.toString()}`);
  console.log("\nCác bước trong Confidential Transfer đầy đủ:");
  console.log("1. Khởi tạo mint với Confidential Transfer extension");
  console.log("2. Cấu hình token accounts với ElGamal keypairs");
  console.log("3. Mint token → public balance");
  console.log("4. Deposit token từ public balance → confidential pending balance");
  console.log("5. Apply pending balance → confidential available balance");
  console.log("6. Tạo ZK Proofs và thực hiện confidential transfer");
  console.log("7. Apply recipient pending balance → recipient available balance");
  console.log("8. Withdraw từ confidential balance → public balance (nếu cần)\n");
  
  console.log("Xem chi tiết tại: https://solana.com/docs/tokens/extensions/confidential-transfer");
}

main()
  .then(() => console.log("Demo completed successfully"))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  }); 