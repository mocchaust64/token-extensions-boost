"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenMetadataToken = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const spl_token_metadata_1 = require("@solana/spl-token-metadata");
const token_1 = require("../../core/token");
class TokenMetadataToken extends token_1.Token {
    constructor(connection, mint, metadata) {
        super(connection, mint);
        this.metadata = metadata;
    }
    getMintAddress() {
        return this.mint;
    }
    static async create(connection, payer, params) {
        const { decimals, mintAuthority, metadata } = params;
        if (!metadata.name || metadata.name.length > 32) {
            throw new Error("Metadata name is required and must be 32 characters or less");
        }
        if (!metadata.symbol || metadata.symbol.length > 10) {
            throw new Error("Metadata symbol is required and must be 10 characters or less");
        }
        if (!metadata.uri || metadata.uri.length > 200) {
            throw new Error("Metadata URI is required and must be 200 characters or less");
        }
        const mintKeypair = web3_js_1.Keypair.generate();
        const mint = mintKeypair.publicKey;
        const tokenMetadata = {
            mint: mint,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(([key, value]) => [key, value]),
        };
        try {
            const metadataExtension = spl_token_1.TYPE_SIZE + spl_token_1.LENGTH_SIZE; // 4 bytes
            const metadataLen = (0, spl_token_metadata_1.pack)(tokenMetadata).length;
            const mintLen = (0, spl_token_1.getMintLen)([spl_token_1.ExtensionType.MetadataPointer]);
            const totalSize = mintLen + metadataExtension + metadataLen + 2048;
            console.log(`Kích thước mint: ${mintLen} bytes, metadata: ${metadataLen} bytes, extension: ${metadataExtension} bytes, tổng: ${totalSize} bytes`);
            const lamports = await connection.getMinimumBalanceForRentExemption(totalSize);
            console.log("step 1: create account...");
            const createAccountTx = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mint,
                space: totalSize,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }));
            const createAccountSignature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, createAccountTx, [payer, mintKeypair], { commitment: 'confirmed' });
            console.log(`Transaction succested : ${createAccountSignature.substring(0, 16)}...`);
            console.log(`Explorer: https://explorer.solana.com/tx/${createAccountSignature}?cluster=devnet`);
            await new Promise(resolve => setTimeout(resolve, 2500));
            console.log("step 2: create MetadataPointer...");
            const initPointerTx = new web3_js_1.Transaction().add((0, spl_token_1.createInitializeMetadataPointerInstruction)(mint, payer.publicKey, null, spl_token_1.TOKEN_2022_PROGRAM_ID));
            const initPointerSignature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, initPointerTx, [payer], { commitment: 'confirmed' });
            console.log(`Transaction create MetadataPointer succesed: ${initPointerSignature.substring(0, 16)}...`);
            console.log(`Explorer: https://explorer.solana.com/tx/${initPointerSignature}?cluster=devnet`);
            await new Promise(resolve => setTimeout(resolve, 2500));
            console.log("step 3: create Mint...");
            const initMintTx = new web3_js_1.Transaction().add((0, spl_token_1.createInitializeMintInstruction)(mint, decimals, mintAuthority, null, spl_token_1.TOKEN_2022_PROGRAM_ID));
            const initMintSignature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, initMintTx, [payer], { commitment: 'confirmed' });
            console.log(`Transaction create Mint succesed: ${initMintSignature.substring(0, 16)}...`);
            console.log(`Explorer: https://explorer.solana.com/tx/${initMintSignature}?cluster=devnet`);
            await new Promise(resolve => setTimeout(resolve, 2500));
            console.log("step 4: update MetadataPointer...");
            const updatePointerTx = new web3_js_1.Transaction().add((0, spl_token_1.createUpdateMetadataPointerInstruction)(mint, payer.publicKey, mint, [], spl_token_1.TOKEN_2022_PROGRAM_ID));
            const updatePointerSignature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, updatePointerTx, [payer], { commitment: 'confirmed' });
            console.log(`Transaction update MetadataPointer succesed: ${updatePointerSignature.substring(0, 16)}...`);
            console.log(`Explorer: https://explorer.solana.com/tx/${updatePointerSignature}?cluster=devnet`);
            await new Promise(resolve => setTimeout(resolve, 2500));
            console.log("step 5: create TokenMetadata...");
            const initMetadataTx = new web3_js_1.Transaction().add((0, spl_token_metadata_1.createInitializeInstruction)({
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                updateAuthority: payer.publicKey,
                mint: mint,
                mintAuthority: payer.publicKey,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
            }));
            const initMetadataSignature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, initMetadataTx, [payer], { commitment: 'confirmed' });
            console.log(`Transaction create TokenMetadata succed: ${initMetadataSignature.substring(0, 16)}...`);
            console.log(`Explorer: https://explorer.solana.com/tx/${initMetadataSignature}?cluster=devnet`);
            if (metadata.additionalMetadata && Object.keys(metadata.additionalMetadata).length > 0) {
                console.log("step 6: add update metadata ...");
                let fieldCounter = 0;
                for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
                    if (key.length === 0 || value.length === 0)
                        continue;
                    fieldCounter++;
                    console.log(`  add #${fieldCounter}: ${key}=${value}`);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    const addFieldTx = new web3_js_1.Transaction().add((0, spl_token_metadata_1.createUpdateFieldInstruction)({
                        programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                        metadata: mint,
                        updateAuthority: payer.publicKey,
                        field: key,
                        value: value,
                    }));
                    try {
                        const addFieldSignature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, addFieldTx, [payer], { commitment: 'confirmed' });
                        console.log(`  ✓ Thêm trường "${key}" thành công: ${addFieldSignature.substring(0, 16)}...`);
                    }
                    catch (err) {
                        console.warn(`  ⚠ Không thể thêm trường "${key}": ${err instanceof Error ? err.message : String(err)}`);
                    }
                }
            }
            console.log(`🔍explorer: https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);
            return new TokenMetadataToken(connection, mint, metadata);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Lỗi khi tạo token với metadata: ${errorMessage}`);
            throw new Error(`Failed to create token with metadata: ${errorMessage}`);
        }
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
            return new TokenMetadataToken(connection, mint, metadata);
        }
        catch (error) {
            console.error("Error loading metadata token:", error);
            return null;
        }
    }
    async getTokenMetadata() {
        const metadata = await (0, spl_token_1.getTokenMetadata)(this.connection, this.mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
        if (!metadata) {
            throw new Error("No metadata found for this token");
        }
        return metadata;
    }
    async updateMetadataField(authority, field, value) {
        const instruction = (0, spl_token_metadata_1.createUpdateFieldInstruction)({
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            metadata: this.mint,
            updateAuthority: authority.publicKey,
            field,
            value,
        });
        const transaction = new web3_js_1.Transaction().add(instruction);
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [authority], { commitment: 'confirmed' });
        const metadata = await this.getTokenMetadata();
        return { signature, metadata };
    }
    async removeMetadataField(authority, key) {
        const instruction = (0, spl_token_metadata_1.createRemoveKeyInstruction)({
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            metadata: this.mint,
            updateAuthority: authority.publicKey,
            key,
            idempotent: false
        });
        const transaction = new web3_js_1.Transaction().add(instruction);
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [authority], { commitment: 'confirmed' });
        const metadata = await this.getTokenMetadata();
        return { signature, metadata };
    }
    async updateMetadataBatch(authority, fields) {
        const transaction = new web3_js_1.Transaction();
        for (const [key, value] of Object.entries(fields)) {
            transaction.add((0, spl_token_metadata_1.createUpdateFieldInstruction)({
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                metadata: this.mint,
                updateAuthority: authority.publicKey,
                field: key,
                value,
            }));
        }
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [authority], { commitment: 'confirmed' });
        const metadata = await this.getTokenMetadata();
        return { signature, metadata };
    }
    async getNFTMetadata() {
        const metadata = await this.getTokenMetadata();
        if (!metadata.uri) {
            throw new Error("Token metadata has no URI");
        }
        const response = await fetch(metadata.uri);
        if (!response.ok) {
            throw new Error(`Failed to fetch metadata from ${metadata.uri}`);
        }
        return await response.json();
    }
    getMetadataConfig() {
        return this.metadata;
    }
    async updateMetadataAuthority(currentAuthority, newAuthority) {
        const instruction = (0, spl_token_metadata_1.createUpdateAuthorityInstruction)({
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            metadata: this.mint,
            oldAuthority: currentAuthority.publicKey,
            newAuthority: newAuthority,
        });
        const transaction = new web3_js_1.Transaction().add(instruction);
        return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [currentAuthority], { commitment: 'confirmed' });
    }
}
exports.TokenMetadataToken = TokenMetadataToken;
