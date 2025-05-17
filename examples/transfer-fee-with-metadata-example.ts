import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { TransferFeeToken,MetadataPointerToken } from "solana-token-extension-boost";

import * as fs from "fs";
import * as path from "path";
import { 
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  getMintLen,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeMetadataPointerInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedWithFeeInstruction,
  createHarvestWithheldTokensToMintInstruction,
  createWithdrawWithheldTokensFromMintInstruction
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata
} from "@solana/spl-token-metadata";

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

  console.log("\nStep 1: Creating token with both transfer fee and metadata");
  
  const metadata = {
    name: "Transfer Fee Token with Metadata",
    symbol: "TFMD",
    uri: "https://example.com/metadata/transfer-fee-token.json",
    additionalMetadata: {
      "description": "A token with both transfer fee and metadata features",
      "creator": payer.publicKey.toString(),
      "website": "https://example.com" 
    }
  };
  
  const feeBasisPoints = 100;
  const maxFee = BigInt(1_000_000_000);
  const decimals = 9;
  
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  
  const transferFeeConfigAuthority = payer;
  const withdrawWithheldAuthority = payer;
  
  const tokenMetadata: TokenMetadata = {
    mint: mintKeypair.publicKey,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(
      ([key, value]) => [key, value]
    ),
  };

  const mintLen = getMintLen([ExtensionType.TransferFeeConfig, ExtensionType.MetadataPointer]);
  const metadataLen = pack(tokenMetadata).length + 4;
  const lamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen
  );

  const transaction = new Transaction().add(
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
    
    createInitializeMetadataPointerInstruction(
      mintKeypair.publicKey,
      payer.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    ),
    
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    ),
    
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mintKeypair.publicKey,
      updateAuthority: payer.publicKey,
      mint: mintKeypair.publicKey,
      mintAuthority: payer.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
    })
  );
  
  for (const [key, value] of Object.entries(metadata.additionalMetadata || {})) {
    transaction.add(
      createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mintKeypair.publicKey,
        updateAuthority: payer.publicKey,
        field: key,
        value: value,
      })
    );
  }
  
  await sendAndConfirmTransaction(connection, transaction, [
    payer,
    mintKeypair,
  ]);
  
  console.log(`Created token with mint: ${mintKeypair.publicKey.toString()}`);
  
  const metadataToken = new MetadataPointerToken(connection, mintKeypair.publicKey, metadata);
  const transferFeeToken = new TransferFeeToken(connection, mintKeypair.publicKey, {
    feeBasisPoints,
    maxFee,
    transferFeeConfigAuthority,
    withdrawWithheldAuthority
  });
  
  console.log("\nStep 2: Displaying token metadata");
  const tokenMetadataInfo = await metadataToken.getTokenMetadata();
  console.log(JSON.stringify(tokenMetadataInfo, null, 2));
  
  console.log("\nStep 3: Minting tokens to owner");
  const mintAmount = BigInt(100_000_000_000);
  
  const ownerTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  const mintTransaction = new Transaction();
  
  try {
    const account = await connection.getAccountInfo(ownerTokenAccount);
    if (!account) {
      mintTransaction.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          ownerTokenAccount,
          payer.publicKey,
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }
  } catch (error) {
    mintTransaction.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ownerTokenAccount,
        payer.publicKey,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }
  
  mintTransaction.add(
    createMintToInstruction(
      mintKeypair.publicKey,
      ownerTokenAccount,
      payer.publicKey,
      mintAmount,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [payer]
  );
  
  console.log(`Minted ${Number(mintAmount) / 10**9} tokens to ${ownerTokenAccount.toString()}`);
  
  console.log("\nStep 4: Creating recipient and transferring tokens with fee");
  const recipient = Keypair.generate();
  console.log(`Recipient: ${recipient.publicKey.toString()}`);
  
  const recipientTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    recipient.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  const transferTransaction = new Transaction();
  
  transferTransaction.add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      recipientTokenAccount,
      recipient.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  const transferAmount = BigInt(10_000_000_000);
  const expectedFee = transferAmount * BigInt(feeBasisPoints) / BigInt(10000);
  console.log(`Expected fee: ${Number(expectedFee) / 10**9} tokens`);
  
  transferTransaction.add(
    createTransferCheckedWithFeeInstruction(
      ownerTokenAccount,
      mintKeypair.publicKey,
      recipientTokenAccount,
      payer.publicKey,
      transferAmount,
      decimals,
      expectedFee,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  const transferSignature = await sendAndConfirmTransaction(
    connection,
    transferTransaction,
    [payer]
  );
  
  console.log(`Transferred ${Number(transferAmount) / 10**9} tokens to ${recipientTokenAccount.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${transferSignature}?cluster=devnet`);
  
  console.log("\nStep 5: Harvesting fees from accounts to mint");
  
  const harvestTransaction = new Transaction().add(
    createHarvestWithheldTokensToMintInstruction(
      mintKeypair.publicKey,
      [recipientTokenAccount],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  const harvestSignature = await sendAndConfirmTransaction(
    connection,
    harvestTransaction,
    [payer]
  );
  
  console.log(`Fees harvested to mint`);
  console.log(`Transaction: https://explorer.solana.com/tx/${harvestSignature}?cluster=devnet`);
  
  console.log("\nStep 6: Withdrawing fees from mint to wallet");
  
  const withdrawTransaction = new Transaction().add(
    createWithdrawWithheldTokensFromMintInstruction(
      mintKeypair.publicKey,
      ownerTokenAccount,
      payer.publicKey,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );
  
  const withdrawSignature = await sendAndConfirmTransaction(
    connection,
    withdrawTransaction,
    [payer]
  );
  
  console.log(`Fees withdrawn to ${ownerTokenAccount.toString()}`);
  console.log(`Transaction: https://explorer.solana.com/tx/${withdrawSignature}?cluster=devnet`);
  
  console.log("\nStep 7: Updating token metadata");
  
  const updateSignature = await metadataToken.updateMetadataField(
    payer,
    "description",
    "Updated description for token with transfer fee and metadata features"
  );
  
  console.log(`Metadata updated!`);
  console.log(`Transaction: https://explorer.solana.com/tx/${updateSignature}?cluster=devnet`);
  
  console.log("Updated metadata:");
  const updatedMetadata = await metadataToken.getTokenMetadata();
  console.log(updatedMetadata);
  
  console.log("\n===== SUMMARY =====");
  console.log(`- Token Address: ${mintKeypair.publicKey.toString()}`);
  console.log(`- Owner Token Account: ${ownerTokenAccount.toString()}`);
  console.log(`- Recipient Token Account: ${recipientTokenAccount.toString()}`);
  console.log(`- View details on Solana Explorer (devnet):`);
  console.log(`  https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`);
}

main()
  .then(() => console.log("Success"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 