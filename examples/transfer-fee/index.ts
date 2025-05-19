import { Connection, Keypair } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import { TokenBuilder } from "../../src/utils/token-builder";
import { TransferFeeToken } from "../../src/extensions/transfer-fee";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  let payer: Keypair;
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  
  try {
    const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    payer = Keypair.fromSecretKey(secretKey);
  } catch (error) {
    payer = Keypair.generate();
  }
  
  const balance = await connection.getBalance(payer.publicKey);
  
  if (balance < 1e9) {
    console.log("Need at least 1 SOL to run this example");
    console.log("Use: solana airdrop 1 <wallet address> --url devnet");
    return;
  }
  
  // 1. Create token with 1% transfer fee
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey, payer.publicKey)
    .addTransferFee(
      100, // 1% (100 basis points)
      BigInt(10_000_000_000), // 10 tokens max fee
      payer.publicKey, // transferFeeConfigAuthority
      payer.publicKey  // withdrawWithheldAuthority
    );
  
  const { mint, token } = await tokenBuilder.createToken(payer);
  
  console.log(`Token created: ${mint.toString()}`);
  
  const transferFeeToken = new TransferFeeToken(connection, mint, {
    feeBasisPoints: 100,
    maxFee: BigInt(10_000_000_000),
    transferFeeConfigAuthority: payer.publicKey,
    withdrawWithheldAuthority: payer.publicKey
  });
  
  // 2. Mint tokens to owner
  const mintAmount = BigInt(1000_000_000_000);
  const ownerTokenAccount = await transferFeeToken.createAccountAndMintTo(
    payer.publicKey,
    payer,
    mintAmount,
    payer
  );
  
  console.log(`Minted ${Number(mintAmount) / 1e9} tokens to ${ownerTokenAccount.toString()}`);
  
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
  
  // 3. Transfer tokens with 1% fee
  const transferAmount = BigInt(100_000_000_000);
  
  const expectedFee = transferFeeToken.calculateFee(transferAmount);
  
  const transferSignature = await transferFeeToken.transfer(
    ownerTokenAccount,
    recipientTokenAccount.address,
    payer,
    transferAmount,
    9
  );
  
  console.log(`Transferred ${Number(transferAmount) / 1e9} tokens with ${Number(expectedFee) / 1e9} fee`);
  console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  
  try {
    // 4. Harvest fees from accounts to mint
    const harvestSignature = await transferFeeToken.harvestWithheldTokensToMint(
      [recipientTokenAccount.address]
    );
    
    console.log(`Harvested fees to mint`);
    
    // 5. Withdraw fees from mint to wallet
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
    
    const withdrawSignature = await transferFeeToken.withdrawFeesFromMint(
      feeRecipientTokenAccount.address
    );
    
    console.log(`Withdrew fees to ${feeRecipientTokenAccount.address.toString()}`);
  } catch (error: any) {
    // Fee handling error may occur if there are no fees to collect
  }
  
  console.log(`Token details: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
}

main()
  .then(() => console.log("Success"))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  }); 