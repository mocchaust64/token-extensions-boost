import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  TransactionSignature,
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
      console.log("step 5: create TokenMetadata...");
      
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
      
      console.log(`Transaction create TokenMetadata succed: ${initMetadataSignature.substring(0, 16)}...`);
      console.log(`Explorer: https://explorer.solana.com/tx/${initMetadataSignature}?cluster=devnet`);
      
      if (metadata.additionalMetadata && Object.keys(metadata.additionalMetadata).length > 0) {
        console.log("step 6: add update metadata ...");
        
        let fieldCounter = 0;
        for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
          if (key.length === 0 || value.length === 0) continue;
          
          fieldCounter++;
          console.log(`  add #${fieldCounter}: ${key}=${value}`);
          
    
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const addFieldTx = new Transaction().add(
            createUpdateFieldInstruction({
              programId: TOKEN_2022_PROGRAM_ID,
              metadata: mint,
              updateAuthority: payer.publicKey,
              field: key,
              value: value,
            })
          );
          
          try {
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
} 