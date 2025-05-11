import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TokenMetadata } from "@solana/spl-token-metadata";
import { Token } from "../../core/token";
export interface MetadataConfig {
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata?: Record<string, string>;
}
export declare class MetadataPointerToken extends Token {
    private metadata;
    constructor(connection: Connection, mint: PublicKey, metadata: MetadataConfig);
    static create(connection: Connection, payer: Keypair, params: {
        decimals: number;
        mintAuthority: PublicKey;
        metadata: MetadataConfig;
    }): Promise<MetadataPointerToken>;
    static fromMint(connection: Connection, mint: PublicKey): Promise<MetadataPointerToken | null>;
    getMetadataPointer(): Promise<any>;
    getTokenMetadata(): Promise<TokenMetadata | null>;
    updateMetadataField(authority: Keypair, field: string, value: string): Promise<string>;
    removeMetadataField(authority: Keypair, key: string): Promise<string>;
    updateMetadataPointer(authority: Keypair, newMetadataAddress: PublicKey): Promise<string>;
    updateMetadataBatch(authority: Keypair, fields: Record<string, string>): Promise<string>;
    getNFTMetadata(): Promise<any>;
    getMetadataConfig(): MetadataConfig;
    updateMetadataAuthority(currentAuthority: Keypair, newAuthority: PublicKey | null): Promise<string>;
}
