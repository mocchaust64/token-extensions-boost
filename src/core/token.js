"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Token = void 0;
var spl_token_1 = require("@solana/spl-token");
var Token = /** @class */ (function () {
    function Token(connection, mint) {
        this.connection = connection;
        this.mint = mint;
    }
    Token.prototype.getMint = function () {
        return this.mint;
    };
    Token.prototype.getConnection = function () {
        return this.connection;
    };
    Token.prototype.getProgramId = function () {
        return spl_token_1.TOKEN_2022_PROGRAM_ID;
    };
    return Token;
}());
exports.Token = Token;
