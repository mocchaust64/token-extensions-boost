import { PublicKey } from '@solana/web3.js';
import { Connection, Keypair } from "@solana/web3.js";
import { ExtensionType } from "@solana/spl-token";
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
/**
 * Interface cho cấu hình token với nhiều extension
 */
export interface TokenWithExtensionConfig {
    /**
     * Danh sách các loại extension được hỗ trợ
     */
    extensionTypes: ExtensionType[];
    /**
     * Đối tượng chứa cấu hình cho từng extension
     * trong đó khóa là tên extension và giá trị là cấu hình tương ứng
     */
    extensions: Record<string, any>;
    /**
     * Cấu hình cho extension transfer fee (tùy chọn)
     */
    transferFee?: TransferFeeConfig;
    /**
     * Cấu hình cho extension metadata (tùy chọn)
     */
    metadata?: MetadataConfig;
    /**
     * Địa chỉ permanent delegate (tùy chọn)
     */
    permanentDelegate?: PublicKey;
    /**
     * Cấu hình cho extension transfer hook (tùy chọn)
     */
    transferHook?: TransferHookConfig;
}
