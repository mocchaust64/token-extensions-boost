import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Signer,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  getMintLen,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  TokenAccountNotFoundError,
  getAccount,
} from "@solana/spl-token";
import { Token } from "../../core/token";
import { createTransferCheckedWithTransferHookInstruction } from "@solana/spl-token";

/**
 * TransferHookToken - Extension for Token with transfer hook functionality
 * 
 * This extension allows token transfers to trigger a custom instruction
 * executed by a separate program, specified when the mint is created.
 */
export class TransferHookToken extends Token {
  private hookProgramId: PublicKey;

  constructor(
    connection: Connection,
    mint: PublicKey,
    hookProgramId: PublicKey
  ) {
    super(connection, mint);
    this.hookProgramId = hookProgramId;
  }

  /**
   * Create a new TransferHookToken
   * 
   * @param connection - Connection to Solana cluster
   * @param payer - Transaction fee payer keypair
   * @param params - Initialization parameters including:
   *   - decimals: Number of decimal places
   *   - mintAuthority: Authority allowed to mint tokens
   *   - transferHookProgramId: Program ID that will be called during transfers
   *   - freezeAuthority: Optional authority allowed to freeze accounts
   * @returns Newly created TransferHookToken object
   */
  static async create(
    connection: Connection,
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      transferHookProgramId: PublicKey;
      freezeAuthority?: PublicKey | null;
    }
  ): Promise<TransferHookToken> {
    try {
      const mintKeypair = Keypair.generate();
      const mintLen = getMintLen([ExtensionType.TransferHook]);
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeTransferHookInstruction(
          mintKeypair.publicKey,
          payer.publicKey,
          params.transferHookProgramId,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          params.decimals,
          params.mintAuthority,
          params.freezeAuthority || null,
          TOKEN_2022_PROGRAM_ID
        )
      );

      await sendAndConfirmTransaction(connection, transaction, [
        payer,
        mintKeypair,
      ], { commitment: 'confirmed' });

      return new TransferHookToken(connection, mintKeypair.publicKey, params.transferHookProgramId);
    } catch (error: any) {
      throw new Error(`Could not create TransferHookToken: ${error.message}`);
    }
  }

  /**
   * Execute token transfer with hook execution
   * 
   * @param source - Source account address
   * @param destination - Destination account address
   * @param owner - Source account owner
   * @param amount - Token amount to transfer
   * @param decimals - Token decimal places
   * @param extraAccounts - Additional accounts required by the hook
   * @returns Transaction signature
   */
  async transfer(
    source: PublicKey,
    destination: PublicKey,
    owner: Signer,
    amount: bigint,
    decimals: number,
    extraAccounts: PublicKey[] = []
  ): Promise<string> {
    try {
      // Tạo transaction với hook
      const transferInstruction = await createTransferCheckedWithTransferHookInstruction(
        this.connection,
        source,
        this.mint,
        destination,
        owner.publicKey,
        amount,
        decimals,
        extraAccounts,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );

      const transaction = new Transaction().add(transferInstruction);

      return await sendAndConfirmTransaction(this.connection, transaction, [owner], {
        commitment: "confirmed",
      });
    } catch (error: any) {
      throw new Error(`Could not transfer tokens: ${error.message}`);
    }
  }

  /**
   * Create an account and mint tokens to it
   * 
   * @param owner - Account owner
   * @param payer - Transaction fee payer
   * @param amount - Amount to mint
   * @param mintAuthority - Authority allowed to mint tokens
   * @returns Public key of the newly created account
   */
  async createAccountAndMintTo(
    owner: PublicKey,
    payer: Keypair,
    amount: bigint,
    mintAuthority: Keypair
  ): Promise<PublicKey> {
    try {
      // Create token account
      const { address } = await this.createOrGetTokenAccount(payer, owner);

      // Mint tokens
      const transaction = new Transaction().add(
        createMintToInstruction(
          this.mint,
          address,
          mintAuthority.publicKey,
          amount,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer, mintAuthority],
        { commitment: "confirmed" }
      );

      return address;
    } catch (error: any) {
      throw new Error(`Could not create account and mint tokens: ${error.message}`);
    }
  }

  /**
   * Create or get an existing token account
   * 
   * @param payer - Transaction fee payer
   * @param owner - Account owner
   * @returns Token account address and transaction signature
   */
  async createOrGetTokenAccount(
    payer: Keypair,
    owner: PublicKey
  ): Promise<{ address: PublicKey; signature: string }> {
    const associatedTokenAddress = await getAssociatedTokenAddress(
      this.mint,
      owner,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    try {
      // Kiểm tra xem account đã tồn tại chưa
      await getAccount(
        this.connection,
        associatedTokenAddress,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      return { address: associatedTokenAddress, signature: "" };
    } catch (error: any) {
      if (error instanceof TokenAccountNotFoundError) {
        // Account chưa tồn tại, tạo mới
        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            associatedTokenAddress,
            owner,
            this.mint,
            TOKEN_2022_PROGRAM_ID
          )
        );

        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [payer],
          { commitment: "confirmed" }
        );

        return { address: associatedTokenAddress, signature };
      }
      throw error;
    }
  }

  /**
   * Get the hook program ID associated with this token
   * 
   * @returns Public key of the hook program
   */
  getHookProgramId(): PublicKey {
    return this.hookProgramId;
  }

  /**
   * Check if an address is the hook program ID for this token
   * 
   * @param address - Public key to check
   * @returns boolean indicating whether the address is the hook program
   */
  async isHookProgram(address: PublicKey): Promise<boolean> {
    return this.hookProgramId.equals(address);
  }
} 