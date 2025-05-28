"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenAccountBuilder = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
/**
 * TokenAccountBuilder - Helper class for creating token accounts with extensions
 *
 * ImmutableOwner and other extensions for token accounts
 */
class TokenAccountBuilder {
    /**
     * Initialize builder with connection
     *
     * @param connection - Connection to Solana cluster
     */
    constructor(connection) {
        this.extensions = [];
        this.connection = connection;
    }
    /**
     * Set basic information for token account
     *
     * @param mint - Mint address of the token
     * @param owner - Owner of the token account
     */
    setTokenAccountInfo(mint, owner) {
        this.mint = mint;
        this.owner = owner;
        return this;
    }
    /**
     * Add ImmutableOwner extension
     * ImmutableOwner prevents changing the owner of the token account
     */
    addImmutableOwner() {
        this.extensions.push(spl_token_1.ExtensionType.ImmutableOwner);
        return this;
    }
    /**
     * Add DefaultAccountState extension
     *
     * @param state - Default state of the account (frozen or unlocked)
     */
    addDefaultAccountState(state) {
        this.extensions.push(spl_token_1.ExtensionType.DefaultAccountState);
        this.defaultAccountState = state;
        return this;
    }
    /**
     * Create instructions for standard (non-associated) token account
     *
     * @param payer - Public key of the transaction fee payer
     * @returns Instructions, signers and token account address
     */
    async buildStandardAccountInstructions(payer) {
        if (!this.mint || !this.owner) {
            throw new Error("Mint and owner are required. Call setTokenAccountInfo first.");
        }
        try {
            // 1. Create new keypair for token account
            const tokenAccountKeypair = web3_js_1.Keypair.generate();
            const tokenAccount = tokenAccountKeypair.publicKey;
            // 2. Calculate account size and rent
            const accountLen = (0, spl_token_1.getAccountLen)(this.extensions);
            const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
            console.log(`Token account size: ${accountLen} bytes`);
            // 3. Create instructions array
            const instructions = [];
            // Correct initialization order: 
            // 1. Create account
            // 2. Initialize extensions
            // 3. Initialize token account
            // Create account instruction
            instructions.push(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer,
                newAccountPubkey: tokenAccount,
                space: accountLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }));
            // Add extensions
            if (this.extensions.includes(spl_token_1.ExtensionType.ImmutableOwner)) {
                instructions.push((0, spl_token_1.createInitializeImmutableOwnerInstruction)(tokenAccount, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            if (this.extensions.includes(spl_token_1.ExtensionType.DefaultAccountState) && this.defaultAccountState) {
                instructions.push((0, spl_token_1.createInitializeDefaultAccountStateInstruction)(tokenAccount, this.defaultAccountState, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            // Finally, initialize token account
            instructions.push((0, spl_token_1.createInitializeAccountInstruction)(tokenAccount, this.mint, this.owner, spl_token_1.TOKEN_2022_PROGRAM_ID));
            return {
                instructions,
                signers: [tokenAccountKeypair],
                tokenAccount
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create token account instructions: ${errorMessage}`);
        }
    }
    /**
     * Create standard (non-associated) token account
     *
     * @param payer - Transaction fee payer
     * @returns Information about the created token account
     */
    async buildStandardAccount(payer) {
        if (!this.mint || !this.owner) {
            throw new Error("Mint and owner are required. Call setTokenAccountInfo first.");
        }
        try {
            const { instructions, signers, tokenAccount } = await this.buildStandardAccountInstructions(payer.publicKey);
            const tokenAccountKeypair = signers[0];
            // Create and send transaction
            const transaction = new web3_js_1.Transaction().add(...instructions);
            const transactionSignature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, tokenAccountKeypair], { commitment: 'confirmed' });
            console.log(`Token account created: ${tokenAccount.toBase58()}`);
            console.log(`Transaction signature: ${transactionSignature}`);
            return {
                tokenAccount,
                tokenAccountKeypair,
                transactionSignature
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create token account: ${errorMessage}`);
        }
    }
    /**
     * Create instructions for Associated Token Account with extensions
     *
     * Note: Not all extensions work with ATA
     *
     * @param payer - Public key of the transaction fee payer
     * @returns Instructions and token account address
     */
    buildAssociatedAccountInstructions(payer) {
        if (!this.mint || !this.owner) {
            throw new Error("Mint and owner are required. Call setTokenAccountInfo first.");
        }
        try {
            // 1. Get ATA address
            const tokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(this.mint, this.owner, true, // allowOwnerOffCurve
            spl_token_1.TOKEN_2022_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
            // 2. Create instruction
            // Can only add normal ATA, cannot add extensions directly
            // Some extensions like ImmutableOwner are automatically applied to ATA
            const instructions = [
                (0, spl_token_1.createAssociatedTokenAccountInstruction)(payer, tokenAccount, this.owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID)
            ];
            return {
                instructions,
                tokenAccount
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create Associated Token Account instructions: ${errorMessage}`);
        }
    }
    /**
     * Create Associated Token Account with extensions
     *
     * Note: Not all extensions work with ATA
     *
     * @param payer - Transaction fee payer
     * @returns Information about the created token account
     */
    async buildAssociatedAccount(payer) {
        try {
            const { instructions, tokenAccount } = this.buildAssociatedAccountInstructions(payer.publicKey);
            // Create and send transaction
            const transaction = new web3_js_1.Transaction().add(...instructions);
            const transactionSignature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer], { commitment: 'confirmed' });
            console.log(`Associated Token Account created: ${tokenAccount.toBase58()}`);
            console.log(`Transaction signature: ${transactionSignature}`);
            return {
                tokenAccount,
                transactionSignature
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create Associated Token Account: ${errorMessage}`);
        }
    }
}
exports.TokenAccountBuilder = TokenAccountBuilder;
