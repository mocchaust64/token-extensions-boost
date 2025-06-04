import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import {
    AccountState,
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    getMintLen,
    createInitializeMintInstruction,
    createInitializeMetadataPointerInstruction,
    createInitializeTransferFeeConfigInstruction,
    createInitializePermanentDelegateInstruction,
    createInitializeInterestBearingMintInstruction,
    createInitializeTransferHookInstruction,
    createInitializeNonTransferableMintInstruction,
    createInitializeDefaultAccountStateInstruction,
    createInitializeMintCloseAuthorityInstruction,
    TYPE_SIZE,
    LENGTH_SIZE
} from "@solana/spl-token";
import {
    createInitializeInstruction,
    createUpdateFieldInstruction,
    pack
} from "@solana/spl-token-metadata";

interface ExtensionCompatibilityResult {
    isCompatible: boolean;
    incompatiblePairs?: [ExtensionType, ExtensionType][];
    reason?: string;
}

interface MetadataConfig {
    name: string;
    symbol: string;
    uri: string;
    additionalMetadata?: Record<string, string>;
}

interface TransferFeeConfig {
    feeBasisPoints: number;
    maxFee: bigint;
    transferFeeConfigAuthority: PublicKey;
    withdrawWithheldAuthority: PublicKey;
}

interface InterestBearingConfig {
    rate: number;
    rateAuthority: PublicKey;
}

interface TransferHookConfig {
    programId: PublicKey;
    extraMetas?: PublicKey[];
}

interface ConfidentialTransferConfig {
    autoEnable: boolean;
}

/**
 * Check extension compatibility
 *
 * @param extensionTypes Array of extension types to check
 * @returns Compatibility check result
 */
function checkExtensionCompatibility(extensionTypes: ExtensionType[]): ExtensionCompatibilityResult {
    const incompatiblePairs: [ExtensionType, ExtensionType][] = [];

    if (extensionTypes.includes(ExtensionType.NonTransferable)) {
        if (extensionTypes.includes(ExtensionType.TransferFeeConfig)) {
            incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.TransferFeeConfig]);
        }
        if (extensionTypes.includes(ExtensionType.TransferHook)) {
            incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.TransferHook]);
        }
        if (extensionTypes.includes(ExtensionType.ConfidentialTransferMint)) {
            incompatiblePairs.push([ExtensionType.NonTransferable, ExtensionType.ConfidentialTransferMint]);
        }
    }

    if (extensionTypes.includes(ExtensionType.ConfidentialTransferMint)) {
        if (extensionTypes.includes(ExtensionType.TransferFeeConfig)) {
            incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.TransferFeeConfig]);
        }
        if (extensionTypes.includes(ExtensionType.TransferHook)) {
            incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.TransferHook]);
        }
        if (extensionTypes.includes(ExtensionType.PermanentDelegate)) {
            incompatiblePairs.push([ExtensionType.ConfidentialTransferMint, ExtensionType.PermanentDelegate]);
        }
    }

    if (incompatiblePairs.length > 0) {
        const reasons = incompatiblePairs.map(([a, b]) => 
            `${ExtensionType[a]} and ${ExtensionType[b]} cannot be used together`
        );
        return {
            isCompatible: false,
            incompatiblePairs,
            reason: reasons.join("; ")
        };
    }

    return { isCompatible: true };
}

export class TokenBuilder {
    private connection: Connection;
    private extensions: ExtensionType[] = [];
    private decimals: number = 9;
    private mintAuthority: PublicKey | null = null;
    private freezeAuthority: PublicKey | null = null;
    
    private metadata?: MetadataConfig;
    private tokenMetadata?: MetadataConfig;
    private transferFee?: TransferFeeConfig;
    private permanentDelegate?: PublicKey;
    private transferHook?: TransferHookConfig;
    private confidentialTransfer?: ConfidentialTransferConfig;
    private interestBearing?: InterestBearingConfig;
    private defaultAccountState?: AccountState;
    private mintCloseAuthority?: PublicKey;

    /**
     * Initialize builder with connection
     *
     * @param connection - Connection to Solana cluster
     */
    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Set basic token information
     *
     * @param decimals - Token decimals
     * @param mintAuthority - Mint authority of the token
     * @param freezeAuthority - Freeze authority of the token (optional)
     * @returns this - for method chaining
     */
    setTokenInfo(decimals: number, mintAuthority: PublicKey, freezeAuthority?: PublicKey | null): TokenBuilder {
        this.decimals = decimals;
        this.mintAuthority = mintAuthority;
        this.freezeAuthority = freezeAuthority || null;
        return this;
    }

    /**
     * Add metadata extension
     *
     * @param name - Token name
     * @param symbol - Token symbol
     * @param uri - URI to metadata
     * @param additionalMetadata - Additional metadata (optional)
     * @returns this - for method chaining
     */
    addMetadata(name: string, symbol: string, uri: string, additionalMetadata?: Record<string, string>): TokenBuilder {
        this.metadata = { name, symbol, uri, additionalMetadata };
        this.extensions.push(ExtensionType.MetadataPointer);
        return this;
    }

    /**
     * Add token metadata extension (embedded metadata)
     *
     * When using this extension, metadata will be stored directly in the mint account
     * and does not require a separate metadata account
     *
     * @param name - Token name
     * @param symbol - Token symbol
     * @param uri - URI to metadata
     * @param additionalMetadata - Additional metadata (optional)
     * @returns this - for method chaining
     */
    addTokenMetadata(name: string, symbol: string, uri: string, additionalMetadata?: Record<string, string>): TokenBuilder {
        this.tokenMetadata = { name, symbol, uri, additionalMetadata };
        // Metadata needs MetadataPointer extension
        this.extensions.push(ExtensionType.MetadataPointer);
        return this;
    }

    /**
     * Add transfer fee extension
     *
     * @param feeBasisPoints - Fee in basis points (1% = 100 basis points)
     * @param maxFee - Maximum fee
     * @param transferFeeConfigAuthority - Account with authority to update fee config
     * @param withdrawWithheldAuthority - Account with authority to withdraw collected fees
     * @returns this - for method chaining
     */
    addTransferFee(
        feeBasisPoints: number,
        maxFee: bigint,
        transferFeeConfigAuthority: PublicKey,
        withdrawWithheldAuthority: PublicKey
    ): TokenBuilder {
        this.transferFee = {
            feeBasisPoints,
            maxFee,
            transferFeeConfigAuthority,
            withdrawWithheldAuthority
        };
        this.extensions.push(ExtensionType.TransferFeeConfig);
        return this;
    }

    /**
     * Add permanent delegate extension
     *
     * @param delegate - Permanent delegate address
     * @returns this - for method chaining
     */
    addPermanentDelegate(delegate: PublicKey): TokenBuilder {
        this.permanentDelegate = delegate;
        this.extensions.push(ExtensionType.PermanentDelegate);
        return this;
    }

    /**
     * Add interest bearing extension
     *
     * @param rate - Interest rate (basis points)
     * @param rateAuthority - Account with authority to update interest rate
     * @returns this - for method chaining
     */
    addInterestBearing(rate: number, rateAuthority: PublicKey): TokenBuilder {
        this.interestBearing = {
            rate,
            rateAuthority
        };
        this.extensions.push(ExtensionType.InterestBearingConfig);
        return this;
    }

    /**
     * Add transfer hook extension
     *
     * @param programId - Address of transfer hook program
     * @param extraMetas - Additional metadata (optional)
     * @returns this - for method chaining
     */
    addTransferHook(programId: PublicKey, extraMetas?: PublicKey[]): TokenBuilder {
        this.transferHook = {
            programId,
            extraMetas
        };
        this.extensions.push(ExtensionType.TransferHook);
        return this;
    }

    /**
     * Add non-transferable extension
     *
     * @returns this - for method chaining
     */
    addNonTransferable(): TokenBuilder {
        this.extensions.push(ExtensionType.NonTransferable);
        return this;
    }

    /**
     * Add confidential transfer extension
     *
     * @param autoEnable - Whether to auto-enable confidential transfers
     * @returns this - for method chaining
     */
    addConfidentialTransfer(autoEnable: boolean = false): TokenBuilder {
        this.confidentialTransfer = {
            autoEnable
        };
        this.extensions.push(ExtensionType.ConfidentialTransferMint);
        return this;
    }

    /**
     * Add default account state extension
     *
     * @param state - Default account state
     * @param freezeAuthority - Freeze authority (optional)
     * @returns this - for method chaining
     */
    addDefaultAccountState(state: AccountState, freezeAuthority?: PublicKey): TokenBuilder {
        this.defaultAccountState = state;
        this.extensions.push(ExtensionType.DefaultAccountState);
        return this;
    }

    /**
     * Add mint close authority extension
     *
     * @param closeAuthority - Close authority
     * @returns this - for method chaining
     */
    addMintCloseAuthority(closeAuthority: PublicKey): TokenBuilder {
        this.mintCloseAuthority = closeAuthority;
        this.extensions.push(ExtensionType.MintCloseAuthority);
        return this;
    }

    /**
     * Create instructions for token with configured extensions
     *
     * This method returns instructions instead of executing transaction,
     * making it easy to integrate with wallet adapter.
     *
     * @param payer - Public key of the transaction fee payer
     * @returns Promise with instructions, required signers, and mint address
     */
    async createTokenInstructions(payer: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        signers: Keypair[];
        mint: PublicKey;
    }> {
        const hasMetadata = this.metadata || this.tokenMetadata;
        const hasOtherExtensions = this.extensions.filter(ext => 
            ext !== ExtensionType.MetadataPointer
        ).length > 0;

        // Check extension compatibility
        const compatibilityCheck = checkExtensionCompatibility(this.extensions);
        if (!compatibilityCheck.isCompatible) {
            throw new Error(`Incompatible extensions: ${compatibilityCheck.reason}`);
        }

        if (hasMetadata && hasOtherExtensions) {
            return this.createTokenWithMetadataAndExtensionsInstructions(payer);
        } else {
            return this.createTokenWithExtensionsInstructions(payer);
        }
    }

    /**
     * Create instructions for token with multiple extensions - simplified version
     *
     * @param payer - Public key of the transaction fee payer
     * @returns Promise with instructions, required signers, and mint address
     */
    async createTokenWithExtensionsInstructions(payer: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        signers: Keypair[];
        mint: PublicKey;
    }> {
        if (!this.mintAuthority) {
            throw new Error("Mint authority is required");
        }

        try {
            console.log("Creating instructions for token with extensions...");
            const mintKeypair = Keypair.generate();
            const mint = mintKeypair.publicKey;
            console.log(`Mint address: ${mint.toString()}`);

            // If tokenMetadata is provided, use MetadataHelper
            if (this.tokenMetadata) {
                console.log("Using MetadataHelper to create token with metadata...");
                const { MetadataHelper } = require('./metadata-helper');
                const result = await MetadataHelper.createTokenWithMetadataInstructions(
                    this.connection,
                    payer,
                    {
                        decimals: this.decimals,
                        mintAuthority: this.mintAuthority,
                        name: this.tokenMetadata.name,
                        symbol: this.tokenMetadata.symbol,
                        uri: this.tokenMetadata.uri,
                        additionalMetadata: this.tokenMetadata.additionalMetadata,
                        extensions: this.extensions
                    }
                );

                return {
                    instructions: result.instructions,
                    signers: result.signers,
                    mint: result.mint
                };
            }

            console.log("Creating mint with other extensions...");
            const extensionsToUse = [...this.extensions];
            const mintLen = getMintLen(extensionsToUse);
            console.log(`Mint size: ${mintLen} bytes`);

            const lamports = await this.connection.getMinimumBalanceForRentExemption(mintLen);
            const instructions: TransactionInstruction[] = [];

            // Create account
            instructions.push(
                SystemProgram.createAccount({
                    fromPubkey: payer,
                    newAccountPubkey: mint,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                })
            );

            // Add extension instructions
            if (this.extensions.includes(ExtensionType.NonTransferable)) {
                console.log("Adding NonTransferable extension...");
                instructions.push(
                    createInitializeNonTransferableMintInstruction(
                        mint,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.transferFee) {
                console.log("Adding TransferFee extension...");
                instructions.push(
                    createInitializeTransferFeeConfigInstruction(
                        mint,
                        this.transferFee.transferFeeConfigAuthority,
                        this.transferFee.withdrawWithheldAuthority,
                        this.transferFee.feeBasisPoints,
                        this.transferFee.maxFee,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.permanentDelegate) {
                console.log("Adding PermanentDelegate extension...");
                instructions.push(
                    createInitializePermanentDelegateInstruction(
                        mint,
                        this.permanentDelegate,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.interestBearing) {
                console.log("Adding InterestBearing extension...");
                instructions.push(
                    createInitializeInterestBearingMintInstruction(
                        mint,
                        this.interestBearing.rateAuthority,
                        this.interestBearing.rate,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.transferHook) {
                console.log("Adding TransferHook extension...");
                instructions.push(
                    createInitializeTransferHookInstruction(
                        mint,
                        payer,
                        this.transferHook.programId,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.confidentialTransfer) {
                console.log("Warning: ConfidentialTransfer extension is not fully supported yet");
            }

            if (this.defaultAccountState !== undefined) {
                console.log("Adding DefaultAccountState extension...");
                instructions.push(
                    createInitializeDefaultAccountStateInstruction(
                        mint,
                        this.defaultAccountState,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.mintCloseAuthority) {
                console.log("Adding MintCloseAuthority extension...");
                instructions.push(
                    createInitializeMintCloseAuthorityInstruction(
                        mint,
                        this.mintCloseAuthority,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // Initialize mint after extensions
            console.log("Initializing mint after extensions...");
            instructions.push(
                createInitializeMintInstruction(
                    mint,
                    this.decimals,
                    this.mintAuthority,
                    this.freezeAuthority,
                    TOKEN_2022_PROGRAM_ID
                )
            );

            return {
                instructions,
                signers: [mintKeypair],
                mint
            };

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to create token instructions: ${error.message}`);
            } else {
                throw new Error(`Unknown error creating token instructions: ${String(error)}`);
            }
        }
    }

    /**
     * Create instructions for token with metadata and other extensions
     *
     * @param payer - Public key of the transaction fee payer
     * @returns Promise with instructions, required signers, and mint address
     */
    async createTokenWithMetadataAndExtensionsInstructions(payer: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        signers: Keypair[];
        mint: PublicKey;
    }> {
        if (!this.mintAuthority) {
            throw new Error("Mint authority is required");
        }

        const metadata = this.metadata || this.tokenMetadata;
        if (!metadata) {
            throw new Error("Metadata is required for this method");
        }

        try {
            console.log("Creating instructions for token with metadata and other extensions...");
            const mintKeypair = Keypair.generate();
            const mint = mintKeypair.publicKey;
            console.log(`Mint address: ${mint.toString()}`);

            // Prepare token metadata
            const tokenMetadata = {
                mint: mint,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                additionalMetadata: Object.entries(metadata.additionalMetadata || {}).map(
                    ([key, value]) => [key, value] as const
                ),
            };

            // Ensure MetadataPointer extension is included
            let extensionsToUse = [...this.extensions];
            if (!extensionsToUse.includes(ExtensionType.MetadataPointer)) {
                extensionsToUse.push(ExtensionType.MetadataPointer);
            }

            // Check if Non-Transferable extension is included
            const hasNonTransferable = extensionsToUse.includes(ExtensionType.NonTransferable);

            // Calculate sizes
            const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
            const metadataLen = pack(tokenMetadata).length;
            const mintLen = getMintLen(extensionsToUse);
            const lamports = await this.connection.getMinimumBalanceForRentExemption(
                mintLen + metadataExtension + metadataLen
            );

            console.log(`Size: mint=${mintLen}, metadata extension=${metadataExtension}, metadata=${metadataLen}`);

            const instructions: TransactionInstruction[] = [];

            // Create account
            instructions.push(
                SystemProgram.createAccount({
                    fromPubkey: payer,
                    newAccountPubkey: mint,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                })
            );

            // Initialize MetadataPointer extension
            instructions.push(
                createInitializeMetadataPointerInstruction(
                    mint,
                    payer,
                    mint,
                    TOKEN_2022_PROGRAM_ID
                )
            );

            // Split extensions into 3 groups:
            // 1. Non-Transferable (must be initialized before mint)
            // 2. Other extensions (except Non-Transferable)
            // 3. Metadata (must be initialized after mint)

            // 1. Initialize Non-Transferable extension first (if present)
            if (hasNonTransferable) {
                console.log("Adding NonTransferable extension before initializing mint...");
                instructions.push(
                    createInitializeNonTransferableMintInstruction(
                        mint,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // 2. Add other extensions (except Non-Transferable)
            if (this.transferFee) {
                instructions.push(
                    createInitializeTransferFeeConfigInstruction(
                        mint,
                        this.transferFee.transferFeeConfigAuthority,
                        this.transferFee.withdrawWithheldAuthority,
                        this.transferFee.feeBasisPoints,
                        this.transferFee.maxFee,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.permanentDelegate) {
                instructions.push(
                    createInitializePermanentDelegateInstruction(
                        mint,
                        this.permanentDelegate,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.transferHook) {
                instructions.push(
                    createInitializeTransferHookInstruction(
                        mint,
                        payer,
                        this.transferHook.programId,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.confidentialTransfer) {
                console.log("Warning: ConfidentialTransfer extension is not fully supported yet");
            }

            if (this.interestBearing) {
                instructions.push(
                    createInitializeInterestBearingMintInstruction(
                        mint,
                        this.interestBearing.rateAuthority,
                        this.interestBearing.rate,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.defaultAccountState !== undefined) {
                instructions.push(
                    createInitializeDefaultAccountStateInstruction(
                        mint,
                        this.defaultAccountState,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            if (this.mintCloseAuthority) {
                instructions.push(
                    createInitializeMintCloseAuthorityInstruction(
                        mint,
                        this.mintCloseAuthority,
                        TOKEN_2022_PROGRAM_ID
                    )
                );
            }

            // 3. Initialize mint after extensions (important: after Non-Transferable and before Metadata)
            console.log("Initializing mint after extensions...");
            instructions.push(
                createInitializeMintInstruction(
                    mint,
                    this.decimals,
                    this.mintAuthority,
                    this.freezeAuthority,
                    TOKEN_2022_PROGRAM_ID
                )
            );

            // 4. Initialize metadata (must be after mint initialization)
            console.log("Initializing metadata after initializing mint...");
            instructions.push(
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    metadata: mint,
                    updateAuthority: payer,
                    mint: mint,
                    mintAuthority: this.mintAuthority,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                })
            );

            // Add additional metadata if provided
            if (metadata.additionalMetadata) {
                for (const [key, value] of Object.entries(metadata.additionalMetadata)) {
                    instructions.push(
                        createUpdateFieldInstruction({
                            programId: TOKEN_2022_PROGRAM_ID,
                            metadata: mint,
                            updateAuthority: payer,
                            field: key,
                            value: value,
                        })
                    );
                }
            }

            return {
                instructions,
                signers: [mintKeypair],
                mint
            };

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to create token instructions: ${error.message}`);
            } else {
                throw new Error(`Unknown error creating token instructions: ${String(error)}`);
            }
        }
    }

    /**
     * Build transaction from token instructions
     *
     * Utility method to help users create transaction from instructions
     *
     * @param instructions - Instructions to include in transaction
     * @param feePayer - Public key of fee payer
     * @returns Configured transaction
     */
    buildTransaction(instructions: TransactionInstruction[], feePayer: PublicKey): Transaction {
        const transaction = new Transaction();
        instructions.forEach(instruction => transaction.add(instruction));
        transaction.feePayer = feePayer;
        return transaction;
    }
}