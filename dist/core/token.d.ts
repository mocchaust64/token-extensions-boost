import { Connection, PublicKey, Signer, TransactionInstruction, Commitment } from "@solana/web3.js";
import { Account, Mint } from "@solana/spl-token";
export declare class Token {
    protected connection: Connection;
    protected mint: PublicKey;
    protected _decimals?: number;
    protected _mintInfo?: Mint;
    constructor(connection: Connection, mint: PublicKey, decimals?: number);
    getMint(): PublicKey;
    getConnection(): Connection;
    getProgramId(): PublicKey;
    /**
     * Get the token decimals
     * If not set, it will query information from the blockchain
     *
     * @param forceRefresh - Force refresh information from blockchain if true
     * @returns Promise<number> - The token's decimals
     */
    getDecimals(forceRefresh?: boolean): Promise<number>;
    /**
     * Set decimals for the token
     *
     * @param decimals - Number of decimals to set
     */
    setDecimals(decimals: number): void;
    /**
     * Get complete mint information from blockchain
     *
     * @param forceRefresh - Force refresh information from blockchain if true
     * @returns Promise<Mint> - Detailed mint information
     */
    getMintInfo(forceRefresh?: boolean): Promise<Mint>;
    /**
     * Get Associated Token Account address for a wallet
     *
     * @param owner - Wallet address of the owner
     * @param allowOwnerOffCurve - Allow owner to be an address off the curve (default: false)
     * @returns The Associated Token Account address
     */
    getAssociatedAddress(owner: PublicKey, allowOwnerOffCurve?: boolean): Promise<PublicKey>;
    /**
     * Create instruction to initialize Associated Token Account
     *
     * @param payer - Transaction fee payer
     * @param associatedAccount - Associated Token Account address
     * @param owner - Wallet address of the owner
     * @returns TransactionInstruction to create Associated Token Account
     */
    createAssociatedTokenAccountInstruction(payer: PublicKey, associatedAccount: PublicKey, owner: PublicKey): TransactionInstruction;
    /**
     * Create instructions to mint tokens to an account
     *
     * @param destination - Address of the account receiving tokens
     * @param authority - Authority allowed to mint tokens
     * @param amount - Amount of tokens to mint
     * @returns Object containing instructions
     */
    createMintToInstructions(destination: PublicKey, authority: PublicKey, amount: bigint): {
        instructions: TransactionInstruction[];
    };
    /**
     * Create instructions to mint tokens with decimals check
     *
     * @param destination - Address of the account receiving tokens
     * @param authority - Authority allowed to mint tokens
     * @param amount - Amount of tokens to mint
     * @param decimals - Token decimals
     * @returns Object containing instructions
     */
    createMintToCheckedInstructions(destination: PublicKey, authority: PublicKey, amount: bigint, decimals: number): {
        instructions: TransactionInstruction[];
    };
    /**
     * Create instructions to create token account and mint tokens
     *
     * @param owner - Owner of the token account
     * @param payer - Transaction fee payer
     * @param amount - Amount of tokens to mint
     * @param mintAuthority - Authority allowed to mint tokens
     * @returns Object containing instructions and token account address
     */
    createAccountAndMintToInstructions(owner: PublicKey, payer: PublicKey, amount: bigint, mintAuthority: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        address: PublicKey;
    }>;
    /**
     * Create instructions to burn tokens
     *
     * @param account - Address of the account containing tokens to burn
     * @param owner - Account owner
     * @param amount - Amount of tokens to burn
     * @param decimals - Token decimals
     * @returns Object containing instructions
     */
    createBurnInstructions(account: PublicKey, owner: PublicKey, amount: bigint, decimals: number): {
        instructions: TransactionInstruction[];
    };
    /**
     * Create instructions to transfer tokens
     *
     * Usage guide:
     * - To transfer between existing token accounts: Use token account addresses directly for source and destination
     * - To transfer to a wallet without a token account: Use createDestinationIfNeeded=true and allowOwnerOffCurve=true
     *   if the address might be off-curve
     * - If you get a "Provided owner is not allowed" error, try using skipSourceOwnerCheck=true
     *
     * @param source - Source token account address
     * @param destination - Destination wallet or token account address
     * @param owner - Owner of source account and fee payer
     * @param amount - Amount of tokens to transfer
     * @param decimals - Token decimals
     * @param options - Additional options
     * @returns Object containing instructions and destination account address
     */
    createTransferInstructions(source: PublicKey, destination: PublicKey, owner: PublicKey, amount: bigint, decimals: number, options?: {
        memo?: string;
        createDestinationIfNeeded?: boolean;
        feePayer?: PublicKey;
        allowOwnerOffCurve?: boolean;
    }): Promise<{
        instructions: TransactionInstruction[];
        destinationAddress: PublicKey;
    }>;
    /**
     * Create or get token account
     *
     * @param payer - Transaction fee payer
     * @param owner - Token account owner
     * @returns Object containing instructions and token account address
     */
    createTokenAccountInstructions(payer: PublicKey, owner: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        address: PublicKey;
        accountExists: boolean;
    }>;
    /**
     * Create or get associated token account for a wallet address
     *
     * @param payer - Transaction fee payer (Keypair)
     * @param owner - Token account owner
     * @param allowOwnerOffCurve - Allow owner to be off-curve (default: false)
     * @param commitment - Transaction confirmation commitment level (default: "confirmed")
     * @param options - Transaction options
     * @returns Information about created or existing token account
     */
    getOrCreateTokenAccount(payer: Signer, owner: PublicKey, allowOwnerOffCurve?: boolean, commitment?: Commitment, options?: any): Promise<Account>;
    /**
     * Get information about a token account
     *
     * @param address - Token account address to query
     * @param commitment - Query commitment level
     * @returns Promise<Account> - Detailed information about the token account
     */
    getAccount(address: PublicKey, commitment?: Commitment): Promise<Account>;
    /**
     * Create instructions to transfer tokens using Permanent Delegate
     *
     * Usage guide:
     * - Permanent delegate can transfer tokens from any account without the owner's consent
     * - Use token account addresses for both source and destination to avoid errors
     * - If destination doesn't exist and needs to be created, set createDestinationIfNeeded=true
     * - If encountering off-curve address errors, set allowOwnerOffCurve=true
     * - You can provide decimals to avoid blockchain query if known in advance
     *
     * @param source - Source token account address
     * @param destination - Destination wallet or token account address
     * @param delegate - Permanent delegate address with token transfer authority
     * @param amount - Amount of tokens to transfer
     * @param options - Additional options
     * @returns Object containing instructions and destination account address
     */
    createPermanentDelegateTransferInstructions(source: PublicKey, destination: PublicKey, delegate: PublicKey, amount: bigint, options?: {
        memo?: string;
        createDestinationIfNeeded?: boolean;
        feePayer?: PublicKey;
        decimals?: number;
        allowOwnerOffCurve?: boolean;
        verifySourceBalance?: boolean;
    }): Promise<{
        instructions: TransactionInstruction[];
        destinationAddress: PublicKey;
    }>;
}
