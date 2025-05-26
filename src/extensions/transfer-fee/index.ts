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
  createInitializeTransferFeeConfigInstruction,
  getMintLen,
  createTransferCheckedWithFeeInstruction,
  createWithdrawWithheldTokensFromAccountsInstruction,
  createWithdrawWithheldTokensFromMintInstruction,
  createHarvestWithheldTokensToMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount,
  getTransferFeeAmount,
} from "@solana/spl-token";
import { Token } from "../../core/token";
import { TransferFeeConfig } from "../../types";

/**
 * TransferFeeToken - Extension for Token with transfer fee functionality
 * 
 * This extension allows automatic fee collection when transferring tokens,
 * with configurable fee rate and maximum fee amount.
 */
export class TransferFeeToken extends Token {
  private config: TransferFeeConfig;

  constructor(
    connection: Connection,
    mint: PublicKey,
    config: TransferFeeConfig
  ) {
    super(connection, mint);
    this.config = config;
  }

  /**
   * Create a new TransferFeeToken
   * 
   * @param connection - Connection to Solana cluster
   * @param payer - Transaction fee payer keypair
   * @param params - Initialization parameters including:
   *   - decimals: Number of decimal places
   *   - mintAuthority: Authority allowed to mint tokens
   *   - transferFeeConfig: Transfer fee configuration
   * @returns Newly created TransferFeeToken object
   */
  static async create(
    connection: Connection,
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      transferFeeConfig: {
        feeBasisPoints: number;
        maxFee: bigint;
        transferFeeConfigAuthority: Keypair;
        withdrawWithheldAuthority: Keypair;
      };
    }
  ): Promise<TransferFeeToken> {
    if (params.transferFeeConfig.feeBasisPoints < 0 || params.transferFeeConfig.feeBasisPoints > 10000) {
      throw new Error("Fee rate must be between 0 and 10000 basis points (0-100%)");
    }

    if (params.transferFeeConfig.maxFee < 0n) {
      throw new Error("Maximum fee cannot be negative");
    }

    try {
      const mintKeypair = Keypair.generate();
      const mintLen = getMintLen([ExtensionType.TransferFeeConfig]);
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeTransferFeeConfigInstruction(
          mintKeypair.publicKey,
          params.transferFeeConfig.transferFeeConfigAuthority.publicKey,
          params.transferFeeConfig.withdrawWithheldAuthority.publicKey,
          params.transferFeeConfig.feeBasisPoints,
          params.transferFeeConfig.maxFee,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          params.decimals,
          params.mintAuthority,
          null,
          TOKEN_2022_PROGRAM_ID
        )
      );

      await sendAndConfirmTransaction(connection, transaction, [
        payer,
        mintKeypair,
      ]);

      return new TransferFeeToken(connection, mintKeypair.publicKey, {
        feeBasisPoints: params.transferFeeConfig.feeBasisPoints,
        maxFee: params.transferFeeConfig.maxFee,
        transferFeeConfigAuthority: params.transferFeeConfig.transferFeeConfigAuthority,
        withdrawWithheldAuthority: params.transferFeeConfig.withdrawWithheldAuthority,
      });
    } catch (error: any) {
      throw new Error(`Could not create TransferFeeToken: ${error.message}`);
    }
  }

  /**
   * Calculate transfer fee based on token amount and fee configuration
   * 
   * @param amount - Token amount to transfer
   * @returns Calculated fee amount
   */
  calculateFee(amount: bigint): bigint {
    const fee = (amount * BigInt(this.config.feeBasisPoints)) / BigInt(10000);
    return fee > this.config.maxFee ? this.config.maxFee : fee;
  }

  /**
   * Execute token transfer with automatically calculated fee
   * 
   * @param source - Source account address
   * @param destination - Destination account address
   * @param owner - Source account owner
   * @param amount - Token amount to transfer
   * @param decimals - Token decimal places
   * @returns Transaction signature
   */
  async transfer(
    source: PublicKey,
    destination: PublicKey,
    owner: Signer,
    amount: bigint,
    decimals: number
  ): Promise<string> {
    try {
      const fee = this.calculateFee(amount);
      return await this.transferWithFee(source, destination, owner, amount, decimals, Number(fee));
    } catch (error: any) {
      throw new Error(`Could not transfer tokens: ${error.message}`);
    }
  }

  /**
   * Execute token transfer with specified fee
   * 
   * @param source - Source account address
   * @param destination - Destination account address
   * @param owner - Source account owner
   * @param amount - Token amount to transfer
   * @param decimals - Token decimal places
   * @param fee - Specified fee amount
   * @returns Transaction signature
   */
  async transferWithFee(
    source: PublicKey,
    destination: PublicKey,
    owner: Signer,
    amount: bigint,
    decimals: number,
    fee: number
  ): Promise<string> {
    try {
      const transaction = new Transaction().add(
        createTransferCheckedWithFeeInstruction(
          source,
          this.mint,
          destination,
          owner.publicKey,
          amount,
          decimals,
          BigInt(fee),
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      return await sendAndConfirmTransaction(this.connection, transaction, [owner]);
    } catch (error: any) {
      throw new Error(`Could not transfer tokens with fee: ${error.message}`);
    }
  }

  /**
   * Harvest withheld tokens from accounts to the mint
   * 
   * @param accounts - List of accounts with withheld fees to harvest
   * @param withdrawAuthority - Withdraw authority keypair (required if not set in constructor)
   * @returns Transaction signature
   */
  async harvestWithheldTokensToMint(
    accounts: PublicKey[],
    withdrawAuthority?: Keypair
  ): Promise<string> {
    if (accounts.length === 0) {
      throw new Error("Account list cannot be empty");
    }

    const authority = this.getWithdrawAuthority(withdrawAuthority);
    if (!authority) {
      throw new Error("Withdrawal authority is required");
    }

    try {
      const transaction = new Transaction().add(
        createHarvestWithheldTokensToMintInstruction(
          this.mint,
          accounts,
          TOKEN_2022_PROGRAM_ID
        )
      );

      return await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [authority]
      );
    } catch (error: any) {
      throw new Error(`Could not harvest fees to mint: ${error.message}`);
    }
  }

  /**
   * Withdraw withheld tokens from accounts to a destination account
   * 
   * @param accounts - List of accounts with withheld fees to withdraw
   * @param destination - Destination account to receive fees
   * @param withdrawAuthority - Withdraw authority keypair (required if not set in constructor)
   * @returns Transaction signature
   */
  async withdrawFeesFromAccounts(
    accounts: PublicKey[],
    destination: PublicKey,
    withdrawAuthority?: Keypair
  ): Promise<string> {
    if (accounts.length === 0) {
      throw new Error("Account list cannot be empty");
    }


    const authority = this.getWithdrawAuthority(withdrawAuthority);
    if (!authority) {
      throw new Error("Withdrawal authority is required");
    }

    const authorityPublicKey = authority instanceof Keypair 
      ? authority.publicKey 
      : authority;

    try {
      const transaction = new Transaction().add(
        createWithdrawWithheldTokensFromAccountsInstruction(
          this.mint,
          destination,
          authorityPublicKey,
          [],
          accounts,
          TOKEN_2022_PROGRAM_ID
        )
      );

      return await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [authority]
      );
    } catch (error: any) {
      throw new Error(`Could not withdraw fees from accounts: ${error.message}`);
    }
  }

  /**
   * Withdraw withheld tokens from mint to a destination account
   * 
   * @param destination - Destination account to receive fees
   * @param withdrawAuthority - Withdraw authority keypair (required if not set in constructor)
   * @returns Transaction signature
   */
  async withdrawFeesFromMint(
    destination: PublicKey, 
    withdrawAuthority?: Keypair
  ): Promise<string> {
    // Xác định authority để sử dụng
    const authority = this.getWithdrawAuthority(withdrawAuthority);
    if (!authority) {
      throw new Error("Withdrawal authority is required");
    }

    const authorityPublicKey = authority instanceof Keypair 
      ? authority.publicKey 
      : authority;

    try {
      const transaction = new Transaction().add(
        createWithdrawWithheldTokensFromMintInstruction(
          this.mint,
          destination,
          authorityPublicKey,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      return await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [authority]
      );
    } catch (error: any) {
      throw new Error(`Could not withdraw fees from mint: ${error.message}`);
    }
  }

  /**
   * Get the withdraw authority signer
   * 
   * @param providedAuthority - Optional withdraw authority to use
   * @returns Withdraw authority keypair or public key
   * @private
   */
  private getWithdrawAuthority(providedAuthority?: Keypair): Keypair | null {

    if (providedAuthority) {
      return providedAuthority;
    }

 
    if (this.config.withdrawWithheldAuthority) {
      if (this.config.withdrawWithheldAuthority instanceof Keypair) {
        return this.config.withdrawWithheldAuthority;
      }
    }


    return null;
  }

  /**
   * Create token account and mint tokens to it
   * 
   * @param owner - Token account owner address
   * @param payer - Transaction fee payer keypair
   * @param amount - Token amount to mint
   * @param mintAuthority - Mint authority keypair
   * @returns Created token account address and transaction signature
   */
  async createAccountAndMintTo(
    owner: PublicKey,
    payer: Keypair,
    amount: bigint,
    mintAuthority: Signer
  ): Promise<{ address: PublicKey; signature: string }> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(
        this.mint,
        owner,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const transaction = new Transaction();
      let accountCreated = false;
      
      try {
        await getAccount(this.connection, tokenAccount, "recent", TOKEN_2022_PROGRAM_ID);
      } catch (error) {
        accountCreated = true;
        transaction.add(
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            tokenAccount,
            owner,
            this.mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      const mintInstruction = createMintToInstruction(
        this.mint,
        tokenAccount,
        mintAuthority.publicKey,
        amount,
        [],
        TOKEN_2022_PROGRAM_ID
      );

      transaction.add(mintInstruction);

      const signature = await sendAndConfirmTransaction(
        this.connection, 
        transaction, 
        accountCreated || !(mintAuthority instanceof Keypair) ? 
          [payer, mintAuthority] : 
          [payer, mintAuthority instanceof Keypair ? mintAuthority : payer]
      );
      
      return { address: tokenAccount, signature };
    } catch (error: any) {
      throw new Error(`Could not create account and mint tokens: ${error.message}`);
    }
  }

  /**
   * Find all accounts with withheld fees
   * 
   * @returns List of public keys for accounts with withheld fees
   */
  async findAccountsWithWithheldFees(): Promise<PublicKey[]> {
    try {
      const accounts = await this.connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
        commitment: "confirmed",
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: this.mint.toString(),
            },
          },
        ],
      });

      const accountsWithFees: PublicKey[] = [];

      for (const { pubkey } of accounts) {
        try {
          const tokenAccount = await getAccount(this.connection, pubkey, "confirmed", TOKEN_2022_PROGRAM_ID);
          const feeAmount = getTransferFeeAmount(tokenAccount);
          
          if (feeAmount !== null && feeAmount.withheldAmount > 0) {
            accountsWithFees.push(pubkey);
          }
        } catch (error) {
         
        }
      }

      return accountsWithFees;
    } catch (error: any) {
      throw new Error(`Could not find accounts with fees: ${error.message}`);
    }
  }

  /**
   * Get transfer fee configuration
   * 
   * @returns TransferFeeConfig object
   */
  getTransferFeeConfig(): TransferFeeConfig {
    return { ...this.config };
  }

  /**
   * Lấy thông tin chi tiết về phí chuyển khoản hiện tại và phí đã giữ lại
   * 
   * @param tokenAccount - Địa chỉ tài khoản token cần kiểm tra
   * @returns Đối tượng chứa thông tin về phí
   *   - withheldAmount: Số lượng token đã giữ lại làm phí
   *   - hasOlderTransferFee: Cho biết tài khoản có phí từ giao dịch trước đó chưa được rút
   */
  async getAccountTransferFeeInfo(tokenAccount: PublicKey): Promise<{
    withheldAmount: bigint;
    hasOlderTransferFee: boolean;
  }> {
    try {
      const account = await getAccount(
        this.connection,
        tokenAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );

      const feeAmount = getTransferFeeAmount(account);
      if (!feeAmount) {
        return {
          withheldAmount: BigInt(0),
          hasOlderTransferFee: false
        };
      }

      return {
        withheldAmount: feeAmount.withheldAmount,
        hasOlderTransferFee: feeAmount.withheldAmount > BigInt(0)
      };
    } catch (error: any) {
      throw new Error(`Could not get transfer fee info: ${error.message}`);
    }
  }

  /**
   * Tính tổng số token đã giữ lại làm phí từ nhiều tài khoản
   * 
   * @param accounts - Danh sách các địa chỉ tài khoản token
   * @returns Tổng số token đã giữ lại
   */
  async getTotalWithheldAmount(accounts: PublicKey[]): Promise<bigint> {
    let totalWithheldAmount = BigInt(0);

    for (const account of accounts) {
      try {
        const feeInfo = await this.getAccountTransferFeeInfo(account);
        totalWithheldAmount += feeInfo.withheldAmount;
      } catch (error) {
        
      }
    }

    return totalWithheldAmount;
  }

  /**
   * Kiểm tra xem một địa chỉ có phải là withdraw withheld authority của token không
   * 
   * @param address - Địa chỉ cần kiểm tra
   * @returns true nếu là withdraw withheld authority, false nếu không phải
   */
  async isWithdrawWithheldAuthority(address: PublicKey): Promise<boolean> {
    if (!this.config.withdrawWithheldAuthority) {
      return false;
    }

    if (this.config.withdrawWithheldAuthority instanceof Keypair) {
      return this.config.withdrawWithheldAuthority.publicKey.equals(address);
    } else if (this.config.withdrawWithheldAuthority instanceof PublicKey) {
      return this.config.withdrawWithheldAuthority.equals(address);
    }

    return false;
  }

  /**
   * Tạo token account nếu chưa tồn tại hoặc trả về account đã tồn tại
   * 
   * @param payer - Người trả phí giao dịch
   * @param owner - Chủ sở hữu tài khoản token
   * @returns Đối tượng chứa địa chỉ tài khoản và chữ ký giao dịch
   */
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