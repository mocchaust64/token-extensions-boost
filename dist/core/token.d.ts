import { Connection, PublicKey } from "@solana/web3.js";
export declare class Token {
    protected connection: Connection;
    protected mint: PublicKey;
    constructor(connection: Connection, mint: PublicKey);
    getMint(): PublicKey;
    getConnection(): Connection;
    getProgramId(): PublicKey;
}
