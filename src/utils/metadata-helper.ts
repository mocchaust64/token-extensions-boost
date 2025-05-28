import {
  ExtensionType,
  getMintLen,
  createInitializeMetadataPointerInstruction,
  TOKEN_2022_PROGRAM_ID,
  LENGTH_SIZE,
  TYPE_SIZE,
  createInitializeMintInstruction,
  createInitializeNonTransferableMintInstruction,
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
  Connection,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction,
} from '@solana/web3.js';

/**
 * Helper class for better handling of metadata when combined with other extensions
 */
export class MetadataHelper {
  /**
   * Calculate the size needed for metadata
   * 
   * @param metadata - Metadata information
   * @returns Estimated size (bytes)
   */
  static calculateMetadataSize(metadata: {
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata?: Record<string, string>;
  }): number {
    // Create TokenMetadata object
    const tokenMetadata: TokenMetadata = {
      mint: PublicKey.default,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      additionalMetadata: metadata.additionalMetadata 
        ? Object.entries(metadata.additionalMetadata) 
        : [],
    };
    
    // Pack metadata to calculate actual size
    const packedData = pack(tokenMetadata);
    
    // Add header size (TYPE_SIZE + LENGTH_SIZE)
    const headerSize = TYPE_SIZE + LENGTH_SIZE;
    
    // Add padding to ensure sufficient size
    const paddingFactor = 2;
    const metadataLen = headerSize + (packedData.length * paddingFactor);
    
    // Add minimum size as a safeguard
    return Math.max(metadataLen, 2048);
  }

  /**
   * Calculate the size needed for mint account with extensions and metadata
   * 
   * @param extensionTypes - Types of extensions to add
   * @param metadata - Metadata information (if any)
   * @returns Total required size (bytes)
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
    // Ensure MetadataPointer is included in extensionTypes if metadata exists
    let allExtensions = [...extensionTypes];
    if (metadata && !allExtensions.includes(ExtensionType.MetadataPointer)) {
      allExtensions.push(ExtensionType.MetadataPointer);
    }
    
    // Calculate size needed for mint with extensions
    const mintLen = getMintLen(allExtensions);
    
    // If there's no metadata information
    if (!metadata) {
      return mintLen;
    }
    
    // Calculate size needed for metadata
    const metadataSize = this.calculateMetadataSize(metadata);
    
    // Total size = mint size + metadata size + buffer
    const totalSize = mintLen + metadataSize + 1024; // Add 1KB buffer
    
    return totalSize;
  }

  /**
   * Create token with integrated metadata in a simple way
   * This function follows the correct initialization order to ensure proper operation
   * 
   * @param connection - Solana connection
   * @param payer - Fee payer
   * @param params - Initialization parameters
   * @returns Information about the created token
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
      extensions?: ExtensionType[];
    }
  ): Promise<{
    mint: PublicKey;
    txId: string;
  }> {
    try {
      // Create keypair for mint account
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;
      console.log(`Creating token with mint address: ${mint.toString()}`);
      
      // Prepare metadata
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
      
      // Change the size calculation method for the parts
      const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
      const metadataLen = pack(metaData).length;
      
      // Create extension list to calculate correct size
      const extensionsToUse = [ExtensionType.MetadataPointer];
      
      // Add other extensions if provided
      if (params.extensions && params.extensions.length > 0) {
        params.extensions.forEach(ext => {
          if (!extensionsToUse.includes(ext)) {
            extensionsToUse.push(ext);
          }
        });
      }
      
      // Calculate size based on all extensions
      const mintLen = getMintLen(extensionsToUse);
      
      console.log(`Calculating size for ${extensionsToUse.length} extensions: ${JSON.stringify(extensionsToUse.map(ext => ExtensionType[ext]))}`);
      console.log(`Size: mint=${mintLen}, metadata extension=${metadataExtension}, metadata=${metadataLen}`);
      
      // Calculate required lamports based on total size
      const lamports = await connection.getMinimumBalanceForRentExemption(
        mintLen + metadataExtension + metadataLen
      );
      
      // Create transaction with all necessary instructions
      const transaction = new Transaction();
      
      // 1. Create account
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: payer.publicKey,
          newAccountPubkey: mint,
          space: mintLen,  // Only need enough for mint with extension
          lamports, // But need enough lamports for metadata too
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      // 2. Initialize MetadataPointer extension
      transaction.add(
        createInitializeMetadataPointerInstruction(
          mint,
          payer.publicKey,  // Update authority
          mint,  // Metadata address (points to itself)
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // 3. Initialize NonTransferable extension
      if (params.extensions && params.extensions.includes(ExtensionType.NonTransferable)) {
        transaction.add(
          createInitializeNonTransferableMintInstruction(
            mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }
      
      // 4. Initialize Mint
      transaction.add(
        createInitializeMintInstruction(
          mint,
          params.decimals,
          params.mintAuthority,
          null, // Freeze Authority
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // 5. Initialize Metadata
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
      
      // 6. Add additional metadata fields
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
      
      // Send transaction
      console.log("Sending transaction...");
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, mintKeypair],
        { commitment: 'confirmed' }
      );
      
      console.log(`Token created successfully! Transaction: ${signature}`);
      
      return {
        mint,
        txId: signature
      };
    } catch (error) {
      console.error('Error creating token with metadata:', error);
      
      if (error instanceof Error) {
        const errorMessage = error.message;
        console.error('Error details:', errorMessage);
      }
      
      throw error;
    }
  }

  /**
   * Check if extensions are compatible with each other
   * 
   * @param extensionTypes - Array of extension types to check
   * @returns Compatibility check result
   */
  static checkExtensionCompatibility(extensionTypes: ExtensionType[]): {
    isCompatible: boolean;
    incompatiblePairs?: [ExtensionType, ExtensionType][];
    reason?: string;
  } {
    const incompatiblePairs: [ExtensionType, ExtensionType][] = [];
    
    // Check incompatible pairs according to Solana guidelines
    
    // NonTransferable is incompatible with extensions related to token transfers
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
    
    // ConfidentialTransfer is incompatible with some extensions
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
        ? "Some extensions are incompatible with each other" 
        : undefined
    };
  }

  /**
   * Create metadata address based on mint
   * 
   * @param mint - Mint address
   * @returns Metadata address
   */
  static findMetadataAddress(mint: PublicKey): PublicKey {
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      TOKEN_2022_PROGRAM_ID
    );
    
    return metadataAddress;
  }

  /**
   * Create the sequence of steps to initialize metadata correctly
   * 
   * @param mint - Mint address
   * @param updateAuthority - Address with authority to update metadata
   * @param metadata - Metadata information
   * @returns Sequence of steps
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
    
    // Initialization order for metadata
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

  /**
   * Create instructions for initializing tokens with metadata
   * 
   * @param connection - Solana connection
   * @param payer - Public key of the fee payer
   * @param params - Initialization parameters
   * @returns Instructions, signers, and mint address
   */
  static async createTokenWithMetadataInstructions(
    connection: Connection,
    payer: PublicKey,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      name: string;
      symbol: string;
      uri: string;
      additionalMetadata?: Record<string, string>;
      extensions?: ExtensionType[];
    }
  ): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
    mint: PublicKey;
  }> {
    try {
      // Create keypair for mint account
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;
      console.log(`Creating token with mint address: ${mint.toString()}`);
      
      // Prepare metadata
      const metaData: TokenMetadata = {
        updateAuthority: payer,
        mint: mint,
        name: params.name,
        symbol: params.symbol,
        uri: params.uri,
        additionalMetadata: params.additionalMetadata 
          ? Object.entries(params.additionalMetadata) 
          : [],
      };
      
      // Change the size calculation method for the parts
      const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
      const metadataLen = pack(metaData).length;
      
      // Create extension list to calculate correct size
      const extensionsToUse = [ExtensionType.MetadataPointer];
      
      // Add other extensions if provided
      if (params.extensions && params.extensions.length > 0) {
        params.extensions.forEach(ext => {
          if (!extensionsToUse.includes(ext)) {
            extensionsToUse.push(ext);
          }
        });
      }
      
      // Calculate size based on all extensions
      const mintLen = getMintLen(extensionsToUse);
      
      console.log(`Calculating size for ${extensionsToUse.length} extensions: ${JSON.stringify(extensionsToUse.map(ext => ExtensionType[ext]))}`);
      console.log(`Size: mint=${mintLen}, metadata extension=${metadataExtension}, metadata=${metadataLen}`);
      
      // Calculate required lamports based on total size
      const lamports = await connection.getMinimumBalanceForRentExemption(
        mintLen + metadataExtension + metadataLen
      );
      
      // Create array for instructions
      const instructions: TransactionInstruction[] = [];
      
      // 1. Create account
      instructions.push(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mint,
          space: mintLen,  // Only need enough for mint with extension
          lamports, // But need enough lamports for metadata too
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );
      
      // 2. Initialize MetadataPointer extension
      instructions.push(
        createInitializeMetadataPointerInstruction(
          mint,
          payer,  // Update authority
          mint,  // Metadata address (points to itself)
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // 3. Add NonTransferable extension if included
      if (params.extensions && params.extensions.includes(ExtensionType.NonTransferable)) {
        instructions.push(
          createInitializeNonTransferableMintInstruction(
            mint,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // 4. Initialize mint
      instructions.push(
        createInitializeMintInstruction(
          mint,
          params.decimals,
          params.mintAuthority,
          null, // Freeze authority
          TOKEN_2022_PROGRAM_ID
        )
      );
      
      // 5. Initialize metadata
      instructions.push(
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: mint,
          updateAuthority: payer,
          mint: mint,
          mintAuthority: params.mintAuthority,
          name: params.name,
          symbol: params.symbol,
          uri: params.uri,
        })
      );
      
      // 6. Add additional metadata fields if any
      if (params.additionalMetadata) {
        for (const [key, value] of Object.entries(params.additionalMetadata)) {
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
        throw new Error(`Failed to create token with metadata instructions: ${error.message}`);
      } else {
        throw new Error(`Unknown error creating token with metadata instructions: ${String(error)}`);
      }
    }
  }
} 