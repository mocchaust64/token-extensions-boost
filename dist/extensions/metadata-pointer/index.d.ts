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
    getMetadataPointer(): Promise<any>;
    getTokenMetadata(): Promise<TokenMetadata | null>;
    updateMetadataField(authority: Keypair, field: string, value: string): Promise<string>;
    removeMetadataField(authority: Keypair, key: string): Promise<string>;
}
