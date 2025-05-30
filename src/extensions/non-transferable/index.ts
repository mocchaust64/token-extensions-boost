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
  createInitializeNonTransferableMintInstruction,
  getMintLen,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount,
  getMint
} from "@solana/spl-token";
import { Token } from "../../core/token";

/**
 * NonTransferableToken - Extension for non-transferable tokens
 * 
 * This extension prevents tokens from being transferred after they've been minted.
 * Useful for credentials, certificates, soulbound tokens, and other non-transferable assets.
 */
export class NonTransferableToken extends Token {
  constructor(
    connection: Connection,
    mint: PublicKey
  ) {
    super(connection, mint);
  }

  /**
   * Create instructions for a new NonTransferableToken
   * 
   * @param connection - Connection to Solana cluster
   * @param payer - Public key of the transaction fee payer
   * @param params - Initialization parameters including:
   *   - decimals: Number of decimal places
   *   - mintAuthority: Authority allowed to mint tokens
   *   - freezeAuthority: Optional authority allowed to freeze accounts
   * @returns Instructions, signers and mint address for the new token
   */
  static async createInstructions(
    connection: Connection,
    payer: PublicKey,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      freezeAuthority?: PublicKey | null;
    }
  ): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
    mint: PublicKey;
  }> {
    try {
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;
      
      const mintLen = getMintLen([ExtensionType.NonTransferable]);
      const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

      const instructions: TransactionInstruction[] = [
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mint,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeNonTransferableMintInstruction(
          mint,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          mint,
          params.decimals,
          params.mintAuthority,
          params.freezeAuthority ?? null,
          TOKEN_2022_PROGRAM_ID
        )
      ];

      return {
        instructions,
        signers: [mintKeypair],
        mint
      };
    } catch (error: any) {
      throw new Error(`Could not create NonTransferableToken instructions: ${error.message}`);
    }
  }

  /**
   * Create instructions to mint to an account
   * 
   * @param destination - Địa chỉ tài khoản nhận token
   * @param authority - Authority được phép mint token
   * @param amount - Số lượng token cần mint
   * @returns Object chứa instructions
   */
  createMintToInstructions(
    destination: PublicKey,
    authority: PublicKey,
    amount: bigint
  ): { instructions: TransactionInstruction[] } {
    const instructions: TransactionInstruction[] = [];
    
    // Thêm instruction mint token
    instructions.push(
      createMintToInstruction(
        this.mint,
        destination,
        authority,
        amount,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    return { instructions };
  }

  /**
   * Create instructions to mint to an account (phiên bản mở rộng)
   * 
   * @param owner - Chủ sở hữu tài khoản token
   * @param amount - Số lượng token cần mint
   * @param mintAuthority - Authority được phép mint token
   * @returns Instructions và địa chỉ tài khoản token
   */
  async createMintToInstructionsWithAddress(
    owner: PublicKey,
    amount: bigint,
    mintAuthority: PublicKey
  ): Promise<{
    instructions: TransactionInstruction[];
    address: PublicKey;
  }> {
    try {
      // Lấy địa chỉ token account
      const tokenAccount = await getAssociatedTokenAddress(
        this.mint,
        owner,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const instructions: TransactionInstruction[] = [];
      
      // Kiểm tra tài khoản đã tồn tại chưa
      try {
        await getAccount(this.connection, tokenAccount, "recent", TOKEN_2022_PROGRAM_ID);
      } catch (error) {
        // Tài khoản chưa tồn tại, thêm instruction tạo mới
        instructions.push(
          createAssociatedTokenAccountInstruction(
            owner, // payer
            tokenAccount,
            owner,
            this.mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Thêm instruction mint token
      instructions.push(
        createMintToInstruction(
          this.mint,
          tokenAccount,
          mintAuthority,
          amount,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      return {
        instructions,
        address: tokenAccount
      };
    } catch (error: any) {
      throw new Error(`Could not create mint instructions: ${error.message}`);
    }
  }

  /**
   * Check if the token is non-transferable
   * 
   * @returns Promise resolving to boolean
   */
  async isNonTransferable(): Promise<boolean> {
    try {
      const mintInfo = await getMint(this.connection, this.mint, "confirmed", TOKEN_2022_PROGRAM_ID);
     
      if (!mintInfo.tlvData || mintInfo.tlvData.length === 0) {
        console.log("Không có dữ liệu TLV cho mint");
        return false;
      }
  
      console.log(`Mint TLV data for ${this.mint.toBase58()}:`, mintInfo.tlvData);
      
      const NON_TRANSFERABLE_TYPE = 9; 
      
      let offset = 0;
      while (offset < mintInfo.tlvData.length) {
        if (offset + 4 > mintInfo.tlvData.length) break;
        const type = mintInfo.tlvData.readUInt32LE(offset);
        console.log(`Found extension type: ${type}`);
        
        if (type === NON_TRANSFERABLE_TYPE) {
          return true;
        }
        
        if (offset + 8 > mintInfo.tlvData.length) break;
        const length = mintInfo.tlvData.readUInt32LE(offset + 4);
        offset += 8 + length;
      }
      
      return false;
    } catch (error: any) {
      console.error("Error checking non-transferable status:", error);
      throw new Error(`Failed to check if token is non-transferable: ${error.message}`);
    }
  }

  /**
   * Get mint information
   * 
   * @returns Mint information
   */
  async getMintInfo(): Promise<any> {
    try {
      return await getMint(this.connection, this.mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    } catch (error: any) {
      throw new Error(`Failed to get mint info: ${error.message}`);
    }
  }

  /**
   * Get non-transferable information
   * 
   * @returns Object with isNonTransferable property
   */
  async getNonTransferableInfo(): Promise<{ isNonTransferable: boolean }> {
    const isNonTransferable = await this.isNonTransferable();
    return { isNonTransferable };
  }

  /**
   * Check if tokens can be transferred from a token account
   * For non-transferable tokens, this will always return false
   * 
   * @param tokenAccount - Token account to check
   * @returns Boolean indicating if tokens can be transferred
   */
  async canTransferTokens(tokenAccount: PublicKey): Promise<boolean> {
      const isNonTransferable = await this.isNonTransferable();
    return !isNonTransferable;
  }
} 