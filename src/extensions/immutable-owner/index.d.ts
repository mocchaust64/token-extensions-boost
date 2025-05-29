import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Token } from "../../core/token";
/**
 * ImmutableOwnerToken - Extension for TokenAccount with immutable owner functionality
 *
 * This extension ensures that the owner of a token account cannot be changed after initialization,
 * enhancing security and reducing the risk of attacks.
 */
export declare class ImmutableOwnerToken extends Token {
    /**
     * Create a new ImmutableOwnerToken instance
     *
     * @param connection - Connection to Solana cluster
     * @param mintAddress - Public key of the token mint
     */
    constructor(connection: Connection, mintAddress: PublicKey);
    /**
     * Create a token account with immutable owner
     *
     * @param payer - Transaction fee payer keypair
     * @param owner - Public key of the account owner (cannot be changed)
     * @param tokenAccountKeypair - Keypair of the token account to be created
     * @returns Transaction signature
     */
    createTokenAccountWithImmutableOwner(payer: Keypair, owner: PublicKey, tokenAccountKeypair: Keypair): Promise<string>;
    /**
     * Create associated token account with immutable owner
     *
     * @param payer - Transaction fee payer keypair
     * @param owner - Public key of the account owner (cannot be changed)
     * @returns Object containing transaction signature and token account address
     */
    createAssociatedTokenAccountWithImmutableOwner(payer: Keypair, owner: PublicKey): Promise<{
        signature: string;
        tokenAccount: PublicKey;
    }>;
    /**
     * Check if an account has immutable owner
     *
     * @param tokenAccount - Public key of the token account to check
     * @returns true if the account has immutable owner, false if not
     */
    hasImmutableOwner(tokenAccount: PublicKey): Promise<boolean>;
    /**
     * Create a token account with immutable owner, or return existing one if already exists
     *
     * @param payer - Transaction fee payer
     * @param owner - Owner of the token account
     * @returns Object containing the account address and transaction signature
     */
    createOrGetImmutableAccount(payer: Keypair, owner: PublicKey): Promise<{
        address: PublicKey;
        signature: string;
    }>;
}
