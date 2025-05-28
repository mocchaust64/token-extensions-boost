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
    /**
     * Create instructions to make a new MetadataPointerToken
     *
     * @param connection - Solana connection
     * @param payer - Public key of the payer
     * @param params - Parameters for token creation
     * @returns Instructions, signers, and mint address
     */
    static async createInstructions(connection, payer, params) {
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
        const tokenMetadata = {
            mint: mintKeypair.publicKey,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(([key, value]) => [key, value]),
        };
        const mintLen = (0, spl_token_1.getMintLen)([spl_token_1.ExtensionType.MetadataPointer]);
        const metadataLen = spl_token_1.TYPE_SIZE + spl_token_1.LENGTH_SIZE + (0, spl_token_metadata_1.pack)(tokenMetadata).length;
        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);
        const instructions = [
            web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer,
                newAccountPubkey: mintKeypair.publicKey,
                space: mintLen,
                lamports,
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }),
            (0, spl_token_1.createInitializeMetadataPointerInstruction)(mintKeypair.publicKey, payer, mintKeypair.publicKey, spl_token_1.TOKEN_2022_PROGRAM_ID),
            (0, spl_token_1.createInitializeMintInstruction)(mintKeypair.publicKey, decimals, mintAuthority, null, spl_token_1.TOKEN_2022_PROGRAM_ID),
            (0, spl_token_metadata_1.createInitializeInstruction)({
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                metadata: mintKeypair.publicKey,
                updateAuthority: payer,
                mint: mintKeypair.publicKey,
                mintAuthority: mintAuthority,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
            })
        ];
        if (metadata.additionalMetadata) {
            for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
                if (key.length === 0 || value.length === 0) {
                    continue;
                }
                instructions.push((0, spl_token_metadata_1.createUpdateFieldInstruction)({
                    programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                    metadata: mintKeypair.publicKey,
                    updateAuthority: payer,
                    field: key,
                    value: value,
                }));
            }
        }
        return {
            instructions,
            signers: [mintKeypair],
            mint: mintKeypair.publicKey
        };
    }
    static async create(connection, payer, params) {
        const { instructions, signers, mint } = await this.createInstructions(connection, payer.publicKey, params);
        const transaction = new web3_js_1.Transaction().add(...instructions);
        await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [payer, ...signers]);
        return new MetadataPointerToken(connection, mint, params.metadata);
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
        try {
            const mintInfo = await (0, spl_token_1.getMint)(this.connection, this.mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
            const pointerState = (0, spl_token_1.getMetadataPointerState)(mintInfo);
            if (!pointerState || !pointerState.authority || !pointerState.metadataAddress) {
                return null;
            }
            return {
                authority: pointerState.authority,
                metadataAddress: pointerState.metadataAddress
            };
        }
        catch (error) {
            throw new Error(`Failed to get metadata pointer: ${error}`);
        }
    }
    async getTokenMetadata() {
        const metadata = await (0, spl_token_1.getTokenMetadata)(this.connection, this.mint, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID);
        if (!metadata) {
            throw new Error("No metadata found for this token");
        }
        return metadata;
    }
    /**
     * Create instruction to update a metadata field
     *
     * @param authority - Update authority public key
     * @param field - Field name to update
     * @param value - New value for the field
     * @returns Transaction instruction
     */
    createUpdateMetadataFieldInstruction(authority, field, value) {
        return (0, spl_token_metadata_1.createUpdateFieldInstruction)({
            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            metadata: this.mint,
            updateAuthority: authority,
            field,
            value,
        });
    }
    async updateMetadataField(authority, field, value) {
        try {
            const instruction = this.createUpdateMetadataFieldInstruction(authority.publicKey, field, value);
            const transaction = new web3_js_1.Transaction().add(instruction);
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [authority]);
            const metadata = await this.getTokenMetadata();
            return {
                signature,
                metadata,
            };
        }
        catch (error) {
            throw new Error(`Failed to update metadata field: ${error}`);
        }
    }
    async removeMetadataField(authority, key) {
        if (!key || key.length === 0) {
            throw new Error("Field key cannot be empty");
        }
        try {
            const transaction = new web3_js_1.Transaction();
            transaction.add((0, spl_token_metadata_1.createRemoveKeyInstruction)({
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                metadata: this.mint,
                updateAuthority: authority.publicKey,
                key: key,
                idempotent: true,
            }));
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [
                authority,
            ]);
            const updatedMetadata = await this.getTokenMetadata();
            return {
                signature,
                metadata: updatedMetadata
            };
        }
        catch (error) {
            throw new Error(`Failed to remove metadata field: ${error}`);
        }
    }
    async updateMetadataPointer(authority, newMetadataAddress) {
        try {
            const transaction = new web3_js_1.Transaction().add((0, spl_token_1.createUpdateMetadataPointerInstruction)(this.mint, authority.publicKey, newMetadataAddress, [], spl_token_1.TOKEN_2022_PROGRAM_ID));
            return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [
                authority,
            ]);
        }
        catch (error) {
            throw new Error(`Failed to update metadata pointer: ${error}`);
        }
    }
    async updateMetadataBatch(authority, fields) {
        if (Object.keys(fields).length === 0) {
            throw new Error("No fields provided for update");
        }
        try {
            let totalSize = 0;
            for (const [field, value] of Object.entries(fields)) {
                totalSize += spl_token_1.LENGTH_SIZE + field.length + value.length;
            }
            const additionalRent = await this.connection.getMinimumBalanceForRentExemption(totalSize);
            const transaction = new web3_js_1.Transaction();
            transaction.add(web3_js_1.SystemProgram.transfer({
                fromPubkey: authority.publicKey,
                toPubkey: this.mint,
                lamports: additionalRent,
            }));
            for (const [field, value] of Object.entries(fields)) {
                if (field.length === 0 || value.length === 0) {
                    continue;
                }
                transaction.add((0, spl_token_metadata_1.createUpdateFieldInstruction)({
                    programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                    metadata: this.mint,
                    updateAuthority: authority.publicKey,
                    field: field,
                    value: value,
                }));
            }
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [
                authority,
            ]);
            const updatedMetadata = await this.getTokenMetadata();
            return {
                signature,
                metadata: updatedMetadata
            };
        }
        catch (error) {
            throw new Error(`Failed to update metadata batch: ${error}`);
        }
    }
    async getNFTMetadata() {
        const tokenMetadata = await this.getTokenMetadata();
        if (!tokenMetadata.uri) {
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
            throw new Error(`Error fetching off-chain metadata: ${error}`);
        }
    }
    getMetadataConfig() {
        return { ...this.metadata };
    }
    async updateMetadataAuthority(currentAuthority, newAuthority) {
        try {
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
        catch (error) {
            throw new Error(`Failed to update metadata authority: ${error}`);
        }
    }
    async getMetadataField(field) {
        try {
            const metadata = await this.getTokenMetadata();
            if (!metadata.additionalMetadata) {
                return null;
            }
            for (const [key, value] of metadata.additionalMetadata) {
                if (key === field) {
                    return value;
                }
            }
            return null;
        }
        catch (error) {
            throw new Error(`Failed to get metadata field: ${error}`);
        }
    }
    async updateBasicMetadata(authority, updates) {
        const fields = {};
        if (updates.name) {
            if (updates.name.length > 32) {
                throw new Error("Name must be 32 characters or less");
            }
            fields["name"] = updates.name;
        }
        if (updates.symbol) {
            if (updates.symbol.length > 10) {
                throw new Error("Symbol must be 10 characters or less");
            }
            fields["symbol"] = updates.symbol;
        }
        if (updates.uri) {
            if (updates.uri.length > 200) {
                throw new Error("URI must be 200 characters or less");
            }
            fields["uri"] = updates.uri;
        }
        return await this.updateMetadataBatch(authority, fields);
    }
}
exports.MetadataPointerToken = MetadataPointerToken;
