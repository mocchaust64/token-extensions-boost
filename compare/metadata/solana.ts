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
    getMintLen,
    createInitializeMetadataPointerInstruction,
    getMint,
    getMetadataPointerState,
    getTokenMetadata,
    TYPE_SIZE,
    LENGTH_SIZE,
  } from "@solana/spl-token";
  import {
    createInitializeInstruction,
    createUpdateFieldInstruction,
    createRemoveKeyInstruction,
    pack,
    TokenMetadata,
  } from "@solana/spl-token-metadata";

  import * as fs from "fs";


    async function main() {

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const wallet = "/Users/tai/.config/solana/id.json";
    const secretKeyString = fs.readFileSync(wallet, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  const payer = Keypair.fromSecretKey(secretKey);
  

  let transaction: Transaction;
  let transactionSignature: string;
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const decimals = 2;
  const mintAuthority = payer.publicKey;
  const updateAuthority = payer.publicKey;
  
  const metaData: TokenMetadata = {
    updateAuthority: updateAuthority,
    mint: mint,
    name: "OPOS",
    symbol: "OPOS",
    uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
    additionalMetadata: [["description", "Only Possible On Solana"]],
  };
  
  const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
  const metadataLen = pack(metaData).length;
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const lamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataExtension + metadataLen
  );
  
  const createAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey, 
    newAccountPubkey: mint, 
    space: mintLen, 
    lamports, 
    programId: TOKEN_2022_PROGRAM_ID, 
  });
  

  const initializeMetadataPointerInstruction =
    createInitializeMetadataPointerInstruction(
      mint, 
      updateAuthority, 
      mint, 
      TOKEN_2022_PROGRAM_ID
    );
  

  const initializeMintInstruction = createInitializeMintInstruction(
    mint, 
    decimals, 
    mintAuthority, 
    null, 
    TOKEN_2022_PROGRAM_ID 
  );
  
 
  const initializeMetadataInstruction = createInitializeInstruction({
    programId: TOKEN_2022_PROGRAM_ID, 
    metadata: mint, 
    updateAuthority: updateAuthority, 
    mint: mint, 
    mintAuthority: mintAuthority, 
    name: metaData.name,
    symbol: metaData.symbol,
    uri: metaData.uri,
  });
  
  const updateFieldInstruction = createUpdateFieldInstruction({
    programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
    metadata: mint, // Account address that holds the metadata
    updateAuthority: updateAuthority, // Authority that can update the metadata
    field: metaData.additionalMetadata[0][0], // key
    value: metaData.additionalMetadata[0][1], // value
  });
  

  transaction = new Transaction().add(
    createAccountInstruction,
    initializeMetadataPointerInstruction,
    initializeMintInstruction,
    initializeMetadataInstruction,
    updateFieldInstruction
  );
  
  // Send transaction
  transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair] // Signers
  );
  
  console.log(
    "\nCreate Mint Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );
  
  // Retrieve mint information
  const mintInfo = await getMint(
    connection,
    mint,
    "confirmed",
    TOKEN_2022_PROGRAM_ID
  );
  
  // Retrieve and log the metadata pointer state
  const metadataPointer = getMetadataPointerState(mintInfo);
  console.log("\nMetadata Pointer:", JSON.stringify(metadataPointer, null, 2));
  
  const metadata = await getTokenMetadata(
    connection,
    mint // Mint Account address
  );
  console.log("\nMetadata:", JSON.stringify(metadata, null, 2));
  
  // Instruction to remove a key from the metadata
  const removeKeyInstruction = createRemoveKeyInstruction({
    programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
    metadata: mint, // Address of the metadata
    updateAuthority: updateAuthority, // Authority that can update the metadata
    key: metaData.additionalMetadata[0][0], // Key to remove from the metadata
    idempotent: true, // If the idempotent flag is set to true, then the instruction will not error if the key does not exist
  });
  
  // Add instruction to new transaction
  transaction = new Transaction().add(removeKeyInstruction);
  
  // Send transaction
  transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
  );
  
  console.log(
    "\nRemove Additional Metadata Field:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`
  );
  
  // Retrieve and log the metadata state
  const updatedMetadata = await getTokenMetadata(
    connection,
    mint // Mint Account address
  );
  console.log("\nUpdated Metadata:", JSON.stringify(updatedMetadata, null, 2));
  
  console.log(
    "\nMint Account:",
    `https://solana.fm/address/${mint}?cluster=devnet-solana`
  );
}
main();