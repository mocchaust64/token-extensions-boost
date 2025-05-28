"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenAccount = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
class TokenAccount {
    constructor(connection, mint, owner) {
        this.connection = connection;
        this.mint = mint;
        this.owner = owner;
    }
    /**
     *
     *
     * @param payer
     * @returns
     */
    async createAccount(payer) {
        const tokenAccountKeypair = web3_js_1.Keypair.generate();
        const accountLen = (0, spl_token_1.getAccountLen)([]);
        const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
        const transaction = new web3_js_1.Transaction();
        transaction.add(web3_js_1.SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: tokenAccountKeypair.publicKey,
            space: accountLen,
            lamports,
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
        }), (0, spl_token_1.createInitializeAccountInstruction)(tokenAccountKeypair.publicKey, this.mint, this.owner, spl_token_1.TOKEN_2022_PROGRAM_ID));
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, tokenAccountKeypair], { commitment: 'confirmed' });
        return {
            tokenAccount: tokenAccountKeypair.publicKey,
            tokenAccountKeypair,
            signature
        };
    }
    /**
     *
     *
     * @param payer
     * @returns
     */
    async createAccountWithImmutableOwner(payer) {
        const tokenAccountKeypair = web3_js_1.Keypair.generate();
        const accountLen = (0, spl_token_1.getAccountLen)([spl_token_1.ExtensionType.ImmutableOwner]);
        const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
        const transaction = new web3_js_1.Transaction();
        transaction.add(web3_js_1.SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: tokenAccountKeypair.publicKey,
            space: accountLen,
            lamports,
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
        }));
        transaction.add((0, spl_token_1.createInitializeImmutableOwnerInstruction)(tokenAccountKeypair.publicKey, spl_token_1.TOKEN_2022_PROGRAM_ID));
        transaction.add((0, spl_token_1.createInitializeAccountInstruction)(tokenAccountKeypair.publicKey, this.mint, this.owner, spl_token_1.TOKEN_2022_PROGRAM_ID));
        // Gửi transaction
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, tokenAccountKeypair], { commitment: 'confirmed' });
        return {
            tokenAccount: tokenAccountKeypair.publicKey,
            tokenAccountKeypair,
            signature
        };
    }
    /**
     *
     *
     * @param payer
     * @returns
     */
    async createAssociatedTokenAccount(payer) {
        const tokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(this.mint, this.owner, true, spl_token_1.TOKEN_2022_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
        const transaction = new web3_js_1.Transaction();
        transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, tokenAccount, this.owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID));
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer], { commitment: 'confirmed' });
        return {
            tokenAccount,
            signature
        };
    }
    /**
     *
     *
     * @param payer
     * @returns
     */
    async createAccountWithImmutableOwnerAlt(payer) {
        const tokenAccount = await (0, spl_token_1.createAccount)(this.connection, payer, this.mint, this.owner, undefined, { commitment: 'confirmed' }, spl_token_1.TOKEN_2022_PROGRAM_ID);
        return {
            tokenAccount,
            signature: "Used createAccount helper function"
        };
    }
    /**
     *
     *
     * @param payer
     * @param state
     * @returns
     */
    async createAccountWithDefaultState(payer, state) {
        const tokenAccountKeypair = web3_js_1.Keypair.generate();
        const accountLen = (0, spl_token_1.getAccountLen)([spl_token_1.ExtensionType.DefaultAccountState]);
        const lamports = await this.connection.getMinimumBalanceForRentExemption(accountLen);
        const transaction = new web3_js_1.Transaction();
        transaction.add(web3_js_1.SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: tokenAccountKeypair.publicKey,
            space: accountLen,
            lamports,
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
        }));
        transaction.add((0, spl_token_1.createInitializeDefaultAccountStateInstruction)(tokenAccountKeypair.publicKey, state, spl_token_1.TOKEN_2022_PROGRAM_ID));
        transaction.add((0, spl_token_1.createInitializeAccountInstruction)(tokenAccountKeypair.publicKey, this.mint, this.owner, spl_token_1.TOKEN_2022_PROGRAM_ID));
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, tokenAccountKeypair], { commitment: 'confirmed' });
        return {
            tokenAccount: tokenAccountKeypair.publicKey,
            tokenAccountKeypair,
            signature
        };
    }
}
exports.TokenAccount = TokenAccount;
