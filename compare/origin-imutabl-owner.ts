import {
  clusterApiUrl,
  sendAndConfirmTransaction,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  Commitment,
} from "@solana/web3.js";
import * as fs from "fs";
import {
  createAssociatedTokenAccount,
  createMint,
  createInitializeImmutableOwnerInstruction,
  createInitializeAccountInstruction,
  getAccountLen,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  setAuthority,
  AuthorityType,
} from "@solana/spl-token";

async function main() {
  const walletPath = "/Users/tai/.config/solana/id.json";
  const secretKeyString = fs.readFileSync(walletPath, {encoding: "utf8"});
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  let transactionSignature: string;
  const mintAuthority = payer.publicKey;
  const decimals = 2;  

  const mint = await createMint(
    connection,
    payer,
    mintAuthority,
    null, // freeze authority
    decimals,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  console.log("✅ Mint created:", mint.toString());

  const associtatedTokenAcount = await createAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    undefined, // no programId specified, using default SPL Token program
    TOKEN_2022_PROGRAM_ID
  );

  try {
    
    await setAuthority(
      connection, 
      payer, 
      associtatedTokenAcount, 
      payer.publicKey, 
      AuthorityType.AccountOwner, 
      new Keypair().publicKey, 
      undefined, 
      undefined, 
      TOKEN_2022_PROGRAM_ID 
    );
  } catch (error) {
    console.log("\nExpect Error:", error);
  }
  console.log("✅ Associated Token Account created:", associtatedTokenAcount.toString());

  const tokenAccountKeypair = Keypair.generate();
  const tokenAccount = tokenAccountKeypair.publicKey;
  const accountLen = getAccountLen([ExtensionType.ImmutableOwner]);
  const lamports = await connection.getMinimumBalanceForRentExemption(accountLen);

  const createAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: tokenAccount,
    space: accountLen,
    lamports: lamports,
    programId: TOKEN_2022_PROGRAM_ID,
  });

  const InitializeImmutableOwnerInstruction = createInitializeImmutableOwnerInstruction(
    tokenAccount,
    TOKEN_2022_PROGRAM_ID
  );

  // Sửa lại thứ tự tham số cho đúng
  const initializeAccountInstruction = createInitializeAccountInstruction(
    tokenAccount,     // Địa chỉ Token Account
    mint,            // Địa chỉ Mint Account (đổi vị trí)
    payer.publicKey, // Chủ sở hữu Token Account (đổi vị trí)
    TOKEN_2022_PROGRAM_ID
  );

  // Thêm logging trước khi tạo transaction
  console.log("Debug info:");
  console.log("- Mint address:", mint.toString());
  console.log("- Token account:", tokenAccount.toString());
  console.log("- Account Length:", accountLen);
  console.log("- Required lamports:", lamports);

  // Kiểm tra mint account
  const mintInfo = await connection.getAccountInfo(mint);
  if (!mintInfo) {
      throw new Error('Mint account không tồn tại');
  } else {
      console.log("- Mint account size:", mintInfo.data.length);
      console.log("- Mint account owner:", mintInfo.owner.toString());
  }

  // Sửa lại thứ tự instructions
  const transaction = new Transaction().add(
    createAccountInstruction,
    InitializeImmutableOwnerInstruction,  
    initializeAccountInstruction          
  );

  transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, tokenAccountKeypair] // Signers
  );


  console.log(
    "\nCreate Token Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );

  try {
    
    await setAuthority(
      connection, 
      payer, 
      tokenAccount,
      payer.publicKey, 
      AuthorityType.AccountOwner, 
      new Keypair().publicKey, 
      undefined, 
      undefined,
      TOKEN_2022_PROGRAM_ID 
    );
  } catch (error) {
    console.log("\nExpect Error:", error);
  }
}

// Execute the main function
main()
  .then(() => {
    console.log("Success");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


