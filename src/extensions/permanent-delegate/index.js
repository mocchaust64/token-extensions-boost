"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermanentDelegateToken = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const token_1 = require("../../core/token");
/**
 * PermanentDelegateToken - Extension for Token with permanent delegate functionality
 *
 * This extension allows setting a permanent delegate that can transfer tokens from any
 * account holding this token without the owner's permission.
 */
class PermanentDelegateToken extends token_1.Token {
    constructor(connection, mint, delegate) {
        super(connection, mint);
        this.delegate = delegate;
    }
    /**
     * Create a new token with permanent delegate extension
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Transaction fee payer keypair
     * @param params - Initialization parameters:
     *   - decimals: Number of decimals
     *   - mintAuthority: Authority allowed to mint tokens
     *   - freezeAuthority: Authority allowed to freeze accounts (optional)
     *   - permanentDelegate: Address of the permanent delegate
     * @returns Newly created PermanentDelegateToken object
     */
    static async create(connection, payer, params) {
        const { decimals, mintAuthority, freezeAuthority = null, permanentDelegate } = params;
        try {
            const mintKeypair = web3_js_1.Keypair.generate();
            const mintLen = (0, spl_token_1.getMintLen)([spl_token_1.ExtensionType.PermanentDelegate]);
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: mintLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }), (0, spl_token_1.createInitializePermanentDelegateInstruction)(mintKeypair.publicKey, permanentDelegate, spl_token_1.TOKEN_2022_PROGRAM_ID), (0, spl_token_1.createInitializeMintInstruction)(mintKeypair.publicKey, decimals, mintAuthority, freezeAuthority, spl_token_1.TOKEN_2022_PROGRAM_ID));
            await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [
                payer,
                mintKeypair,
            ]);
            return new PermanentDelegateToken(connection, mintKeypair.publicKey, permanentDelegate);
        }
        catch (error) {
            throw new Error(`Could not create PermanentDelegateToken: ${error.message}`);
        }
    }
    /**
     * Create a token account for a token with permanent delegate
     *
     * @param payer - Transaction fee payer keypair
     * @param owner - Token account owner
     * @returns Address of the created token account
     */
    async createTokenAccount(payer, owner) {
        try {
            const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
            const transaction = new web3_js_1.Transaction();
            try {
                await (0, spl_token_1.getAccount)(this.connection, tokenAccount, "recent", spl_token_1.TOKEN_2022_PROGRAM_ID);
            }
            catch (error) {
                transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, tokenAccount, owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
                await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer]);
            }
            return tokenAccount;
        }
        catch (error) {
            throw new Error(`Could not create token account: ${error.message}`);
        }
    }
    /**
     * Transfer tokens as permanent delegate
     *
     * @param delegateKeypair - Permanent delegate keypair
     * @param source - Source account (any account holding the token)
     * @param destination - Destination account
     * @param amount - Amount to transfer
     * @returns Transaction signature
     */
    async transferAsDelegate(delegateKeypair, source, destination, amount) {
        try {
            const mintInfo = await (0, spl_token_1.getMint)(this.connection, this.mint, "recent", spl_token_1.TOKEN_2022_PROGRAM_ID);
            if (!mintInfo.permanentDelegate ||
                !delegateKeypair.publicKey.equals(mintInfo.permanentDelegate)) {
                throw new Error("Keypair is not the permanent delegate of this token");
            }
            const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createTransferInstruction)(source, destination, delegateKeypair.publicKey, amount, [], spl_token_1.TOKEN_2022_PROGRAM_ID));
            return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [delegateKeypair]);
        }
        catch (error) {
            throw new Error(`Could not transfer tokens as delegate: ${error.message || String(error)}`);
        }
    }
    /**
     * Check if an address is the permanent delegate
     *
     * @param address - Address to check
     * @returns true if it is the permanent delegate, false otherwise
     */
    async isPermanentDelegate(address) {
        try {
            const mintInfo = await (0, spl_token_1.getMint)(this.connection, this.mint, "recent", spl_token_1.TOKEN_2022_PROGRAM_ID);
            if (!mintInfo.permanentDelegate) {
                console.log("Permanent delegate không tồn tại cho token này");
                return false;
            }
            return mintInfo.permanentDelegate.equals(address);
        }
        catch (error) {
            console.error(`Lỗi khi kiểm tra permanent delegate: ${error.message || String(error)}`);
            return false;
        }
    }
    /**
     * Get the permanent delegate of the token
     *
     * @returns Address of the permanent delegate or null if none
     */
    async getPermanentDelegate() {
        try {
            const mintInfo = await (0, spl_token_1.getMint)(this.connection, this.mint, "recent", spl_token_1.TOKEN_2022_PROGRAM_ID);
            return mintInfo.permanentDelegate || null;
        }
        catch (error) {
            console.error(`Lỗi khi lấy permanent delegate: ${error.message || String(error)}`);
            return null;
        }
    }
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
exports.PermanentDelegateToken = PermanentDelegateToken;
