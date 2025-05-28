"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferHookToken = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const token_1 = require("../../core/token");
const spl_token_2 = require("@solana/spl-token");
/**
 * TransferHookToken - Extension for Token with transfer hook functionality
 *
 * This extension allows token transfers to trigger a custom instruction
 * executed by a separate program, specified when the mint is created.
 */
class TransferHookToken extends token_1.Token {
    constructor(connection, mint, hookProgramId) {
        super(connection, mint);
        this.hookProgramId = hookProgramId;
    }
    /**
     * Create a new TransferHookToken
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Transaction fee payer keypair
     * @param params - Initialization parameters including:
     *   - decimals: Number of decimal places
     *   - mintAuthority: Authority allowed to mint tokens
     *   - transferHookProgramId: Program ID that will be called during transfers
     *   - freezeAuthority: Optional authority allowed to freeze accounts
     * @returns Newly created TransferHookToken object
     */
    static async create(connection, payer, params) {
        try {
            const mintKeypair = web3_js_1.Keypair.generate();
            const mintLen = (0, spl_token_1.getMintLen)([spl_token_1.ExtensionType.TransferHook]);
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: mintLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }), (0, spl_token_1.createInitializeTransferHookInstruction)(mintKeypair.publicKey, payer.publicKey, params.transferHookProgramId, spl_token_1.TOKEN_2022_PROGRAM_ID), (0, spl_token_1.createInitializeMintInstruction)(mintKeypair.publicKey, params.decimals, params.mintAuthority, params.freezeAuthority || null, spl_token_1.TOKEN_2022_PROGRAM_ID));
            await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [
                payer,
                mintKeypair,
            ], { commitment: 'confirmed' });
            return new TransferHookToken(connection, mintKeypair.publicKey, params.transferHookProgramId);
        }
        catch (error) {
            throw new Error(`Could not create TransferHookToken: ${error.message}`);
        }
    }
    /**
     * Execute token transfer with hook execution
     *
     * @param source - Source account address
     * @param destination - Destination account address
     * @param owner - Source account owner
     * @param amount - Token amount to transfer
     * @param decimals - Token decimal places
     * @param extraAccounts - Additional accounts required by the hook
     * @returns Transaction signature
     */
    async transfer(source, destination, owner, amount, decimals, extraAccounts = []) {
        try {
            // Tạo transaction với hook
            const transferInstruction = await (0, spl_token_2.createTransferCheckedWithTransferHookInstruction)(this.connection, source, this.mint, destination, owner.publicKey, amount, decimals, extraAccounts, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
            const transaction = new web3_js_1.Transaction().add(transferInstruction);
            return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [owner], {
                commitment: "confirmed",
            });
        }
        catch (error) {
            throw new Error(`Could not transfer tokens: ${error.message}`);
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
            // Tạo hoặc lấy tài khoản token
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
            await (0, spl_token_1.getAccount)(this.connection, associatedTokenAddress, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
            return { address: associatedTokenAddress, signature: "" };
        }
        catch (error) {
            if (error instanceof spl_token_1.TokenAccountNotFoundError) {
                const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, associatedTokenAddress, owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
                const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer], { commitment: "confirmed" });
                return { address: associatedTokenAddress, signature };
            }
            throw error;
        }
    }
    /**
     * Get the hook program ID associated with this token
     *
     * @returns Public key of the hook program
     */
    getHookProgramId() {
        return this.hookProgramId;
    }
    /**
     * Check if an address is the hook program ID for this token
     *
     * @param address - Public key to check
     * @returns boolean indicating whether the address is the hook program
     */
    async isHookProgram(address) {
        return this.hookProgramId.equals(address);
    }
}
exports.TransferHookToken = TransferHookToken;
