"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Token = void 0;
const spl_token_1 = require("@solana/spl-token");
class Token {
    constructor(connection, mint) {
        this.connection = connection;
        this.mint = mint;
    }
    getMint() {
        return this.mint;
    }
    getConnection() {
        return this.connection;
    }
    getProgramId() {
        return spl_token_1.TOKEN_2022_PROGRAM_ID;
    }
}
exports.Token = Token;
