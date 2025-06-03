import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  TransactionSignature,
  TransactionInstruction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeMetadataPointerInstruction,
  createUpdateMetadataPointerInstruction,
  getMintLen,
  getMint,
  getMetadataPointerState,
  getTokenMetadata,
  LENGTH_SIZE,
  TYPE_SIZE,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  createRemoveKeyInstruction,
  createUpdateAuthorityInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import { Token } from "../../core/token";

export interface MetadataConfig {
  name: string;
  symbol: string;
  uri: string;
  additionalMetadata?: Record<string, string>;
}

export interface NFTMetadataContent {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export type MetadataUpdateResult = {
  signature: TransactionSignature;
  metadata: TokenMetadata;
};

export type MetadataInstructionResult = {
  instructions: TransactionInstruction[];
  metadata?: TokenMetadata;
};

export class TokenMetadataToken extends Token {
  private metadata: MetadataConfig;

  constructor(
    connection: Connection,
    mint: PublicKey,
    metadata: MetadataConfig
  ) {
    super(connection, mint);
    this.metadata = metadata;
  }

 
  getMintAddress(): PublicKey {
    return this.mint;
  }


  static async create(
    connection: Connection,
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      metadata: MetadataConfig;
    }
  ): Promise<TokenMetadataToken> {
    const { decimals, mintAuthority, metadata } = params;
    
 
    if (!metadata.name || metadata.name.length > 32) {
      throw new Error("Metadata name is required and must be 32 characters or less");
    }
    
    if (!metadata.symbol || metadata.symbol.length > 10) {
      throw new Error("Metadata symbol is required and must be 10 characters or less");
    }
    
    if (!metadata.uri || metadata.uri.length > 200) {
      throw new Error("Metadata URI is required and must be 200 characters or less");
    }

    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    const tokenMetadata: TokenMetadata = {
      mint: mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(
        ([key, value]) => [key, value]
      ),
    };

    try {

      const metadataExtension = TYPE_SIZE + LENGTH_SIZE; // 4 bytes
      const metadataLen = pack(tokenMetadata).length;
      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
      const totalSize = mintLen + metadataExtension + metadataLen + 2048;
      console.log(`Kích thước mint: ${mintLen} bytes, metadata: ${metadataLen} bytes, extension: ${metadataExtension} bytes, tổng: ${totalSize} bytes`);
      
      const lamports = await connection.getMinimumBalanceForRentExemption(totalSize);
      console.log("step 1: create account...");
      
      const createAccountTx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint,
          space: totalSize,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      const createAccountSignature = await sendAndConfirmTransaction(
        connection,
        createAccountTx,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`Transaction succested : ${createAccountSignature.substring(0, 16)}...`);
      console.log(`Explorer: https://explorer.solana.com/tx/${createAccountSignature}?cluster=devnet`);   
      await new Promise(resolve => setTimeout(resolve, 2500));   
      console.log("step 2: create MetadataPointer...");
      
      const initPointerTx = new Transaction().add(
        createInitializeMetadataPointerInstruction(
          mint,
          payer.publicKey,
          null, 
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      const initPointerSignature = await sendAndConfirmTransaction(
        connection,
        initPointerTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Transaction create MetadataPointer succesed: ${initPointerSignature.substring(0, 16)}...`);
      console.log(`Explorer: https://explorer.solana.com/tx/${initPointerSignature}?cluster=devnet`);
      await new Promise(resolve => setTimeout(resolve, 2500));
      console.log("step 3: create Mint...");
      
      const initMintTx = new Transaction().add(
        createInitializeMintInstruction(
          mint,
          decimals,
          mintAuthority,
          null, 
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      const initMintSignature = await sendAndConfirmTransaction(
        connection,
        initMintTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Transaction create Mint succesed: ${initMintSignature.substring(0, 16)}...`);
      console.log(`Explorer: https://explorer.solana.com/tx/${initMintSignature}?cluster=devnet`);
      
      await new Promise(resolve => setTimeout(resolve, 2500));
      console.log("step 4: update MetadataPointer...");
      
      const updatePointerTx = new Transaction().add(
        createUpdateMetadataPointerInstruction(
          mint,
          payer.publicKey,
          mint,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      const updatePointerSignature = await sendAndConfirmTransaction(
        connection,
        updatePointerTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Transaction update MetadataPointer succesed: ${updatePointerSignature.substring(0, 16)}...`);
      console.log(`Explorer: https://explorer.solana.com/tx/${updatePointerSignature}?cluster=devnet`);
      
      await new Promise(resolve => setTimeout(resolve, 2500));
      console.log("step 5: initialize metadata...");
      
      const initMetadataTx = new Transaction().add(
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: mint, 
          updateAuthority: payer.publicKey,
          mint: mint,
          mintAuthority: payer.publicKey,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
        })
      );
      
      const initMetadataSignature = await sendAndConfirmTransaction(
        connection,
        initMetadataTx,
        [payer],
        { commitment: 'confirmed' }
      );
      
      console.log(`Transaction initialize metadata succesed: ${initMetadataSignature.substring(0, 16)}...`);
      console.log(`Explorer: https://explorer.solana.com/tx/${initMetadataSignature}?cluster=devnet`);
      
      // Thêm các trường metadata bổ sung
      if (metadata.additionalMetadata && Object.keys(metadata.additionalMetadata).length > 0) {
        console.log("step 6: adding additional metadata fields...");
        
        for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
          try {
          const addFieldTx = new Transaction().add(
            createUpdateFieldInstruction({
              programId: TOKEN_2022_PROGRAM_ID,
              metadata: mint,
              updateAuthority: payer.publicKey,
              field: key,
                value: value
            })
          );
          
            const addFieldSignature = await sendAndConfirmTransaction(
              connection,
              addFieldTx,
              [payer],
              { commitment: 'confirmed' }
            );
            
            console.log(`  ✓ Thêm trường "${key}" thành công: ${addFieldSignature.substring(0, 16)}...`);
          } catch (err) {
            console.warn(`  ⚠ Không thể thêm trường "${key}": ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
      
   
      console.log(`🔍explorer: https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);

      return new TokenMetadataToken(connection, mint, metadata);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Lỗi khi tạo token với metadata: ${errorMessage}`);
      throw new Error(`Failed to create token with metadata: ${errorMessage}`);
    }
  }

  static async fromMint(
    connection: Connection, 
    mint: PublicKey
  ): Promise<TokenMetadataToken | null> {
    try {
      const tokenMetadata = await getTokenMetadata(
        connection,
        mint,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );

      if (!tokenMetadata) {
        return null;
      }

      const additionalMetadata: Record<string, string> = {};
      if (tokenMetadata.additionalMetadata) {
        for (const [key, value] of tokenMetadata.additionalMetadata) {
          additionalMetadata[key] = value;
        }
      }

      const metadata: MetadataConfig = {
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
        uri: tokenMetadata.uri,
        additionalMetadata
      };

      return new TokenMetadataToken(connection, mint, metadata);
    } catch (error) {
      console.error("Error loading metadata token:", error);
      return null;
    }
  }

  async getTokenMetadata(): Promise<TokenMetadata> {
    const metadata = await getTokenMetadata(
      this.connection,
      this.mint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    
    if (!metadata) {
      throw new Error("No metadata found for this token");
    }
    
    return metadata;
  }

  async updateMetadataField(
    authority: Keypair,
    field: string,
    value: string
  ): Promise<MetadataUpdateResult> {
    const instruction = createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: this.mint,
      updateAuthority: authority.publicKey,
      field,
      value,
    });

    const transaction = new Transaction().add(instruction);
    
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [authority],
      { commitment: 'confirmed' }
    );

    const metadata = await this.getTokenMetadata();
    
    return { signature, metadata };
  }

  // New method for wallet adapter compatibility
  createUpdateMetadataFieldInstruction(
    updateAuthority: PublicKey,
    field: string,
    value: string
  ): TransactionInstruction {
    return createUpdateFieldInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: this.mint,
      updateAuthority: updateAuthority,
      field,
      value,
    });
  }


  async removeMetadataField(
    authority: Keypair,
    key: string
  ): Promise<MetadataUpdateResult> {
    const instruction = createRemoveKeyInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: this.mint,
      updateAuthority: authority.publicKey,
      key,
      idempotent: false
    });

    const transaction = new Transaction().add(instruction);
    
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [authority],
      { commitment: 'confirmed' }
    );

    const metadata = await this.getTokenMetadata();
    
    return { signature, metadata };
  }

  // New method for wallet adapter compatibility
  createRemoveMetadataFieldInstruction(
    updateAuthority: PublicKey,
    key: string,
    idempotent: boolean = false
  ): TransactionInstruction {
    return createRemoveKeyInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: this.mint,
      updateAuthority: updateAuthority,
      key,
      idempotent
    });
  }


  async updateMetadataBatch(
    authority: Keypair,
    fields: Record<string, string>
  ): Promise<MetadataUpdateResult> {
    const transaction = new Transaction();
    
    for (const [key, value] of Object.entries(fields)) {
      transaction.add(
        createUpdateFieldInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: this.mint,
          updateAuthority: authority.publicKey,
          field: key,
          value,
        })
      );
    }
    
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [authority],
      { commitment: 'confirmed' }
    );

    const metadata = await this.getTokenMetadata();
    
    return { signature, metadata };
  }

  // New method for wallet adapter compatibility
  createUpdateMetadataBatchInstructions(
    updateAuthority: PublicKey,
    fields: Record<string, string>
  ): TransactionInstruction[] {
    const instructions: TransactionInstruction[] = [];
    
    for (const [key, value] of Object.entries(fields)) {
      instructions.push(
        createUpdateFieldInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: this.mint,
          updateAuthority: updateAuthority,
          field: key,
          value,
        })
      );
    }
    
    return instructions;
  }

  async getNFTMetadata(): Promise<NFTMetadataContent> {
    const metadata = await this.getTokenMetadata();
    
    if (!metadata.uri) {
      throw new Error("Token metadata has no URI");
    }
    
    const response = await fetch(metadata.uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata from ${metadata.uri}`);
    }
    
    return await response.json();
  }


  getMetadataConfig(): MetadataConfig {
    return this.metadata;
  }

  async updateMetadataAuthority(
    currentAuthority: Keypair,
    newAuthority: PublicKey | null
  ): Promise<TransactionSignature> {
    const instruction = createUpdateAuthorityInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: this.mint,
      oldAuthority: currentAuthority.publicKey,
      newAuthority: newAuthority,
    });

    const transaction = new Transaction().add(instruction);
    
    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [currentAuthority],
      { commitment: 'confirmed' }
    );
  }

  // New method for wallet adapter compatibility
  createUpdateMetadataAuthorityInstruction(
    currentAuthority: PublicKey,
    newAuthority: PublicKey | null
  ): TransactionInstruction {
    return createUpdateAuthorityInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: this.mint,
      oldAuthority: currentAuthority,
      newAuthority: newAuthority,
    });
  }

  /**
   * Tạo instruction ưu tiên với mức phí thích hợp
   * @param priorityLevel Mức độ ưu tiên: 'low', 'medium', 'high'
   * @returns Instruction phí ưu tiên 
   */
  static createPriorityFeeInstruction(
    priorityLevel: 'low' | 'medium' | 'high' = 'medium'
  ): TransactionInstruction {
    let microLamports: number;
    
    switch(priorityLevel) {
      case 'low': 
        microLamports = 5_000;
        break;
      case 'high':
        microLamports = 20_000;
        break;
      case 'medium':
      default:
        microLamports = 10_000;
    }
    
    return ComputeBudgetProgram.setComputeUnitPrice({
      microLamports,
    });
  }

  /**
   * Tính toán và cấp phát không gian cho metadata
   * @param connection Kết nối Solana
   * @param payer PublicKey của người trả phí
   * @param fieldName Tên trường metadata
   * @param fieldValue Giá trị trường metadata
   * @returns Instruction để cấp phát thêm không gian (hoặc null nếu không cần)
   */
  async calculateAndAllocateStorage(
    connection: Connection,
    payer: PublicKey,
    fieldName: string, 
    fieldValue: string
  ): Promise<TransactionInstruction | null> {
    try {
      // Lấy metadata hiện tại để so sánh kích thước
      const currentMetadata = await getTokenMetadata(
        connection,
        this.mint,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      
      // Tìm trường metadata hiện tại để so sánh
      let currentFieldValue = "";
      if (fieldName === "uri" && currentMetadata) {
        currentFieldValue = currentMetadata.uri || "";
      } else if (currentMetadata?.additionalMetadata) {
        for (const [key, value] of currentMetadata.additionalMetadata) {
          if (key === fieldName) {
            currentFieldValue = value;
            break;
          }
        }
      }
      
      // 1. So sánh kích thước: Chỉ cấp phát nếu giá trị mới dài hơn giá trị cũ
      if (fieldValue.length <= currentFieldValue.length) {
        console.log(`🔍 Không cần cấp phát không gian cho trường "${fieldName}": Giá trị mới (${fieldValue.length} bytes) <= giá trị cũ (${currentFieldValue.length} bytes)`);
        return null; // Không cần cấp phát nếu giá trị mới ngắn hơn hoặc bằng
      }
      
      // 2. Tính toán không gian thực sự cần thêm (chỉ phần tăng thêm)
      const additionalSize = fieldValue.length - currentFieldValue.length;
      
      // Thêm padding cho phần mở rộng nếu cần
      const paddingSize = fieldName === "uri" ? 8 : 4;
      const totalAdditionalSize = additionalSize + paddingSize;
      
      // 3. Lấy chi phí rent exemption chính xác cho số byte bổ sung
      const rentPerByte = await connection.getMinimumBalanceForRentExemption(1);
      const requiredLamports = totalAdditionalSize * rentPerByte;
      
      console.log(`🔄 Cấp phát thêm ${totalAdditionalSize} bytes cho trường "${fieldName}" (${requiredLamports / LAMPORTS_PER_SOL} SOL)`);
      
      // 4. Tạo instruction chuyển SOL cho không gian bổ sung
      return SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: this.mint,
        lamports: requiredLamports,
      });
    } catch (error) {
      console.error(`❌ Lỗi khi tính toán không gian cho trường "${fieldName}":`, error);
      
      // Nếu có lỗi khi tính toán, sử dụng phương pháp đơn giản
      // Tính toán không gian cần thiết cho trường mới (phương pháp dự phòng)
      const estimatedSize = fieldName.length + fieldValue.length + 16; // Tăng thêm padding
      const rentPerByte = await connection.getMinimumBalanceForRentExemption(1);
      
      console.log(`⚠️ Sử dụng phương pháp dự phòng: cấp phát ${estimatedSize} bytes (${(estimatedSize * rentPerByte) / LAMPORTS_PER_SOL} SOL)`);
      
      return SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: this.mint,
        lamports: estimatedSize * rentPerByte,
      });
    }
  }

  /**
   * Tính toán và cấp phát không gian hiệu quả cho nhiều trường metadata
   * @param connection Kết nối Solana
   * @param payer PublicKey của người trả phí
   * @param fields Các trường metadata cần cập nhật
   * @returns Instruction để cấp phát thêm không gian (hoặc null nếu không cần)
   */
  async calculateBatchStorageInstruction(
    connection: Connection,
    payer: PublicKey,
    fields: Record<string, string>
  ): Promise<TransactionInstruction | null> {
    try {
      // 1. Kiểm tra metadata hiện tại để xác định trường nào mới hoặc cần thêm dung lượng
      const currentMetadata = await getTokenMetadata(
        connection,
        this.mint,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      
      // Chuyển additionalMetadata hiện tại thành đối tượng để dễ so sánh
      const currentFields: Record<string, string> = {};
      if (currentMetadata?.additionalMetadata) {
        for (const [key, value] of currentMetadata.additionalMetadata) {
          currentFields[key] = value;
        }
      }
      
      // 2. Tính toán kích thước cần thêm cho các trường mới và trường thay đổi
      let additionalSize = 0;
      const fieldChanges: Record<string, { old: number; new: number; diff: number }> = {};
      
      for (const [field, value] of Object.entries(fields)) {
        // Xử lý trường đặc biệt "uri"
        if (field === "uri" && currentMetadata) {
          const currentValue = currentMetadata.uri || "";
          if (value.length > currentValue.length) {
            const diff = value.length - currentValue.length;
            additionalSize += diff;
            fieldChanges[field] = { old: currentValue.length, new: value.length, diff };
          }
          continue;
        }

        // Xử lý các trường thông thường
        const currentValue = currentFields[field];
        if (currentValue === undefined) {
          // Trường mới: cần không gian cho cả key và value
          additionalSize += field.length + value.length + 8; // overhead cho mỗi cặp key-value
          fieldChanges[field] = { old: 0, new: value.length, diff: field.length + value.length + 8 };
        } else if (value.length > currentValue.length) {
          // Trường hiện có nhưng cần thêm không gian (giá trị mới dài hơn)
          const diff = value.length - currentValue.length;
          additionalSize += diff;
          fieldChanges[field] = { old: currentValue.length, new: value.length, diff };
        }
        // Nếu giá trị mới ngắn hơn hoặc bằng, không cần thêm không gian
      }
      
      // 3. In thông tin chi tiết về những trường cần cấp phát thêm
      if (Object.keys(fieldChanges).length > 0) {
        console.log(`📊 Chi tiết thay đổi kích thước trường:`);
        for (const [field, change] of Object.entries(fieldChanges)) {
          console.log(`   - "${field}": ${change.old} -> ${change.new} bytes (+${change.diff} bytes)`);
        }
      }
      
      // 4. Nếu không cần thêm không gian, trả về null
      if (additionalSize <= 0) {
        console.log(`✅ Không cần cấp phát thêm không gian cho ${Object.keys(fields).length} trường`);
        return null;
      }
      
      // 5. Thêm padding để đảm bảo đủ không gian cho metadata
      const paddingSize = Math.min(32, additionalSize * 0.1); // Padding 10% nhưng không quá 32 bytes
      additionalSize += paddingSize;
      
      // 6. Lấy chi phí rent exemption cho mỗi byte
      const rentPerByte = await connection.getMinimumBalanceForRentExemption(1);
      const requiredLamports = additionalSize * rentPerByte;
      
      // 7. Log thông tin chi phí
      console.log(`🔄 Cấp phát thêm ${additionalSize} bytes (${(requiredLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL) cho ${Object.keys(fieldChanges).length} trường`);
      
      // 8. Tạo instruction chuyển SOL cho không gian bổ sung
      return SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: this.mint,
        lamports: requiredLamports,
      });
    } catch (error) {
      console.error("❌ Lỗi tính toán không gian cho batch metadata:", error);
      
      // Phương pháp dự phòng: tính toán đơn giản
      let totalSize = 0;
      for (const [field, value] of Object.entries(fields)) {
        totalSize += field.length + value.length + 8;
      }
      
      // Thêm padding
      totalSize += 32;
      
      // Lấy chi phí rent exemption
      const rentPerByte = await connection.getMinimumBalanceForRentExemption(1);
      const backupLamports = totalSize * rentPerByte * 0.25; // Chỉ cấp phát 25% kích thước ước tính để tiết kiệm
      
      console.log(`⚠️ Sử dụng phương pháp dự phòng: cấp phát cho ${totalSize} bytes × 25% = ${(backupLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
      
      return SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: this.mint,
        lamports: backupLamports,
      });
    }
  }

  /**
   * Cập nhật metadata với tối ưu hóa
   * @param connection Kết nối Solana
   * @param wallet Đối tượng wallet-adapter
   * @param fieldName Tên trường cần cập nhật
   * @param fieldValue Giá trị mới
   * @param options Tùy chọn (phí ưu tiên, skipPreflight...)
   * @returns Thông tin giao dịch
   */
  async updateMetadataOptimized(
    connection: Connection,
    wallet: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> },
    fieldName: string,
    fieldValue: string,
    options: {
      priorityLevel?: 'low' | 'medium' | 'high';
      skipPreflight?: boolean;
      allocateStorage?: boolean;
    } = {}
  ): Promise<{ signature: string }> {
    const { priorityLevel = 'medium', skipPreflight = true, allocateStorage = true } = options;
    
    // Tạo transaction
    const transaction = new Transaction();
    
    // 1. Thêm instruction phí ưu tiên
    transaction.add(
      TokenMetadataToken.createPriorityFeeInstruction(priorityLevel)
    );
    
    // 2. Thêm instruction cấp phát không gian nếu cần
    if (allocateStorage) {
      const storageIx = await this.calculateAndAllocateStorage(
        connection, wallet.publicKey, fieldName, fieldValue
      );
      if (storageIx) {
        transaction.add(storageIx);
      }
    }
    
    // 3. Thêm instruction cập nhật metadata
    const updateIx = this.createUpdateMetadataFieldInstruction(
      wallet.publicKey, fieldName, fieldValue
    );
    transaction.add(updateIx);
    
    // Thiết lập giao dịch
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = wallet.publicKey;
    
    // Ký và gửi giao dịch
    const signedTx = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      { skipPreflight }
    );
    
    // Xác nhận giao dịch
    await connection.confirmTransaction(signature, 'confirmed');
    
    return { signature };
  }

  /**
   * Cập nhật nhiều trường metadata với tối ưu hóa 
   * @param connection Kết nối Solana
   * @param wallet Đối tượng wallet-adapter 
   * @param fields Object chứa các cặp key-value cần cập nhật
   * @param options Tùy chọn cấu hình
   * @returns Mảng chữ ký giao dịch
   */
  async updateMetadataBatchOptimized(
    connection: Connection,
    wallet: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> },
    fields: Record<string, string>,
    options: {
      maxFieldsPerTransaction?: number;
      priorityLevel?: 'low' | 'medium' | 'high';
      skipPreflight?: boolean;
      allocateStorage?: boolean;
    } = {}
  ): Promise<{ signatures: string[] }> {
    const { 
      maxFieldsPerTransaction = 2, 
      priorityLevel = 'medium',
      skipPreflight = true,
      allocateStorage = true
    } = options;
    
    const fieldEntries = Object.entries(fields);
    const signatures: string[] = [];
    
    // Chia thành các giao dịch nhỏ hơn
    for (let i = 0; i < fieldEntries.length; i += maxFieldsPerTransaction) {
      const batch = fieldEntries.slice(i, i + maxFieldsPerTransaction);
      const batchFields = Object.fromEntries(batch);
      
      const transaction = new Transaction();
      
      // Thêm instruction phí ưu tiên
      transaction.add(
        TokenMetadataToken.createPriorityFeeInstruction(priorityLevel)
      );
      
      // Thêm instruction cấp phát không gian nếu cần - PHƯƠNG PHÁP 1 & 2
      if (allocateStorage) {
        // Sử dụng phương pháp tối ưu tính toán không gian cho tất cả trường trong batch
        const storageIx = await this.calculateBatchStorageInstruction(
          connection, wallet.publicKey, batchFields
        );
        if (storageIx) {
          transaction.add(storageIx);
        }
      }
      
      // Thêm instruction cập nhật cho mỗi trường 
      for (const [field, value] of batch) {
        transaction.add(
          this.createUpdateMetadataFieldInstruction(wallet.publicKey, field, value)
        );
      }
      
      // Thiết lập giao dịch
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = wallet.publicKey;
      
      // Ký và gửi giao dịch
      const signedTx = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight }
      );
      
      await connection.confirmTransaction(signature, 'confirmed');
      signatures.push(signature);
    }
    
    return { signatures };
  }
} 