"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferFeeToken = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const token_1 = require("../../core/token");
/**
 * TransferFeeToken - Extension for Token with transfer fee functionality
 *
 * This extension allows automatic fee collection when transferring tokens,
 * with configurable fee rate and maximum fee amount.
 */
class TransferFeeToken extends token_1.Token {
    constructor(connection, mint, config) {
        super(connection, mint);
        this.config = config;
    }
    /**
     * Create a new TransferFeeToken
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Transaction fee payer keypair
     * @param params - Initialization parameters including:
     *   - decimals: Number of decimal places
     *   - mintAuthority: Authority allowed to mint tokens
     *   - transferFeeConfig: Transfer fee configuration
     * @returns Newly created TransferFeeToken object
     */
    static async create(connection, payer, params) {
        if (params.transferFeeConfig.feeBasisPoints < 0 || params.transferFeeConfig.feeBasisPoints > 10000) {
            throw new Error("Fee rate must be between 0 and 10000 basis points (0-100%)");
        }
        if (params.transferFeeConfig.maxFee < 0n) {
            throw new Error("Maximum fee cannot be negative");
        }
        try {
            const mintKeypair = web3_js_1.Keypair.generate();
            const mintLen = (0, spl_token_1.getMintLen)([spl_token_1.ExtensionType.TransferFeeConfig]);
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: mintLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }), (0, spl_token_1.createInitializeTransferFeeConfigInstruction)(mintKeypair.publicKey, params.transferFeeConfig.transferFeeConfigAuthority.publicKey, params.transferFeeConfig.withdrawWithheldAuthority.publicKey, params.transferFeeConfig.feeBasisPoints, params.transferFeeConfig.maxFee, spl_token_1.TOKEN_2022_PROGRAM_ID), (0, spl_token_1.createInitializeMintInstruction)(mintKeypair.publicKey, params.decimals, params.mintAuthority, null, spl_token_1.TOKEN_2022_PROGRAM_ID));
            await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [
                payer,
                mintKeypair,
            ]);
            return new TransferFeeToken(connection, mintKeypair.publicKey, {
                feeBasisPoints: params.transferFeeConfig.feeBasisPoints,
                maxFee: params.transferFeeConfig.maxFee,
                transferFeeConfigAuthority: params.transferFeeConfig.transferFeeConfigAuthority,
                withdrawWithheldAuthority: params.transferFeeConfig.withdrawWithheldAuthority,
            });
        }
        catch (error) {
            throw new Error(`Could not create TransferFeeToken: ${error.message}`);
        }
    }
    /**
     * Generate instructions to create a new TransferFeeToken
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Public key of the transaction fee payer
     * @param params - Initialization parameters including:
     *   - decimals: Number of decimal places
     *   - mintAuthority: Authority allowed to mint tokens
     *   - transferFeeConfig: Transfer fee configuration
     * @returns Instructions, signers and mint address
     */
    static async createInstructions(connection, payer, params) {
        if (params.transferFeeConfig.feeBasisPoints < 0 || params.transferFeeConfig.feeBasisPoints > 10000) {
            throw new Error("Fee rate must be between 0 and 10000 basis points (0-100%)");
        }
        if (params.transferFeeConfig.maxFee < 0n) {
            throw new Error("Maximum fee cannot be negative");
        }
        try {
            const mintKeypair = web3_js_1.Keypair.generate();
            const mintLen = (0, spl_token_1.getMintLen)([spl_token_1.ExtensionType.TransferFeeConfig]);
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
            const instructions = [
                web3_js_1.SystemProgram.createAccount({
                    fromPubkey: payer,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                }),
                (0, spl_token_1.createInitializeTransferFeeConfigInstruction)(mintKeypair.publicKey, params.transferFeeConfig.transferFeeConfigAuthority, params.transferFeeConfig.withdrawWithheldAuthority, params.transferFeeConfig.feeBasisPoints, params.transferFeeConfig.maxFee, spl_token_1.TOKEN_2022_PROGRAM_ID),
                (0, spl_token_1.createInitializeMintInstruction)(mintKeypair.publicKey, params.decimals, params.mintAuthority, null, spl_token_1.TOKEN_2022_PROGRAM_ID)
            ];
            return {
                instructions,
                signers: [mintKeypair],
                mint: mintKeypair.publicKey
            };
        }
        catch (error) {
            throw new Error(`Could not create TransferFeeToken instructions: ${error.message}`);
        }
    }
    /**
     * Calculate transfer fee based on token amount and fee configuration
     *
     * @param amount - Token amount to transfer
     * @returns Calculated fee amount
     */
    calculateFee(amount) {
        const fee = (amount * BigInt(this.config.feeBasisPoints)) / BigInt(10000);
        return fee > this.config.maxFee ? this.config.maxFee : fee;
    }
    /**
     * Create transfer instruction with automatically calculated fee
     *
     * @param source - Source account address
     * @param destination - Destination account address
     * @param owner - Source account owner
     * @param amount - Token amount to transfer
     * @param decimals - Token decimal places
     * @returns TransactionInstruction
     */
    createTransferInstruction(source, destination, owner, amount, decimals) {
        const fee = this.calculateFee(amount);
        return this.createTransferWithFeeInstruction(source, destination, owner, amount, decimals, Number(fee));
    }
    /**
     * Create transfer instruction with specified fee
     *
     * @param source - Source account address
     * @param destination - Destination account address
     * @param owner - Source account owner
     * @param amount - Token amount to transfer
     * @param decimals - Token decimal places
     * @param fee - Specified fee amount
     * @returns TransactionInstruction
     */
    createTransferWithFeeInstruction(source, destination, owner, amount, decimals, fee) {
        return (0, spl_token_1.createTransferCheckedWithFeeInstruction)(source, this.mint, destination, owner, amount, decimals, BigInt(fee), [], spl_token_1.TOKEN_2022_PROGRAM_ID);
    }
    /**
     * Execute token transfer with automatically calculated fee
     *
     * @param source - Source account address
     * @param destination - Destination account address
     * @param owner - Source account owner
     * @param amount - Token amount to transfer
     * @param decimals - Token decimal places
     * @returns Transaction signature
     */
    async transfer(source, destination, owner, amount, decimals) {
        try {
            const fee = this.calculateFee(amount);
            return await this.transferWithFee(source, destination, owner, amount, decimals, Number(fee));
        }
        catch (error) {
            throw new Error(`Could not transfer tokens: ${error.message}`);
        }
    }
    /**
     * Execute token transfer with specified fee
     *
     * @param source - Source account address
     * @param destination - Destination account address
     * @param owner - Source account owner
     * @param amount - Token amount to transfer
     * @param decimals - Token decimal places
     * @param fee - Specified fee amount
     * @returns Transaction signature
     */
    async transferWithFee(source, destination, owner, amount, decimals, fee) {
        try {
            const transaction = new web3_js_1.Transaction().add(this.createTransferWithFeeInstruction(source, destination, owner.publicKey, amount, decimals, fee));
            return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [owner]);
        }
        catch (error) {
            throw new Error(`Could not transfer tokens with fee: ${error.message}`);
        }
    }
    /**
     * Create instruction to harvest withheld tokens from accounts to the mint
     *
     * @param accounts - List of accounts with withheld fees to harvest
     * @returns Transaction instruction
     */
    createHarvestWithheldTokensToMintInstruction(accounts) {
        if (accounts.length === 0) {
            throw new Error("Account list cannot be empty");
        }
        return (0, spl_token_1.createHarvestWithheldTokensToMintInstruction)(this.mint, accounts, spl_token_1.TOKEN_2022_PROGRAM_ID);
    }
    /**
     * Harvest withheld tokens from accounts to the mint
     *
     * @param accounts - List of accounts with withheld fees to harvest
     * @param withdrawAuthority - Withdraw authority keypair (required if not set in constructor)
     * @returns Transaction signature
     */
    async harvestWithheldTokensToMint(accounts, withdrawAuthority) {
        if (accounts.length === 0) {
            throw new Error("Account list cannot be empty");
        }
        const authority = this.getWithdrawAuthority(withdrawAuthority);
        if (!authority) {
            throw new Error("Withdrawal authority is required");
        }
        try {
            const transaction = new web3_js_1.Transaction().add(this.createHarvestWithheldTokensToMintInstruction(accounts));
            return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [authority]);
        }
        catch (error) {
            throw new Error(`Could not harvest fees to mint: ${error.message}`);
        }
    }
    /**
     * Create instruction to withdraw withheld tokens from accounts to a destination account
     *
     * @param accounts - List of accounts with withheld fees to withdraw
     * @param destination - Destination account to receive fees
     * @param authority - Withdraw authority public key
     * @returns Transaction instruction
     */
    createWithdrawFeesFromAccountsInstruction(accounts, destination, authority) {
        if (accounts.length === 0) {
            throw new Error("Account list cannot be empty");
        }
        return (0, spl_token_1.createWithdrawWithheldTokensFromAccountsInstruction)(this.mint, destination, authority, [], accounts, spl_token_1.TOKEN_2022_PROGRAM_ID);
    }
    /**
     * Withdraw withheld tokens from accounts to a destination account
     *
     * @param accounts - List of accounts with withheld fees to withdraw
     * @param destination - Destination account to receive fees
     * @param withdrawAuthority - Withdraw authority keypair (required if not set in constructor)
     * @returns Transaction signature
     */
    async withdrawFeesFromAccounts(accounts, destination, withdrawAuthority) {
        if (accounts.length === 0) {
            throw new Error("Account list cannot be empty");
        }
        const authority = this.getWithdrawAuthority(withdrawAuthority);
        if (!authority) {
            throw new Error("Withdrawal authority is required");
        }
        const authorityPublicKey = authority instanceof web3_js_1.Keypair
            ? authority.publicKey
            : authority;
        try {
            const transaction = new web3_js_1.Transaction().add(this.createWithdrawFeesFromAccountsInstruction(accounts, destination, authorityPublicKey));
            return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [authority]);
        }
        catch (error) {
            throw new Error(`Could not withdraw fees from accounts: ${error.message}`);
        }
    }
    /**
     * Create instruction to withdraw withheld tokens from mint to a destination account
     *
     * @param destination - Destination account to receive fees
     * @param authority - Withdraw authority public key
     * @returns Transaction instruction
     */
    createWithdrawFeesFromMintInstruction(destination, authority) {
        return (0, spl_token_1.createWithdrawWithheldTokensFromMintInstruction)(this.mint, destination, authority, [], spl_token_1.TOKEN_2022_PROGRAM_ID);
    }
    /**
     * Withdraw withheld tokens from mint to a destination account
     *
     * @param destination - Destination account to receive fees
     * @param withdrawAuthority - Withdraw authority keypair (required if not set in constructor)
     * @returns Transaction signature
     */
    async withdrawFeesFromMint(destination, withdrawAuthority) {
        // Xác định authority để sử dụng
        const authority = this.getWithdrawAuthority(withdrawAuthority);
        if (!authority) {
            throw new Error("Withdrawal authority is required");
        }
        const authorityPublicKey = authority instanceof web3_js_1.Keypair
            ? authority.publicKey
            : authority;
        try {
            const transaction = new web3_js_1.Transaction().add(this.createWithdrawFeesFromMintInstruction(destination, authorityPublicKey));
            return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [authority]);
        }
        catch (error) {
            throw new Error(`Could not withdraw fees from mint: ${error.message}`);
        }
    }
    /**
     * Get the withdraw authority signer
     *
     * @param providedAuthority - Optional withdraw authority to use
     * @returns Withdraw authority keypair or public key
     * @private
     */
    getWithdrawAuthority(providedAuthority) {
        if (providedAuthority) {
            return providedAuthority;
        }
        if (this.config.withdrawWithheldAuthority) {
            if (this.config.withdrawWithheldAuthority instanceof web3_js_1.Keypair) {
                return this.config.withdrawWithheldAuthority;
            }
        }
        return null;
    }
    /**
     * Create instructions to create token account and mint tokens to it
     *
     * @param owner - Token account owner address
     * @param payer - Transaction fee payer public key
     * @param amount - Token amount to mint
     * @param mintAuthority - Mint authority
     * @returns Instructions and token account address
     */
    async createAccountAndMintToInstructions(owner, payer, amount, mintAuthority) {
        try {
            const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
            const instructions = [];
            try {
                await (0, spl_token_1.getAccount)(this.connection, tokenAccount, "recent", spl_token_1.TOKEN_2022_PROGRAM_ID);
            }
            catch (error) {
                instructions.push((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer, tokenAccount, owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            const mintInstruction = (0, spl_token_1.createMintToInstruction)(this.mint, tokenAccount, mintAuthority, amount, [], spl_token_1.TOKEN_2022_PROGRAM_ID);
            instructions.push(mintInstruction);
            return {
                instructions,
                address: tokenAccount
            };
        }
        catch (error) {
            throw new Error(`Could not create account and mint instructions: ${error.message}`);
        }
    }
    /**
     * Create token account and mint tokens to it
     *
     * @param owner - Token account owner address
     * @param payer - Transaction fee payer keypair
     * @param amount - Token amount to mint
     * @param mintAuthority - Mint authority keypair
     * @returns Created token account address and transaction signature
     */
    async createAccountAndMintTo(owner, payer, amount, mintAuthority) {
        try {
            // Tạo instructions
            const { instructions, address } = await this.createAccountAndMintToInstructions(owner, payer.publicKey, amount, mintAuthority.publicKey);
            // Tạo và gửi transaction
            const transaction = new web3_js_1.Transaction().add(...instructions);
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, mintAuthority instanceof web3_js_1.Keypair ? mintAuthority : payer]);
            return { address, signature };
        }
        catch (error) {
            throw new Error(`Could not create account and mint tokens: ${error.message}`);
        }
    }
    /**
     * Find all accounts with withheld fees
     *
     * @returns List of public keys for accounts with withheld fees
     */
    async findAccountsWithWithheldFees() {
        try {
            const accounts = await this.connection.getProgramAccounts(spl_token_1.TOKEN_2022_PROGRAM_ID, {
                commitment: "confirmed",
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: this.mint.toString(),
                        },
                    },
                ],
            });
            const accountsWithFees = [];
            for (const { pubkey } of accounts) {
                try {
                    const tokenAccount = await (0, spl_token_1.getAccount)(this.connection, pubkey, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
                    const feeAmount = (0, spl_token_1.getTransferFeeAmount)(tokenAccount);
                    if (feeAmount !== null && feeAmount.withheldAmount > 0) {
                        accountsWithFees.push(pubkey);
                    }
                }
                catch (error) {
                }
            }
            return accountsWithFees;
        }
        catch (error) {
            throw new Error(`Could not find accounts with fees: ${error.message}`);
        }
    }
    /**
     * Get transfer fee configuration
     *
     * @returns TransferFeeConfig object
     */
    getTransferFeeConfig() {
        return { ...this.config };
    }
    /**
     * Lấy thông tin chi tiết về phí chuyển khoản hiện tại và phí đã giữ lại
     *
     * @param tokenAccount - Địa chỉ tài khoản token cần kiểm tra
     * @returns Đối tượng chứa thông tin về phí
     *   - withheldAmount: Số lượng token đã giữ lại làm phí
     *   - hasOlderTransferFee: Cho biết tài khoản có phí từ giao dịch trước đó chưa được rút
     */
    async getAccountTransferFeeInfo(tokenAccount) {
        try {
            const account = await (0, spl_token_1.getAccount)(this.connection, tokenAccount, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
            const feeAmount = (0, spl_token_1.getTransferFeeAmount)(account);
            if (!feeAmount) {
                return {
                    withheldAmount: BigInt(0),
                    hasOlderTransferFee: false
                };
            }
            return {
                withheldAmount: feeAmount.withheldAmount,
                hasOlderTransferFee: feeAmount.withheldAmount > BigInt(0)
            };
        }
        catch (error) {
            throw new Error(`Could not get transfer fee info: ${error.message}`);
        }
    }
    /**
     * Tính tổng số token đã giữ lại làm phí từ nhiều tài khoản
     *
     * @param accounts - Danh sách các địa chỉ tài khoản token
     * @returns Tổng số token đã giữ lại
     */
    async getTotalWithheldAmount(accounts) {
        let totalWithheldAmount = BigInt(0);
        for (const account of accounts) {
            try {
                const feeInfo = await this.getAccountTransferFeeInfo(account);
                totalWithheldAmount += feeInfo.withheldAmount;
            }
            catch (error) {
            }
        }
        return totalWithheldAmount;
    }
    /**
     * Kiểm tra xem một địa chỉ có phải là withdraw withheld authority của token không
     *
     * @param address - Địa chỉ cần kiểm tra
     * @returns true nếu là withdraw withheld authority, false nếu không phải
     */
    async isWithdrawWithheldAuthority(address) {
        if (!this.config.withdrawWithheldAuthority) {
            return false;
        }
        if (this.config.withdrawWithheldAuthority instanceof web3_js_1.Keypair) {
            return this.config.withdrawWithheldAuthority.publicKey.equals(address);
        }
        else if (this.config.withdrawWithheldAuthority instanceof web3_js_1.PublicKey) {
            return this.config.withdrawWithheldAuthority.equals(address);
        }
        return false;
    }
    /**
     * Tạo token account nếu chưa tồn tại hoặc trả về account đã tồn tại
     *
     * @param payer - Người trả phí giao dịch
     * @param owner - Chủ sở hữu tài khoản token
     * @returns Đối tượng chứa địa chỉ tài khoản và chữ ký giao dịch
     */
    async createOrGetTokenAccount(payer, owner) {
        try {
            const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
            const transaction = new web3_js_1.Transaction();
            let accountExists = false;
            try {
                await (0, spl_token_1.getAccount)(this.connection, tokenAccount, "recent", spl_token_1.TOKEN_2022_PROGRAM_ID);
                accountExists = true;
                return { address: tokenAccount, signature: "" };
            }
            catch (error) {
                transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, tokenAccount, owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
                const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer]);
                return { address: tokenAccount, signature };
            }
        }
        catch (error) {
            throw new Error(`Could not create or get token account: ${error.message}`);
        }
    }
}
exports.TransferFeeToken = TransferFeeToken;
