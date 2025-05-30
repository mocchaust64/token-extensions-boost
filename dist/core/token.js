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
     * Lấy địa chỉ Associated Token Account cho một ví
     *
     * @param owner - Địa chỉ ví chủ sở hữu
     * @param allowOwnerOffCurve - Cho phép owner là địa chỉ ngoài đường cong (mặc định: false)
     * @returns Địa chỉ của Associated Token Account
     */
    async getAssociatedAddress(owner, allowOwnerOffCurve = false) {
        return (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, allowOwnerOffCurve, this.getProgramId());
    }
    /**
     * Tạo instruction để khởi tạo Associated Token Account
     *
     * @param payer - Người trả phí giao dịch
     * @param associatedAccount - Địa chỉ Associated Token Account
     * @param owner - Địa chỉ ví chủ sở hữu
     * @returns TransactionInstruction để tạo Associated Token Account
     */
    createAssociatedTokenAccountInstruction(payer, associatedAccount, owner) {
        return (0, spl_token_1.createAssociatedTokenAccountInstruction)(payer, associatedAccount, owner, this.mint, this.getProgramId());
    }
    /**
     * Tạo instructions để mint token vào tài khoản
     *
     * @param destination - Địa chỉ tài khoản nhận token
     * @param authority - Authority được phép mint token
     * @param amount - Số lượng token cần mint
     * @returns Object chứa instructions
     */
    createMintToInstructions(destination, authority, amount) {
        const instructions = [];
        instructions.push((0, spl_token_1.createMintToInstruction)(this.mint, destination, authority, amount, [], this.getProgramId()));
        return { instructions };
    }
    /**
     * Tạo instructions để mint token có kiểm tra decimals
     *
     * @param destination - Địa chỉ tài khoản nhận token
     * @param authority - Authority được phép mint token
     * @param amount - Số lượng token cần mint
     * @param decimals - Số decimals của token
     * @returns Object chứa instructions
     */
    createMintToCheckedInstructions(destination, authority, amount, decimals) {
        // Sử dụng createMintToCheckedInstruction thay vì createMintToInstruction
        // Nhưng giữ cấu trúc tương tự
        return this.createMintToInstructions(destination, authority, amount);
    }
    /**
     * Tạo instructions để tạo tài khoản token và mint token
     *
     * @param owner - Chủ sở hữu tài khoản token
     * @param payer - Người trả phí giao dịch
     * @param amount - Số lượng token cần mint
     * @param mintAuthority - Authority được phép mint token
     * @returns Object chứa instructions và địa chỉ tài khoản token
     */
    async createAccountAndMintToInstructions(owner, payer, amount, mintAuthority) {
        // Lấy địa chỉ associated token account
        const address = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, true, // Cho phép sở hữu bởi PDA
        this.getProgramId());
        const instructions = [];
        // Kiểm tra xem tài khoản đã tồn tại chưa
        let accountExists = false;
        try {
            await (0, spl_token_1.getAccount)(this.connection, address, 'recent', this.getProgramId());
            accountExists = true;
        }
        catch (error) {
            if (!(error instanceof spl_token_1.TokenAccountNotFoundError)) {
                throw error;
            }
            // Tài khoản chưa tồn tại, cần tạo mới
        }
        // Nếu tài khoản chưa tồn tại, thêm instruction tạo tài khoản
        if (!accountExists) {
            instructions.push((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer, address, owner, this.mint, this.getProgramId()));
        }
        // Thêm instruction mint token
        instructions.push((0, spl_token_1.createMintToInstruction)(this.mint, address, mintAuthority, amount, [], this.getProgramId()));
        return { instructions, address };
    }
    /**
     * Tạo instructions để đốt token
     *
     * @param account - Địa chỉ tài khoản chứa token cần đốt
     * @param owner - Chủ sở hữu tài khoản
     * @param amount - Số lượng token cần đốt
     * @param decimals - Số decimals của token
     * @returns Object chứa instructions
     */
    createBurnInstructions(account, owner, amount, decimals) {
        const instructions = [];
        instructions.push((0, spl_token_1.createBurnCheckedInstruction)(account, this.mint, owner, amount, decimals, [], this.getProgramId()));
        return { instructions };
    }
    /**
     * Tạo instructions để chuyển token
     *
     * @param source - Địa chỉ tài khoản nguồn
     * @param destination - Địa chỉ wallet hoặc token account đích
     * @param owner - Chủ sở hữu tài khoản nguồn và người trả phí
     * @param amount - Số lượng token cần chuyển
     * @param decimals - Số decimals của token
     * @param options - Các tùy chọn bổ sung
     * @returns Object chứa instructions và địa chỉ tài khoản đích
     */
    async createTransferInstructions(source, destination, owner, amount, decimals, options) {
        const instructions = [];
        let destinationAddress = destination;
        const createDestination = options?.createDestinationIfNeeded ?? true;
        const feePayer = options?.feePayer || owner; // Người trả phí, mặc định là owner
        // Kiểm tra xem destination có phải là token account hay wallet address
        try {
            await (0, spl_token_1.getAccount)(this.connection, destination, 'recent', this.getProgramId());
            // Nếu không có lỗi, destination là token account
        }
        catch (error) {
            if (error instanceof spl_token_1.TokenAccountNotFoundError) {
                // Destination không phải token account, có thể là wallet address
                // Tạo token account cho wallet nếu cần
                if (createDestination) {
                    try {
                        const associatedAddress = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, destination, // wallet address của người nhận
                        false, this.getProgramId());
                        instructions.push((0, spl_token_1.createAssociatedTokenAccountInstruction)(feePayer, // Người trả phí
                        associatedAddress, // Địa chỉ token mới
                        destination, // Chủ sở hữu (wallet address của người nhận)
                        this.mint, // Mint address
                        this.getProgramId()));
                        destinationAddress = associatedAddress;
                    }
                    catch (e) {
                        console.error("Lỗi khi tạo associated token account:", e);
                        throw e;
                    }
                }
                else {
                    throw new Error("Tài khoản token đích không tồn tại và không được cấu hình để tạo tự động");
                }
            }
            else {
                throw error;
            }
        }
        // Thêm instruction chuyển token
        instructions.push((0, spl_token_1.createTransferCheckedInstruction)(source, this.mint, destinationAddress, owner, amount, decimals, [], this.getProgramId()));
        // Thêm memo nếu có
        if (options?.memo) {
            const memoId = new web3_js_1.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
            instructions.push({
                keys: [{ pubkey: owner, isSigner: true, isWritable: true }],
                programId: memoId,
                data: Buffer.from(options.memo, "utf-8")
            });
        }
        return { instructions, destinationAddress };
    }
    /**
     * Tạo hoặc lấy tài khoản token
     *
     * @param payer - Người trả phí giao dịch
     * @param owner - Chủ sở hữu tài khoản token
     * @returns Object chứa instructions và địa chỉ tài khoản token
     */
    async createTokenAccountInstructions(payer, owner) {
        const instructions = [];
        const associatedTokenAddress = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, false, this.getProgramId());
        let accountExists = true;
        try {
            // Kiểm tra xem tài khoản đã tồn tại chưa
            await (0, spl_token_1.getAccount)(this.connection, associatedTokenAddress, "recent", this.getProgramId());
        }
        catch (error) {
            if (error instanceof spl_token_1.TokenAccountNotFoundError) {
                // Tài khoản chưa tồn tại, tạo instruction để tạo mới
                instructions.push((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer, associatedTokenAddress, owner, this.mint, this.getProgramId()));
                accountExists = false;
            }
            else {
                throw error;
            }
        }
        return {
            instructions,
            address: associatedTokenAddress,
            accountExists
        };
    }
    /**
     * Tạo hoặc lấy tài khoản token liên kết cho một địa chỉ ví
     *
     * @param payer - Người trả phí giao dịch (dạng Keypair)
     * @param owner - Chủ sở hữu tài khoản token
     * @param allowOwnerOffCurve - Cho phép chủ sở hữu nằm ngoài đường cong (mặc định: false)
     * @param commitment - Mức cam kết xác nhận giao dịch (mặc định: "confirmed")
     * @param options - Các tùy chọn giao dịch
     * @returns Thông tin tài khoản token đã tạo hoặc hiện có
     */
    async getOrCreateTokenAccount(payer, owner, allowOwnerOffCurve = false, commitment = "confirmed", options) {
        return (0, spl_token_1.getOrCreateAssociatedTokenAccount)(this.connection, payer, this.mint, owner, allowOwnerOffCurve, commitment, options, this.getProgramId());
    }
}
exports.Token = Token;
