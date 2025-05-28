"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultAccountStateExtension = void 0;
const spl_token_1 = require("@solana/spl-token");
/**
 * Class cho việc thiết lập trạng thái mặc định cho tài khoản token
 */
class DefaultAccountStateExtension {
    /**
     * Tạo instruction để khởi tạo trạng thái mặc định cho mint
     * @param mint - Địa chỉ mint
     * @param accountState - Trạng thái mặc định (frozen hoặc initialized)
     * @param programId - Program ID của Token Extension
     * @returns Instruction để khởi tạo trạng thái mặc định
     */
    static createInitializeDefaultAccountStateInstruction(mint, accountState, programId = spl_token_1.TOKEN_2022_PROGRAM_ID) {
        return (0, spl_token_1.createInitializeDefaultAccountStateInstruction)(mint, accountState, programId);
    }
}
exports.DefaultAccountStateExtension = DefaultAccountStateExtension;
