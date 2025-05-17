import { PublicKey } from '@solana/web3.js';
import { Connection, Keypair } from "@solana/web3.js";
export interface TokenExtensionConfig {
    mint: PublicKey;
    authority?: PublicKey;
}
export interface ConfidentialConfig extends TokenExtensionConfig {
    auditor?: PublicKey;
}
export interface TransferFeeConfig {
    feeBasisPoints: number;
    maxFee: bigint;
    transferFeeConfigAuthority: Keypair | PublicKey | null;
    withdrawWithheldAuthority: Keypair | PublicKey | null;
}
export interface TransferHookConfig extends TokenExtensionConfig {
    hookProgramId: PublicKey;
}
export interface InterestBearingConfig extends TokenExtensionConfig {
    rate: number;
}
export interface MetadataConfig {
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata?: Record<string, string>;
}
export interface SoulboundConfig extends TokenExtensionConfig {
}
export interface BaseExtensionConfig {
    connection: Connection;
    mint: PublicKey;
}
