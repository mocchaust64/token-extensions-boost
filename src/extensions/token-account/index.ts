import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccountLen,
  createInitializeAccountInstruction,
  createInitializeImmutableOwnerInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createAccount,
  AccountState,
  createInitializeDefaultAccountStateInstruction,
} from "@solana/spl-token";

export class TokenAccount {
  connection: Connection;
  mint: PublicKey;
  owner: PublicKey;
  
  constructor(connection: Connection, mint: PublicKey, owner: PublicKey) {
    this.connection = connection;
    this.mint = mint;
    this.owner = owner;
  }
  
  /**
   * 
   * 
   * @param payer
   * @returns 
   */
  async createAccount(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    tokenAccountKeypair: Keypair;
    signature: string;
  }> {
    const tokenAccountKeypair = Keypair.generate();
    const accountLen = getAccountLen([]);
    const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
    const transaction = new Transaction();
  
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: tokenAccountKeypair.publicKey,
        space: accountLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeAccountInstruction(
        tokenAccountKeypair.publicKey,
        this.mint,
        this.owner,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer, tokenAccountKeypair],
      { commitment: 'confirmed' }
    );
    
    return {
      tokenAccount: tokenAccountKeypair.publicKey,
      tokenAccountKeypair,
      signature
    };
  }
  
  /**
   * 
   * 
   * @param payer 
   * @returns 
   */
  async createAccountWithImmutableOwner(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    tokenAccountKeypair: Keypair;
    signature: string;
  }> {
    const tokenAccountKeypair = Keypair.generate();
    const accountLen = getAccountLen([ExtensionType.ImmutableOwner]);
    const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
    const transaction = new Transaction();
    
 
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: tokenAccountKeypair.publicKey,
        space: accountLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );
    

    transaction.add(
      createInitializeImmutableOwnerInstruction(
        tokenAccountKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
 
    transaction.add(
      createInitializeAccountInstruction(
        tokenAccountKeypair.publicKey,
        this.mint,
        this.owner,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Gửi transaction
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer, tokenAccountKeypair],
      { commitment: 'confirmed' }
    );
    
    return {
      tokenAccount: tokenAccountKeypair.publicKey,
      tokenAccountKeypair,
      signature
    };
  }
  
  /**
   *
   * 
   * @param payer 
   * @returns 
   */
  async createAssociatedTokenAccount(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    signature: string;
  }> {
   
    const tokenAccount = getAssociatedTokenAddressSync(
      this.mint,
      this.owner,
      true, 
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  
    const transaction = new Transaction();
    
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccount,
        this.owner,
        this.mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );
    
    return {
      tokenAccount,
      signature
    };
  }
  
  /**
   * 
   * 
   * @param payer 
   * @returns 
   */
  async createAccountWithImmutableOwnerAlt(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    signature: string;
  }> {
   
    const tokenAccount = await createAccount(
      this.connection,
      payer,
      this.mint,
      this.owner,
      undefined, 
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    
    return {
      tokenAccount,
      signature: "Used createAccount helper function"
    };
  }
  
  /**
   * 
   * 
   * @param payer 
   * @param state 
   * @returns 
   */
  async createAccountWithDefaultState(payer: Keypair, state: AccountState): Promise<{
    tokenAccount: PublicKey;
    tokenAccountKeypair: Keypair;
    signature: string;
  }> {
    const tokenAccountKeypair = Keypair.generate();
    const accountLen = getAccountLen([ExtensionType.DefaultAccountState]);
    const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
    const transaction = new Transaction();

    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: tokenAccountKeypair.publicKey,
        space: accountLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );

    transaction.add(
      createInitializeDefaultAccountStateInstruction(
        tokenAccountKeypair.publicKey,
        state,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    transaction.add(
      createInitializeAccountInstruction(
        tokenAccountKeypair.publicKey,
        this.mint,
        this.owner,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [payer, tokenAccountKeypair],
      { commitment: 'confirmed' }
    );
    
    return {
      tokenAccount: tokenAccountKeypair.publicKey,
      tokenAccountKeypair,
      signature
    };
  }
} 