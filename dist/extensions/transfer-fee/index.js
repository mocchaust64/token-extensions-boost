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
}
exports.TransferFeeToken = TransferFeeToken;
