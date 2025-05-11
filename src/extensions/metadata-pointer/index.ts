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
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  createRemoveKeyInstruction,
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
    
    // Create mint keypair
    const mintKeypair = Keypair.generate();
    
    // Format metadata for on-chain storage
    const tokenMetadata: TokenMetadata = {
      mint: mintKeypair.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(
        ([key, value]) => [key, value]
      ),
    };

    // Calculate sizes and rent
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(tokenMetadata).length;
    const lamports = await connection.getMinimumBalanceForRentExemption(
      mintLen + metadataLen
    );

    // Create mint account
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      // Initialize metadata pointer to point to the mint itself
      createInitializeMetadataPointerInstruction(
        mintKeypair.publicKey,
        payer.publicKey,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      // Initialize mint
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        mintAuthority,
        null,
        TOKEN_2022_PROGRAM_ID
      ),
      // Initialize metadata
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

    // Add instructions for additional metadata fields if any
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
    const transaction = new Transaction().add(
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
    const transaction = new Transaction().add(
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
} 