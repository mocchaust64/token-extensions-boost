import {
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
    clusterApiUrl,
    sendAndConfirmTransaction,
  } from "@solana/web3.js";
  import {
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createInitializeMintInstruction,
    createInitializeNonTransferableMintInstruction,
    getMintLen,
    mintTo,
    createAccount,
    transfer,
    burn,
    closeAccount,
  } from "@solana/spl-token";

import * as fs from "fs";
async function main (){
    const walletPath = "/Users/tai/.config/solana/id.json";
    const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8"});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));


    const payer = Keypair.fromSecretKey(secretKey);
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    let transactionSignature: string;
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    const decimals = 0;
    const mintAuthority  = payer.publicKey;
    const mintlen  = getMintLen([ExtensionType.NonTransferable]);
    const lampoorts  = await connection.getMinimumBalanceForRentExemption(mintlen);


    const createAccountIntruction =  SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint,
        space: mintlen,
        lamports: lampoorts,
        programId:  TOKEN_2022_PROGRAM_ID
    })

    const initializeNonTransferableMintInstruction = createInitializeNonTransferableMintInstruction(
        mint,
        TOKEN_2022_PROGRAM_ID
    )

    const initializeMintInstruction = createInitializeMintInstruction(
        mint,
        decimals,
        mintAuthority,
        null,
        TOKEN_2022_PROGRAM_ID
    )

    const transaction = new Transaction().add(
        createAccountIntruction,
        initializeNonTransferableMintInstruction,
        initializeMintInstruction
        
    )

    transactionSignature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mintKeypair]
    )
    console.log(
        "\nCreate Mint Account:",
        `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
      );



    
      const sourceTokenAccount = await createAccount(
        connection,
        payer,
        mint,
        payer.publicKey,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      )

      const ramdomKeypair = new Keypair();

      const destinationTokenAccount = await createAccount(
        connection,
        payer,
        mint,
        ramdomKeypair.publicKey,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      )
try{
    transactionSignature = await mintTo(
        connection,
        payer,
        mint,
        sourceTokenAccount,
        mintAuthority,
        100000000000,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      )

    console.log(
        "\nMint Tokens:",
        `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
      );
} catch (error) {
    console.log("\nExpect Error:", error);
}

 transactionSignature = await burn(
    connection,
    payer,
    sourceTokenAccount,
    mint,
    payer.publicKey,
    1,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
 );
 console.log(
    "\n burn Tokens:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
  );
      

  //  test transfer token 

  try {
    transactionSignature = await transfer (
        connection,
        payer,
        sourceTokenAccount,
        destinationTokenAccount,
        payer.publicKey,
        100,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
    )
  } catch (error) {
    console.log("\nExpect Error:", error);
  }


// test burn 
  transactionSignature = await burn(
    connection,
    payer,
    destinationTokenAccount,
    mint,
    payer.publicKey,
    100,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  )
    console.log(
        "\nBurn Tokens:",
        `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
    );

 transactionSignature = await closeAccount(
    connection,
    payer,
    sourceTokenAccount,
    payer.publicKey,
    payer.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
    
 )

    console.log(
        "\nClose Token Account:",
        `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
    );

      





}
main()
  .then(() => console.log("✅ Done"))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }
  );
  

  