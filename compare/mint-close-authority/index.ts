
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
    closeAccount,
    createInitializeMintCloseAuthorityInstruction,
    createInitializeMintInstruction,
    getMintLen,
  } from "@solana/spl-token";

  import * as fs from "fs";

  async function main() {



  const walletPath = "/Users/tai/.config/solana/id.json";
  const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
  const  secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  let transactionSignature: string;

  const mintKeypair  = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const decimals = 9;
  const mintAuthority = payer.publicKey;
  const closeAuthority = payer.publicKey;

  const mintlen = getMintLen([ExtensionType.MintCloseAuthority]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintlen); 

  const createAccountIntruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint,
    space: mintlen,
    lamports: lamports,
    programId: TOKEN_2022_PROGRAM_ID
  })

  const initializeMintCloseAuthorityInstruction = createInitializeMintCloseAuthorityInstruction(
    mint,
    closeAuthority,
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
    initializeMintCloseAuthorityInstruction,
    initializeMintInstruction
  )

  transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair],
    

  )
  console.log(
    "\nCreate Mint Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
  );

  transactionSignature = await closeAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    closeAuthority,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  )
  console.log(
    "\nClose Mint Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
  );

}

main()
  .then(() => {
    console.log("Success");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


