import { Connection, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Token } from "../../core/token";
/**
 * NonTransferableToken - Extension for non-transferable tokens
 *
 * This extension prevents tokens from being transferred after they've been minted.
 * Useful for credentials, certificates, soulbound tokens, and other non-transferable assets.
 */
export declare class NonTransferableToken extends Token {
    constructor(connection: Connection, mint: PublicKey);
    /**
     * Create instructions for a new NonTransferableToken
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Public key of the transaction fee payer
     * @param params - Initialization parameters including:
     *   - decimals: Number of decimal places
     *   - mintAuthority: Authority allowed to mint tokens
     *   - freezeAuthority: Optional authority allowed to freeze accounts
     * @returns Instructions, signers and mint address for the new token
     */
    static createInstructions(connection: Connection, payer: PublicKey, params: {
        decimals: number;
        mintAuthority: PublicKey;
        freezeAuthority?: PublicKey | null;
    }): Promise<{
        instructions: TransactionInstruction[];
        signers: Keypair[];
        mint: PublicKey;
    }>;
    /**
     * Create instructions to mint to an account
     *
     * @param owner - Public key of the account owner
     * @param amount - Amount to mint
     * @param mintAuthority - Public key of the mint authority
     * @returns Instructions and token account address
     */
    createMintToInstructions(owner: PublicKey, amount: bigint, mintAuthority: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        address: PublicKey;
    }>;
    /**
     * Check if the token is non-transferable
     *
     * @returns Promise resolving to boolean
     */
    isNonTransferable(): Promise<boolean>;
    /**
     * Get mint information
     *
     * @returns Mint information
     */
    getMintInfo(): Promise<any>;
    /**
     * Get non-transferable information
     *
     * @returns Object with isNonTransferable property
     */
    getNonTransferableInfo(): Promise<{
        isNonTransferable: boolean;
    }>;
    /**
     * Check if tokens can be transferred from a token account
     * For non-transferable tokens, this will always return false
     *
     * @param tokenAccount - Token account to check
     * @returns Boolean indicating if tokens can be transferred
     */
    canTransferTokens(tokenAccount: PublicKey): Promise<boolean>;
}
