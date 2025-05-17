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
    createInitializePermanentDelegateInstruction,
    createInitializeMintInstruction,
    getMintLen,
    createAccount,
    mintTo,
    transferChecked,
    burnChecked,
    getMinimumBalanceForRentExemptAccount,
  } from "@solana/spl-token";

  import * as fs from "fs";

  async  function main() {

    const walletPath = "/Users/tai/.config/solana/id.json";
    const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8"});
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const payer =  Keypair.fromSecretKey(secretKey);
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    let transactionSignature: string;


    const permanentDelegate = payer.publicKey;
    const mintKeypair  = Keypair.generate();
    const mint = mintKeypair.publicKey;
    const decimals = 9;
    const mintAuthoriy =payer.publicKey;
    const mintlen = getMintLen([ExtensionType.PermanentDelegate]);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintlen);


    const createAccontIntruction  = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint,
        space: mintlen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,

    })

    const initializePermanentDelegateInstruction = createInitializePermanentDelegateInstruction(
        mint,
        permanentDelegate,
        TOKEN_2022_PROGRAM_ID,
    )

    const initializeMintInstruction = createInitializeMintInstruction(
        mint,
        decimals,
        mintAuthoriy,
        null,
        TOKEN_2022_PROGRAM_ID
    );


const transaction = new Transaction().add(
    createAccontIntruction,
    initializePermanentDelegateInstruction,
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


  const ramdomKeypair = Keypair.generate();
   const sourceTokenAccount = await createAccount (
    connection,
    payer,
    mint,
    ramdomKeypair.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID

   );

   const destinantionTokenAccount = await createAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
   )

    transactionSignature = await mintTo(
        connection,
        payer,
        mint,
        sourceTokenAccount,
        mintAuthoriy,
        10000000000000000,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
    )

    console.log(
        "\nMint Token to Source Token Account:",
        `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
      );


      transactionSignature = await transferChecked(
        connection,
        payer,
        sourceTokenAccount,
        mint,
        destinantionTokenAccount,
        permanentDelegate,
        10000,
        9,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      )
        console.log(
            "\nTransfer Token to Destination Token Account:",
            `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
        );


    transactionSignature = await burnChecked(
        connection,
        payer,
        sourceTokenAccount,
        mint,
        permanentDelegate,
        1000,
        9,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
    )
    console.log(
        "\nBurn Token from Source Token Account:",
        `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,)

  }



  main()
    .then(() => {
      console.log("Success");
    }
    )
    .catch((error) => {
        console.error(error);
        process.exit(1);
        }   
    )
  
  