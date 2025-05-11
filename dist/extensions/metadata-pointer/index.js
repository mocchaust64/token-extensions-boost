"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataPointerToken = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const spl_token_metadata_1 = require("@solana/spl-token-metadata");
const token_1 = require("../../core/token");
class MetadataPointerToken extends token_1.Token {
    constructor(connection, mint, metadata) {
        super(connection, mint);
        this.metadata = metadata;
    }
    static async create(connection, payer, params) {
        const { decimals, mintAuthority, metadata } = params;
        // Create mint keypair
        const mintKeypair = web3_js_1.Keypair.generate();
        // Format metadata for on-chain storage
        const tokenMetadata = {
            mint: mintKeypair.publicKey,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(([key, value]) => [key, value]),
        };
        // Calculate sizes and rent
        const mintLen = (0, spl_token_1.getMintLen)([spl_token_1.ExtensionType.MetadataPointer]);
        const metadataLen = spl_token_1.TYPE_SIZE + spl_token_1.LENGTH_SIZE + (0, spl_token_metadata_1.pack)(tokenMetadata).length;
        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);
        // Create mint account
        const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: mintLen,
            lamports,
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
        }), 
        // Initialize metadata pointer to point to the mint itself
        (0, spl_token_1.createInitializeMetadataPointerInstruction)(mintKeypair.publicKey, payer.publicKey, mintKeypair.publicKey, spl_token_1.TOKEN_2022_PROGRAM_ID), 
        // Initialize mint
        (0, spl_token_1.createInitializeMintInstruction)(mintKeypair.publicKey, decimals, mintAuthority, null, spl_token_1.TOKEN_2022_PROGRAM_ID), 
        // Initialize metadata
        (0, spl_token_metadata_1.createInitializeInstruction)({
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            metadata: mintKeypair.publicKey,
            updateAuthority: payer.publicKey,
            mint: mintKeypair.publicKey,
            mintAuthority: payer.publicKey,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
        }));
        // Add instructions for additional metadata fields if any
        if (metadata.additionalMetadata) {
            for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
                transaction.add((0, spl_token_metadata_1.createUpdateFieldInstruction)({
                    programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                    metadata: mintKeypair.publicKey,
                    updateAuthority: payer.publicKey,
                    field: key,
                    value: value,
                }));
            }
        }
        await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [
            payer,
            mintKeypair,
        ]);
        return new MetadataPointerToken(connection, mintKeypair.publicKey, metadata);
    }
    async getMetadataPointer() {
        const mintInfo = await (0, spl_token_1.getMint)(this.connection, this.mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
        return (0, spl_token_1.getMetadataPointerState)(mintInfo);
    }
    async getTokenMetadata() {
        return await (0, spl_token_1.getTokenMetadata)(this.connection, this.mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
    }
    async updateMetadataField(authority, field, value) {
        const transaction = new web3_js_1.Transaction().add((0, spl_token_metadata_1.createUpdateFieldInstruction)({
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            metadata: this.mint,
            updateAuthority: authority.publicKey,
            field: field,
            value: value,
        }));
        return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [
            authority,
        ]);
    }
    async removeMetadataField(authority, key) {
        const transaction = new web3_js_1.Transaction().add((0, spl_token_metadata_1.createRemoveKeyInstruction)({
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            metadata: this.mint,
            updateAuthority: authority.publicKey,
            key: key,
            idempotent: true,
        }));
        return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [
            authority,
        ]);
    }
}
exports.MetadataPointerToken = MetadataPointerToken;
