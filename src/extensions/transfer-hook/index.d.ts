import { Connection, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Token } from "../../core/token";
/**
 * TransferHookToken - Extension for Token with transfer hook functionality
 *
 * This extension allows executing custom logic on token transfers through a separate program
 */
export declare class TransferHookToken extends Token {
    private programId;
    constructor(connection: Connection, mint: PublicKey, programId: PublicKey);
    /**
     * Create transfer instruction with transfer hook
     *
     * @param source - Source account address
     * @param destination - Destination account address
     * @param owner - Account owner
     * @param amount - Token amount to transfer
     * @param decimals - Token decimal places
     * @param extraAccounts - Additional accounts to include in the instruction (optional)
     * @returns Transaction instruction
     */
    createTransferInstruction(source: PublicKey, destination: PublicKey, owner: PublicKey, amount: bigint, decimals: number, extraAccounts?: PublicKey[]): TransactionInstruction;
    /**
     * Generate instructions to create a new TransferHookToken
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Public key of the transaction fee payer
     * @param params - Initialization parameters
     * @returns Instructions, signers, and mint address
     */
    static createInstructions(connection: Connection, payer: PublicKey, params: {
        decimals: number;
        mintAuthority: PublicKey;
        programId: PublicKey;
    }): Promise<{
        instructions: TransactionInstruction[];
        signers: Keypair[];
        mint: PublicKey;
    }>;
    /**
     * Get the program ID that will be called on transfers
     *
     * @returns Transfer hook program ID
     */
    getTransferHookProgramId(): PublicKey;
    /**
     * Check if an account has the TransferHook extension enabled
     *
     * @param tokenAccount - Token account to check
     * @returns Promise resolving to boolean indicating if the extension is enabled
     */
    hasTransferHookExtension(tokenAccount: PublicKey): Promise<boolean>;
}
