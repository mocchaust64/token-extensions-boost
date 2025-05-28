import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  TransactionInstruction, 
  SystemProgram,
} from "@solana/web3.js";
import { 
  ExtensionType, 
  TOKEN_2022_PROGRAM_ID, 
  createInitializeMintInstruction, 
  getMintLen,
  createInitializeTransferFeeConfigInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeTransferHookInstruction,
  createInitializeNonTransferableMintInstruction,
  LENGTH_SIZE,
  TYPE_SIZE,
  createInitializeInterestBearingMintInstruction,
  AccountState,
  createInitializeDefaultAccountStateInstruction,
  createInitializeMintCloseAuthorityInstruction,
} from "@solana/spl-token";
import { 
  createInitializeInstruction, 
  createUpdateFieldInstruction, 
  pack, 
  TokenMetadata,
} from "@solana/spl-token-metadata";



/**
 * Kiểm tra tính tương thích của các extension
 * 
 * @param extensionTypes Mảng các loại extension cần kiểm tra
 * @returns Kết quả kiểm tra tương thích
 */
function checkExtensionCompatibility(extensionTypes: ExtensionType[]): {
  isCompatible: boolean;
  incompatiblePairs?: [ExtensionType, ExtensionType][];
  reason?: string;
} {
  const incompatiblePairs: [ExtensionType, ExtensionType][] = [];
  
  // NonTransferable chỉ thực sự không tương thích với TransferFeeConfig và ConfidentialTransferMint
  // Metadata và các extension khác vẫn có thể kết hợp với NonTransferable
  if (extensionTypes.includes(ExtensionType.NonTransferable)) {
    if (extensionTypes.includes(ExtensionType.TransferFeeConfig)) {
      incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.TransferFeeConfig]);
    }
    
    // TransferHook có thể kết hợp với NonTransferable trong một số trường hợp
    // Nhưng cần cẩn thận vì có thể gây xung đột logic
    
    if (extensionTypes.includes(ExtensionType.ConfidentialTransferMint)) {
      incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.ConfidentialTransferMint]);
    }
  }
  
  // Các ràng buộc khác giữa các extension
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

  // Nếu có cặp extension không tương thích
  if (incompatiblePairs.length > 0) {
    const reasons = incompatiblePairs.map(([a, b]) => 
      `${ExtensionType[a]} và ${ExtensionType[b]} không thể dùng cùng nhau`
    );
    
    return {
      isCompatible: false,
      incompatiblePairs,
      reason: reasons.join("; ")
    };
  }
  
  return { isCompatible: true };
}


export class TokenBuilder {
  private connection: Connection;
  private extensions: ExtensionType[] = [];
  

  private decimals: number = 9;
  private mintAuthority: PublicKey | null = null;
  private freezeAuthority: PublicKey | null = null;
  

  private metadata?: {
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata?: Record<string, string>;
  };
  
  private tokenMetadata?: {
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata?: Record<string, string>;
  };
  
  private transferFee?: {
    feeBasisPoints: number;
    maxFee: bigint;
    transferFeeConfigAuthority: PublicKey;
    withdrawWithheldAuthority: PublicKey;
  };
  
  private permanentDelegate?: PublicKey;
  
  private transferHook?: {
    programId: PublicKey;
    extraMetas?: PublicKey[];
  };
  
  private confidentialTransfer?: {
    autoEnable?: boolean;
  };

  private interestBearing?: {
    rate: number;
    rateAuthority: PublicKey;
  };

  private defaultAccountState?: AccountState;
  
  private mintCloseAuthority?: PublicKey;
  

  /**
   * Khởi tạo builder với connection
   * 
   * @param connection - Connection đến Solana cluster
   */
  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Thiết lập thông tin cơ bản cho token
   * 
   * @param decimals - Số decimals của token
   * @param mintAuthority - Mint authority của token
   * @param freezeAuthority - Freeze authority của token (tùy chọn)
   * @returns this - để hỗ trợ method chaining
   */
  setTokenInfo(
    decimals: number, 
    mintAuthority: PublicKey, 
    freezeAuthority: PublicKey | null = null
  ): TokenBuilder {
    this.decimals = decimals;
    this.mintAuthority = mintAuthority;
    this.freezeAuthority = freezeAuthority;
    return this;
  }

  /**
   * Thêm extension metadata
   * 
   * @param name - Tên token
   * @param symbol - Ký hiệu token
   * @param uri - URI đến metadata
   * @param additionalMetadata - Metadata bổ sung (tùy chọn)
   * @returns this - để hỗ trợ method chaining
   */
  addMetadata(
    name: string,
    symbol: string,
    uri: string,
    additionalMetadata?: Record<string, string>
  ): TokenBuilder {
    this.metadata = { name, symbol, uri, additionalMetadata };
    this.extensions.push(ExtensionType.MetadataPointer);
    return this;
  }

  /**
   * Thêm extension token metadata (embedded metadata)
   * 
   * Khi sử dụng extension này, metadata sẽ được lưu trực tiếp trong mint account
   * và không cần tài khoản metadata riêng biệt
   * 
   * @param name - Tên token
   * @param symbol - Ký hiệu token
   * @param uri - URI đến metadata
   * @param additionalMetadata - Metadata bổ sung (tùy chọn)
   * @returns this - để hỗ trợ method chaining
   */
  addTokenMetadata(
    name: string,
    symbol: string,
    uri: string,
    additionalMetadata?: Record<string, string>
  ): TokenBuilder {
    this.tokenMetadata = { name, symbol, uri, additionalMetadata };
    // Metadata cần MetadataPointer extension
    this.extensions.push(ExtensionType.MetadataPointer);
    return this;
  }

  /**
   * Thêm extension transfer fee
   * 
   * @param feeBasisPoints - Phí cơ bản tính theo basis points (1% = 100 basis points)
   * @param maxFee - Phí tối đa
   * @param transferFeeConfigAuthority - Tài khoản có quyền cập nhật cấu hình phí
   * @param withdrawWithheldAuthority - Tài khoản có quyền rút phí đã thu
   * @returns this - để hỗ trợ method chaining
   */
  addTransferFee(
    feeBasisPoints: number,
    maxFee: bigint,
    transferFeeConfigAuthority: PublicKey,
    withdrawWithheldAuthority: PublicKey
  ): TokenBuilder {
    this.transferFee = {
      feeBasisPoints,
      maxFee,
      transferFeeConfigAuthority,
      withdrawWithheldAuthority
    };
    this.extensions.push(ExtensionType.TransferFeeConfig);
    return this;
  }

  /**
   * Thêm extension permanent delegate
   * 
   * @param delegate - Địa chỉ permanent delegate
   * @returns this - để hỗ trợ method chaining
   */
  addPermanentDelegate(delegate: PublicKey): TokenBuilder {
    this.permanentDelegate = delegate;
    this.extensions.push(ExtensionType.PermanentDelegate);
    return this;
  }

  /**
   * Thêm extension interest bearing
   * 
   * @param rate - Lãi suất (basis points)
   * @param rateAuthority - Tài khoản có quyền cập nhật lãi suất
   * @returns this - để hỗ trợ method chaining
   */
  addInterestBearing(rate: number, rateAuthority: PublicKey): TokenBuilder {
    this.interestBearing = {
      rate,
      rateAuthority
    };
    this.extensions.push(ExtensionType.InterestBearingConfig);
    return this;
  }

  /**
   * Thêm extension transfer hook
   * 
   * @param programId - Địa chỉ của transfer hook program
   * @param extraMetas - Metadata bổ sung (tùy chọn)
   * @returns this - để hỗ trợ method chaining
   */
  addTransferHook(programId: PublicKey, extraMetas?: PublicKey[]): TokenBuilder {
    this.transferHook = {
      programId,
      extraMetas
    };
    this.extensions.push(ExtensionType.TransferHook);
    return this;
  }

  /**
   * Thêm extension non-transferable
   * 
   * @returns this - để hỗ trợ method chaining
   */
  addNonTransferable(): TokenBuilder {
    this.extensions.push(ExtensionType.NonTransferable);
    return this;
  }

  /**
   * Thêm extension confidential transfer
   * 
   * @param autoEnable - Tự động kích hoạt confidential transfer (mặc định: false)
   * @returns this - để hỗ trợ method chaining
   */
  addConfidentialTransfer(autoEnable: boolean = false): TokenBuilder {
    this.confidentialTransfer = {
      autoEnable
    };
    this.extensions.push(ExtensionType.ConfidentialTransferMint);
    return this;
  }

  /**
   * Thêm extension DefaultAccountState
   * 
   * Extension này thiết lập trạng thái mặc định cho mọi tài khoản token
   * khi chúng được tạo (frozen hoặc initialized)
   * 
   * @param state - Trạng thái mặc định (AccountState.Frozen hoặc AccountState.Initialized)
   * @returns this - để hỗ trợ method chaining
   */
  addDefaultAccountState(state: AccountState): TokenBuilder {
    this.defaultAccountState = state;
    this.extensions.push(ExtensionType.DefaultAccountState);
    return this;
  }

  /**
   * Thêm extension MintCloseAuthority
   * 
   * Extension này cho phép chỉ định authority có quyền đóng mint account
   * 
   * @param closeAuthority - Authority có quyền đóng mint account
   * @returns this - để hỗ trợ method chaining
   */
  addMintCloseAuthority(closeAuthority: PublicKey): TokenBuilder {
    this.mintCloseAuthority = closeAuthority;
    this.extensions.push(ExtensionType.MintCloseAuthority);
    return this;
  }

  /**
   * Tạo instructions cho token với các extension đã cấu hình
   * 
   * Phương thức này trả về instructions thay vì thực thi transaction,
   * giúp tích hợp dễ dàng với wallet adapter.
   * 
   * @param payer - Public key của người trả phí giao dịch
   * @returns Promise với instructions, signers cần thiết và mint address
   */
  async createTokenInstructions(payer: PublicKey): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
    mint: PublicKey;
  }> {
    const hasMetadata = this.metadata || this.tokenMetadata;
    const hasOtherExtensions = this.extensions.filter(ext => 
      ext !== ExtensionType.MetadataPointer).length > 0;
    
    const hasNonTransferable = this.extensions.includes(ExtensionType.NonTransferable);
    const hasMetadataPointer = this.extensions.includes(ExtensionType.MetadataPointer);
    
    const compatibilityCheck = checkExtensionCompatibility(this.extensions);
    if (!compatibilityCheck.isCompatible) {
      throw new Error(`Extension không tương thích: ${compatibilityCheck.reason}`);
      }
  
    if (hasMetadata && hasOtherExtensions) {
      return this.createTokenWithMetadataAndExtensionsInstructions(payer);
    } else {
      return this.createTokenWithExtensionsInstructions(payer);
    }
  }

  /**
   * Tạo instructions cho token với nhiều extension - phiên bản đơn giản hóa
   * 
   * @param payer - Public key của người trả phí giao dịch
   * @returns Promise với instructions, signers cần thiết và mint address
   */
  async createTokenWithExtensionsInstructions(payer: PublicKey): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
    mint: PublicKey;
  }> {
    if (!this.mintAuthority) {
      throw new Error("Mint authority is required");
    }
    
    try {
      console.log("Tạo instructions cho token với các extension...");
     
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;
      console.log(`Mint address: ${mint.toString()}`);
      
      if (this.tokenMetadata) {
        console.log("Sử dụng MetadataHelper để tạo token với metadata...");
        
        const { MetadataHelper } = require('./metadata-helper');
        
        const result = await MetadataHelper.createTokenWithMetadataInstructions(
          this.connection,
          payer,
          {
            decimals: this.decimals,
            mintAuthority: this.mintAuthority,
            name: this.tokenMetadata.name,
            symbol: this.tokenMetadata.symbol,
            uri: this.tokenMetadata.uri,
            additionalMetadata: this.tokenMetadata.additionalMetadata,
            extensions: this.extensions
          }
        );
        
        return {
          instructions: result.instructions,
          signers: result.signers,
          mint: result.mint
        };
      }
     
      console.log("Tạo mint với các extensions khác...");
      const extensionsToUse = [...this.extensions];
    
      const mintLen = getMintLen(extensionsToUse);
      console.log(`Kích thước mint: ${mintLen} bytes`);
      const lamports = await this.connection.getMinimumBalanceForRentExemption(mintLen);
      
      const instructions: TransactionInstruction[] = [];
      
      instructions.push(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mint,
          space: mintLen, 
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      // ĐẢM BẢO THỨ TỰ KHỞI TẠO CÁC EXTENSION:
      // 1. NonTransferable LUÔN đầu tiên nếu có
      if (this.extensions.includes(ExtensionType.NonTransferable)) {
        console.log("Thêm NonTransferable extension...");
        instructions.push(
          createInitializeNonTransferableMintInstruction(
            mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      // 2. Các extension khác
      if (this.transferFee) {
        console.log("Thêm TransferFee extension...");
        instructions.push(
          createInitializeTransferFeeConfigInstruction(
            mint,
            this.transferFee.transferFeeConfigAuthority,
            this.transferFee.withdrawWithheldAuthority,
            this.transferFee.feeBasisPoints,
            this.transferFee.maxFee,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.permanentDelegate) {
        console.log("Thêm PermanentDelegate extension...");
        instructions.push(
          createInitializePermanentDelegateInstruction(
            mint,
            this.permanentDelegate,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.interestBearing) {
        console.log("Thêm InterestBearing extension...");
        instructions.push(
          createInitializeInterestBearingMintInstruction(
            mint,
            this.interestBearing.rateAuthority,
            this.interestBearing.rate,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.transferHook) {
        console.log("Thêm TransferHook extension...");
        instructions.push(
          createInitializeTransferHookInstruction(
            mint,
            payer,
            this.transferHook.programId,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.confidentialTransfer) {
        console.log("Warning: ConfidentialTransfer extension is not fully supported yet");
      }
      
      if (this.defaultAccountState !== undefined) {
        console.log("Thêm DefaultAccountState extension...");
        instructions.push(
          createInitializeDefaultAccountStateInstruction(
            mint,
            this.defaultAccountState,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      if (this.mintCloseAuthority) {
        console.log("Thêm MintCloseAuthority extension...");
        instructions.push(
          createInitializeMintCloseAuthorityInstruction(
            mint,
            this.mintCloseAuthority,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      // 3. LUÔN khởi tạo mint cuối cùng
      console.log("Khởi tạo mint sau các extension...");
      instructions.push(
        createInitializeMintInstruction(
          mint,
          this.decimals,
          this.mintAuthority,
          this.freezeAuthority,
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      return {
        instructions,
        signers: [mintKeypair],
        mint
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create token instructions: ${error.message}`);
      } else {
        throw new Error(`Unknown error creating token instructions: ${String(error)}`);
      }
    }
  }

  /**
   * Tạo instructions cho token với metadata và các extension khác
   * 
   * @param payer - Public key của người trả phí giao dịch
   * @returns Promise với instructions, signers cần thiết và mint address
   */
  async createTokenWithMetadataAndExtensionsInstructions(payer: PublicKey): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
    mint: PublicKey;
  }> {
    if (!this.mintAuthority) {
      throw new Error("Mint authority is required");
    }

    const metadata = this.metadata || this.tokenMetadata;
    if (!metadata) {
      throw new Error("Metadata là bắt buộc cho phương thức này");
    }

    try {
      console.log("Tạo instructions cho token với metadata và các extension khác...");

      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;
      console.log(`Mint address: ${mint.toString()}`);

      const tokenMetadata: TokenMetadata = {
        mint: mint,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(
          ([key, value]) => [key, value]
        ),
      };

      let extensionsToUse = [...this.extensions];
      if (!extensionsToUse.includes(ExtensionType.MetadataPointer)) {
        extensionsToUse.push(ExtensionType.MetadataPointer);
      }
 
      const mintLen = getMintLen(extensionsToUse);
      
      const lamports = await this.connection.getMinimumBalanceForRentExemption(mintLen);
      
      console.log(`Kích thước mint account: ${mintLen} bytes`);
      
      const instructions: TransactionInstruction[] = [];
      
      instructions.push(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mint,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      if (this.extensions.includes(ExtensionType.NonTransferable)) {
        console.log("Thêm NonTransferable extension...");
        instructions.push(
          createInitializeNonTransferableMintInstruction(
            mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      instructions.push(
        createInitializeMetadataPointerInstruction(
          mint,
          payer, 
          mint, 
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      if (this.transferFee) {
        instructions.push(
          createInitializeTransferFeeConfigInstruction(
            mint,
            this.transferFee.transferFeeConfigAuthority,
            this.transferFee.withdrawWithheldAuthority,
            this.transferFee.feeBasisPoints,
            this.transferFee.maxFee,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.permanentDelegate) {
        instructions.push(
          createInitializePermanentDelegateInstruction(
            mint,
            this.permanentDelegate,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      if (this.transferHook) {
        instructions.push(
          createInitializeTransferHookInstruction(
            mint,
            payer,
            this.transferHook.programId,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
 
      if (this.confidentialTransfer) {
        console.log("Warning: ConfidentialTransfer extension is not fully supported yet");
      }

      if (this.interestBearing) {
        instructions.push(
          createInitializeInterestBearingMintInstruction(
            mint,
            this.interestBearing.rateAuthority,
            this.interestBearing.rate,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.defaultAccountState !== undefined) {
        instructions.push(
          createInitializeDefaultAccountStateInstruction(
            mint,
            this.defaultAccountState,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      if (this.mintCloseAuthority) {
        instructions.push(
          createInitializeMintCloseAuthorityInstruction(
            mint,
            this.mintCloseAuthority,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      instructions.push(
        createInitializeMintInstruction(
          mint,
          this.decimals,
          this.mintAuthority,
          this.freezeAuthority,
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      instructions.push(
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: mint,
          updateAuthority: payer,
          mint: mint,
          mintAuthority: this.mintAuthority,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
        })
      );
      
      if (metadata.additionalMetadata) {
        for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
          instructions.push(
            createUpdateFieldInstruction({
              programId: TOKEN_2022_PROGRAM_ID,
              metadata: mint,
              updateAuthority: payer,
              field: key,
              value: value,
            })
          );
        }
      }
      
      return {
        instructions,
        signers: [mintKeypair],
        mint
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create token instructions: ${error.message}`);
      } else {
        throw new Error(`Unknown error creating token instructions: ${String(error)}`);
      }
    }
  }

  /**
   * Tạo transaction từ instructions cho token
   * 
   * Phương thức tiện ích giúp người dùng tạo transaction từ instructions
   * 
   * @param instructions - Instructions cần đưa vào transaction
   * @param feePayer - Public key của người trả phí 
   * @returns Transaction đã được thiết lập
   */
  buildTransaction(
    instructions: TransactionInstruction[], 
    feePayer: PublicKey
  ): Transaction {
    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));
    transaction.feePayer = feePayer;
    return transaction;
  }
} 