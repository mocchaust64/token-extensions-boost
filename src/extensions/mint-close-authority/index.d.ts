import { PublicKey } from '@solana/web3.js';
/**
 * Class cho việc thiết lập quyền đóng mint account
 */
export declare class MintCloseAuthorityExtension {
    /**
     * Tạo instruction để khởi tạo mint close authority
     * @param mint - Địa chỉ mint
     * @param closeAuthority - Địa chỉ có quyền đóng mint
     * @param programId - Program ID của Token Extension
     * @returns Instruction để thiết lập close authority
     */
    static createInitializeMintCloseAuthorityInstruction(mint: PublicKey, closeAuthority: PublicKey, programId?: PublicKey): import("@solana/web3.js").TransactionInstruction;
}
