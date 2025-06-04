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
   * Create a standard token account
   * 
   * @param payer - Transaction fee payer
   * @returns Token account information
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
   * Create a token account with immutable owner extension
   * 
   * @param payer - Transaction fee payer
   * @returns Token account information
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
    
    // Step 1: Create the account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: tokenAccountKeypair.publicKey,
        space: accountLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );
    
    // Step 2: Initialize the immutable owner extension
    transaction.add(
      createInitializeImmutableOwnerInstruction(
        tokenAccountKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Step 3: Initialize the account
    transaction.add(
      createInitializeAccountInstruction(
        tokenAccountKeypair.publicKey,
        this.mint,
        this.owner,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Send transaction
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
   * Create an Associated Token Account
   * Note: ATAs already have immutable owner built-in
   * 
   * @param payer - Transaction fee payer
   * @returns Token account information
   */
  async createAssociatedTokenAccount(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    signature: string;
  }> {
    // Get the Associated Token Account address
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
   * Create a token account with immutable owner using the helper function
   * Alternative method using the SPL-token helper
   * 
   * @param payer - Transaction fee payer
   * @returns Token account information
   */
  async createAccountWithImmutableOwnerAlt(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    signature: string;
  }> {
    // Use the SPL-token helper function to create an account
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
   * Create an account with default state
   * This allows setting a default state for the account (e.g., frozen)
   * 
   * @param payer - Transaction fee payer
   * @param state - Default account state
   * @returns Token account information
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