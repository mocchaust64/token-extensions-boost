import {
    Connection,
    Keypair,
    Transaction,
    clusterApiUrl,
    sendAndConfirmTransaction,
  } from "@solana/web3.js";
  import {
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createAccount,
    createReallocateInstruction,
    createEnableRequiredMemoTransfersInstruction,
    createMint,
  } from "@solana/spl-token";

import * as fs from "fs";

async function main(){

    const walletPath = "/Users/tai/.config/solana/id.json";
    const secrecrtKeyString = fs.readFileSync(walletPath, { encoding: "utf8"});
    const secrecrt = Uint8Array.from(JSON.parse(secrecrtKeyString));
    const payer = Keypair.fromSecretKey(secrecrt);
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    let transactionSignature: string;
    const mintAuthority = payer.publicKey;
    const decimals = 9 ;


    const mint = await createMint(
        connection,
        payer, 
        mintAuthority,
        null,
        decimals,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
    );

    const tokenAccount = await createAccount (
        connection,
        payer,
        mint,
        mintAuthority,
        undefined, // no programId specified, using default SPL Token program
        undefined,
        TOKEN_2022_PROGRAM_ID
    )
    console.log("✅ Token account created:", tokenAccount.toString());

const extension = [ExtensionType.MemoTransfer]; 

const reallocateInstruction = createReallocateInstruction(

    tokenAccount,
    payer.publicKey,
    extension,
    payer.publicKey,
    undefined,
    TOKEN_2022_PROGRAM_ID
)

const enableRequiredMemoTransfersIntruction = createEnableRequiredMemoTransfersInstruction(
    tokenAccount,
    payer.publicKey,
    undefined,
    TOKEN_2022_PROGRAM_ID
)


const transaction = new Transaction().add(
    reallocateInstruction,
    enableRequiredMemoTransfersIntruction
)

transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
)
console.log(
    "\nReallocate Mint Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
);




}
main()
  .then(() => console.log("✅ Transaction completed successfully"))
  .catch((error) => {
    console.error("❌ Transaction failed:", error);
    process.exit(1);
  });
  
 