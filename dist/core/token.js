"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Token = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
class Token {
    constructor(connection, mint) {
        this.connection = connection;
        this.mint = mint;
    }
    getMint() {
        return this.mint;
    }
    getConnection() {
        return this.connection;
    }
    getProgramId() {
        return spl_token_1.TOKEN_2022_PROGRAM_ID;
    }
    /**
     * Mint token vào tài khoản
     *
     * @param destination - Địa chỉ tài khoản nhận token
     * @param authority - Authority được phép mint token
     * @param amount - Số lượng token cần mint
     * @param multiSigners - Danh sách signers nếu sử dụng multisig (tùy chọn)
     * @returns Chữ ký của transaction
     */
    async mintTo(destination, authority, amount, multiSigners = []) {
        try {
            const mintSignature = await (0, spl_token_1.mintTo)(this.connection, authority, this.mint, destination, authority, amount, multiSigners, undefined, this.getProgramId());
            return mintSignature;
        }
        catch (error) {
            throw new Error(`Could not mint tokens: ${error.message}`);
        }
    }
    /**
     * Mint token vào tài khoản với kiểm tra decimals
     *
     * @param destination - Địa chỉ tài khoản nhận token
     * @param authority - Authority được phép mint token
     * @param amount - Số lượng token cần mint
     * @param decimals - Số decimals của token
     * @param multiSigners - Danh sách signers nếu sử dụng multisig (tùy chọn)
     * @returns Chữ ký của transaction
     */
    async mintToChecked(destination, authority, amount, decimals, multiSigners = []) {
        try {
            const mintSignature = await (0, spl_token_1.mintToChecked)(this.connection, authority, this.mint, destination, authority, amount, decimals, multiSigners, undefined, this.getProgramId());
            return mintSignature;
        }
        catch (error) {
            throw new Error(`Could not mint tokens with decimals check: ${error.message}`);
        }
    }
    /**
     * Tạo tài khoản token và mint token vào tài khoản đó
     *
     * @param owner - Chủ sở hữu tài khoản token
     * @param payer - Người trả phí giao dịch
     * @param amount - Số lượng token cần mint
     * @param mintAuthority - Authority được phép mint token
     * @returns Địa chỉ tài khoản token và chữ ký giao dịch
     */
    async createAccountAndMintTo(owner, payer, amount, mintAuthority) {
        try {
            // Tạo hoặc lấy tài khoản token
            const { address, signature: createSignature } = await this.createOrGetTokenAccount(payer, owner);
            // Mint token vào tài khoản
            const mintSignature = await this.mintTo(address, mintAuthority, amount);
            return {
                address,
                signature: createSignature ? createSignature : mintSignature
            };
        }
        catch (error) {
            throw new Error(`Could not create account and mint tokens: ${error.message}`);
        }
    }
    /**
     * Đốt (burn) một số lượng token từ tài khoản
     *
     * @param account - Địa chỉ tài khoản chứa token cần đốt
     * @param owner - Chủ sở hữu của tài khoản
     * @param amount - Số lượng token cần đốt
     * @returns Chữ ký của transaction
     */
    async burnTokens(account, owner, amount) {
        try {
            const burnSignature = await (0, spl_token_1.burn)(this.connection, owner, account, this.mint, owner.publicKey, amount, [], undefined, this.getProgramId());
            return burnSignature;
        }
        catch (error) {
            throw new Error(`Could not burn tokens: ${error.message}`);
        }
    }
    /**
     * Đốt (burn) một số lượng token từ tài khoản với kiểm tra decimals
     *
     * @param account - Địa chỉ tài khoản chứa token cần đốt
     * @param owner - Chủ sở hữu của tài khoản
     * @param amount - Số lượng token cần đốt
     * @param decimals - Số decimals của token
     * @returns Chữ ký của transaction
     */
    async burnTokensChecked(account, owner, amount, decimals) {
        try {
            const burnSignature = await (0, spl_token_1.burnChecked)(this.connection, owner, account, this.mint, owner.publicKey, amount, decimals, [], undefined, this.getProgramId());
            return burnSignature;
        }
        catch (error) {
            throw new Error(`Could not burn tokens with decimals check: ${error.message}`);
        }
    }
    /**
     * Chuyển token với kiểm tra decimals
     *
     * @param source - Địa chỉ tài khoản nguồn
     * @param destination - Địa chỉ tài khoản đích
     * @param owner - Chủ sở hữu tài khoản nguồn
     * @param amount - Số lượng token cần chuyển
     * @param decimals - Số decimals của token
     * @returns Chữ ký của transaction
     */
    async transfer(source, destination, owner, amount, decimals) {
        try {
            const transferSignature = await (0, spl_token_1.transferChecked)(this.connection, owner, source, this.mint, destination, owner.publicKey, amount, decimals, [], undefined, this.getProgramId());
            return transferSignature;
        }
        catch (error) {
            throw new Error(`Could not transfer tokens: ${error.message}`);
        }
    }
    /**
     * Tạo hoặc lấy tài khoản token hiện có
     *
     * @param payer - Người trả phí giao dịch
     * @param owner - Chủ sở hữu tài khoản token
     * @returns Địa chỉ tài khoản token và chữ ký giao dịch
     */
    async createOrGetTokenAccount(payer, owner) {
        try {
            const associatedTokenAddress = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, false, this.getProgramId());
            try {
                // Kiểm tra xem tài khoản đã tồn tại chưa
                await (0, spl_token_1.getAccount)(this.connection, associatedTokenAddress, "confirmed", this.getProgramId());
                return { address: associatedTokenAddress, signature: "" };
            }
            catch (error) {
                if (error instanceof spl_token_1.TokenAccountNotFoundError) {
                    // Tài khoản chưa tồn tại, tạo mới
                    const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, associatedTokenAddress, owner, this.mint, this.getProgramId()));
                    const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer], { commitment: "confirmed" });
                    return { address: associatedTokenAddress, signature };
                }
                throw error;
            }
        }
        catch (error) {
            throw new Error(`Could not create or get token account: ${error.message}`);
        }
    }
}
exports.Token = Token;
