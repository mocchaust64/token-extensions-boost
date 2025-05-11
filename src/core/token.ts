import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export class Token {
  protected connection: Connection;
  protected mint: PublicKey;

  constructor(connection: Connection, mint: PublicKey) {
    this.connection = connection;
    this.mint = mint;
  }

  getMint(): PublicKey {
    return this.mint;
  }

  getConnection(): Connection {
    return this.connection;
  }

  getProgramId(): PublicKey {
    return TOKEN_2022_PROGRAM_ID;
  }
} 