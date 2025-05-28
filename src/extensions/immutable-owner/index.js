"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImmutableOwnerToken = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const token_1 = require("../../core/token");
/**
 * ImmutableOwnerToken - Extension for TokenAccount with immutable owner functionality
 *
 * This extension ensures that the owner of a token account cannot be changed after initialization,
 * enhancing security and reducing the risk of attacks.
 */
class ImmutableOwnerToken extends token_1.Token {
    /**
     * Create a new ImmutableOwnerToken instance
     *
     * @param connection - Connection to Solana cluster
     * @param mintAddress - Public key of the token mint
     */
    constructor(connection, mintAddress) {
        super(connection, mintAddress);
    }
    /**
     * Create a token account with immutable owner
     *
     * @param payer - Transaction fee payer keypair
     * @param owner - Public key of the account owner (cannot be changed)
     * @param tokenAccountKeypair - Keypair of the token account to be created
     * @returns Transaction signature
     */
    async createTokenAccountWithImmutableOwner(payer, owner, tokenAccountKeypair) {
        const tokenAccount = tokenAccountKeypair.publicKey;
        const accountLen = (0, spl_token_1.getAccountLen)([spl_token_1.ExtensionType.ImmutableOwner]);
        try {
            const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: tokenAccount,
                space: accountLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }), (0, spl_token_1.createInitializeImmutableOwnerInstruction)(tokenAccount, spl_token_1.TOKEN_2022_PROGRAM_ID), (0, spl_token_1.createInitializeAccountInstruction)(tokenAccount, this.mint, owner, spl_token_1.TOKEN_2022_PROGRAM_ID));
            return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, tokenAccountKeypair]);
        }
        catch (error) {
            throw new Error(`Could not create account with immutable owner: ${error.message}`);
        }
    }
    /**
     * Create associated token account with immutable owner
     *
     * @param payer - Transaction fee payer keypair
     * @param owner - Public key of the account owner (cannot be changed)
     * @returns Object containing transaction signature and token account address
     */
    async createAssociatedTokenAccountWithImmutableOwner(payer, owner) {
        const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
        try {
            await (0, spl_token_1.getAccount)(this.connection, tokenAccount);
            return { signature: "", tokenAccount };
        }
        catch (error) {
            try {
                const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, tokenAccount, owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
                // Note: Associated Token Accounts created with Token-2022
                // automatically have the ImmutableOwner extension
                const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer]);
                return { signature, tokenAccount };
            }
            catch (error) {
                throw new Error(`Could not create associated token account with immutable owner: ${error.message}`);
            }
        }
    }
    /**
     * Check if an account has immutable owner
     *
     * @param tokenAccount - Public key of the token account to check
     * @returns true if the account has immutable owner, false if not
     */
    async hasImmutableOwner(tokenAccount) {
        try {
            const accountInfo = await this.connection.getAccountInfo(tokenAccount);
            if (!accountInfo) {
                throw new Error("Account not found");
            }
            try {
                // Try to change authority - if immutable owner, this will fail
                await (0, spl_token_1.setAuthority)(this.connection, new web3_js_1.Keypair(), tokenAccount, new web3_js_1.PublicKey("11111111111111111111111111111111"), spl_token_1.AuthorityType.AccountOwner, new web3_js_1.PublicKey("11111111111111111111111111111111"), [], { skipPreflight: true }, spl_token_1.TOKEN_2022_PROGRAM_ID);
                return false;
            }
            catch (error) {
                const errorMessage = error.toString();
                return errorMessage.includes("0x22") ||
                    errorMessage.includes("owner authority cannot be changed");
            }
        }
        catch (error) {
            console.error("Error checking immutable owner:", error);
            return false;
        }
    }
    /**
     * Create a token account with immutable owner, or return existing one if already exists
     *
     * @param payer - Transaction fee payer
     * @param owner - Owner of the token account
     * @returns Object containing the account address and transaction signature
     */
    async createOrGetImmutableAccount(payer, owner) {
        // Try to use associated token account first as it's the standard
        const associatedAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
        const transaction = new web3_js_1.Transaction();
        let created = false;
        try {
            await (0, spl_token_1.getAccount)(this.connection, associatedAccount, "recent", spl_token_1.TOKEN_2022_PROGRAM_ID);
            // Account exists, check if it has immutable owner
            const isImmutable = await this.hasImmutableOwner(associatedAccount);
            if (!isImmutable) {
                console.warn("Warning: Existing account does not have immutable owner extension");
            }
            return { address: associatedAccount, signature: "" };
        }
        catch (error) {
            // Account doesn't exist, create a new one
            transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, associatedAccount, owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
            created = true;
            try {
                const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer]);
                return { address: associatedAccount, signature };
            }
            catch (error) {
                throw new Error(`Failed to create immutable owner account: ${error.message}`);
            }
        }
    }
}
exports.ImmutableOwnerToken = ImmutableOwnerToken;
