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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccountLen,
  createInitializeAccountInstruction,
  createInitializeImmutableOwnerInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createAccount,
  createInitializeAccount2Instruction,
  createInitializeAccount3Instruction,
  AccountState,
  createInitializeDefaultAccountStateInstruction,
} from "@solana/spl-token";

/**
 * TokenAccount - Lớp hỗ trợ tạo token account với extensions
 */
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
   * Tạo token account thông thường
   * 
   * @param payer Người trả phí giao dịch
   * @returns Thông tin về token account
   */
  async createAccount(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    tokenAccountKeypair: Keypair;
    signature: string;
  }> {
    const tokenAccountKeypair = Keypair.generate();
    
    // Tính kích thước account và rent
    const accountLen = getAccountLen([]);
    const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
    
    // Tạo transaction
    const transaction = new Transaction();
    
    // Tạo và khởi tạo account
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
   * Tạo token account với ImmutableOwner extension
   * 
   * @param payer Người trả phí giao dịch
   * @returns Thông tin về token account
   */
  async createAccountWithImmutableOwner(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    tokenAccountKeypair: Keypair;
    signature: string;
  }> {
    const tokenAccountKeypair = Keypair.generate();
    
    // Tính kích thước account và rent
    const accountLen = getAccountLen([ExtensionType.ImmutableOwner]);
    const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
    
    // Tạo transaction
    const transaction = new Transaction();
    
    // Tạo account và khởi tạo
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: tokenAccountKeypair.publicKey,
        space: accountLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );
    
    // Khởi tạo ImmutableOwner trước
    transaction.add(
      createInitializeImmutableOwnerInstruction(
        tokenAccountKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Khởi tạo account sau
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
   * Tạo Associated Token Account
   * 
   * @param payer Người trả phí giao dịch
   * @returns Thông tin về token account
   */
  async createAssociatedTokenAccount(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    signature: string;
  }> {
    // Tính địa chỉ ATA
    const tokenAccount = getAssociatedTokenAddressSync(
      this.mint,
      this.owner,
      true, // allowOwnerOffCurve
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Tạo transaction
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
    
    // Gửi transaction
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
   * Phương pháp tạo Account3 - sử dụng createAccount và createInitializeAccount3Instruction
   * 
   * @param payer Người trả phí giao dịch
   * @returns Thông tin về token account
   */
  async createAccountWithImmutableOwnerAlt(payer: Keypair): Promise<{
    tokenAccount: PublicKey;
    signature: string;
  }> {
    // Tạo account bằng createAccount helper function
    const tokenAccount = await createAccount(
      this.connection,
      payer,
      this.mint,
      this.owner,
      undefined, // keypair
      { commitment: 'confirmed' },
      TOKEN_2022_PROGRAM_ID
    );
    
    return {
      tokenAccount,
      signature: "Used createAccount helper function"
    };
  }
  
  /**
   * Tạo token account với DefaultAccountState extension
   * 
   * @param payer Người trả phí giao dịch
   * @param state Trạng thái mặc định
   * @returns Thông tin về token account
   */
  async createAccountWithDefaultState(payer: Keypair, state: AccountState): Promise<{
    tokenAccount: PublicKey;
    tokenAccountKeypair: Keypair;
    signature: string;
  }> {
    const tokenAccountKeypair = Keypair.generate();
    
    // Tính kích thước account và rent
    const accountLen = getAccountLen([ExtensionType.DefaultAccountState]);
    const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
    
    // Tạo transaction
    const transaction = new Transaction();
    
    // Tạo account và khởi tạo
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: tokenAccountKeypair.publicKey,
        space: accountLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );
    
    // Khởi tạo DefaultAccountState trước
    transaction.add(
      createInitializeDefaultAccountStateInstruction(
        tokenAccountKeypair.publicKey,
        state,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Khởi tạo account sau
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
} 