import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Signer,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  getMintLen,
  createTransferCheckedWithFeeInstruction,
  createWithdrawWithheldTokensFromMintInstruction,
  createHarvestWithheldTokensToMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount,
} from "@solana/spl-token";

async function main() {
  const connection = new Connection("https://api.mainet.solana.com", "confirmed");
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.WALLET_KEY || "[]"))
  );
  const mintKeypair = Keypair.generate();
  const mintLen = getMintLen([ExtensionType.TransferFeeConfig]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const feeBasisPoints = 100; // 1%
  const maxFee = BigInt(10_000_000_000);
  const transferFeeConfigAuthority = payer;
  const withdrawWithheldAuthority = payer;
  
  const createTokenTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mintKeypair.publicKey,
      transferFeeConfigAuthority.publicKey,
      withdrawWithheldAuthority.publicKey,
      feeBasisPoints,
      maxFee,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      9, 
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  await sendAndConfirmTransaction(connection, createTokenTx, [payer, mintKeypair]);
  
  // 4. Mint tokens to owner
  const ownerTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  const mintAmount = BigInt(1000_000_000_000);
  const mintTx = new Transaction();
  
  try {
    await getAccount(connection, ownerTokenAccount, "recent", TOKEN_2022_PROGRAM_ID);
  } catch (error) {
    mintTx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ownerTokenAccount,
        payer.publicKey,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }
  
  mintTx.add(
    createMintToInstruction(
      mintKeypair.publicKey,
      ownerTokenAccount,
      payer.publicKey,
      mintAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  await sendAndConfirmTransaction(connection, mintTx, [payer]);
  
  // 5. Transfer tokens with fee
  const recipient = Keypair.generate(); // In production, this would be the recipient's wallet address
  const recipientTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    recipient.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  const transferAmount = BigInt(100_000_000_000);
  const fee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10000);
  const finalFee = fee > maxFee ? maxFee : fee;
  
  const transferTx = new Transaction().add(
    createTransferCheckedWithFeeInstruction(
      ownerTokenAccount,
      mintKeypair.publicKey,
      recipientTokenAccount,
      payer.publicKey,
      transferAmount,
      9,
      finalFee,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  await sendAndConfirmTransaction(connection, transferTx, [payer]);
  
  // 6. Harvest fees from accounts
  const harvestTx = new Transaction().add(
    createHarvestWithheldTokensToMintInstruction(
      mintKeypair.publicKey,
      [recipientTokenAccount],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  await sendAndConfirmTransaction(connection, harvestTx, [withdrawWithheldAuthority]);
  
  // 7. Withdraw fees from mint
  const feeRecipientAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  const withdrawTx = new Transaction().add(
    createWithdrawWithheldTokensFromMintInstruction(
      mintKeypair.publicKey,
      feeRecipientAccount,
      withdrawWithheldAuthority.publicKey,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  await sendAndConfirmTransaction(connection, withdrawTx, [withdrawWithheldAuthority]);
  
  console.log("\n===== SUMMARY =====");
  console.log(`- Token Address: ${mintKeypair.publicKey.toString()}`);
  console.log(`- Owner Token Account: ${ownerTokenAccount.toString()}`);
  console.log(`- Recipient Token Account: ${recipientTokenAccount.toString()}`);
  console.log(`- View details on Solana Explorer (devnet):`);
  console.log(`  https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`);
}

main().catch(console.error); 