import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TransferFeeToken } from "../../src/extensions/transfer-fee";
import * as fs from "fs";
import * as path from "path";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

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
    console.log("Wallet not found, creating new one...");
    payer = Keypair.generate();
    console.log(`Created new wallet: ${payer.publicKey.toString()}`);
  }
  
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);
  
  if (balance < 1e9) {
    console.log("At least 1 SOL is required to run this example");
    console.log("Use command: solana airdrop 1 <wallet address> --url devnet");
    return;
  }
  
  const mintAuthority = payer;
  const transferFeeConfigAuthority = payer;
  const withdrawWithheldAuthority = payer;
  
  console.log("\n1. Creating token with 1% transfer fee");
  
  const token = await TransferFeeToken.create(
    connection,
    payer,
    {
      decimals: 9,
      mintAuthority: payer.publicKey,
      transferFeeConfig: {
        feeBasisPoints: 100,
        maxFee: BigInt(10_000_000_000),
        transferFeeConfigAuthority,
        withdrawWithheldAuthority,
      },
    }
  );

  const mintAddress = token.getMint();
  console.log(`Token created: ${mintAddress.toString()}`);
  
  console.log("\n2. Minting tokens to owner");
  
  const mintAmount = BigInt(1000_000_000_000);
  const ownerTokenAccount = await token.createAccountAndMintTo(
    payer.publicKey,
    payer,
    mintAmount,
    payer
  );
  
  console.log(`Minted ${Number(mintAmount) / 1e9} tokens to ${ownerTokenAccount.toString()}`);
  
  const recipients = [
    Keypair.generate(),
    Keypair.generate(),
    Keypair.generate()
  ];
  
  const recipientAccounts: { address: PublicKey }[] = [];
  for (const recipient of recipients) {
    console.log(`\nRecipient: ${recipient.publicKey.toString()}`);
    
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mintAddress,
      recipient.publicKey,
      false,
      "confirmed",
      { skipPreflight: true },
      token.getProgramId()
    );
    
    recipientAccounts.push(recipientTokenAccount);
    console.log(`Recipient token account: ${recipientTokenAccount.address.toString()}`);
  }
  
  console.log("\n3. Transferring tokens with 1% fee to multiple recipients");
  
  const transferredAccounts: PublicKey[] = [];
  
  for (let i = 0; i < recipientAccounts.length; i++) {
    const transferAmount = BigInt((100_000_000_000 * (i + 1)));
    
    const expectedFee = token.calculateFee(transferAmount);
    console.log(`Transfer ${i+1}: ${Number(transferAmount) / 1e9} tokens with fee: ${Number(expectedFee) / 1e9} tokens`);
    
    try {
      const transferSignature = await token.transfer(
        ownerTokenAccount,
        recipientAccounts[i].address,
        payer,
        transferAmount,
        9
      );
      
      console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
      transferredAccounts.push(recipientAccounts[i].address);
    } catch (error: any) {
      console.error(`Transfer failed: ${error.message}`);
    }
  }
  
  console.log("\n4. Finding accounts with withheld fees");
  
  try {
    const accountsWithFees = await token.findAccountsWithWithheldFees();
    
    console.log(`Found ${accountsWithFees.length} accounts with withheld fees:`);
    for (const account of accountsWithFees) {
      console.log(`- ${account.toString()}`);
    }
    
    if (accountsWithFees.length > 0) {
      console.log("\n5. Harvesting fees from accounts to mint");
      
      const harvestSignature = await token.harvestWithheldTokensToMint(
        accountsWithFees
      );
      
      console.log(`Fees harvested to mint`);
      console.log(`Transaction: https://explorer.solana.com/tx/${harvestSignature}?cluster=devnet`);
      
      console.log("\n6. Withdrawing fees from mint");
      
      const feeRecipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        payer.publicKey,
        false,
        "confirmed",
        { skipPreflight: true },
        token.getProgramId()
      );
      
      const withdrawSignature = await token.withdrawFeesFromMint(
        feeRecipientTokenAccount.address
      );
      
      console.log(`Fees withdrawn to ${feeRecipientTokenAccount.address.toString()}`);
      console.log(`Transaction: https://explorer.solana.com/tx/${withdrawSignature}?cluster=devnet`);
    }
  } catch (error: any) {
    console.error(`Failed to process fees: ${error.message}`);
  }
  
  console.log("\n===== SUMMARY =====");
  console.log(`- Token Address: ${mintAddress.toString()}`);
  console.log(`- Owner Token Account: ${ownerTokenAccount.toString()}`);
  console.log(`- View details on Solana Explorer (devnet):`);
  console.log(`  https://explorer.solana.com/address/${mintAddress.toString()}?cluster=devnet`);
  
  const finalBalance = await connection.getBalance(payer.publicKey);
  console.log(`\nFinal balance: ${finalBalance / 1e9} SOL (used ${(balance - finalBalance) / 1e9} SOL)`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  });