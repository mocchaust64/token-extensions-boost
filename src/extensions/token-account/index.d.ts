import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AccountState } from "@solana/spl-token";
export declare class TokenAccount {
    connection: Connection;
    mint: PublicKey;
    owner: PublicKey;
    constructor(connection: Connection, mint: PublicKey, owner: PublicKey);
    /**
     *
     *
     * @param payer
     * @returns
     */
    createAccount(payer: Keypair): Promise<{
        tokenAccount: PublicKey;
        tokenAccountKeypair: Keypair;
        signature: string;
    }>;
    /**
     *
     *
     * @param payer
     * @returns
     */
    createAccountWithImmutableOwner(payer: Keypair): Promise<{
        tokenAccount: PublicKey;
        tokenAccountKeypair: Keypair;
        signature: string;
    }>;
    /**
     *
     *
     * @param payer
     * @returns
     */
    createAssociatedTokenAccount(payer: Keypair): Promise<{
        tokenAccount: PublicKey;
        signature: string;
    }>;
    /**
     *
     *
     * @param payer
     * @returns
     */
    createAccountWithImmutableOwnerAlt(payer: Keypair): Promise<{
        tokenAccount: PublicKey;
        signature: string;
    }>;
    /**
     *
     *
     * @param payer
     * @param state
     * @returns
     */
    createAccountWithDefaultState(payer: Keypair, state: AccountState): Promise<{
        tokenAccount: PublicKey;
        tokenAccountKeypair: Keypair;
        signature: string;
    }>;
}
