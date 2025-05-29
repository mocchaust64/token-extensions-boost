import { Connection, PublicKey, Keypair } from '@solana/web3.js';
export declare const GroupPointerExtensionType = 20;
/**
 * Tạo instruction để khởi tạo group pointer cho một token
 * @param mint - Địa chỉ mint
 * @param groupMint - Địa chỉ mint của token group
 * @param programId - Program ID của Token Extension
 * @returns Instruction để khởi tạo group pointer
 */
export declare function createInitializeGroupPointerInstruction(mint: PublicKey, groupMint: PublicKey, programId?: PublicKey): any;
/**
 * Class cho việc quản lý token groups
 */
export declare class TokenGroupExtension {
    /**
     * Tạo một token group
     * @param connection - Connection đến Solana cluster
     * @param payer - Keypair của người trả phí
     * @param mintAuthority - Mint authority
     * @param decimals - Số thập phân
     * @returns Promise với thông tin về token group đã tạo
     */
    static createTokenGroup(connection: Connection, payer: Keypair, mintAuthority: PublicKey, decimals?: number): Promise<{
        groupMint: PublicKey;
        signature: string;
    }>;
    /**
     * Tạo instruction để khởi tạo group pointer cho một token
     * @param mint - Địa chỉ mint
     * @param groupMint - Địa chỉ mint của token group
     * @param programId - Program ID của Token Extension
     * @returns Instruction để khởi tạo group pointer
     */
    static createInitializeGroupPointerInstruction(mint: PublicKey, groupMint: PublicKey, programId?: PublicKey): any;
}
