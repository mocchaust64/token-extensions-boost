import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, Signer } from "@solana/web3.js";
import { 
  TOKEN_2022_PROGRAM_ID, 
  burn, 
  burnChecked,
  transferChecked,
  mintTo,
  mintToChecked,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError
} from "@solana/spl-token";

export class Token {
  protected connection: Connection;
  protected mint: PublicKey;

  constructor(connection: Connection, mint: PublicKey) {
    this.connection = connection;
    this.mint = mint;
  }

  getMint(): PublicKey {
    return this.mint;
  }

  getConnection(): Connection {
    return this.connection;
  }

  getProgramId(): PublicKey {
    return TOKEN_2022_PROGRAM_ID;
  }

  /**
   * Mint token vào tài khoản
   * 
   * @param destination - Địa chỉ tài khoản nhận token
   * @param authority - Authority được phép mint token
   * @param amount - Số lượng token cần mint
   * @param multiSigners - Danh sách signers nếu sử dụng multisig (tùy chọn)
   * @returns Chữ ký của transaction
   */
  async mintTo(
    destination: PublicKey,
    authority: Signer,
    amount: bigint,
    multiSigners: Signer[] = []
  ): Promise<string> {
    try {
      const mintSignature = await mintTo(
        this.connection,
        authority,
        this.mint,
        destination,
        authority,
        amount,
        multiSigners,
        undefined,
        this.getProgramId()
      );
      
      return mintSignature;
    } catch (error: any) {
      throw new Error(`Could not mint tokens: ${error.message}`);
    }
  }

  /**
   * Mint token vào tài khoản với kiểm tra decimals
   * 
   * @param destination - Địa chỉ tài khoản nhận token
   * @param authority - Authority được phép mint token
   * @param amount - Số lượng token cần mint
   * @param decimals - Số decimals của token
   * @param multiSigners - Danh sách signers nếu sử dụng multisig (tùy chọn)
   * @returns Chữ ký của transaction
   */
  async mintToChecked(
    destination: PublicKey,
    authority: Signer,
    amount: bigint,
    decimals: number,
    multiSigners: Signer[] = []
  ): Promise<string> {
    try {
      const mintSignature = await mintToChecked(
        this.connection,
        authority,
        this.mint,
        destination,
        authority,
        amount,
        decimals,
        multiSigners,
        undefined,
        this.getProgramId()
      );
      
      return mintSignature;
    } catch (error: any) {
      throw new Error(`Could not mint tokens with decimals check: ${error.message}`);
    }
  }

  /**
   * Tạo tài khoản token và mint token vào tài khoản đó
   * 
   * @param owner - Chủ sở hữu tài khoản token
   * @param payer - Người trả phí giao dịch
   * @param amount - Số lượng token cần mint
   * @param mintAuthority - Authority được phép mint token
   * @returns Địa chỉ tài khoản token và chữ ký giao dịch
   */
  async createAccountAndMintTo(
    owner: PublicKey,
    payer: Keypair,
    amount: bigint,
    mintAuthority: Signer
  ): Promise<{address: PublicKey; signature: string}> {
    try {
      // Tạo hoặc lấy tài khoản token
      const { address, signature: createSignature } = await this.createOrGetTokenAccount(
        payer,
        owner
      );

      // Mint token vào tài khoản
      const mintSignature = await this.mintTo(
        address,
        mintAuthority,
        amount
      );

      return { 
        address, 
        signature: createSignature ? createSignature : mintSignature 
      };
    } catch (error: any) {
      throw new Error(`Could not create account and mint tokens: ${error.message}`);
    }
  }

  /**
   * Đốt (burn) một số lượng token từ tài khoản
   * 
   * @param account - Địa chỉ tài khoản chứa token cần đốt
   * @param owner - Chủ sở hữu của tài khoản
   * @param amount - Số lượng token cần đốt
   * @returns Chữ ký của transaction
   */
  async burnTokens(
    account: PublicKey,
    owner: Signer,
    amount: bigint
  ): Promise<string> {
    try {
      const burnSignature = await burn(
        this.connection,
        owner,
        account,
        this.mint,
        owner.publicKey,
        amount,
        [],
        undefined,
        this.getProgramId()
      );
      
      return burnSignature;
    } catch (error: any) {
      throw new Error(`Could not burn tokens: ${error.message}`);
    }
  }

  /**
   * Đốt (burn) một số lượng token từ tài khoản với kiểm tra decimals
   * 
   * @param account - Địa chỉ tài khoản chứa token cần đốt
   * @param owner - Chủ sở hữu của tài khoản
   * @param amount - Số lượng token cần đốt
   * @param decimals - Số decimals của token
   * @returns Chữ ký của transaction
   */
  async burnTokensChecked(
    account: PublicKey,
    owner: Signer,
    amount: bigint,
    decimals: number
  ): Promise<string> {
    try {
      const burnSignature = await burnChecked(
        this.connection,
        owner,
        account,
        this.mint,
        owner.publicKey,
        amount,
        decimals,
        [],
        undefined,
        this.getProgramId()
      );
      
      return burnSignature;
    } catch (error: any) {
      throw new Error(`Could not burn tokens with decimals check: ${error.message}`);
    }
  }

  /**
   * Chuyển token với kiểm tra decimals
   * 
   * @param source - Địa chỉ tài khoản nguồn
   * @param destination - Địa chỉ tài khoản đích
   * @param owner - Chủ sở hữu tài khoản nguồn
   * @param amount - Số lượng token cần chuyển
   * @param decimals - Số decimals của token
   * @returns Chữ ký của transaction
   */
  async transfer(
    source: PublicKey,
    destination: PublicKey,
    owner: Signer,
    amount: bigint,
    decimals: number
  ): Promise<string> {
    try {
      const transferSignature = await transferChecked(
        this.connection,
        owner,
        source,
        this.mint,
        destination,
        owner.publicKey,
        amount,
        decimals,
        [],
        undefined,
        this.getProgramId()
      );
      
      return transferSignature;
    } catch (error: any) {
      throw new Error(`Could not transfer tokens: ${error.message}`);
    }
  }

  /**
   * Tạo hoặc lấy tài khoản token hiện có
   * 
   * @param payer - Người trả phí giao dịch
   * @param owner - Chủ sở hữu tài khoản token
   * @returns Địa chỉ tài khoản token và chữ ký giao dịch
   */
  async createOrGetTokenAccount(
    payer: Keypair,
    owner: PublicKey
  ): Promise<{ address: PublicKey; signature: string }> {
    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        this.mint,
        owner,
        false,
        this.getProgramId()
      );

      try {
        // Kiểm tra xem tài khoản đã tồn tại chưa
        await getAccount(
          this.connection,
          associatedTokenAddress,
          "confirmed",
          this.getProgramId()
        );
        return { address: associatedTokenAddress, signature: "" };
      } catch (error: any) {
        if (error instanceof TokenAccountNotFoundError) {
          // Tài khoản chưa tồn tại, tạo mới
          const transaction = new Transaction().add(
            createAssociatedTokenAccountInstruction(
              payer.publicKey,
              associatedTokenAddress,
              owner,
              this.mint,
              this.getProgramId()
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
    } catch (error: any) {
      throw new Error(`Could not create or get token account: ${error.message}`);
    }
  }
} 