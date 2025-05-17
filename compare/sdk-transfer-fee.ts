import { Connection, Keypair } from "@solana/web3.js";
import { TransferFeeToken, getOrCreateTokenAccount } from "solana-token-extension-boost";
import * as fs from "fs";
async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // 1. Load wallet
  const walletPath = "/Users/tai/.config/solana/id.json";
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);

  // 2. Tạo token với phí chuyển token
  const token = await TransferFeeToken.create(
    connection,
    payer,
    {
      decimals: 9,
      mintAuthority: payer.publicKey,
      transferFeeConfig: {
        feeBasisPoints: 100, // 1%
        maxFee: BigInt(10_000_000_000),
        transferFeeConfigAuthority: payer,
        withdrawWithheldAuthority: payer,
      },
    }
  );
  // 3. Mint tokens cho chủ sở hữu
  const mintAmount = BigInt(1000_000_000_000);
  const ownerTokenAccount = await token.createAccountAndMintTo(
    payer.publicKey,
    payer,
    mintAmount,
    payer
  );
 
  // 4. Tạo người nhận
  const recipient = Keypair.generate();
  console.log("👥 Recipient:", recipient.publicKey.toString());

  // 5. Tạo tài khoản token cho người nhận sử dụng SDK 
  const recipientTokenAccount = await getOrCreateTokenAccount(
    connection,
    payer,
    token.getMint(),
    recipient.publicKey,
    false, 
    undefined, 
    undefined, 
    token.getProgramId() 
  );
  console.log("✅ Recipient token account:", recipientTokenAccount.address.toString());

  // 6. Chuyển tokens với phí
  const transferAmount = BigInt(100_000_000_000);
  const expectedFee = token.calculateFee(transferAmount);
  console.log("📊 Expected fee:", Number(expectedFee) / 1e9, "tokens");

  const transferSignature = await token.transfer(
    ownerTokenAccount,
    recipientTokenAccount.address,
    payer,
    transferAmount,
    9 
  );
  console.log("✅ Transfer completed:", transferSignature);

  // 7. Tìm tài khoản với phí đang giữ
  console.log("🔍 Finding accounts with withheld fees...");
  const accountsWithFees = await token.findAccountsWithWithheldFees();
  console.log(`Found ${accountsWithFees.length} accounts with withheld fees`);

  if (accountsWithFees.length > 0) {
    // 8. Thu thập phí từ các tài khoản
    console.log("🌾 Harvesting fees...");
    const harvestSignature = await token.harvestWithheldTokensToMint(
      accountsWithFees
    );
    console.log("✅ Fees harvested:", harvestSignature);

    // 9. Tạo tài khoản người nhận phí
    const feeRecipientAccount = await getOrCreateTokenAccount(
      connection,
      payer,
      token.getMint(),
      payer.publicKey,
      false, // allowOwnerOffCurve
      undefined, // commitment
      undefined, // confirmOptions
      token.getProgramId() // programId
    );

    // 10. Rút phí từ mint
    console.log("💵 Withdrawing fees...");
    try {
      const withdrawSignature = await token.withdrawFeesFromMint(
        feeRecipientAccount.address
      );
      console.log("✅ Fees withdrawn:", withdrawSignature);
    } catch (error: any) {
      console.log("❌ Error withdrawing fees:", error.message);
      console.log("This error may occur if there are no fees to collect. Try transferring more tokens to generate fees.");
    }
  } else {
    console.log("No fees to harvest or withdraw");
  }
}
main().catch(console.error); 