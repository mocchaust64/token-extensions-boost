"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataHelper = void 0;
const spl_token_1 = require("@solana/spl-token");
const spl_token_metadata_1 = require("@solana/spl-token-metadata");
const web3_js_1 = require("@solana/web3.js");
/**
 * Helper class for better handling of metadata when combined with other extensions
 */
class MetadataHelper {
    /**
     * Calculate the size needed for metadata
     *
     * @param metadata - Metadata information
     * @returns Estimated size (bytes)
     */
    static calculateMetadataSize(metadata) {
        // Create TokenMetadata object
        const tokenMetadata = {
            mint: web3_js_1.PublicKey.default,
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            additionalMetadata: metadata.additionalMetadata
                ? Object.entries(metadata.additionalMetadata)
                : [],
        };
        // Pack metadata to calculate actual size
        const packedData = (0, spl_token_metadata_1.pack)(tokenMetadata);
        // Add header size (TYPE_SIZE + LENGTH_SIZE)
        const headerSize = spl_token_1.TYPE_SIZE + spl_token_1.LENGTH_SIZE;
        // Add padding to ensure sufficient size
        const paddingFactor = 2;
        const metadataLen = headerSize + (packedData.length * paddingFactor);
        // Add minimum size as a safeguard
        return Math.max(metadataLen, 2048);
    }
    /**
     * Calculate the size needed for mint account with extensions and metadata
     *
     * @param extensionTypes - Types of extensions to add
     * @param metadata - Metadata information (if any)
     * @returns Total required size (bytes)
     */
    static calculateMintSize(extensionTypes, metadata) {
        // Ensure MetadataPointer is included in extensionTypes if metadata exists
        let allExtensions = [...extensionTypes];
        if (metadata && !allExtensions.includes(spl_token_1.ExtensionType.MetadataPointer)) {
            allExtensions.push(spl_token_1.ExtensionType.MetadataPointer);
        }
        // Calculate size needed for mint with extensions
        const mintLen = (0, spl_token_1.getMintLen)(allExtensions);
        // If there's no metadata information
        if (!metadata) {
            return mintLen;
        }
        // Calculate size needed for metadata
        const metadataSize = this.calculateMetadataSize(metadata);
        // Total size = mint size + metadata size + buffer
        const totalSize = mintLen + metadataSize + 1024; // Add 1KB buffer
        return totalSize;
    }
    /**
     * Create token with integrated metadata in a simple way
     * This function follows the correct initialization order to ensure proper operation
     *
     * @param connection - Solana connection
     * @param payer - Fee payer
     * @param params - Initialization parameters
     * @returns Information about the created token
     */
    static async createTokenWithMetadata(connection, payer, params) {
        try {
            // Create keypair for mint account
            const mintKeypair = web3_js_1.Keypair.generate();
            const mint = mintKeypair.publicKey;
            console.log(`Creating token with mint address: ${mint.toString()}`);
            // Prepare metadata
            const metaData = {
                updateAuthority: payer.publicKey,
                mint: mint,
                name: params.name,
                symbol: params.symbol,
                uri: params.uri,
                additionalMetadata: params.additionalMetadata
                    ? Object.entries(params.additionalMetadata)
                    : [],
            };
            // Change the size calculation method for the parts
            const metadataExtension = spl_token_1.TYPE_SIZE + spl_token_1.LENGTH_SIZE;
            const metadataLen = (0, spl_token_metadata_1.pack)(metaData).length;
            // Create extension list to calculate correct size
            const extensionsToUse = [spl_token_1.ExtensionType.MetadataPointer];
            // Add other extensions if provided
            if (params.extensions && params.extensions.length > 0) {
                params.extensions.forEach(ext => {
                    if (!extensionsToUse.includes(ext)) {
                        extensionsToUse.push(ext);
                    }
                });
            }
            // Calculate size based on all extensions
            const mintLen = (0, spl_token_1.getMintLen)(extensionsToUse);
            console.log(`Calculating size for ${extensionsToUse.length} extensions: ${JSON.stringify(extensionsToUse.map(ext => spl_token_1.ExtensionType[ext]))}`);
            console.log(`Size: mint=${mintLen}, metadata extension=${metadataExtension}, metadata=${metadataLen}`);
            // Calculate required lamports based on total size
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataExtension + metadataLen);
            // Create transaction with all necessary instructions
            const transaction = new web3_js_1.Transaction();
            // 1. Create account
            transaction.add(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mint,
                space: mintLen, // Only need enough for mint with extension
                lamports, // But need enough lamports for metadata too
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }));
            // 2. Initialize MetadataPointer extension
            transaction.add((0, spl_token_1.createInitializeMetadataPointerInstruction)(mint, payer.publicKey, // Update authority
            mint, // Metadata address (points to itself)
            spl_token_1.TOKEN_2022_PROGRAM_ID));
            // 3. Initialize NonTransferable extension
            if (params.extensions && params.extensions.includes(spl_token_1.ExtensionType.NonTransferable)) {
                transaction.add((0, spl_token_1.createInitializeNonTransferableMintInstruction)(mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            // 4. Initialize Mint
            transaction.add((0, spl_token_1.createInitializeMintInstruction)(mint, params.decimals, params.mintAuthority, null, // Freeze Authority
            spl_token_1.TOKEN_2022_PROGRAM_ID));
            // 5. Initialize Metadata
            transaction.add((0, spl_token_metadata_1.createInitializeInstruction)({
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                updateAuthority: payer.publicKey,
                mint: mint,
                mintAuthority: params.mintAuthority,
                name: params.name,
                symbol: params.symbol,
                uri: params.uri,
            }));
            // 6. Add additional metadata fields
            if (params.additionalMetadata) {
                for (const [key, value] of Object.entries(params.additionalMetadata)) {
                    transaction.add((0, spl_token_metadata_1.createUpdateFieldInstruction)({
                        programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                        metadata: mint,
                        updateAuthority: payer.publicKey,
                        field: key,
                        value: value,
                    }));
                }
            }
            // Send transaction
            console.log("Sending transaction...");
            const signature = await (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [payer, mintKeypair], { commitment: 'confirmed' });
            console.log(`Token created successfully! Transaction: ${signature}`);
            return {
                mint,
                txId: signature
            };
        }
        catch (error) {
            console.error('Error creating token with metadata:', error);
            if (error instanceof Error) {
                const errorMessage = error.message;
                console.error('Error details:', errorMessage);
            }
            throw error;
        }
    }
    /**
     * Check if extensions are compatible with each other
     *
     * @param extensionTypes - Array of extension types to check
     * @returns Compatibility check result
     */
    static checkExtensionCompatibility(extensionTypes) {
        const incompatiblePairs = [];
        // Check incompatible pairs according to Solana guidelines
        // NonTransferable is incompatible with extensions related to token transfers
        if (extensionTypes.includes(spl_token_1.ExtensionType.NonTransferable)) {
            if (extensionTypes.includes(spl_token_1.ExtensionType.TransferFeeConfig)) {
                incompatiblePairs.push([spl_token_1.ExtensionType.NonTransferable, spl_token_1.ExtensionType.TransferFeeConfig]);
            }
            if (extensionTypes.includes(spl_token_1.ExtensionType.TransferHook)) {
                incompatiblePairs.push([spl_token_1.ExtensionType.NonTransferable, spl_token_1.ExtensionType.TransferHook]);
            }
            if (extensionTypes.includes(spl_token_1.ExtensionType.ConfidentialTransferMint)) {
                incompatiblePairs.push([spl_token_1.ExtensionType.NonTransferable, spl_token_1.ExtensionType.ConfidentialTransferMint]);
            }
        }
        // ConfidentialTransfer is incompatible with some extensions
        if (extensionTypes.includes(spl_token_1.ExtensionType.ConfidentialTransferMint)) {
            if (extensionTypes.includes(spl_token_1.ExtensionType.TransferFeeConfig)) {
                incompatiblePairs.push([spl_token_1.ExtensionType.ConfidentialTransferMint, spl_token_1.ExtensionType.TransferFeeConfig]);
            }
            if (extensionTypes.includes(spl_token_1.ExtensionType.TransferHook)) {
                incompatiblePairs.push([spl_token_1.ExtensionType.ConfidentialTransferMint, spl_token_1.ExtensionType.TransferHook]);
            }
            if (extensionTypes.includes(spl_token_1.ExtensionType.PermanentDelegate)) {
                incompatiblePairs.push([spl_token_1.ExtensionType.ConfidentialTransferMint, spl_token_1.ExtensionType.PermanentDelegate]);
            }
        }
        return {
            isCompatible: incompatiblePairs.length === 0,
            incompatiblePairs: incompatiblePairs.length > 0 ? incompatiblePairs : undefined,
            reason: incompatiblePairs.length > 0
                ? "Some extensions are incompatible with each other"
                : undefined
        };
    }
    /**
     * Create metadata address based on mint
     *
     * @param mint - Mint address
     * @returns Metadata address
     */
    static findMetadataAddress(mint) {
        const [metadataAddress] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("metadata"), spl_token_1.TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()], spl_token_1.TOKEN_2022_PROGRAM_ID);
        return metadataAddress;
    }
    /**
     * Create the sequence of steps to initialize metadata correctly
     *
     * @param mint - Mint address
     * @param updateAuthority - Address with authority to update metadata
     * @param metadata - Metadata information
     * @returns Sequence of steps
     */
    static getMetadataInstructions(mint, updateAuthority, metadata) {
        const metadataAddress = this.findMetadataAddress(mint);
        // Initialization order for metadata
        const setupOrder = [
            "1. Initialize the metadata pointer on the mint",
            "2. Initialize the metadata account itself",
            "3. Set additional metadata fields",
            "4. Update the metadata pointer to point to the metadata account"
        ];
        return {
            metadataAddress,
            setupOrder
        };
    }
    /**
     * Create instructions for initializing tokens with metadata
     *
     * @param connection - Solana connection
     * @param payer - Public key of the fee payer
     * @param params - Initialization parameters
     * @returns Instructions, signers, and mint address
     */
    static async createTokenWithMetadataInstructions(connection, payer, params) {
        try {
            // Create keypair for mint account
            const mintKeypair = web3_js_1.Keypair.generate();
            const mint = mintKeypair.publicKey;
            console.log(`Creating token with mint address: ${mint.toString()}`);
            // Prepare metadata
            const metaData = {
                updateAuthority: payer,
                mint: mint,
                name: params.name,
                symbol: params.symbol,
                uri: params.uri,
                additionalMetadata: params.additionalMetadata
                    ? Object.entries(params.additionalMetadata)
                    : [],
            };
            // Change the size calculation method for the parts
            const metadataExtension = spl_token_1.TYPE_SIZE + spl_token_1.LENGTH_SIZE;
            const metadataLen = (0, spl_token_metadata_1.pack)(metaData).length;
            // Create extension list to calculate correct size
            const extensionsToUse = [spl_token_1.ExtensionType.MetadataPointer];
            // Add other extensions if provided
            if (params.extensions && params.extensions.length > 0) {
                params.extensions.forEach(ext => {
                    if (!extensionsToUse.includes(ext)) {
                        extensionsToUse.push(ext);
                    }
                });
            }
            // Calculate size based on all extensions
            const mintLen = (0, spl_token_1.getMintLen)(extensionsToUse);
            console.log(`Calculating size for ${extensionsToUse.length} extensions: ${JSON.stringify(extensionsToUse.map(ext => spl_token_1.ExtensionType[ext]))}`);
            console.log(`Size: mint=${mintLen}, metadata extension=${metadataExtension}, metadata=${metadataLen}`);
            // Calculate required lamports based on total size
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataExtension + metadataLen);
            // Create array for instructions
            const instructions = [];
            // 1. Create account
            instructions.push(web3_js_1.SystemProgram.createAccount({
                fromPubkey: payer,
                newAccountPubkey: mint,
                space: mintLen, // Only need enough for mint with extension
                lamports, // But need enough lamports for metadata too
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
            }));
            // 2. Initialize MetadataPointer extension
            instructions.push((0, spl_token_1.createInitializeMetadataPointerInstruction)(mint, payer, // Update authority
            mint, // Metadata address (points to itself)
            spl_token_1.TOKEN_2022_PROGRAM_ID));
            // 3. Add NonTransferable extension if included
            if (params.extensions && params.extensions.includes(spl_token_1.ExtensionType.NonTransferable)) {
                instructions.push((0, spl_token_1.createInitializeNonTransferableMintInstruction)(mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
            }
            // 4. Initialize mint
            instructions.push((0, spl_token_1.createInitializeMintInstruction)(mint, params.decimals, params.mintAuthority, null, // Freeze authority
            spl_token_1.TOKEN_2022_PROGRAM_ID));
            // 5. Initialize metadata
            instructions.push((0, spl_token_metadata_1.createInitializeInstruction)({
                programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                metadata: mint,
                updateAuthority: payer,
                mint: mint,
                mintAuthority: params.mintAuthority,
                name: params.name,
                symbol: params.symbol,
                uri: params.uri,
            }));
            // 6. Add additional metadata fields if any
            if (params.additionalMetadata) {
                for (const [key, value] of Object.entries(params.additionalMetadata)) {
                    instructions.push((0, spl_token_metadata_1.createUpdateFieldInstruction)({
                        programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                        metadata: mint,
                        updateAuthority: payer,
                        field: key,
                        value: value,
                    }));
                }
            }
            return {
                instructions,
                signers: [mintKeypair],
                mint
            };
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to create token with metadata instructions: ${error.message}`);
            }
            else {
                throw new Error(`Unknown error creating token with metadata instructions: ${String(error)}`);
            }
        }
    }
}
exports.MetadataHelper = MetadataHelper;
