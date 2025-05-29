"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenGroupExtension = exports.GroupPointerExtensionType = void 0;
exports.createInitializeGroupPointerInstruction = createInitializeGroupPointerInstruction;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
// Định nghĩa GroupPointer extension type (chưa có trong ExtensionType tiêu chuẩn)
exports.GroupPointerExtensionType = 20; // Giả định ID cho GroupPointer
/**
 * Tạo instruction để khởi tạo group pointer cho một token
 * @param mint - Địa chỉ mint
 * @param groupMint - Địa chỉ mint của token group
 * @param programId - Program ID của Token Extension
 * @returns Instruction để khởi tạo group pointer
 */
function createInitializeGroupPointerInstruction(mint, groupMint, programId = spl_token_1.TOKEN_2022_PROGRAM_ID) {
    // Trong thực tế, đây là nơi bạn sẽ triển khai logic để tạo instruction
    // Vì đây là mock cho demo, chúng ta sẽ không thực hiện đầy đủ
    return {
        programId,
        keys: [
            { pubkey: mint, isSigner: false, isWritable: true },
            { pubkey: groupMint, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([exports.GroupPointerExtensionType]), // Mock data
    };
}
/**
 * Class cho việc quản lý token groups
 */
class TokenGroupExtension {
    /**
     * Tạo một token group
     * @param connection - Connection đến Solana cluster
     * @param payer - Keypair của người trả phí
     * @param mintAuthority - Mint authority
     * @param decimals - Số thập phân
     * @returns Promise với thông tin về token group đã tạo
     */
    static async createTokenGroup(connection, payer, mintAuthority, decimals = 0) {
        // Tạo keypair cho token group mint
        const groupMintKeypair = web3_js_1.Keypair.generate();
        const groupMint = groupMintKeypair.publicKey;
        // Tính kích thước cho token group mint account
        const extensionsSpace = 100; // Giả định kích thước cần thiết
        const mintLen = (0, spl_token_1.getMintLen)([]) + extensionsSpace;
        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
        // Tạo transaction
        const transaction = new web3_js_1.Transaction();
        // Thêm instruction để tạo token group mint account
        transaction.add(web3_js_1.SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: groupMint,
            space: mintLen,
            lamports,
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
        }));
        // Khởi tạo mint account
        transaction.add((0, spl_token_1.createInitializeMintInstruction)(groupMint, decimals, mintAuthority, null, // freeze authority
        spl_token_1.TOKEN_2022_PROGRAM_ID));
        // Gửi và xác nhận transaction
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [payer, groupMintKeypair], { commitment: 'confirmed' });
        return {
            groupMint,
            signature,
        };
    }
    /**
     * Tạo instruction để khởi tạo group pointer cho một token
     * @param mint - Địa chỉ mint
     * @param groupMint - Địa chỉ mint của token group
     * @param programId - Program ID của Token Extension
     * @returns Instruction để khởi tạo group pointer
     */
    static createInitializeGroupPointerInstruction(mint, groupMint, programId = spl_token_1.TOKEN_2022_PROGRAM_ID) {
        return createInitializeGroupPointerInstruction(mint, groupMint, programId);
    }
}
exports.TokenGroupExtension = TokenGroupExtension;
