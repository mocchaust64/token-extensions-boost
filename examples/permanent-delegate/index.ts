import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { PermanentDelegateToken,TokenBuilder } from "solana-token-extension-boost";

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
    
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      2 * 10 ** 9
    );
    await connection.confirmTransaction(airdropSignature);
  }

  // Step 1: Create a new token with permanent delegate
  const delegateKeypair = payer;
  const delegatePublicKey = delegateKeypair.publicKey;
  
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey)
    .addPermanentDelegate(delegatePublicKey);
  
  const { mint, token } = await tokenBuilder.createToken(payer);
  
  console.log(`Token created successfully with mint: ${mint.toString()}`);
  
  const permaDelegateToken = new PermanentDelegateToken(connection, mint, delegatePublicKey);

  // Step 2: Create token accounts
  const adminTokenAccount = await permaDelegateToken.createTokenAccount(payer, payer.publicKey);
  
  const user = Keypair.generate();
  const userTokenAccount = await permaDelegateToken.createTokenAccount(payer, user.publicKey);

  // Step 3: Transfer tokens as permanent delegate
  const amount = BigInt(50_000_000_000);
  
  try {
    const transferSignature = await permaDelegateToken.transferAsDelegate(
      delegateKeypair, 
      userTokenAccount, 
      adminTokenAccount, 
      amount
    );
    
    console.log(`Transferred ${Number(amount) / 10**9} tokens from user to admin as delegate`);
    console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  } catch (error: any) {
    // Transfer might fail if there are no tokens in the user account
  }
  
  // Step 4: Check permanent delegate status
  try {
    const isPermanentDelegate = await permaDelegateToken.isPermanentDelegate(delegatePublicKey);
    const permanentDelegate = await permaDelegateToken.getPermanentDelegate();
  } catch (error: any) {
    // Handle error silently
  }
  
  // Step 5: Create or get token account in one step
  const secondUser = Keypair.generate();
  
  const { address, signature: getSignature } = await permaDelegateToken.createOrGetTokenAccount(
    payer,
    secondUser.publicKey
  );
  
  console.log(`Summary:`);
  console.log(`- Token Mint: ${mint.toString()}`);
  console.log(`- Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
}

main()
  .then(() => console.log("Success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 