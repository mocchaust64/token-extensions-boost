import { Connection, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Token } from "../../core/token";
declare module "@solana/spl-token" {
    interface Mint {
        permanentDelegate?: PublicKey | null;
    }
}
/**
 * PermanentDelegateToken - Extension for Token with permanent delegate functionality
 *
 * This extension allows setting a permanent delegate that can transfer tokens from any
 * account holding this token without the owner's permission.
 */
export declare class PermanentDelegateToken extends Token {
    private delegate;
    constructor(connection: Connection, mint: PublicKey, delegate: PublicKey | null);
    /**
     * Create instructions for a token with permanent delegate extension
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Public key of the transaction fee payer
     * @param params - Initialization parameters:
     *   - decimals: Number of decimals
     *   - mintAuthority: Authority allowed to mint tokens
     *   - freezeAuthority: Authority allowed to freeze accounts (optional)
     *   - permanentDelegate: Address of the permanent delegate
     * @returns Instructions, signers and mint address
     */
    static createInstructions(connection: Connection, payer: PublicKey, params: {
        decimals: number;
        mintAuthority: PublicKey;
        freezeAuthority?: PublicKey | null;
        permanentDelegate: PublicKey;
    }): Promise<{
        instructions: TransactionInstruction[];
        signers: Keypair[];
        mint: PublicKey;
    }>;
    /**
     * Create instructions for a token account for a token with permanent delegate
     *
     * @param owner - Token account owner
     * @param payer - Public key of the transaction fee payer (optional, defaults to owner)
     * @returns Instructions and token account address
     */
    createTokenAccountInstructions(owner: PublicKey, payer?: PublicKey): Promise<{
        instructions: TransactionInstruction[];
        address: PublicKey;
    }>;
    /**
     * Create instruction to transfer tokens as permanent delegate
     *
     * @param delegate - Public key of the permanent delegate
     * @param source - Source account (any account holding the token)
     * @param destination - Destination account
     * @param amount - Amount to transfer
     * @returns Transaction instruction
     */
    createTransferAsDelegateInstruction(delegate: PublicKey, source: PublicKey, destination: PublicKey, amount: bigint): TransactionInstruction;
    /**
     * Check if an address is the permanent delegate
     *
     * @param address - Address to check
     * @returns true if it is the permanent delegate, false otherwise
     */
    isPermanentDelegate(address: PublicKey): Promise<boolean>;
    /**
     * Get the permanent delegate of the token
     *
     * @returns Address of the permanent delegate or null if none
     */
    getPermanentDelegate(): Promise<PublicKey | null>;
}
