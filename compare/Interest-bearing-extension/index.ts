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
    updateRateInterestBearingMint,
    createInitializeInterestBearingMintInstruction,
    createInitializeMintInstruction,
    getMintLen,
    TOKEN_2022_PROGRAM_ID,
    getInterestBearingMintConfigState,
    getMint,
    amountToUiAmount,
  } from "@solana/spl-token";
  import * as fs from 'fs';


  async function main() {

    const walletPath = "/Users/tai/.config/solana/id.json";
    const secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  

  const payer = Keypair.fromSecretKey(secretKey) ;
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  let transactionSignature: string;

  const mintKeypair  = Keypair.generate(); 
  const mint = mintKeypair.publicKey;
  const decimals = 9 ;
  const mintAuthority = payer.publicKey;
  const rateAuthority = payer;
  const rate = 32767 ;
  
  const mintlen = getMintLen([ExtensionType.InterestBearingConfig]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintlen);
  
  const createAccountIntruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint,
    space: mintlen,
    lamports: lamports,
    programId: TOKEN_2022_PROGRAM_ID,
  })

  const initializeInterestBearingMintInstruction = createInitializeInterestBearingMintInstruction(
    mint,
    rateAuthority.publicKey,
    rate,
    TOKEN_2022_PROGRAM_ID

  )

  const initializeMintIntruction = createInitializeMintInstruction(
    mint,
    decimals,
    mintAuthority,
    null,
    TOKEN_2022_PROGRAM_ID   
  );


  const transaction = new Transaction().add(
    createAccountIntruction,
    initializeInterestBearingMintInstruction,
    initializeMintIntruction
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


  const updateRate = 0 ;
transactionSignature = await updateRateInterestBearingMint(

    connection,
    payer,
    mint,
    rateAuthority,
    updateRate,
    undefined, // Không cần chỉ định authority mới
    undefined, // Không cần chỉ định authority cũ
    TOKEN_2022_PROGRAM_ID
)
console.log(
    "\nUpdate Rate:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
  );

  //fetch interest bearing mint config state
  const mintAccount = await getMint(connection,mint, undefined, TOKEN_2022_PROGRAM_ID);

  const interestBearingMintConfig = await getInterestBearingMintConfigState(mintAccount);

  console.log(
    "\nMint Config:",
    JSON.stringify(interestBearingMintConfig, null, 2),
  );

  await new Promise(r => setTimeout(r, 3000));
 


const amount = 100;
const uiAmountSimulated = await amountToUiAmount(
  connection, 
  payer, 
  mint, 
  amount, 
  TOKEN_2022_PROGRAM_ID, 
);

console.log("\nAmount with Accrued Interest:", uiAmountSimulated);







  }

  
  main()
  .then(() => {
    console.log("Success");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



