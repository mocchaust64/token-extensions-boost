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
  createInitializeMintInstruction,
  createInitializePermanentDelegateInstruction,
  getMintLen,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMint,
  createTransferInstruction,
  getAccount,
} from "@solana/spl-token";
import { Token } from "../../core/token";

// Extend the Mint type to include permanentDelegate
declare module "@solana/spl-token" {
  interface Mint {
    permanentDelegate?: PublicKey | null;
  }
}

/**
 * PermanentDelegateToken - Extension for Token with permanent delegate functionality
 * 
 * This extension allows setting a permanent delegate that can transfer tokens from any
 * account holding this token without the owner's permission.
 */
export class PermanentDelegateToken extends Token {
  private delegate: PublicKey | null;

  constructor(connection: Connection, mint: PublicKey, delegate: PublicKey | null) {
    super(connection, mint);
    this.delegate = delegate;
  }

  /**
   * Create a new token with permanent delegate extension
   * 
   * @param connection - Connection to Solana cluster
   * @param payer - Transaction fee payer keypair
   * @param params - Initialization parameters:
   *   - decimals: Number of decimals
   *   - mintAuthority: Authority allowed to mint tokens
   *   - freezeAuthority: Authority allowed to freeze accounts (optional)
   *   - permanentDelegate: Address of the permanent delegate
   * @returns Newly created PermanentDelegateToken object
   */
  static async create(
    connection: Connection,
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      freezeAuthority?: PublicKey | null;
      permanentDelegate: PublicKey;
    }
  ): Promise<PermanentDelegateToken> {
    const { decimals, mintAuthority, freezeAuthority = null, permanentDelegate } = params;

    try {
      const mintKeypair = Keypair.generate();
      const mintLen = getMintLen([ExtensionType.PermanentDelegate]);
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializePermanentDelegateInstruction(
          mintKeypair.publicKey,
          permanentDelegate,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          decimals,
          mintAuthority,
          freezeAuthority,
          TOKEN_2022_PROGRAM_ID
        )
      );

      await sendAndConfirmTransaction(connection, transaction, [
        payer,
        mintKeypair,
      ]);

      return new PermanentDelegateToken(connection, mintKeypair.publicKey, permanentDelegate);
    } catch (error: any) {
      throw new Error(`Could not create PermanentDelegateToken: ${error.message}`);
    }
  }

  /**
   * Create a token account for a token with permanent delegate
   * 
   * @param payer - Transaction fee payer keypair
   * @param owner - Token account owner
   * @returns Address of the created token account
   */
  async createTokenAccount(
    payer: Keypair,
    owner: PublicKey
  ): Promise<PublicKey> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        this.mint,
        owner,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const transaction = new Transaction();

      try {
        await getAccount(this.connection, tokenAccount, "recent", TOKEN_2022_PROGRAM_ID);
      } catch (error) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            tokenAccount,
            owner,
            this.mint,
            TOKEN_2022_PROGRAM_ID
          )
        );

        await sendAndConfirmTransaction(this.connection, transaction, [payer]);
      }

      return tokenAccount;
    } catch (error: any) {
      throw new Error(`Could not create token account: ${error.message}`);
    }
  }

  /**
   * Transfer tokens as permanent delegate
   * 
   * @param delegateKeypair - Permanent delegate keypair
   * @param source - Source account (any account holding the token)
   * @param destination - Destination account
   * @param amount - Amount to transfer
   * @returns Transaction signature
   */
  async transferAsDelegate(
    delegateKeypair: Keypair,
    source: PublicKey,
    destination: PublicKey,
    amount: bigint
  ): Promise<string> {
    try {
      const mintInfo = await getMint(this.connection, this.mint, "recent", TOKEN_2022_PROGRAM_ID);
      
      if (!mintInfo.permanentDelegate || 
          !delegateKeypair.publicKey.equals(mintInfo.permanentDelegate)) {
        throw new Error("Keypair is not the permanent delegate of this token");
      }

      const transaction = new Transaction().add(
        createTransferInstruction(
          source,
          destination,
          delegateKeypair.publicKey,
          amount,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      return await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [delegateKeypair]
      );
    } catch (error: any) {
      throw new Error(`Could not transfer tokens as delegate: ${error.message || String(error)}`);
    }
  }

  /**
   * Check if an address is the permanent delegate
   * 
   * @param address - Address to check
   * @returns true if it is the permanent delegate, false otherwise
   */
  async isPermanentDelegate(address: PublicKey): Promise<boolean> {
    try {
      const mintInfo = await getMint(this.connection, this.mint, "recent", TOKEN_2022_PROGRAM_ID);
  
      if (!mintInfo.permanentDelegate) {
        console.log("Permanent delegate không tồn tại cho token này");
        return false;
      }
      
      return mintInfo.permanentDelegate.equals(address);
    } catch (error: any) {
      console.error(`Lỗi khi kiểm tra permanent delegate: ${error.message || String(error)}`);
      return false;
    }
  }

  /**
   * Get the permanent delegate of the token
   * 
   * @returns Address of the permanent delegate or null if none
   */
  async getPermanentDelegate(): Promise<PublicKey | null> {
    try {
      const mintInfo = await getMint(this.connection, this.mint, "recent", TOKEN_2022_PROGRAM_ID);
      return mintInfo.permanentDelegate || null;
    } catch (error: any) {
      console.error(`Lỗi khi lấy permanent delegate: ${error.message || String(error)}`);
      return null;
    }
  }

  async createOrGetTokenAccount(
    payer: Keypair,
    owner: PublicKey
  ): Promise<{ address: PublicKey; signature: string }> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        this.mint,
        owner,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const transaction = new Transaction();
      let accountExists = false;
      
      try {
        await getAccount(this.connection, tokenAccount, "recent", TOKEN_2022_PROGRAM_ID);
        accountExists = true;
        return { address: tokenAccount, signature: "" };
      } catch (error) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            tokenAccount,
            owner,
            this.mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
        
        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [payer]
        );
        
        return { address: tokenAccount, signature };
      }
    } catch (error: any) {
      throw new Error(`Could not create or get token account: ${error.message}`);
    }
  }

} 