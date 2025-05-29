"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberPointerExtension = exports.MemberPointerExtensionType = void 0;
exports.createInitializeMemberPointerInstruction = createInitializeMemberPointerInstruction;
const spl_token_1 = require("@solana/spl-token");
// Định nghĩa MemberPointer extension type (chưa có trong ExtensionType tiêu chuẩn)
exports.MemberPointerExtensionType = 21; // Giả định ID cho MemberPointer
/**
 * Tạo instruction để khởi tạo member pointer cho một token
 * @param mint - Địa chỉ mint
 * @param memberMint - Địa chỉ mint của token mà token này là thành viên của
 * @param programId - Program ID của Token Extension
 * @returns Instruction để khởi tạo member pointer
 */
function createInitializeMemberPointerInstruction(mint, memberMint, programId = spl_token_1.TOKEN_2022_PROGRAM_ID) {
    // Trong thực tế, đây là nơi bạn sẽ triển khai logic để tạo instruction
    return {
        programId,
        keys: [
            { pubkey: mint, isSigner: false, isWritable: true },
            { pubkey: memberMint, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([exports.MemberPointerExtensionType]), // Mock data
    };
}
/**
 * Class cho việc quản lý member pointer trong token groups
 */
class MemberPointerExtension {
    /**
     * Tạo instruction để khởi tạo member pointer cho một token
     * @param mint - Địa chỉ mint
     * @param memberMint - Địa chỉ mint của token mà token này là thành viên của
     * @param programId - Program ID của Token Extension
     * @returns Instruction để khởi tạo member pointer
     */
    static createInitializeMemberPointerInstruction(mint, memberMint, programId = spl_token_1.TOKEN_2022_PROGRAM_ID) {
        return createInitializeMemberPointerInstruction(mint, memberMint, programId);
    }
    /**
     * Kiểm tra xem một token có phải là thành viên của token group hay không
     * @param connection - Connection đến Solana cluster
     * @param mint - Địa chỉ mint của token
     * @param groupMint - Địa chỉ mint của token group
     * @returns Promise<boolean> - True nếu token là thành viên của group
     */
    static async isMemberOfGroup(
    // connection: Connection,
    // mint: PublicKey,
    // groupMint: PublicKey
    ) {
        // Trong thực tế, đây là nơi sẽ truy vấn on-chain data để kiểm tra
        // Cho mục đích demo, chúng ta sẽ trả về giá trị giả định
        return Promise.resolve(true);
    }
}
exports.MemberPointerExtension = MemberPointerExtension;
