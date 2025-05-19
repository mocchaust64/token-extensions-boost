import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  getMint,
} from "@solana/spl-token";

import * as fs from 'fs';
import * as path from 'path';
import { TokenBuilder } from "../../src/utils/token-builder";


async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  let payer: Keypair;
  const walletPath = path.join(process.env.HOME!, ".config", "solana", "id.json");
  
  try {
    const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    payer = Keypair.fromSecretKey(secretKey);
  } catch (error) {
    payer = Keypair.generate();
    
    const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSignature, 'confirmed');
  }
  
  const balance = await connection.getBalance(payer.publicKey);
  
  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    const airdropSignature = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSignature, 'confirmed');
  }

  // Create parameters for extensions
  
  // 1. Transfer Fee parameters
  const transferFeeParams = {
    feeBasisPoints: 100, // 1% (100 basis points)
    maxFee: BigInt(1000000), // max fee is 1 token (with 6 decimals)
    transferFeeConfigAuthority: payer.publicKey,
    withdrawWithheldAuthority: payer.publicKey
  };
  
  // 2. Interest bearing parameters
  const interestRate = 500; // 5% annual interest rate (500 basis points)
  const rateAuthority = payer.publicKey;
  
  // 3. Delegate keypair
  const delegateKeypair = Keypair.generate();
  
  // Create TokenBuilder and configure extensions
  const tokenBuilder = new TokenBuilder(connection)
    // Basic information
    .setTokenInfo(6, payer.publicKey) // 6 decimals
    
    // Extension 1: TransferFee
    .addTransferFee(
      transferFeeParams.feeBasisPoints,
      transferFeeParams.maxFee,
      transferFeeParams.transferFeeConfigAuthority,
      transferFeeParams.withdrawWithheldAuthority
    )
    
    // Extension 2: InterestBearing
    .addInterestBearing(interestRate, rateAuthority)
    
    // Extension 3: PermanentDelegate
    .addPermanentDelegate(delegateKeypair.publicKey);

  // Create token with configured extensions
  const { mint, transactionSignature, token } = await tokenBuilder.createToken(payer);
  
  console.log(`Token created successfully!`);
  console.log(`Mint address: ${mint.toString()}`);
  console.log(`Solana Explorer: https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
  
  // Verify the token has the expected extensions
  try {
    const mintInfo = await getMint(
      connection,
      mint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log(`Token created with ${mintInfo.tlvData.length} bytes of extension data`);
  } catch (error) {
    // Handle error silently
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 