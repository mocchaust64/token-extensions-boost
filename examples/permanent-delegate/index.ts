import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { PermanentDelegateToken } from "solana-token-extension-boost";
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

  console.log("\nStep 1: Creating a new token with permanent delegate");
  
  // Tạo một delegate (thường là một quyền hành chính hoặc entity quản lý)
  const delegateKeypair = payer; // Trong ví dụ này, sử dụng payer làm delegate
  const delegatePublicKey = delegateKeypair.publicKey;
  console.log(`Permanent delegate: ${delegatePublicKey.toString()}`);
  
  // Tạo token mới với permanent delegate
  const token = await PermanentDelegateToken.create(
    connection,
    payer,
    {
      decimals: 9,
      mintAuthority: payer.publicKey,
      permanentDelegate: delegatePublicKey
    }
  );
  
  const mintAddress = token.getMint();
  console.log(`Token created with mint: ${mintAddress.toString()}`);

  console.log("\nStep 2: Creating token accounts for users");
  
  // Tạo token account cho payer/admin
  const adminTokenAccount = await token.createTokenAccount(payer, payer.publicKey);
  console.log(`Admin token account: ${adminTokenAccount.toString()}`);
  
  // Tạo user mới và token account cho họ
  const user = Keypair.generate();
  console.log(`User: ${user.publicKey.toString()}`);
  
  const userTokenAccount = await token.createTokenAccount(payer, user.publicKey);
  console.log(`User token account: ${userTokenAccount.toString()}`);

  console.log("\nStep 3: Minting tokens to user");
  
  // Ví dụ mint một số token vào tài khoản của user
  // (Thông thường bạn sẽ sử dụng hàm mintTo từ @solana/spl-token)
  console.log("Minting 100 tokens to user account...");
  console.log("This requires a separate call to mintTo which is not implemented in this example.");
  
  console.log("\nStep 4: Transferring tokens as permanent delegate");
  console.log("(Note: In a real scenario, tokens would already be minted to the user account)");
  console.log("Since the permanent delegate has authority over all accounts, they can transfer tokens from any account");
  
  const amount = BigInt(50_000_000_000); // 50 tokens with 9 decimals
  
  try {
    const transferSignature = await token.transferAsDelegate(
      delegateKeypair, 
      userTokenAccount, 
      adminTokenAccount, 
      amount
    );
    
    console.log(`Transferred ${Number(amount) / 10**9} tokens from user to admin as delegate`);
    console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  } catch (error: any) {
    console.error("Transfer failed:", error.message);
    console.error("This may be due to no tokens being in the user account.");
  }
  
  console.log("\nStep 5: Checking permanent delegate");
  
  const isPermanentDelegate = await token.isPermanentDelegate(delegatePublicKey);
  console.log(`Address ${delegatePublicKey.toString()} is permanent delegate: ${isPermanentDelegate}`);
  
  const permanentDelegate = await token.getPermanentDelegate();
  console.log(`Token's permanent delegate is: ${permanentDelegate?.toString() || 'None'}`);
  
  console.log("\nStep 6: Creating or getting token account in one step");
  
  const secondUser = Keypair.generate();
  console.log(`Second user: ${secondUser.publicKey.toString()}`);
  
  const { address, signature: getSignature } = await token.createOrGetTokenAccount(
    payer,
    secondUser.publicKey
  );
  
  console.log(`Created or got token account: ${address.toString()}`);
  if (getSignature) {
    console.log(`Transaction: https://explorer.solana.com/tx/${getSignature}?cluster=devnet`);
  } else {
    console.log("Account already existed, no transaction needed");
  }

  console.log("\n===== SUMMARY =====");
  console.log(`- Token Mint: ${mintAddress.toString()}`);
  console.log(`- Permanent Delegate: ${delegatePublicKey.toString()}`);
  console.log(`- Admin Token Account: ${adminTokenAccount.toString()}`);
  console.log(`- User Token Account: ${userTokenAccount.toString()}`);
  console.log(`- Second User Token Account: ${address.toString()}`);
  console.log(`- View details on Solana Explorer (devnet):`);
  console.log(`  https://explorer.solana.com/address/${mintAddress.toString()}?cluster=devnet`);
}

main()
  .then(() => console.log("Success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 