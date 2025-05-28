import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction, 
  SystemProgram,
  Signer,
  TransactionInstruction
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeAccountInstruction,
  getAccountLen,
  createInitializeImmutableOwnerInstruction,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createInitializeDefaultAccountStateInstruction,
  AccountState
} from "@solana/spl-token";

/**
 * TokenAccountBuilder - Helper class for creating token accounts with extensions
 * 
 * ImmutableOwner and other extensions for token accounts
 */
export class TokenAccountBuilder {
  private connection: Connection;
  private extensions: ExtensionType[] = [];
  
  // Basic information
  private mint?: PublicKey;
  private owner?: PublicKey;
  
  // Settings for extensions
  private defaultAccountState?: AccountState;
  
  /**
   * Initialize builder with connection
   * 
   * @param connection - Connection to Solana cluster
   */
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  /**
   * Set basic information for token account
   * 
   * @param mint - Mint address of the token
   * @param owner - Owner of the token account
   */
  setTokenAccountInfo(mint: PublicKey, owner: PublicKey): TokenAccountBuilder {
    this.mint = mint;
    this.owner = owner;
    return this;
  }
  
  /**
   * Add ImmutableOwner extension
   * ImmutableOwner prevents changing the owner of the token account
   */
  addImmutableOwner(): TokenAccountBuilder {
    this.extensions.push(ExtensionType.ImmutableOwner);
    return this;
  }
  
  /**
   * Add DefaultAccountState extension
   * 
   * @param state - Default state of the account (frozen or unlocked)
   */
  addDefaultAccountState(state: AccountState): TokenAccountBuilder {
    this.extensions.push(ExtensionType.DefaultAccountState);
    this.defaultAccountState = state;
    return this;
  }
  
  /**
   * Create instructions for standard (non-associated) token account
   * 
   * @param payer - Public key of the transaction fee payer
   * @returns Instructions, signers and token account address
   */
  async buildStandardAccountInstructions(payer: PublicKey): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
    tokenAccount: PublicKey;
  }> {
    if (!this.mint || !this.owner) {
      throw new Error("Mint and owner are required. Call setTokenAccountInfo first.");
    }
    
    try {
      // 1. Create new keypair for token account
      const tokenAccountKeypair = Keypair.generate();
      const tokenAccount = tokenAccountKeypair.publicKey;
      
      // 2. Calculate account size and rent
      const accountLen = getAccountLen(this.extensions);
      const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
      
      console.log(`Token account size: ${accountLen} bytes`);
      
      // 3. Create instructions array
      const instructions: TransactionInstruction[] = [];
      
      // Correct initialization order: 
      // 1. Create account
      // 2. Initialize extensions
      // 3. Initialize token account
      
      // Create account instruction
      instructions.push(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: tokenAccount,
          space: accountLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      // Add extensions
      if (this.extensions.includes(ExtensionType.ImmutableOwner)) {
        instructions.push(
          createInitializeImmutableOwnerInstruction(
            tokenAccount,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.extensions.includes(ExtensionType.DefaultAccountState) && this.defaultAccountState) {
        instructions.push(
          createInitializeDefaultAccountStateInstruction(
            tokenAccount,
            this.defaultAccountState,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      // Finally, initialize token account
      instructions.push(
        createInitializeAccountInstruction(
          tokenAccount,
          this.mint,
          this.owner,
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      return {
        instructions,
        signers: [tokenAccountKeypair],
        tokenAccount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create token account instructions: ${errorMessage}`);
    }
  }
  
  /**
   * Create standard (non-associated) token account
   * 
   * @param payer - Transaction fee payer
   * @returns Information about the created token account
   */
  async buildStandardAccount(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    tokenAccountKeypair: Keypair;
    transactionSignature: string;
  }> {
    if (!this.mint || !this.owner) {
      throw new Error("Mint and owner are required. Call setTokenAccountInfo first.");
    }
    
    try {
      const { instructions, signers, tokenAccount } = await this.buildStandardAccountInstructions(payer.publicKey);
      const tokenAccountKeypair = signers[0];
      
      // Create and send transaction
      const transaction = new Transaction().add(...instructions);
      const transactionSignature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer, tokenAccountKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`Token account created: ${tokenAccount.toBase58()}`);
      console.log(`Transaction signature: ${transactionSignature}`);
      
      return {
        tokenAccount,
        tokenAccountKeypair,
        transactionSignature
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create token account: ${errorMessage}`);
    }
  }
  
  /**
   * Create instructions for Associated Token Account with extensions
   * 
   * Note: Not all extensions work with ATA
   * 
   * @param payer - Public key of the transaction fee payer
   * @returns Instructions and token account address
   */
  buildAssociatedAccountInstructions(payer: PublicKey): {
    instructions: TransactionInstruction[];
    tokenAccount: PublicKey;
  } {
    if (!this.mint || !this.owner) {
      throw new Error("Mint and owner are required. Call setTokenAccountInfo first.");
    }
    
    try {
      // 1. Get ATA address
      const tokenAccount = getAssociatedTokenAddressSync(
        this.mint,
        this.owner,
        true, // allowOwnerOffCurve
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // 2. Create instruction
      // Can only add normal ATA, cannot add extensions directly
      // Some extensions like ImmutableOwner are automatically applied to ATA
      const instructions = [
        createAssociatedTokenAccountInstruction(
          payer,
          tokenAccount,
          this.owner,
          this.mint,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      ];
      
      return {
        instructions,
        tokenAccount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create Associated Token Account instructions: ${errorMessage}`);
    }
  }
  
  /**
   * Create Associated Token Account with extensions
   * 
   * Note: Not all extensions work with ATA
   * 
   * @param payer - Transaction fee payer
   * @returns Information about the created token account
   */
  async buildAssociatedAccount(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    transactionSignature: string;
  }> {
    try {
      const { instructions, tokenAccount } = this.buildAssociatedAccountInstructions(payer.publicKey);
      
      // Create and send transaction
      const transaction = new Transaction().add(...instructions);
      const transactionSignature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Associated Token Account created: ${tokenAccount.toBase58()}`);
      console.log(`Transaction signature: ${transactionSignature}`);
      
      return {
        tokenAccount,
        transactionSignature
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create Associated Token Account: ${errorMessage}`);
    }
  }
} 