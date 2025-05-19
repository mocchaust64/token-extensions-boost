import {
  ExtensionType,
  getMintLen,
  createInitializeMetadataPointerInstruction,
  TOKEN_2022_PROGRAM_ID,
  LENGTH_SIZE,
  TYPE_SIZE,
  createUpdateMetadataPointerInstruction,
  createInitializeMintInstruction,
} from '@solana/spl-token';
import {
  pack,
  TokenMetadata,
  createInitializeInstruction,
  createUpdateFieldInstruction,
} from '@solana/spl-token-metadata';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Connection,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { getOptimalInitializationOrder } from './extension-helpers';

/**
 * Helper class để xử lý metadata tốt hơn khi kết hợp với các extension khác
 */
export class MetadataHelper {
  /**
   * Tính toán kích thước cần thiết cho metadata
   * 
   * @param metadata - Thông tin metadata
   * @returns Kích thước ước tính (bytes)
   */
  static calculateMetadataSize(metadata: {
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata?: Record<string, string>;
  }): number {
    // Tạo đối tượng TokenMetadata
    const tokenMetadata: TokenMetadata = {
      mint: PublicKey.default,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      additionalMetadata: metadata.additionalMetadata 
        ? Object.entries(metadata.additionalMetadata) 
        : [],
    };
    
    // Pack metadata để tính kích thước thực tế
    const packedData = pack(tokenMetadata);
    
    // Thêm header size (TYPE_SIZE + LENGTH_SIZE)
    const headerSize = TYPE_SIZE + LENGTH_SIZE;
    
    // Thêm padding để đảm bảo đủ kích thước
    const paddingFactor = 2;
    const metadataLen = headerSize + (packedData.length * paddingFactor);
    
    // Thêm kích thước tối thiểu để đảm bảo
    return Math.max(metadataLen, 2048);
  }

  /**
   * Tính toán kích thước cần thiết cho mint account với các extension và metadata
   * 
   * @param extensionTypes - Các loại extension cần thêm
   * @param metadata - Thông tin metadata (nếu có)
   * @returns Tổng kích thước cần thiết (bytes)
   */
  static calculateMintSize(
    extensionTypes: ExtensionType[],
    metadata?: {
      name: string;
      symbol: string;
      uri: string;
      additionalMetadata?: Record<string, string>;
    }
  ): number {
    // Đảm bảo MetadataPointer có trong extensionTypes nếu có metadata
    let allExtensions = [...extensionTypes];
    if (metadata && !allExtensions.includes(ExtensionType.MetadataPointer)) {
      allExtensions.push(ExtensionType.MetadataPointer);
    }
    
    // Tính kích thước cần thiết cho mint với các extension
    const mintLen = getMintLen(allExtensions);
    
    // Nếu không có thông tin metadata
    if (!metadata) {
      return mintLen;
    }
    
    // Tính kích thước cần thiết cho metadata
    const metadataSize = this.calculateMetadataSize(metadata);
    
    // Tổng kích thước = mint size + metadata size + thêm dự phòng
    const totalSize = mintLen + metadataSize + 1024; // Thêm 1KB dự phòng
    
    return totalSize;
  }

  /**
   * Tạo token với metadata tích hợp một cách đơn giản
   * Hàm này tuân thủ đúng thứ tự khởi tạo để đảm bảo hoạt động chính xác
   * 
   * @param connection - Kết nối Solana
   * @param payer - Người trả phí
   * @param params - Tham số khởi tạo
   * @returns Thông tin về token đã tạo
   */
  static async createTokenWithMetadata(
    connection: Connection,
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      name: string;
      symbol: string;
      uri: string;
      additionalMetadata?: Record<string, string>;
    }
  ): Promise<{
    mint: PublicKey;
    txId: string;
  }> {
    try {
      // Tạo keypair cho mint account
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;
      console.log(`Tạo token với mint address: ${mint.toString()}`);
      
      // Chuẩn bị metadata
      const metaData: TokenMetadata = {
        updateAuthority: payer.publicKey,
        mint: mint,
        name: params.name,
        symbol: params.symbol,
        uri: params.uri,
        additionalMetadata: params.additionalMetadata 
          ? Object.entries(params.additionalMetadata) 
          : [],
      };
      
      // Tính kích thước cho các phần
      const metadataExtension = TYPE_SIZE + LENGTH_SIZE; // 4 bytes (2 cho type, 2 cho length)
      const metadataLen = pack(metaData).length;
      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
      
      // Tính lamports cần thiết dựa trên tổng kích thước
      const lamports = await connection.getMinimumBalanceForRentExemption(
        mintLen + metadataExtension + metadataLen
      );
      
      console.log(`Kích thước: mint=${mintLen}, metadata extension=${metadataExtension}, metadata=${metadataLen}`);
      
      // Tạo transaction với tất cả các instruction cần thiết
      const transaction = new Transaction();
      
      // 1. Tạo account
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint,
          space: mintLen,  // Chỉ cần đủ cho mint với extension
          lamports, // Nhưng cần đủ lamports cho cả metadata
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      // 2. Khởi tạo MetadataPointer extension
      transaction.add(
        createInitializeMetadataPointerInstruction(
          mint,
          payer.publicKey,  // Update authority
          mint,  // Metadata address (trỏ đến chính nó)
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // 3. Khởi tạo Mint
      transaction.add(
        createInitializeMintInstruction(
          mint,
          params.decimals,
          params.mintAuthority,
          null, // Freeze Authority
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // 4. Khởi tạo Metadata
      transaction.add(
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: mint,
          updateAuthority: payer.publicKey,
          mint: mint,
          mintAuthority: params.mintAuthority,
          name: params.name,
          symbol: params.symbol,
          uri: params.uri,
        })
      );
      
      // 5. Thêm các trường metadata bổ sung
      if (params.additionalMetadata) {
        for (const [key, value] of Object.entries(params.additionalMetadata)) {
          transaction.add(
            createUpdateFieldInstruction({
              programId: TOKEN_2022_PROGRAM_ID,
              metadata: mint,
              updateAuthority: payer.publicKey,
              field: key,
              value: value,
            })
          );
        }
      }
      
      // Gửi transaction
      console.log("Đang gửi transaction...");
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`Token tạo thành công! Transaction: ${signature}`);
      
      return {
        mint,
        txId: signature
      };
    } catch (error) {
      console.error('Lỗi khi tạo token với metadata:', error);
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        console.error('Chi tiết lỗi:', errorMessage);
      }
      
      throw error;
    }
  }

  /**
   * Kiểm tra xem các extension có tương thích với nhau không
   * 
   * @param extensionTypes - Mảng các loại extension cần kiểm tra
   * @returns Kết quả kiểm tra tương thích
   */
  static checkExtensionCompatibility(extensionTypes: ExtensionType[]): {
    isCompatible: boolean;
    incompatiblePairs?: [ExtensionType, ExtensionType][];
    reason?: string;
  } {
    const incompatiblePairs: [ExtensionType, ExtensionType][] = [];
    
    // Kiểm tra các cặp không tương thích theo hướng dẫn Solana
    
    // NonTransferable không tương thích với các extension liên quan đến chuyển token
    if (extensionTypes.includes(ExtensionType.NonTransferable)) {
      if (extensionTypes.includes(ExtensionType.TransferFeeConfig)) {
        incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.TransferFeeConfig]);
      }
      
      if (extensionTypes.includes(ExtensionType.TransferHook)) {
        incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.TransferHook]);
      }
      
      if (extensionTypes.includes(ExtensionType.ConfidentialTransferMint)) {
        incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.ConfidentialTransferMint]);
      }
    }
    
    // ConfidentialTransfer không tương thích với một số extension
    if (extensionTypes.includes(ExtensionType.ConfidentialTransferMint)) {
      if (extensionTypes.includes(ExtensionType.TransferFeeConfig)) {
        incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.TransferFeeConfig]);
      }
      
      if (extensionTypes.includes(ExtensionType.TransferHook)) {
        incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.TransferHook]);
      }
      
      if (extensionTypes.includes(ExtensionType.PermanentDelegate)) {
        incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.PermanentDelegate]);
      }
    }
    
    return {
      isCompatible: incompatiblePairs.length === 0,
      incompatiblePairs: incompatiblePairs.length > 0 ? incompatiblePairs : undefined,
      reason: incompatiblePairs.length > 0 
        ? "Một số extension không tương thích với nhau" 
        : undefined
    };
  }

  /**
   * Tạo địa chỉ metadata dựa trên mint
   * 
   * @param mint - Địa chỉ của mint
   * @returns Địa chỉ của metadata
   */
  static findMetadataAddress(mint: PublicKey): PublicKey {
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      TOKEN_2022_PROGRAM_ID
    );
    
    return metadataAddress;
  }

  /**
   * Tạo thứ tự các bước để khởi tạo metadata đúng cách
   * 
   * @param mint - Địa chỉ của mint
   * @param updateAuthority - Địa chỉ có quyền cập nhật metadata
   * @param metadata - Thông tin metadata
   * @returns Thứ tự các bước
   */
  static getMetadataInstructions(
    mint: PublicKey, 
    updateAuthority: PublicKey,
    metadata: {
      name: string;
      symbol: string;
      uri: string;
      additionalMetadata?: Record<string, string>;
    }
  ): {
    metadataAddress: PublicKey;
    setupOrder: string[];
  } {
    const metadataAddress = this.findMetadataAddress(mint);
    
    // Thứ tự khởi tạo cho metadata
    const setupOrder = [
      "1. Initialize the metadata pointer on the mint",
      "2. Initialize the metadata account itself",
      "3. Set additional metadata fields",
      "4. Update the metadata pointer to point to the metadata account"
    ];
    
    return {
      metadataAddress,
      setupOrder
    };
  }
} 