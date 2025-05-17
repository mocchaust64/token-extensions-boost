import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { ExtensionType } from "@solana/spl-token";
import { TransferFeeToken } from "../extensions/transfer-fee";
import { MetadataPointerToken } from "../extensions/metadata-pointer";
import { ImmutableOwnerToken } from "../extensions/immutable-owner";
import { PermanentDelegateToken } from "../extensions/permanent-delegate";
import { ConfidentialTransferToken } from "../extensions/confidential-transfer";
import { TransferFeeConfig } from "../types";

export class Token2022Factory {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

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
  
  getPermanentDelegateToken(mint: PublicKey, delegate?: PublicKey | null): PermanentDelegateToken {
    return new PermanentDelegateToken(this.connection, mint, delegate || null);
  }
  
  getConfidentialTransferToken(mint: PublicKey): ConfidentialTransferToken {
    return new ConfidentialTransferToken(this.connection, mint);
  }
  
  getImmutableOwnerToken(mint: PublicKey): ImmutableOwnerToken {
    return new ImmutableOwnerToken(this.connection, mint);
  }
} 