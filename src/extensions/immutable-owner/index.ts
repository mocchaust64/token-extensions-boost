import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeImmutableOwnerInstruction,
  createInitializeAccountInstruction,
  getAccountLen,
  setAuthority,
  AuthorityType,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from "@solana/spl-token";
import { Token } from "../../core/token";

/**
 * ImmutableOwnerToken - Extension for TokenAccount with immutable owner functionality
 * 
 * This extension ensures that the owner of a token account cannot be changed after initialization,
 * enhancing security and reducing the risk of attacks.
 */
export class ImmutableOwnerToken extends Token {
  /**
   * Create a new ImmutableOwnerToken instance
   * 
   * @param connection - Connection to Solana cluster
   * @param mintAddress - Public key of the token mint
   */
  constructor(connection: Connection, mintAddress: PublicKey) {
    super(connection, mintAddress);
  }

  /**
   * Create a token account with immutable owner
   * 
   * @param payer - Transaction fee payer keypair
   * @param owner - Public key of the account owner (cannot be changed)
   * @param tokenAccountKeypair - Keypair of the token account to be created
   * @returns Transaction signature
   */
  async createTokenAccountWithImmutableOwner(
    payer: Keypair,
    owner: PublicKey,
    tokenAccountKeypair: Keypair
  ): Promise<string> {
    const tokenAccount = tokenAccountKeypair.publicKey;
    
    const accountLen = getAccountLen([ExtensionType.ImmutableOwner]);
    
    try {
      const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
      
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: tokenAccount,
          space: accountLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        
        createInitializeImmutableOwnerInstruction(
          tokenAccount,
          TOKEN_2022_PROGRAM_ID
        ),
        
        createInitializeAccountInstruction(
          tokenAccount,
          this.mint,
          owner,
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      return await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer, tokenAccountKeypair]
      );
    } catch (error: any) {
      throw new Error(`Could not create account with immutable owner: ${error.message}`);
    }
  }
  
  /**
   * Create associated token account with immutable owner
   * 
   * @param payer - Transaction fee payer keypair
   * @param owner - Public key of the account owner (cannot be changed)
   * @returns Object containing transaction signature and token account address
   */
  async createAssociatedTokenAccountWithImmutableOwner(
    payer: Keypair,
    owner: PublicKey
  ): Promise<{ signature: string, tokenAccount: PublicKey }> {
    const tokenAccount = await getAssociatedTokenAddress(
      this.mint,
      owner,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    try {
      await getAccount(this.connection, tokenAccount);
      return { signature: "", tokenAccount };
    } catch (error) {
      try {
        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            tokenAccount,
            owner,
            this.mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
        
        // Note: Associated Token Accounts created with Token-2022
        // automatically have the ImmutableOwner extension
        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [payer]
        );
        
        return { signature, tokenAccount };
      } catch (error: any) {
        throw new Error(`Could not create associated token account with immutable owner: ${error.message}`);
      }
    }
  }
  
  /**
   * Check if an account has immutable owner
   * 
   * @param tokenAccount - Public key of the token account to check
   * @returns true if the account has immutable owner, false if not
   */
  async hasImmutableOwner(tokenAccount: PublicKey): Promise<boolean> {
    try {
      const accountInfo = await this.connection.getAccountInfo(tokenAccount);
      if (!accountInfo) {
        throw new Error("Account not found");
      }
      
      try {
        // Try to change authority - if immutable owner, this will fail
        await setAuthority(
          this.connection,
          new Keypair(),
          tokenAccount,
          new PublicKey("11111111111111111111111111111111"),
          AuthorityType.AccountOwner,
          new PublicKey("11111111111111111111111111111111"),
          [],
          { skipPreflight: true },
          TOKEN_2022_PROGRAM_ID
        );
        return false;
      } catch (error: any) {
        const errorMessage = error.toString();
        return errorMessage.includes("0x22") ||
              errorMessage.includes("owner authority cannot be changed");
      }
    } catch (error: any) {
      console.error("Error checking immutable owner:", error);
      return false;
    }
  }

  /**
   * Create a token account with immutable owner, or return existing one if already exists
   * 
   * @param payer - Transaction fee payer
   * @param owner - Owner of the token account
   * @returns Object containing the account address and transaction signature
   */
  async createOrGetImmutableAccount(
    payer: Keypair,
    owner: PublicKey
  ): Promise<{ address: PublicKey; signature: string }> {
    // Try to use associated token account first as it's the standard
    const associatedAccount = await getAssociatedTokenAddress(
      this.mint,
      owner,
      false,
      TOKEN_2022_PROGRAM_ID
    );
    
    const transaction = new Transaction();
    let created = false;
    
    try {
      await getAccount(this.connection, associatedAccount, "recent", TOKEN_2022_PROGRAM_ID);
      // Account exists, check if it has immutable owner
      const isImmutable = await this.hasImmutableOwner(associatedAccount);
      
      if (!isImmutable) {
        console.warn("Warning: Existing account does not have immutable owner extension");
      }
      
      return { address: associatedAccount, signature: "" };
    } catch (error) {
      // Account doesn't exist, create a new one
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          associatedAccount,
          owner,
          this.mint,
          TOKEN_2022_PROGRAM_ID
        )
      );
      created = true;
      
      try {
        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [payer]
        );
        return { address: associatedAccount, signature };
      } catch (error: any) {
        throw new Error(`Failed to create immutable owner account: ${error.message}`);
      }
    }
  }

}