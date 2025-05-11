import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
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

export interface MetadataConfig {
  name: string;
  symbol: string;
  uri: string;
  additionalMetadata?: Record<string, string>;
}

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

  async getMetadataPointer(): Promise<any> {
    const mintInfo = await getMint(
      this.connection,
      this.mint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    
    return getMetadataPointerState(mintInfo);
  }

  async getTokenMetadata(): Promise<TokenMetadata | null> {
    return await getTokenMetadata(
      this.connection,
      this.mint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
  }

  async updateMetadataField(
    authority: Keypair,
    field: string,
    value: string
  ): Promise<string> {
 
    const additionalRent = await this.connection.getMinimumBalanceForRentExemption(
      1024 
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

    return await sendAndConfirmTransaction(this.connection, transaction, [
      authority,
    ]);
  }

  async removeMetadataField(
    authority: Keypair,
    key: string
  ): Promise<string> {
    
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

    return await sendAndConfirmTransaction(this.connection, transaction, [
      authority,
    ]);
  }
  
  async updateMetadataPointer(
    authority: Keypair,
    newMetadataAddress: PublicKey
  ): Promise<string> {
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
  }
  
  async updateMetadataBatch(
    authority: Keypair,
    fields: Record<string, string>
  ): Promise<string> {
    
    const additionalRent = await this.connection.getMinimumBalanceForRentExemption(
      1024 * Object.keys(fields).length 
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
    
    return await sendAndConfirmTransaction(this.connection, transaction, [
      authority,
    ]);
  }
  
  async getNFTMetadata(): Promise<any> {
    const tokenMetadata = await this.getTokenMetadata();
    if (!tokenMetadata || !tokenMetadata.uri) {
      throw new Error("No metadata URI found for this token");
    }
    
    try {
      const response = await fetch(tokenMetadata.uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching off-chain metadata:", error);
      throw error;
    }
  }
  
  getMetadataConfig(): MetadataConfig {
    return this.metadata;
  }

  async updateMetadataAuthority(
    currentAuthority: Keypair,
    newAuthority: PublicKey | null
  ): Promise<string> {
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
  }
} 