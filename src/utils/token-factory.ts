import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram } from "@solana/web3.js";
import { ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeMintInstruction, getMintLen, createInitializeTransferFeeConfigInstruction, createInitializeMetadataPointerInstruction, createInitializeTransferHookInstruction } from "@solana/spl-token";
import { TransferFeeToken } from "../extensions/transfer-fee";
import { MetadataPointerToken } from "../extensions/metadata-pointer";
import { ImmutableOwnerToken } from "../extensions/immutable-owner";
import { PermanentDelegateToken } from "../extensions/permanent-delegate";
import { ConfidentialTransferToken } from "../extensions/confidential-transfer";
import { TransferHookToken } from "../extensions/transfer-hook";
import { NonTransferableToken } from "../extensions/non-transferable";
import { TransferFeeConfig } from "../types";
import { createInitializeInstruction, createUpdateFieldInstruction, pack, TokenMetadata } from "@solana/spl-token-metadata";
import { getOptimalInitializationOrder } from "./extension-helpers";
import { TokenBuilder } from "./token-builder";
import { Token } from "../core/token";

/**
 * Factory class cho token 2022 với token extensions
 */
export class Token2022Factory {
  private connection: Connection;

  /**
   * Constructor
   * 
   * @param connection - Kết nối đến Solana cluster
   */
  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Tạo token với nhiều extension
   * 
   * @param payer - Người trả phí transaction
   * @param params - Các thông số của token
   * @returns Promise với thông tin về token đã tạo
   */
  async createToken(
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      freezeAuthority?: PublicKey | null;
      extensions: {
        metadata?: {
          name: string;
          symbol: string;
          uri: string;
          additionalMetadata?: Record<string, string>;
        };
        transferFee?: {
          feeBasisPoints: number;
          maxFee: bigint;
          transferFeeConfigAuthority: PublicKey;
          withdrawWithheldAuthority: PublicKey;
        };
        permanentDelegate?: PublicKey;
        transferHook?: {
          programId: PublicKey;
          extraMetas?: PublicKey[];
        };
        nonTransferable?: boolean;
        confidentialTransfer?: {
          autoEnable?: boolean;
        };
      }
    }
  ): Promise<{
    mint: PublicKey;
    transactionSignature: string;
    token: Token;
  }> {
    // Sử dụng TokenBuilder để xây dựng và tạo token
    const builder = new TokenBuilder(this.connection)
      .setTokenInfo(
        params.decimals,
        params.mintAuthority,
        params.freezeAuthority || null
      );

    // Thêm các extension được yêu cầu
    const { extensions } = params;
    
    if (extensions.metadata) {
      const { name, symbol, uri, additionalMetadata } = extensions.metadata;
      builder.addMetadata(name, symbol, uri, additionalMetadata);
    }
    
    if (extensions.transferFee) {
      const { feeBasisPoints, maxFee, transferFeeConfigAuthority, withdrawWithheldAuthority } = extensions.transferFee;
      builder.addTransferFee(feeBasisPoints, maxFee, transferFeeConfigAuthority, withdrawWithheldAuthority);
    }
    
    if (extensions.permanentDelegate) {
      builder.addPermanentDelegate(extensions.permanentDelegate);
    }
    
    if (extensions.transferHook) {
      const { programId, extraMetas } = extensions.transferHook;
      builder.addTransferHook(programId, extraMetas);
    }
    
    if (extensions.nonTransferable) {
      builder.addNonTransferable();
    }
    
    if (extensions.confidentialTransfer) {
      builder.addConfidentialTransfer(extensions.confidentialTransfer.autoEnable);
    }
    
    // Build token
    return builder.build(payer);
  }

  /**
   * Tạo token kết hợp Transfer Fee và Metadata
   * 
   * @param payer - Người trả phí transaction
   * @param params - Các thông số của token
   * @returns Promise với thông tin về token đã tạo
   */
  async createTransferFeeWithMetadataToken(
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      transferFee: {
        feeBasisPoints: number;
        maxFee: bigint;
        transferFeeConfigAuthority: Keypair | PublicKey;
        withdrawWithheldAuthority: Keypair | PublicKey;
      },
      metadata: {
        name: string;
        symbol: string;
        uri: string;
        additionalMetadata?: Record<string, string>;
      }
    }
  ): Promise<{ transferFeeToken: TransferFeeToken; metadataToken: MetadataPointerToken; mint: PublicKey }> {
    try {
      const { decimals, mintAuthority, transferFee, metadata } = params;
      const { feeBasisPoints, maxFee, transferFeeConfigAuthority, withdrawWithheldAuthority } = transferFee;
      const { name, symbol, uri, additionalMetadata } = metadata;
      
      // Sử dụng createToken để tạo token với cả hai extension
      const result = await this.createToken(payer, {
        decimals,
        mintAuthority,
        extensions: {
          transferFee: {
            feeBasisPoints,
            maxFee,
            transferFeeConfigAuthority: transferFeeConfigAuthority instanceof Keypair 
              ? transferFeeConfigAuthority.publicKey 
              : transferFeeConfigAuthority,
            withdrawWithheldAuthority: withdrawWithheldAuthority instanceof Keypair
              ? withdrawWithheldAuthority.publicKey
              : withdrawWithheldAuthority
          },
          metadata: {
            name,
            symbol,
            uri,
            additionalMetadata
          }
        }
      });
      
      // Tạo các đối tượng token chuyên biệt
      const transferFeeToken = new TransferFeeToken(this.connection, result.mint, {
        feeBasisPoints,
        maxFee,
        transferFeeConfigAuthority: transferFeeConfigAuthority instanceof Keypair 
          ? transferFeeConfigAuthority.publicKey 
          : transferFeeConfigAuthority,
        withdrawWithheldAuthority: withdrawWithheldAuthority instanceof Keypair
          ? withdrawWithheldAuthority.publicKey
          : withdrawWithheldAuthority
      });
      
      const metadataToken = new MetadataPointerToken(this.connection, result.mint, metadata);
      
      return { 
        transferFeeToken, 
        metadataToken, 
        mint: result.mint 
      };
    } catch (error: unknown) {
      console.error("Error creating token with transfer fee and metadata:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create token with transfer fee and metadata: ${errorMessage}`);
    }
  }

  /**
   * Tạo token với Transfer Fee
   * 
   * @param payer - Người trả phí transaction
   * @param params - Các thông số của token
   * @returns Promise với token đã tạo
   */
  async createTransferFeeToken(
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
    return TransferFeeToken.create(this.connection, payer, params);
  }

  /**
   * Tạo token với Metadata
   * 
   * @param payer - Người trả phí transaction
   * @param params - Các thông số của token
   * @returns Promise với token đã tạo
   */
  async createMetadataPointerToken(
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      metadata: {
        name: string;
        symbol: string;
        uri: string;
        additionalMetadata?: Record<string, string>;
      };
    }
  ): Promise<MetadataPointerToken> {
    return MetadataPointerToken.create(this.connection, payer, params);
  }
  
  /**
   * Tạo token với Permanent Delegate
   * 
   * @param payer - Người trả phí transaction
   * @param params - Các thông số của token
   * @returns Promise với token đã tạo
   */
  async createPermanentDelegateToken(
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      freezeAuthority?: PublicKey | null;
      permanentDelegate: PublicKey;
    }
  ): Promise<PermanentDelegateToken> {
    return PermanentDelegateToken.create(this.connection, payer, params);
  }
  
  /**
   * Tạo token với Confidential Transfer
   * 
   * @param payer - Người trả phí transaction
   * @param params - Các thông số của token
   * @returns Promise với token đã tạo
   */
  async createConfidentialTransferToken(
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      freezeAuthority?: PublicKey | null;
      autoEnable?: boolean;
    }
  ): Promise<ConfidentialTransferToken> {
    return ConfidentialTransferToken.create(this.connection, payer, params);
  }
  
  /**
   * Lấy đối tượng TransferFeeToken từ mint address
   * 
   * @param mint - Địa chỉ mint của token
   * @param config - Cấu hình transfer fee (tùy chọn)
   * @returns Đối tượng TransferFeeToken
   */
  getTransferFeeToken(mint: PublicKey, config?: TransferFeeConfig): TransferFeeToken {
    if (config) {
      return new TransferFeeToken(this.connection, mint, config);
    } else {
      const defaultConfig: TransferFeeConfig = {
        feeBasisPoints: 0,
        maxFee: BigInt(0),
        transferFeeConfigAuthority: null,
        withdrawWithheldAuthority: null
      };
      return new TransferFeeToken(this.connection, mint, defaultConfig);
    }
  }
  
  /**
   * Lấy đối tượng MetadataPointerToken từ mint address
   * 
   * @param mint - Địa chỉ mint của token
   * @param metadata - Thông tin metadata
   * @returns Đối tượng MetadataPointerToken
   */
  getMetadataPointerToken(
    mint: PublicKey,
    metadata: {
      name: string;
      symbol: string;
      uri: string;
      additionalMetadata?: Record<string, string>;
    }
  ): MetadataPointerToken {
    return new MetadataPointerToken(this.connection, mint, metadata);
  }
  
  /**
   * Lấy đối tượng PermanentDelegateToken từ mint address
   * 
   * @param mint - Địa chỉ mint của token
   * @param delegate - Địa chỉ permanent delegate
   * @returns Đối tượng PermanentDelegateToken
   */
  getPermanentDelegateToken(mint: PublicKey, delegate: PublicKey): PermanentDelegateToken {
    return new PermanentDelegateToken(this.connection, mint, delegate);
  }

  /**
   * Lấy đối tượng TransferHookToken từ mint address
   * 
   * @param mint - Địa chỉ mint của token
   * @param programId - ID của chương trình hook
   * @returns Đối tượng TransferHookToken
   */
  getTransferHookToken(mint: PublicKey, programId: PublicKey): TransferHookToken {
    return new TransferHookToken(this.connection, mint, programId);
  }

  /**
   * Lấy đối tượng NonTransferableToken từ mint address
   * 
   * @param mint - Địa chỉ mint của token
   * @returns Đối tượng NonTransferableToken
   */
  getNonTransferableToken(mint: PublicKey): NonTransferableToken {
    return new NonTransferableToken(this.connection, mint);
  }
  
  /**
   * Lấy đối tượng ConfidentialTransferToken từ mint address
   * 
   * @param mint - Địa chỉ mint của token
   * @returns Đối tượng ConfidentialTransferToken
   */
  getConfidentialTransferToken(mint: PublicKey): ConfidentialTransferToken {
    return new ConfidentialTransferToken(this.connection, mint);
  }

  /**
   * Tạo token với NonTransferable và Metadata
   * 
   * @param payer - Người trả phí giao dịch
   * @param params - Tham số token
   * @returns Tuple chứa NonTransferableToken và MetadataPointerToken
   */
  async createNonTransferableWithMetadataToken(
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      freezeAuthority?: PublicKey | null;
      metadata: {
        name: string;
        symbol: string;
        uri: string;
        additionalMetadata?: Record<string, string>;
      }
    }
  ): Promise<{ nonTransferableToken: NonTransferableToken; metadataToken: MetadataPointerToken; mint: PublicKey }> {
    try {
      // Xác định extension cần thêm
      const extensionTypes = [ExtensionType.NonTransferable, ExtensionType.MetadataPointer];
      const orderedExtensionTypes = getOptimalInitializationOrder(extensionTypes);
      
      // Tạo keypair cho mint
      const mintKeypair = Keypair.generate();
      
      // Tính kích thước mint và metadata
      const mintLen = getMintLen(extensionTypes);
      
      // Tính thêm khoảng trống cho metadata
      const tokenMetadata: TokenMetadata = {
        mint: mintKeypair.publicKey,
        name: params.metadata.name,
        symbol: params.metadata.symbol,
        uri: params.metadata.uri,
        additionalMetadata: Object.entries(params.metadata.additionalMetadata || {}).map(
          ([key, value]) => [key, value]
        ),
      };
      const metadataLen = pack(tokenMetadata).length + 4;
      
      // Tính phí cho cả mintLen + metadataLen nhưng chỉ cấp phát mintLen
      const lamports = await this.connection.getMinimumBalanceForRentExemption(
        mintLen + metadataLen
      );
      
      console.log(`DEBUG: Creating non-transferable token with mintLen: ${mintLen}, metadataLen: ${metadataLen}, total: ${mintLen + metadataLen}`);
      
      // Tạo transaction
      const transaction = new Transaction();
      
      // Tạo tài khoản cho mint
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      // Khởi tạo các extension theo thứ tự đã sắp xếp
      for (const extensionType of orderedExtensionTypes) {
        switch (extensionType) {
          case ExtensionType.NonTransferable:
            const nonTransferableIx = require("@solana/spl-token").createInitializeNonTransferableMintInstruction(
              mintKeypair.publicKey,
              TOKEN_2022_PROGRAM_ID
            );
            transaction.add(nonTransferableIx);
            break;
            
          case ExtensionType.MetadataPointer:
            transaction.add(
              createInitializeMetadataPointerInstruction(
                mintKeypair.publicKey,
                payer.publicKey,
                mintKeypair.publicKey,
                TOKEN_2022_PROGRAM_ID
              )
            );
            break;
        }
      }
      
      // Khởi tạo mint
      transaction.add(
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          params.decimals,
          params.mintAuthority,
          params.freezeAuthority ?? null,
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // Khởi tạo metadata
      transaction.add(
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: mintKeypair.publicKey,
          updateAuthority: payer.publicKey,
          mint: mintKeypair.publicKey,
          mintAuthority: params.mintAuthority,
          name: params.metadata.name,
          symbol: params.metadata.symbol,
          uri: params.metadata.uri,
        })
      );
      
      // Thêm additionalMetadata nếu có
      if (params.metadata.additionalMetadata) {
        for (const [key, value] of Object.entries(params.metadata.additionalMetadata)) {
          transaction.add(
            createUpdateFieldInstruction({
              programId: TOKEN_2022_PROGRAM_ID,
              metadata: mintKeypair.publicKey,
              updateAuthority: payer.publicKey,
              field: key,
              value: value,
            })
          );
        }
      }
      
      // Gửi transaction
      await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer, mintKeypair],
        { commitment: 'confirmed', skipPreflight: true }
      );
      
      // Khởi tạo và trả về các đối tượng token
      const nonTransferableToken = new NonTransferableToken(this.connection, mintKeypair.publicKey);
      const metadataToken = new MetadataPointerToken(this.connection, mintKeypair.publicKey, params.metadata);
      
      return { 
        nonTransferableToken, 
        metadataToken, 
        mint: mintKeypair.publicKey 
      };
    } catch (error: unknown) {
      console.error("Error creating token with non-transferable and metadata:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create token with non-transferable and metadata: ${errorMessage}`);
    }
  }
} 