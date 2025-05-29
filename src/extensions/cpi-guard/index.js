"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CpiGuardExtension = void 0;
exports.createInitializeCpiGuardInstruction = createInitializeCpiGuardInstruction;
const spl_token_1 = require("@solana/spl-token");
/**
 * Tạo instruction để khởi tạo CPI Guard cho mint
 * @param mint - Địa chỉ mint
 * @param authority - (Optional) Địa chỉ authority có thể bật/tắt CPI Guard
 * @param programId - Program ID của Token Extension
 * @returns Instruction để khởi tạo CPI Guard
 */
function createInitializeCpiGuardInstruction(mint, authority = null, programId = spl_token_1.TOKEN_2022_PROGRAM_ID) {
    const keys = [
        { pubkey: mint, isSigner: false, isWritable: true },
    ];
    if (authority) {
        keys.push({ pubkey: authority, isSigner: false, isWritable: false });
    }
    return {
        programId,
        keys,
        data: Buffer.from([0x00]), // Mock data để khởi tạo CPI Guard
    };
}
/**
 * Class cho việc bảo vệ chống lại CPI attacks
 */
class CpiGuardExtension {
    /**
     * Tạo instruction để khởi tạo CPI Guard cho mint
     * @param mint - Địa chỉ mint
     * @param authority - (Optional) Địa chỉ authority có thể bật/tắt CPI Guard
     * @param programId - Program ID của Token Extension
     * @returns Instruction để khởi tạo CPI Guard
     */
    static createInitializeCpiGuardInstruction(mint, authority = null, programId = spl_token_1.TOKEN_2022_PROGRAM_ID) {
        return createInitializeCpiGuardInstruction(mint, authority, programId);
    }
    /**
     * Tạo instruction để bật CPI Guard cho một mint
     * @param mint - Địa chỉ mint
     * @param authority - Địa chỉ authority có thể bật/tắt CPI Guard
     * @param programId - Program ID của Token Extension
     * @returns Instruction để bật CPI Guard
     */
    static createEnableCpiGuardInstruction(mint, authority, programId = spl_token_1.TOKEN_2022_PROGRAM_ID) {
        // Trong thực tế, bạn sẽ gọi hàm từ @solana/spl-token
        // Đây là phiên bản giả lập cho mục đích demo
        return {
            programId,
            keys: [
                { pubkey: mint, isSigner: false, isWritable: true },
                { pubkey: authority, isSigner: true, isWritable: false }
            ],
            data: Buffer.from([0x01]), // Mock data
        };
    }
    /**
     * Tạo instruction để tắt CPI Guard cho một mint
     * @param mint - Địa chỉ mint
     * @param authority - Địa chỉ authority có thể bật/tắt CPI Guard
     * @param programId - Program ID của Token Extension
     * @returns Instruction để tắt CPI Guard
     */
    static createDisableCpiGuardInstruction(mint, authority, programId = spl_token_1.TOKEN_2022_PROGRAM_ID) {
        // Trong thực tế, bạn sẽ gọi hàm từ @solana/spl-token
        // Đây là phiên bản giả lập cho mục đích demo
        return {
            programId,
            keys: [
                { pubkey: mint, isSigner: false, isWritable: true },
                { pubkey: authority, isSigner: true, isWritable: false }
            ],
            data: Buffer.from([0x02]), // Mock data
        };
    }
}
exports.CpiGuardExtension = CpiGuardExtension;
