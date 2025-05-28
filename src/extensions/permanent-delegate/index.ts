import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction
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
   * Create instructions for a token with permanent delegate extension
   * 
   * @param connection - Connection to Solana cluster
   * @param payer - Public key of the transaction fee payer
   * @param params - Initialization parameters:
   *   - decimals: Number of decimals
   *   - mintAuthority: Authority allowed to mint tokens
   *   - freezeAuthority: Authority allowed to freeze accounts (optional)
   *   - permanentDelegate: Address of the permanent delegate
   * @returns Instructions, signers and mint address
   */
  static async createInstructions(
    connection: Connection,
    payer: PublicKey,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      freezeAuthority?: PublicKey | null;
      permanentDelegate: PublicKey;
    }
  ): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
    mint: PublicKey;
  }> {
    const { decimals, mintAuthority, freezeAuthority = null, permanentDelegate } = params;

    try {
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;
      const mintLen = getMintLen([ExtensionType.PermanentDelegate]);
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

      const instructions: TransactionInstruction[] = [
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mint,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializePermanentDelegateInstruction(
          mint,
          permanentDelegate,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          mint,
          decimals,
          mintAuthority,
          freezeAuthority,
          TOKEN_2022_PROGRAM_ID
        )
      ];

      return {
        instructions,
        signers: [mintKeypair],
        mint
      };
    } catch (error: any) {
      throw new Error(`Could not create PermanentDelegateToken instructions: ${error.message}`);
    }
  }

  /**
   * Create instructions for a token account for a token with permanent delegate
   * 
   * @param owner - Token account owner
   * @param payer - Public key of the transaction fee payer (optional, defaults to owner)
   * @returns Instructions and token account address
   */
  async createTokenAccountInstructions(
    owner: PublicKey,
    payer?: PublicKey
  ): Promise<{
    instructions: TransactionInstruction[];
    address: PublicKey;
  }> {
    try {
      const actualPayer = payer || owner;
      const tokenAccount = await getAssociatedTokenAddress(
        this.mint,
        owner,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const instructions: TransactionInstruction[] = [];

      try {
        await getAccount(this.connection, tokenAccount, "recent", TOKEN_2022_PROGRAM_ID);
        // Account already exists, no instruction needed
      } catch (error) {
        // Account doesn't exist, add instruction to create it
        instructions.push(
          createAssociatedTokenAccountInstruction(
            actualPayer,
            tokenAccount,
            owner,
            this.mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      return {
        instructions,
        address: tokenAccount
      };
    } catch (error: any) {
      throw new Error(`Could not create token account instructions: ${error.message}`);
    }
  }

  /**
   * Create instruction to transfer tokens as permanent delegate
   * 
   * @param delegate - Public key of the permanent delegate
   * @param source - Source account (any account holding the token)
   * @param destination - Destination account
   * @param amount - Amount to transfer
   * @returns Transaction instruction
   */
  createTransferAsDelegateInstruction(
    delegate: PublicKey,
    source: PublicKey,
    destination: PublicKey,
    amount: bigint
  ): TransactionInstruction {
    return createTransferInstruction(
          source,
          destination,
      delegate,
          amount,
          [],
          TOKEN_2022_PROGRAM_ID
    );
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
} 