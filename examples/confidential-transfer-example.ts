import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { ConfidentialTransferToken } from "../src/extensions/confidential-transfer";
import * as fs from "fs";
import * as path from "path";
import { getAssociatedTokenAddress } from "@solana/spl-token";

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

  console.log("\nStep 1: Creating a token with confidential transfer extension");
  
  const token = await ConfidentialTransferToken.create(
    connection,
    payer,
    {
      decimals: 9,
      mintAuthority: payer.publicKey,
      autoEnable: true
    }
  );
  
  const mintAddress = token.getMint();
  console.log(`Created token with mint: ${mintAddress.toString()}`);
  
  console.log("\nStep 2: Creating recipient keypair");
  const recipient = Keypair.generate();
  console.log(`Recipient: ${recipient.publicKey.toString()}`);
  
  console.log("Airdropping SOL to recipient...");
  const airdropSignature = await connection.requestAirdrop(
    recipient.publicKey,
    1 * 10 ** 9
  );
  await connection.confirmTransaction(airdropSignature);
  
  console.log("\nStep 3: Configuring accounts for confidential transfers");
  
  let signature = await token.configureAccount(
    payer,
    payer
  );
  console.log(`Configured payer account for confidential transfers`);
  console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  
  signature = await token.configureAccount(
    payer,
    recipient
  );
  console.log(`Configured recipient account for confidential transfers`);
  console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  
  console.log("\nStep 4: Minting tokens with confidential amount");
  
  const payerTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    payer.publicKey,
    false
  );
  
  const mintAmount = BigInt(100_000_000_000);
  signature = await token.mintToConfidential(
    payer,
    payer,
    payerTokenAccount,
    mintAmount
  );
  console.log(`Minted ${Number(mintAmount) / 10**9} tokens to payer`);
  console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  
  console.log("\nStep 5: Performing confidential transfer");
  
  const recipientTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    recipient.publicKey,
    false
  );
  
  const transferAmount = BigInt(10_000_000_000);
  signature = await token.confidentialTransfer(
    payer,
    payerTokenAccount,
    recipientTokenAccount,
    payer,
    transferAmount
  );
  console.log(`Transferred ${Number(transferAmount) / 10**9} tokens with confidential amount`);
  console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  
  console.log("\n===== SUMMARY =====");
  console.log(`- Token Address: ${mintAddress.toString()}`);
  console.log(`- Payer Token Account: ${payerTokenAccount.toString()}`);
  console.log(`- Recipient Token Account: ${recipientTokenAccount.toString()}`);
  console.log(`- View details on Solana Explorer (devnet):`);
  console.log(`  https://explorer.solana.com/address/${mintAddress.toString()}?cluster=devnet`);
}

main()
  .then(() => console.log("Success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 