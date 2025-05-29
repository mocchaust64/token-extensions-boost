import { PublicKey } from '@solana/web3.js';
export declare const MemberPointerExtensionType = 21;
/**
 * Tạo instruction để khởi tạo member pointer cho một token
 * @param mint - Địa chỉ mint
 * @param memberMint - Địa chỉ mint của token mà token này là thành viên của
 * @param programId - Program ID của Token Extension
 * @returns Instruction để khởi tạo member pointer
 */
export declare function createInitializeMemberPointerInstruction(mint: PublicKey, memberMint: PublicKey, programId?: PublicKey): any;
/**
 * Class cho việc quản lý member pointer trong token groups
 */
export declare class MemberPointerExtension {
    /**
     * Tạo instruction để khởi tạo member pointer cho một token
     * @param mint - Địa chỉ mint
     * @param memberMint - Địa chỉ mint của token mà token này là thành viên của
     * @param programId - Program ID của Token Extension
     * @returns Instruction để khởi tạo member pointer
     */
    static createInitializeMemberPointerInstruction(mint: PublicKey, memberMint: PublicKey, programId?: PublicKey): any;
    /**
     * Kiểm tra xem một token có phải là thành viên của token group hay không
     * @param connection - Connection đến Solana cluster
     * @param mint - Địa chỉ mint của token
     * @param groupMint - Địa chỉ mint của token group
     * @returns Promise<boolean> - True nếu token là thành viên của group
     */
    static isMemberOfGroup(): Promise<boolean>;
}
