import { Connection, Keypair, PublicKey, Signer } from "@solana/web3.js";
import { Token } from "../../core/token";
import { TransferFeeConfig } from "../../types";
export declare class TransferFeeToken extends Token {
    private config;
    constructor(connection: Connection, mint: PublicKey, config: TransferFeeConfig);
    static create(connection: Connection, payer: Keypair, params: {
        decimals: number;
        mintAuthority: PublicKey;
        transferFeeConfig: {
            feeBasisPoints: number;
            maxFee: bigint;
            transferFeeConfigAuthority: Keypair;
            withdrawWithheldAuthority: Keypair;
        };
    }): Promise<TransferFeeToken>;
    calculateFee(amount: bigint): bigint;
    transfer(source: PublicKey, destination: PublicKey, owner: Signer, amount: bigint, decimals: number): Promise<string>;
    transferWithFee(source: PublicKey, destination: PublicKey, owner: Signer, amount: bigint, decimals: number, fee: number): Promise<string>;
    harvestWithheldTokensToMint(accounts: PublicKey[]): Promise<string>;
    withdrawFeesFromAccounts(accounts: PublicKey[], destination: PublicKey): Promise<string>;
    withdrawFeesFromMint(destination: PublicKey): Promise<string>;
    createAccountAndMintTo(owner: PublicKey, payer: Keypair, amount: bigint, mintAuthority: Keypair): Promise<PublicKey>;
    findAccountsWithWithheldFees(): Promise<PublicKey[]>;
}
