import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { TokenBuilder } from "solana-token-extension-boost";
import { ConfidentialTransferToken } from "solana-token-extension-boost";

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const walletPath = path.join(process.env.HOME! , ".config","solana", "id.json");
  const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8"});
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  

  // Step 1: Create token with confidential transfer extension
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)
    .addConfidentialTransfer(true); // autoEnable = true
  
  const { mint, token } = await tokenBuilder.createToken(payer);
  const confidentialToken = new ConfidentialTransferToken(connection, mint);
  
  console.log(`Token created with mint: ${mint.toString()}`);
  
  // Step 2: Create recipient keypair
  const recipient = Keypair.generate();
  
  const airdropSignature = await connection.requestAirdrop(
    recipient.publicKey,
    1 * 10 ** 9
  );
  await connection.confirmTransaction(airdropSignature);
  
  // Step 3: Configure accounts for confidential transfer
  let signature = await confidentialToken.configureAccount(
    payer,
    payer
  );
  console.log(`Configured payer account for confidential transfers`);
  
  signature = await confidentialToken.configureAccount(
    payer,
    recipient
  );
  console.log(`Configured recipient account for confidential transfers`);
  
  // Step 4: Mint tokens with confidential amount
  const payerTokenAccount = await getAssociatedTokenAddress(
    mint,
    payer.publicKey,
    false
  );
  
  const mintAmount = BigInt(100_000_000_000);
  signature = await confidentialToken.mintToConfidential(
    payer,
    payer,
    payerTokenAccount,
    mintAmount
  );
  console.log(`Minted ${Number(mintAmount) / 10**9} tokens to payer (confidential)`);
  
  // Step 5: Perform confidential transfer
  const recipientTokenAccount = await getAssociatedTokenAddress(
    mint,
    recipient.publicKey,
    false
  );
  
  const transferAmount = BigInt(10_000_000_000);
  signature = await confidentialToken.confidentialTransfer(
    payer,
    payerTokenAccount,
    recipientTokenAccount,
    payer,
    transferAmount
  );
  console.log(`Transferred ${Number(transferAmount) / 10**9} tokens confidentially`);
  console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  
  console.log(`Token details: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
}

main()
  .then(() => console.log("Success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 