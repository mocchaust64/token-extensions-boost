import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction, 
  SystemProgram,
  Signer
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
 * TokenAccountBuilder - Lớp hỗ trợ tạo token account với các extension
 * 
 * ImmutableOwner và các extension khác cho token account
 */
export class TokenAccountBuilder {
  private connection: Connection;
  private extensions: ExtensionType[] = [];
  
  // Thông tin cơ bản
  private mint?: PublicKey;
  private owner?: PublicKey;
  
  // Cài đặt cho các extension
  private defaultAccountState?: AccountState;
  
  /**
   * Khởi tạo builder với connection
   * 
   * @param connection - Connection đến Solana cluster
   */
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  /**
   * Thiết lập thông tin cơ bản cho token account
   * 
   * @param mint - Địa chỉ mint của token
   * @param owner - Chủ sở hữu của token account
   */
  setTokenAccountInfo(mint: PublicKey, owner: PublicKey): TokenAccountBuilder {
    this.mint = mint;
    this.owner = owner;
    return this;
  }
  
  /**
   * Thêm extension ImmutableOwner
   * ImmutableOwner ngăn chặn việc thay đổi chủ sở hữu của token account
   */
  addImmutableOwner(): TokenAccountBuilder {
    this.extensions.push(ExtensionType.ImmutableOwner);
    return this;
  }
  
  /**
   * Thêm extension DefaultAccountState
   * 
   * @param state - Trạng thái mặc định của account (frozen hoặc unlocked)
   */
  addDefaultAccountState(state: AccountState): TokenAccountBuilder {
    this.extensions.push(ExtensionType.DefaultAccountState);
    this.defaultAccountState = state;
    return this;
  }
  
  /**
   * Tạo token account thông thường (non-associated)
   * 
   * @param payer - Người trả phí giao dịch
   * @returns Thông tin về token account đã tạo
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
      // 1. Tạo keypair mới cho token account
      const tokenAccountKeypair = Keypair.generate();
      const tokenAccount = tokenAccountKeypair.publicKey;
      
      // 2. Tính kích thước account và rent
      const accountLen = getAccountLen(this.extensions);
      const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
      
      console.log(`Token account size: ${accountLen} bytes`);
      
      // 3. Tạo transaction
      const transaction = new Transaction();
      
      // Thứ tự khởi tạo đúng: 
      // 1. Tạo account
      // 2. Khởi tạo các extension
      // 3. Khởi tạo token account
      
      // Instruction tạo account
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: tokenAccount,
          space: accountLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      // Thêm các extension
      if (this.extensions.includes(ExtensionType.ImmutableOwner)) {
        transaction.add(
          createInitializeImmutableOwnerInstruction(
            tokenAccount,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.extensions.includes(ExtensionType.DefaultAccountState) && this.defaultAccountState) {
        transaction.add(
          createInitializeDefaultAccountStateInstruction(
            tokenAccount,
            this.defaultAccountState,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      // Cuối cùng, khởi tạo token account
      transaction.add(
        createInitializeAccountInstruction(
          tokenAccount,
          this.mint,
          this.owner,
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // 4. Gửi transaction
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
   * Tạo Associated Token Account với các extension
   * 
   * Lưu ý: Không phải tất cả extension đều hoạt động với ATA
   * 
   * @param payer - Người trả phí giao dịch
   * @returns Thông tin về token account đã tạo
   */
  async buildAssociatedAccount(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    transactionSignature: string;
  }> {
    if (!this.mint || !this.owner) {
      throw new Error("Mint and owner are required. Call setTokenAccountInfo first.");
    }
    
    try {
      // 1. Lấy địa chỉ ATA
      const tokenAccount = getAssociatedTokenAddressSync(
        this.mint,
        this.owner,
        true, // allowOwnerOffCurve
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // 2. Tạo transaction
      const transaction = new Transaction();
      
      // Chỉ có thể thêm ATA bình thường, không thể thêm các extension trực tiếp
      // Một số extension như ImmutableOwner được tự động áp dụng cho ATA
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
      
      // 3. Gửi transaction
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