"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MintCloseAuthorityExtension = void 0;
const spl_token_1 = require("@solana/spl-token");
/**
 * Class cho việc thiết lập quyền đóng mint account
 */
class MintCloseAuthorityExtension {
    /**
     * Tạo instruction để khởi tạo mint close authority
     * @param mint - Địa chỉ mint
     * @param closeAuthority - Địa chỉ có quyền đóng mint
     * @param programId - Program ID của Token Extension
     * @returns Instruction để thiết lập close authority
     */
    static createInitializeMintCloseAuthorityInstruction(mint, closeAuthority, programId = spl_token_1.TOKEN_2022_PROGRAM_ID) {
        return (0, spl_token_1.createInitializeMintCloseAuthorityInstruction)(mint, closeAuthority, programId);
    }
}
exports.MintCloseAuthorityExtension = MintCloseAuthorityExtension;
