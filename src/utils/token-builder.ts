import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction, 
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
  createUpdateMetadataPointerInstruction,
  LENGTH_SIZE,
  TYPE_SIZE,
  createInitializeInterestBearingMintInstruction,
  getMetadataPointerState,
  getTokenMetadata,
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
import { Token } from "../core/token";
import { TransferFeeToken } from "../extensions/transfer-fee";
import { MetadataPointerToken } from "../extensions/metadata-pointer";
import { TokenMetadataToken } from "../extensions/token-metadata";
import { PermanentDelegateToken } from "../extensions/permanent-delegate";
import { ConfidentialTransferToken } from "../extensions/confidential-transfer";
import { TransferHookToken } from "../extensions/transfer-hook";
import { NonTransferableToken } from "../extensions/non-transferable";
import { DefaultAccountStateExtension } from "../extensions/default-account-state";
import { MintCloseAuthorityExtension } from "../extensions/mint-close-authority";


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

  // Kiểm tra tương thích với DefaultAccountState
  // DefaultAccountState không có ràng buộc cụ thể về tương thích với các extension khác
  
  // Kiểm tra tương thích với MintCloseAuthority
  // MintCloseAuthority cũng không có ràng buộc cụ thể về tương thích với các extension khác

  // Lưu ý: RequiredMemo không nằm trong ExtensionType của @solana/spl-token nên không cần kiểm tra
  
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
   * Tạo token với các extension đã cấu hình
   * 
   * Phương thức này sẽ tự động nhận biết và xử lý việc tạo token có hoặc không có metadata,
   * kết hợp với các extensions khác theo cách tối ưu.
   * 
   * @param payer - Keypair của người trả phí giao dịch
   * @returns Promise với thông tin về token đã tạo
   */
  async createToken(payer: Keypair): Promise<{
    mint: PublicKey;
    transactionSignature: string;
    token: Token;
  }> {
   
    const hasMetadata = this.metadata || this.tokenMetadata;
    const hasOtherExtensions = this.extensions.filter(ext => 
      ext !== ExtensionType.MetadataPointer).length > 0;
    
    
    const hasNonTransferable = this.extensions.includes(ExtensionType.NonTransferable);
    const hasMetadataPointer = this.extensions.includes(ExtensionType.MetadataPointer);
    
  
    if (hasNonTransferable && hasMetadata) {
      console.log("Xử lý đặc biệt cho cặp NonTransferable + Metadata");
      
      
      if (this.tokenMetadata) {
        console.log("Sử dụng MetadataHelper để tạo token với metadata và NonTransferable...");
        
        const { MetadataHelper } = require('./metadata-helper');
        
        const result = await MetadataHelper.createTokenWithMetadata(
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
        
       
        console.log(`Token với NonTransferable và metadata tạo thành công! Mint: ${result.mint.toString()}`);
        
        return {
          mint: result.mint,
          transactionSignature: result.txId,
          token: new TokenMetadataToken(this.connection, result.mint, {
            name: this.tokenMetadata.name,
            symbol: this.tokenMetadata.symbol,
            uri: this.tokenMetadata.uri,
            additionalMetadata: this.tokenMetadata.additionalMetadata || {}
          })
        };
      }
    }
    
  
    if (hasMetadata && hasOtherExtensions) {
      return this.createTokenWithMetadataAndExtensions(payer);
    } else {
      return this.createTokenWithExtensions(payer);
    }
  }

  /**
   * Tạo token với nhiều extension kết hợp - phiên bản đơn giản hóa
   * 
   * Phương thức này xử lý việc tạo token với metadata kết hợp với các extensions khác
   * theo cách đơn giản nhất, tập trung vào tính ổn định
   * 
   * @param payer - Keypair của người trả phí giao dịch
   * @returns Promise với thông tin về token đã tạo
   */
  async createTokenWithExtensions(payer: Keypair): Promise<{
    mint: PublicKey;
    transactionSignature: string;
    token: Token;
  }> {
    if (!this.mintAuthority) {
      throw new Error("Mint authority is required");
    }
    
  
    const compatibilityCheck = checkExtensionCompatibility(this.extensions);
    if (!compatibilityCheck.isCompatible) {
      throw new Error(`Extension không tương thích: ${compatibilityCheck.reason}`);
    }

    try {
  
      console.log("Tạo token với các extension theo cách đơn giản...");
      
     
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;
      console.log(`Mint address: ${mint.toString()}`);
      
      
      if (this.tokenMetadata) {
        console.log("Sử dụng MetadataHelper để tạo token với metadata...");
        
        const { MetadataHelper } = require('./metadata-helper');
        
        const result = await MetadataHelper.createTokenWithMetadata(
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
        

        console.log(`Token với metadata tạo thành công! Mint: ${result.mint.toString()}`);
        
        return {
          mint: result.mint,
          transactionSignature: result.txId,
          token: new TokenMetadataToken(this.connection, result.mint, {
            name: this.tokenMetadata.name,
            symbol: this.tokenMetadata.symbol,
            uri: this.tokenMetadata.uri,
            additionalMetadata: this.tokenMetadata.additionalMetadata || {}
          })
        };
      }
      
     
      console.log("Tạo mint với các extensions khác...");
      const extensionsToUse = [...this.extensions];
    
      const mintLen = getMintLen(extensionsToUse);
      console.log(`Kích thước mint: ${mintLen} bytes`);
      const lamports = await this.connection.getMinimumBalanceForRentExemption(mintLen);
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint,
          space: mintLen, 
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      if (this.transferFee) {
        console.log("Thêm TransferFee extension...");
        transaction.add(
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
        transaction.add(
          createInitializePermanentDelegateInstruction(
            mint,
            this.permanentDelegate,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.interestBearing) {
        console.log("Thêm InterestBearing extension...");
        transaction.add(
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
        transaction.add(
          createInitializeTransferHookInstruction(
            mint,
            payer.publicKey,
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
        transaction.add(
          createInitializeDefaultAccountStateInstruction(
            mint,
            this.defaultAccountState,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      if (this.mintCloseAuthority) {
        console.log("Thêm MintCloseAuthority extension...");
        transaction.add(
          createInitializeMintCloseAuthorityInstruction(
            mint,
            this.mintCloseAuthority,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      console.log("Khởi tạo mint sau các extension...");
      transaction.add(
        createInitializeMintInstruction(
          mint,
          this.decimals,
          this.mintAuthority,
          this.freezeAuthority,
          TOKEN_2022_PROGRAM_ID
        )
      );
      

      console.log("Đang gửi transaction...");
      const transactionSignature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`Transaction successful! Signature: ${transactionSignature}`);
      

      let token: Token;
      
 
      if (this.permanentDelegate) {
        token = new PermanentDelegateToken(this.connection, mint, this.permanentDelegate);
      } else if (this.transferHook) {
        token = new TransferHookToken(this.connection, mint, this.transferHook.programId);
      } else if (this.confidentialTransfer) {
        token = new ConfidentialTransferToken(this.connection, mint);
      } else if (this.transferFee) {
        token = new TransferFeeToken(this.connection, mint, {
          feeBasisPoints: this.transferFee.feeBasisPoints,
          maxFee: this.transferFee.maxFee,
          transferFeeConfigAuthority: this.transferFee.transferFeeConfigAuthority,
          withdrawWithheldAuthority: this.transferFee.withdrawWithheldAuthority
        });
      } else {
        token = new Token(this.connection, mint);
      }
      
      return {
        mint,
        transactionSignature,
        token
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create token with extensions: ${error.message}`);
      } else {
        throw new Error(`Unknown error creating token with extensions: ${String(error)}`);
      }
    }
  }

  /**
   * Tạo token với metadata và các extension khác trong cùng một giao dịch
   * 
   * Phương thức này giải quyết vấn đề kết hợp metadata với các extension khác
   * bằng cách đảm bảo thứ tự đúng và kích thước tài khoản phù hợp.
   * 
   * @param payer - Keypair của người trả phí giao dịch
   * @returns Promise với thông tin về token đã tạo
   */
  async createTokenWithMetadataAndExtensions(payer: Keypair): Promise<{
    mint: PublicKey;
    transactionSignature: string;
    token: Token;
  }> {
    if (!this.mintAuthority) {
      throw new Error("Mint authority is required");
    }

   
    const compatibilityCheck = checkExtensionCompatibility(this.extensions);
    if (!compatibilityCheck.isCompatible) {
      throw new Error(`Extension không tương thích: ${compatibilityCheck.reason}`);
    }


    const metadata = this.metadata || this.tokenMetadata;
    if (!metadata) {
      throw new Error("Metadata là bắt buộc cho phương thức này");
    }

    try {
      console.log("Tạo token với metadata và các extension khác...");
      

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

 
      const metadataExtension = TYPE_SIZE + LENGTH_SIZE; 
      const metadataLen = pack(tokenMetadata).length;
      const mintLen = getMintLen(extensionsToUse);
      
      const lamports = await this.connection.getMinimumBalanceForRentExemption(
        mintLen + metadataExtension + metadataLen
      );
      
      console.log(`Kích thước: mint=${mintLen}, metadata extension=${metadataExtension}, metadata=${metadataLen}`);
      
      const transaction = new Transaction();
      
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint,
          space: mintLen, 
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      transaction.add(
        createInitializeMetadataPointerInstruction(
          mint,
          payer.publicKey, 
          mint, 
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Thêm NonTransferable extension nếu có trong danh sách
      if (this.extensions.includes(ExtensionType.NonTransferable)) {
        console.log("Thêm NonTransferable extension...");
        transaction.add(
          createInitializeNonTransferableMintInstruction(
            mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.transferFee) {
        transaction.add(
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
              transaction.add(
                createInitializePermanentDelegateInstruction(
                  mint,
                  this.permanentDelegate,
                  TOKEN_2022_PROGRAM_ID
                )
              );
            }
            

            if (this.transferHook) {
              transaction.add(
                createInitializeTransferHookInstruction(
                  mint,
                  payer.publicKey,
                  this.transferHook.programId,
                  TOKEN_2022_PROGRAM_ID
                )
              );
            }
      
 
      if (this.confidentialTransfer) {
        // Note: The createInitializeConfidentialTransferMintInstruction function
        // is not fully implemented in @solana/spl-token yet
        // In a real implementation, we would use something like:
        // transaction.add(
        //   createInitializeConfidentialTransferMintInstruction(
        //     mint,
        //     payer.publicKey,
        //     this.confidentialTransfer.autoEnable || false,
        //     TOKEN_2022_PROGRAM_ID
        //   )
        // );
        console.log("Warning: ConfidentialTransfer extension is not fully supported yet");
      }

      if (this.interestBearing) {
        transaction.add(
          createInitializeInterestBearingMintInstruction(
            mint,
            this.interestBearing.rateAuthority,
            this.interestBearing.rate,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      if (this.defaultAccountState !== undefined) {
        transaction.add(
          createInitializeDefaultAccountStateInstruction(
            mint,
            this.defaultAccountState,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      if (this.mintCloseAuthority) {
        transaction.add(
          createInitializeMintCloseAuthorityInstruction(
            mint,
            this.mintCloseAuthority,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      transaction.add(
        createInitializeMintInstruction(
          mint,
          this.decimals,
          this.mintAuthority,
          this.freezeAuthority,
          TOKEN_2022_PROGRAM_ID
        )
      );
      

      transaction.add(
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: mint,
          updateAuthority: payer.publicKey,
          mint: mint,
          mintAuthority: this.mintAuthority,
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
        })
      );
      
      if (metadata.additionalMetadata) {
        for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
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
      
      console.log("Đang gửi transaction...");
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`Token tạo thành công! Transaction: ${signature}`);
      
      let token: Token;
      
      if (this.metadata) {
        token = new MetadataPointerToken(this.connection, mint, {
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          additionalMetadata: metadata.additionalMetadata || {}
        });
      } else if (this.tokenMetadata) {
        token = new TokenMetadataToken(this.connection, mint, {
          name: metadata.name,
          symbol: metadata.symbol,
          uri: metadata.uri,
          additionalMetadata: metadata.additionalMetadata || {}
        });
      } else if (this.transferFee) {
        token = new TransferFeeToken(this.connection, mint, {
          feeBasisPoints: this.transferFee.feeBasisPoints,
          maxFee: this.transferFee.maxFee,
          transferFeeConfigAuthority: this.transferFee.transferFeeConfigAuthority,
          withdrawWithheldAuthority: this.transferFee.withdrawWithheldAuthority
        });
      } else if (this.permanentDelegate) {
        token = new PermanentDelegateToken(this.connection, mint, this.permanentDelegate);
      } else if (this.transferHook) {
        token = new TransferHookToken(this.connection, mint, this.transferHook.programId);
      } else if (this.confidentialTransfer) {
        token = new ConfidentialTransferToken(this.connection, mint);
      } else {
        token = new Token(this.connection, mint);
      }
      
      return {
        mint,
        transactionSignature: signature,
        token
      };
    } catch (error) {
      console.error('Lỗi khi tạo token với metadata và các extension:', error);
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        console.error('Chi tiết lỗi:', errorMessage);
        throw new Error(`Failed to create token with extensions: ${errorMessage}`);
      } else {
        throw new Error(`Unknown error creating token with extensions: ${String(error)}`);
      }
    }
  }

  /**
   * DEPRECATED: Sử dụng createToken() thay thế.
   * Phương thức này được giữ lại để đảm bảo tương thích với mã nguồn cũ.
   * 
   * @internal
   * @param payer - Keypair của người trả phí giao dịch
   * @returns Promise với thông tin về token đã tạo
   * @deprecated Sử dụng createToken() để có API đơn giản hơn.
   */
  async build(payer: Keypair): Promise<{
    mint: PublicKey;
    transactionSignature: string;
    token: Token;
  }> {
    console.warn('DEPRECATED: build() đã lỗi thời, hãy sử dụng createToken() thay thế');
    return this.createToken(payer);
  }
} 