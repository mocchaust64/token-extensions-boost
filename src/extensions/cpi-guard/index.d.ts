import { PublicKey } from '@solana/web3.js';
/**
 * Tạo instruction để khởi tạo CPI Guard cho mint
 * @param mint - Địa chỉ mint
 * @param authority - (Optional) Địa chỉ authority có thể bật/tắt CPI Guard
 * @param programId - Program ID của Token Extension
 * @returns Instruction để khởi tạo CPI Guard
 */
export declare function createInitializeCpiGuardInstruction(mint: PublicKey, authority?: PublicKey | null, programId?: PublicKey): any;
/**
 * Class cho việc bảo vệ chống lại CPI attacks
 */
export declare class CpiGuardExtension {
    /**
     * Tạo instruction để khởi tạo CPI Guard cho mint
     * @param mint - Địa chỉ mint
     * @param authority - (Optional) Địa chỉ authority có thể bật/tắt CPI Guard
     * @param programId - Program ID của Token Extension
     * @returns Instruction để khởi tạo CPI Guard
     */
    static createInitializeCpiGuardInstruction(mint: PublicKey, authority?: PublicKey | null, programId?: PublicKey): any;
    /**
     * Tạo instruction để bật CPI Guard cho một mint
     * @param mint - Địa chỉ mint
     * @param authority - Địa chỉ authority có thể bật/tắt CPI Guard
     * @param programId - Program ID của Token Extension
     * @returns Instruction để bật CPI Guard
     */
    static createEnableCpiGuardInstruction(mint: PublicKey, authority: PublicKey, programId?: PublicKey): {
        programId: PublicKey;
        keys: {
            pubkey: PublicKey;
            isSigner: boolean;
            isWritable: boolean;
        }[];
        data: Buffer<ArrayBuffer>;
    };
    /**
     * Tạo instruction để tắt CPI Guard cho một mint
     * @param mint - Địa chỉ mint
     * @param authority - Địa chỉ authority có thể bật/tắt CPI Guard
     * @param programId - Program ID của Token Extension
     * @returns Instruction để tắt CPI Guard
     */
    static createDisableCpiGuardInstruction(mint: PublicKey, authority: PublicKey, programId?: PublicKey): {
        programId: PublicKey;
        keys: {
            pubkey: PublicKey;
            isSigner: boolean;
            isWritable: boolean;
        }[];
        data: Buffer<ArrayBuffer>;
    };
}
