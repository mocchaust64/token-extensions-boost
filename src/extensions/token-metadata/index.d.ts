import { Connection, Keypair, PublicKey, TransactionSignature } from "@solana/web3.js";
import { TokenMetadata } from "@solana/spl-token-metadata";
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
    attributes?: Array<{
        trait_type: string;
        value: string | number;
    }>;
    properties?: Record<string, unknown>;
    [key: string]: unknown;
}
export type MetadataUpdateResult = {
    signature: TransactionSignature;
    metadata: TokenMetadata;
};
export declare class TokenMetadataToken extends Token {
    private metadata;
    constructor(connection: Connection, mint: PublicKey, metadata: MetadataConfig);
    getMintAddress(): PublicKey;
    static create(connection: Connection, payer: Keypair, params: {
        decimals: number;
        mintAuthority: PublicKey;
        metadata: MetadataConfig;
    }): Promise<TokenMetadataToken>;
    static fromMint(connection: Connection, mint: PublicKey): Promise<TokenMetadataToken | null>;
    getTokenMetadata(): Promise<TokenMetadata>;
    updateMetadataField(authority: Keypair, field: string, value: string): Promise<MetadataUpdateResult>;
    removeMetadataField(authority: Keypair, key: string): Promise<MetadataUpdateResult>;
    updateMetadataBatch(authority: Keypair, fields: Record<string, string>): Promise<MetadataUpdateResult>;
    getNFTMetadata(): Promise<NFTMetadataContent>;
    getMetadataConfig(): MetadataConfig;
    updateMetadataAuthority(currentAuthority: Keypair, newAuthority: PublicKey | null): Promise<TransactionSignature>;
}
