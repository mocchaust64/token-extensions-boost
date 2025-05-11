"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferFeeToken = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const token_1 = require("../../core/token");
class TransferFeeToken extends token_1.Token {
    constructor(connection, mint, config) {
        super(connection, mint);
        this.config = config;
    }
    static async create(connection, payer, params) {
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
    calculateFee(amount) {
        const fee = (amount * BigInt(this.config.feeBasisPoints)) / BigInt(10000);
        return fee > this.config.maxFee ? this.config.maxFee : fee;
    }
    async transfer(source, destination, owner, amount, decimals) {
        const fee = this.calculateFee(amount);
        return this.transferWithFee(source, destination, owner, amount, decimals, Number(fee));
    }
    async transferWithFee(source, destination, owner, amount, decimals, fee) {
        const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createTransferCheckedWithFeeInstruction)(source, this.mint, destination, owner.publicKey, amount, decimals, BigInt(fee), [], spl_token_1.TOKEN_2022_PROGRAM_ID));
        return (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [owner]);
    }
    async harvestWithheldTokensToMint(accounts) {
        const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createHarvestWithheldTokensToMintInstruction)(this.mint, accounts, spl_token_1.TOKEN_2022_PROGRAM_ID));
        return (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.config.withdrawWithheldAuthority]);
    }
    async withdrawFeesFromAccounts(accounts, destination) {
        const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createWithdrawWithheldTokensFromAccountsInstruction)(this.mint, destination, this.config.withdrawWithheldAuthority.publicKey, [], accounts, spl_token_1.TOKEN_2022_PROGRAM_ID));
        return (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.config.withdrawWithheldAuthority]);
    }
    async withdrawFeesFromMint(destination) {
        const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createWithdrawWithheldTokensFromMintInstruction)(this.mint, destination, this.config.withdrawWithheldAuthority.publicKey, [], spl_token_1.TOKEN_2022_PROGRAM_ID));
        return (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.config.withdrawWithheldAuthority]);
    }
    async createAccountAndMintTo(owner, payer, amount, mintAuthority) {
        const tokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
        const transaction = new web3_js_1.Transaction();
        try {
            await (0, spl_token_1.getAccount)(this.connection, tokenAccount, "recent", spl_token_1.TOKEN_2022_PROGRAM_ID);
        }
        catch (error) {
            transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, tokenAccount, owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
        }
        const mintInstruction = (0, spl_token_1.createMintToInstruction)(this.mint, tokenAccount, mintAuthority.publicKey, amount, [], spl_token_1.TOKEN_2022_PROGRAM_ID);
        transaction.add(mintInstruction);
        await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, mintAuthority]);
        return tokenAccount;
    }
    async findAccountsWithWithheldFees() {
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
                // Skip invalid accounts
            }
        }
        return accountsWithFees;
    }
}
exports.TransferFeeToken = TransferFeeToken;
