import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  getMintLen,
  createMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createApproveInstruction
} from "@solana/spl-token";

export class ConfidentialTransferToken {
  private connection: Connection;
  private mintAddress: PublicKey;
  
    constructor(connection: Connection, mintAddress: PublicKey) {
    this.connection = connection;
    this.mintAddress = mintAddress;
  }

    static async create(
    connection: Connection,
    payer: Keypair,
    options: {
      decimals: number;
      mintAuthority: PublicKey;
      freezeAuthority?: PublicKey | null;
      autoEnable?: boolean;
    }
  ): Promise<ConfidentialTransferToken> {
    const { decimals, mintAuthority, freezeAuthority = null, autoEnable = true } = options;

    const mintLen = getMintLen([ExtensionType.ConfidentialTransferMint]);

    const mintKeypair = Keypair.generate();

    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    const transaction = new Transaction();

    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );

    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        mintAuthority,
        freezeAuthority,
        TOKEN_2022_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, mintKeypair]
    );
    
    return new ConfidentialTransferToken(connection, mintKeypair.publicKey);
  }
  
    getMint(): PublicKey {
    return this.mintAddress;
  }
  
    async configureAccount(
    payer: Keypair,
    owner: Keypair
  ): Promise<string> {
    
    const tokenAccount = await getAssociatedTokenAddress(
      this.mintAddress,
      owner.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const transaction = new Transaction();

    try {
      await this.connection.getAccountInfo(tokenAccount);
    } catch (error) {
      
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          tokenAccount,
          owner.publicKey,
          this.mintAddress,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    transaction.add(
      createApproveInstruction(
        tokenAccount,
        owner.publicKey,
        owner.publicKey,
        1, 
        [owner],
        TOKEN_2022_PROGRAM_ID
      )
    );

    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer, owner]
    );
  }
  
    async confidentialTransfer(
    payer: Keypair,
    source: PublicKey,
    destination: PublicKey,
    owner: Keypair,
    amount: bigint
  ): Promise<string> {

    const transaction = new Transaction();

    transaction.add(
      createApproveInstruction(
        source,
        destination,
        owner.publicKey,
        amount,
        [owner],
        TOKEN_2022_PROGRAM_ID
      )
    );

    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer, owner]
    );
  }
  
    async mintToConfidential(
    payer: Keypair,
    mintAuthority: Keypair,
    destination: PublicKey,
    amount: bigint
  ): Promise<string> {

    return await mintTo(
      this.connection,
      payer,
      this.mintAddress,
      destination,
      mintAuthority,
      amount,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
  }
  
    async isConfiguredForConfidentialTransfers(tokenAccount: PublicKey): Promise<boolean> {
    try {
      const accountInfo = await this.connection.getAccountInfo(tokenAccount);
      if (!accountInfo) {
        return false;
      }

      return accountInfo.data.length > 0;
    } catch (error) {
      console.error("Error checking confidential transfer configuration:", error);
      return false;
    }
  }
} 