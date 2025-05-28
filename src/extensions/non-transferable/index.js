"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonTransferableToken = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const token_1 = require("../../core/token");
/**
 * NonTransferableToken - Extension for non-transferable tokens
 *
 * This extension prevents tokens from being transferred after they've been minted.
 * Useful for credentials, certificates, soulbound tokens, and other non-transferable assets.
 */
class NonTransferableToken extends token_1.Token {
    constructor(connection, mint) {
        super(connection, mint);
    }
    /**
     * Create a new NonTransferableToken
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Transaction fee payer keypair
     * @param params - Initialization parameters including:
     *   - decimals: Number of decimal places
     *   - mintAuthority: Authority allowed to mint tokens
     *   - freezeAuthority: Optional authority allowed to freeze accounts
     * @returns Newly created NonTransferableToken object
     */
    static async create(connection, payer, params) {
        try {
            const mintKeypair = web3_js_1.Keypair.generate();
            const mintLen = (0, spl_token_1.getMintLen)([spl_token_1.ExtensionType.NonTransferable]);
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: mintLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }), (0, spl_token_1.createInitializeNonTransferableMintInstruction)(mintKeypair.publicKey, spl_token_1.TOKEN_2022_PROGRAM_ID), (0, spl_token_1.createInitializeMintInstruction)(mintKeypair.publicKey, params.decimals, params.mintAuthority, params.freezeAuthority ?? null, spl_token_1.TOKEN_2022_PROGRAM_ID));
            await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [
                payer,
                mintKeypair,
            ], { commitment: 'confirmed' });
            return new NonTransferableToken(connection, mintKeypair.publicKey);
        }
        catch (error) {
            throw new Error(`Could not create NonTransferableToken: ${error.message}`);
        }
    }
    /**
     * Create an account and mint tokens to it
     *
     * @param owner - Account owner
     * @param payer - Transaction fee payer
     * @param amount - Amount to mint
     * @param mintAuthority - Authority allowed to mint tokens
     * @returns Public key of the newly created account and transaction signature
     */
    async createAccountAndMintTo(owner, payer, amount, mintAuthority) {
        try {
            // Create token account
            const { address, signature: createSignature } = await this.createOrGetTokenAccount(payer, owner);
            // Mint tokens
            const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createMintToInstruction)(this.mint, address, mintAuthority.publicKey, amount, [], spl_token_1.TOKEN_2022_PROGRAM_ID));
            const mintSignature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, mintAuthority], { commitment: "confirmed" });
            return {
                address,
                signature: createSignature || mintSignature
            };
        }
        catch (error) {
            throw new Error(`Could not create account and mint tokens: ${error.message}`);
        }
    }
    /**
     * Create or get an existing token account
     *
     * @param payer - Transaction fee payer
     * @param owner - Account owner
     * @returns Token account address and transaction signature
     */
    async createOrGetTokenAccount(payer, owner) {
        const associatedTokenAddress = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
        try {
            // Check if account already exists
            await (0, spl_token_1.getAccount)(this.connection, associatedTokenAddress, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
            return { address: associatedTokenAddress, signature: "" };
        }
        catch (error) {
            if (error instanceof spl_token_1.TokenAccountNotFoundError) {
                // Account doesn't exist, create it
                const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, associatedTokenAddress, owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
                const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer], { commitment: "confirmed" });
                return { address: associatedTokenAddress, signature };
            }
            throw error;
        }
    }
    /**
     * Check if the token is non-transferable
     *
     * @returns Promise resolving to boolean
     */
    async isNonTransferable() {
        try {
            const mintInfo = await (0, spl_token_1.getMint)(this.connection, this.mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
            if (!mintInfo.tlvData || mintInfo.tlvData.length === 0) {
                console.log("Không có dữ liệu TLV cho mint");
                return false;
            }
            console.log(`Mint TLV data for ${this.mint.toBase58()}:`, mintInfo.tlvData);
            const NON_TRANSFERABLE_TYPE = 8;
            let offset = 0;
            while (offset < mintInfo.tlvData.length) {
                if (offset + 4 > mintInfo.tlvData.length)
                    break;
                const type = mintInfo.tlvData.readUInt32LE(offset);
                console.log(`Found extension type: ${type}`);
                if (type === NON_TRANSFERABLE_TYPE) {
                    return true;
                }
                if (offset + 8 > mintInfo.tlvData.length)
                    break;
                const length = mintInfo.tlvData.readUInt32LE(offset + 4);
                offset += 8 + length;
            }
            return false;
        }
        catch (error) {
            console.error("Error checking non-transferable status:", error);
            throw new Error(`Failed to check if token is non-transferable: ${error.message}`);
        }
    }
    /**
     * Thử chuyển token để kiểm tra tính năng không thể chuyển nhượng
     * Phương thức này sẽ luôn thất bại với lỗi phù hợp nếu token có extension NonTransferable
     *
     * @param source - Địa chỉ tài khoản nguồn
     * @param destination - Địa chỉ tài khoản đích
     * @param owner - Chủ sở hữu tài khoản nguồn
     * @param amount - Số lượng token cần chuyển
     * @param decimals - Số chữ số thập phân của token
     * @returns Promise resolving to boolean sẽ luôn từ chối với lỗi khi có extension NonTransferable
     */
    async attemptTransfer(source, destination, owner, amount, decimals) {
        try {
            const isNonTransferable = await this.isNonTransferable();
            if (isNonTransferable) {
                throw new Error("Cannot transfer NonTransferableToken: tokens are non-transferable by design");
            }
            await (0, spl_token_1.transferChecked)(this.connection, owner, source, this.mint, destination, owner.publicKey, amount, decimals, [], { commitment: "confirmed" }, spl_token_1.TOKEN_2022_PROGRAM_ID);
            // Không nên đến được đây
            throw new Error("Transfer succeeded unexpectedly for a NonTransferableToken");
        }
        catch (error) {
            throw new Error(`Transfer failed as expected: ${error.message}`);
        }
    }
    /**
     * Lấy thông tin về mint của token
     *
     * @returns Thông tin chi tiết về mint
     */
    async getMintInfo() {
        try {
            return await (0, spl_token_1.getMint)(this.connection, this.mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
        }
        catch (error) {
            throw new Error(`Failed to get mint info: ${error.message}`);
        }
    }
    /**
     * Kiểm tra token có extension NonTransferable hay không và trả về thông tin
     *
     * @returns Thông tin chi tiết về extension NonTransferable
     */
    async getNonTransferableInfo() {
        const isNonTransferable = await this.isNonTransferable();
        return { isNonTransferable };
    }
    /**
     * Kiểm tra xem một tài khoản token có thể thực hiện chuyển token hay không
     * Đối với NonTransferableToken, phương thức này sẽ luôn trả về false
     *
     * @param tokenAccount - Địa chỉ tài khoản token cần kiểm tra
     * @returns False nếu là NonTransferableToken, hoặc tài khoản không tồn tại
     */
    async canTransferTokens(tokenAccount) {
        try {
            const isNonTransferable = await this.isNonTransferable();
            if (isNonTransferable) {
                return false;
            }
            // Kiểm tra tài khoản tồn tại
            await (0, spl_token_1.getAccount)(this.connection, tokenAccount, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
            // Với NonTransferableToken, về nguyên tắc không thể chuyển
            return false;
        }
        catch (error) {
            return false;
        }
    }
}
exports.NonTransferableToken = NonTransferableToken;
