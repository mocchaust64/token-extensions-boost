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
  getMintLen,
  getMint,
  getMetadataPointerState,
  getTokenMetadata,
  LENGTH_SIZE,
  TYPE_SIZE,
  createUpdateMetadataPointerInstruction,
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

export interface MetadataPointerState {
  authority: PublicKey;
  metadataAddress: PublicKey;
}

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

export class MetadataPointerToken extends Token {
  private metadata: MetadataConfig;

  constructor(
    connection: Connection,
    mint: PublicKey,
    metadata: MetadataConfig
  ) {
    super(connection, mint);
    this.metadata = metadata;
  }

  static async create(
    connection: Connection,
    payer: Keypair,
    params: {
      decimals: number;
      mintAuthority: PublicKey;
      metadata: MetadataConfig;
    }
  ): Promise<MetadataPointerToken> {
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
    
    const tokenMetadata: TokenMetadata = {
      mint: mintKeypair.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(
        ([key, value]) => [key, value]
      ),
    };

    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(tokenMetadata).length;
    const lamports = await connection.getMinimumBalanceForRentExemption(
      mintLen + metadataLen
    );

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMetadataPointerInstruction(
        mintKeypair.publicKey,
        payer.publicKey,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        mintAuthority,
        null,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mintKeypair.publicKey,
        updateAuthority: payer.publicKey,
        mint: mintKeypair.publicKey,
        mintAuthority: payer.publicKey,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
      })
    );

    if (metadata.additionalMetadata) {
      for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
        if (key.length === 0 || value.length === 0) {
          continue;
        }
        
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

    await sendAndConfirmTransaction(connection, transaction, [
      payer,
      mintKeypair,
    ]);

    return new MetadataPointerToken(connection, mintKeypair.publicKey, metadata);
  }

  static async fromMint(
    connection: Connection, 
    mint: PublicKey
  ): Promise<MetadataPointerToken | null> {
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

      return new MetadataPointerToken(connection, mint, metadata);
    } catch (error) {
      console.error("Error loading metadata token:", error);
      return null;
    }
  }

  async getMetadataPointer(): Promise<MetadataPointerState | null> {
    try {
      const mintInfo = await getMint(
        this.connection,
        this.mint,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );
      
      const pointerState = getMetadataPointerState(mintInfo);
      if (!pointerState || !pointerState.authority || !pointerState.metadataAddress) {
        return null;
      }
      
      return {
        authority: pointerState.authority,
        metadataAddress: pointerState.metadataAddress
      };
    } catch (error) {
      throw new Error(`Failed to get metadata pointer: ${error}`);
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
    if (!field || field.length === 0) {
      throw new Error("Field name cannot be empty");
    }
    
    if (value.length === 0) {
      throw new Error("Field value cannot be empty");
    }
    
    try {
      const additionalRent = await this.connection.getMinimumBalanceForRentExemption(
        LENGTH_SIZE + field.length + value.length
      );
      
      const transaction = new Transaction();
      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: this.mint,
          lamports: additionalRent,
        })
      );
      
      transaction.add(
        createUpdateFieldInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: this.mint,
          updateAuthority: authority.publicKey,
          field: field,
          value: value,
        })
      );

      const signature = await sendAndConfirmTransaction(this.connection, transaction, [
        authority,
      ]);
      
      const updatedMetadata = await this.getTokenMetadata();
      
      return {
        signature,
        metadata: updatedMetadata
      };
    } catch (error) {
      throw new Error(`Failed to update metadata field: ${error}`);
    }
  }

  async removeMetadataField(
    authority: Keypair,
    key: string
  ): Promise<MetadataUpdateResult> {
    if (!key || key.length === 0) {
      throw new Error("Field key cannot be empty");
    }
    
    try {
      const transaction = new Transaction();
      
      transaction.add(
        createRemoveKeyInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: this.mint,
          updateAuthority: authority.publicKey,
          key: key,
          idempotent: true,
        })
      );

      const signature = await sendAndConfirmTransaction(this.connection, transaction, [
        authority,
      ]);
      
      const updatedMetadata = await this.getTokenMetadata();
      
      return {
        signature,
        metadata: updatedMetadata
      };
    } catch (error) {
      throw new Error(`Failed to remove metadata field: ${error}`);
    }
  }
  
  async updateMetadataPointer(
    authority: Keypair,
    newMetadataAddress: PublicKey
  ): Promise<TransactionSignature> {
    try {
      const transaction = new Transaction().add(
        createUpdateMetadataPointerInstruction(
          this.mint,
          authority.publicKey,
          newMetadataAddress,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      return await sendAndConfirmTransaction(this.connection, transaction, [
        authority,
      ]);
    } catch (error) {
      throw new Error(`Failed to update metadata pointer: ${error}`);
    }
  }
  
  async updateMetadataBatch(
    authority: Keypair,
    fields: Record<string, string>
  ): Promise<MetadataUpdateResult> {
    if (Object.keys(fields).length === 0) {
      throw new Error("No fields provided for update");
    }
    
    try {
      let totalSize = 0;
      for (const [field, value] of Object.entries(fields)) {
        totalSize += LENGTH_SIZE + field.length + value.length;
      }
      
      const additionalRent = await this.connection.getMinimumBalanceForRentExemption(
        totalSize
      );
      
      const transaction = new Transaction();
      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: this.mint,
          lamports: additionalRent,
        })
      );
      
      for (const [field, value] of Object.entries(fields)) {
        if (field.length === 0 || value.length === 0) {
          continue;
        }
        
        transaction.add(
          createUpdateFieldInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: this.mint,
            updateAuthority: authority.publicKey,
            field: field,
            value: value,
          })
        );
      }
      
      const signature = await sendAndConfirmTransaction(this.connection, transaction, [
        authority,
      ]);
      
      const updatedMetadata = await this.getTokenMetadata();
      
      return {
        signature,
        metadata: updatedMetadata
      };
    } catch (error) {
      throw new Error(`Failed to update metadata batch: ${error}`);
    }
  }
  
  async getNFTMetadata(): Promise<NFTMetadataContent> {
    const tokenMetadata = await this.getTokenMetadata();
    if (!tokenMetadata.uri) {
      throw new Error("No metadata URI found for this token");
    }
    
    try {
      const response = await fetch(tokenMetadata.uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Error fetching off-chain metadata: ${error}`);
    }
  }
  
  getMetadataConfig(): MetadataConfig {
    return { ...this.metadata };
  }

  async updateMetadataAuthority(
    currentAuthority: Keypair,
    newAuthority: PublicKey | null
  ): Promise<TransactionSignature> {
    try {
      const transaction = new Transaction().add(
        createUpdateAuthorityInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          metadata: this.mint,
          oldAuthority: currentAuthority.publicKey,
          newAuthority: newAuthority,
        })
      );

      return await sendAndConfirmTransaction(this.connection, transaction, [
        currentAuthority,
      ]);
    } catch (error) {
      throw new Error(`Failed to update metadata authority: ${error}`);
    }
  }
  
  async getMetadataField(field: string): Promise<string | null> {
    try {
      const metadata = await this.getTokenMetadata();
      
      if (!metadata.additionalMetadata) {
        return null;
      }
      
      for (const [key, value] of metadata.additionalMetadata) {
        if (key === field) {
          return value;
        }
      }
      
      return null;
    } catch (error) {
      throw new Error(`Failed to get metadata field: ${error}`);
    }
  }
  
  async updateBasicMetadata(
    authority: Keypair,
    updates: {
      name?: string;
      symbol?: string;
      uri?: string;
    }
  ): Promise<MetadataUpdateResult> {
    const fields: Record<string, string> = {};
    
    if (updates.name) {
      if (updates.name.length > 32) {
        throw new Error("Name must be 32 characters or less");
      }
      fields["name"] = updates.name;
    }
    
    if (updates.symbol) {
      if (updates.symbol.length > 10) {
        throw new Error("Symbol must be 10 characters or less");
      }
      fields["symbol"] = updates.symbol;
    }
    
    if (updates.uri) {
      if (updates.uri.length > 200) {
        throw new Error("URI must be 200 characters or less");
      }
      fields["uri"] = updates.uri;
    }
    
    return await this.updateMetadataBatch(authority, fields);
  }
} 