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
    static async fromMint(connection, mint) {
        try {
            const tokenMetadata = await (0, spl_token_1.getTokenMetadata)(connection, mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
            if (!tokenMetadata) {
                return null;
            }
            const additionalMetadata = {};
            if (tokenMetadata.additionalMetadata) {
                for (const [key, value] of tokenMetadata.additionalMetadata) {
                    additionalMetadata[key] = value;
                }
            }
            const metadata = {
                name: tokenMetadata.name,
                symbol: tokenMetadata.symbol,
                uri: tokenMetadata.uri,
                additionalMetadata
            };
            return new MetadataPointerToken(connection, mint, metadata);
        }
        catch (error) {
            console.error("Error loading metadata token:", error);
            return null;
        }
    }
    async getMetadataPointer() {
        const mintInfo = await (0, spl_token_1.getMint)(this.connection, this.mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
        return (0, spl_token_1.getMetadataPointerState)(mintInfo);
    }
    async getTokenMetadata() {
        return await (0, spl_token_1.getTokenMetadata)(this.connection, this.mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
    }
    async updateMetadataField(authority, field, value) {
        const additionalRent = await this.connection.getMinimumBalanceForRentExemption(1024);
        const transaction = new web3_js_1.Transaction();
        transaction.add(web3_js_1.SystemProgram.transfer({
            fromPubkey: authority.publicKey,
            toPubkey: this.mint,
            lamports: additionalRent,
        }));
        // Thêm hướng dẫn cập nhật trường
        transaction.add((0, spl_token_metadata_1.createUpdateFieldInstruction)({
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
        // Tạo transaction
        const transaction = new web3_js_1.Transaction();
        // Thêm hướng dẫn xóa trường
        transaction.add((0, spl_token_metadata_1.createRemoveKeyInstruction)({
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
    async updateMetadataPointer(authority, newMetadataAddress) {
        const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createUpdateMetadataPointerInstruction)(this.mint, authority.publicKey, newMetadataAddress, [], spl_token_1.TOKEN_2022_PROGRAM_ID));
        return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [
            authority,
        ]);
    }
    async updateMetadataBatch(authority, fields) {
        // Ước tính lượng rent cần thiết cho việc mở rộng dữ liệu
        const additionalRent = await this.connection.getMinimumBalanceForRentExemption(1024 * Object.keys(fields).length // Dự phòng không gian cho metadata
        );
        const transaction = new web3_js_1.Transaction();
        // Thêm hướng dẫn chuyển SOL để chi trả cho việc mở rộng tài khoản
        transaction.add(web3_js_1.SystemProgram.transfer({
            fromPubkey: authority.publicKey,
            toPubkey: this.mint,
            lamports: additionalRent,
        }));
        // Thêm hướng dẫn cập nhật trường cho mỗi cặp key-value
        for (const [field, value] of Object.entries(fields)) {
            transaction.add((0, spl_token_metadata_1.createUpdateFieldInstruction)({
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                metadata: this.mint,
                updateAuthority: authority.publicKey,
                field: field,
                value: value,
            }));
        }
        return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [
            authority,
        ]);
    }
    async getNFTMetadata() {
        const tokenMetadata = await this.getTokenMetadata();
        if (!tokenMetadata || !tokenMetadata.uri) {
            throw new Error("No metadata URI found for this token");
        }
        try {
            const response = await fetch(tokenMetadata.uri);
            if (!response.ok) {
                throw new Error(`Failed to fetch metadata: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error("Error fetching off-chain metadata:", error);
            throw error;
        }
    }
    getMetadataConfig() {
        return this.metadata;
    }
    async updateMetadataAuthority(currentAuthority, newAuthority) {
        const transaction = new web3_js_1.Transaction().add((0, spl_token_metadata_1.createUpdateAuthorityInstruction)({
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            metadata: this.mint,
            oldAuthority: currentAuthority.publicKey,
            newAuthority: newAuthority,
        }));
        return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [
            currentAuthority,
        ]);
    }
}
exports.MetadataPointerToken = MetadataPointerToken;
