import { TokenExtensionConfig } from './../../src/types/index';
import { Token } from './../../src/core/token';
import {
    Connection,
    Keypair,
    SystemProgram,
    Transaction,
    clusterApiUrl,
    sendAndConfirmTransaction,
    TransactionInstruction,
    PublicKey,
  } from "@solana/web3.js";
  import {
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createEnableRequiredMemoTransfersInstruction,
    createInitializeAccountInstruction,
    createMint,
    disableRequiredMemoTransfers,
    enableRequiredMemoTransfers,
    getAccountLen,
    createAccount,
    mintTo,
    createTransferInstruction,
  } from "@solana/spl-token";
import * as fs from "fs";


    const wallet = "/Users/tai/.config/solana/id.json";
    const secrecrtKeyString = fs.readFileSync(wallet, { encoding: "utf8" });
    const secretKey = Uint8Array.from(JSON.parse(secrecrtKeyString));
    const payer = Keypair.fromSecretKey(secretKey);
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    let transaction: Transaction;
    let transactionSignature: string;

    const mintAuthority = payer.publicKey;
    const decimals = 9;

    const mint = await createMint(
        connection,
        payer,
        mintAuthority,
        null,
        decimals,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
    )
    const tokenAccountKeypair = Keypair.generate();
    const tokenAccount = tokenAccountKeypair.publicKey;

    const accountlen = getAccountLen([ExtensionType.MemoTransfer]);
    const lamports = await connection.getMinimumBalanceForRentExemption(accountlen);

    const enableRequiredMemoTransfersInstruction = createEnableRequiredMemoTransfersInstruction(
        tokenAccount,
        mintAuthority,
        undefined,
        TOKEN_2022_PROGRAM_ID
    )

    