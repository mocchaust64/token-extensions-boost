import { Connection, PublicKey, TransactionInstruction, Keypair } from "@solana/web3.js";
import { Token } from "../../core/token";
export declare class ConfidentialTransferToken extends Token {
    /**
     * Create a new ConfidentialTransferToken instance
     *
     * @param connection - Connection to Solana cluster
     * @param mintAddress - Public key of the token mint
     */
    constructor(connection: Connection, mintAddress: PublicKey);
    /**
     * Create instructions to create a new token with confidential transfer extension
     *
     * @param connection - Connection to Solana cluster
     * @param payer - Public key of the transaction fee payer
     * @param options - Creation options including:
     *   - decimals: Number of decimals for the token
     *   - mintAuthority: Authority allowed to mint tokens
     *   - freezeAuthority: Authority allowed to freeze accounts (optional)
     *   - autoEnable?: Whether to auto-enable confidential transfers
     * @returns Instructions, signers and mint address
     */
    static createInstructions(connection: Connection, payer: PublicKey, options: {
        decimals: number;
        mintAuthority: PublicKey;
        freezeAuthority?: PublicKey | null;
    }): Promise<{
        instructions: TransactionInstruction[];
        signers: Keypair[];
        mint: PublicKey;
    }>;
    /**
     * Create instructions to configure an account for confidential transfers
     *
     * @param owner - Public key of the token account owner
     * @param tokenAccount - Public key of the token account to configure (optional)
     * @returns Transaction instruction
     */
    createConfigureAccountInstruction(owner: PublicKey, tokenAccount?: PublicKey): Promise<TransactionInstruction>;
    /**
     * Create instruction for a confidential transfer
     *
     * @param source - Public key of the source account
     * @param destination - Public key of the destination account
     * @param owner - Public key of the source account owner
     * @param amount - Amount to transfer
     * @returns Transaction instruction
     */
    createConfidentialTransferInstruction(source: PublicKey, destination: PublicKey, owner: PublicKey, amount: bigint): TransactionInstruction;
    /**
     * Check if an account is configured for confidential transfers
     *
     * @param tokenAccount - Public key of the token account to check
     * @returns Boolean indicating if the account is configured for confidential transfers
     */
    isConfiguredForConfidentialTransfers(tokenAccount: PublicKey): Promise<boolean>;
}
