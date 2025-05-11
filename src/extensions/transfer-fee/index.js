"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferFeeToken = void 0;
var web3_js_1 = require("@solana/web3.js");
var spl_token_1 = require("@solana/spl-token");
var token_1 = require("../../core/token");
var TransferFeeToken = /** @class */ (function (_super) {
    __extends(TransferFeeToken, _super);
    function TransferFeeToken(connection, mint, config) {
        var _this = _super.call(this, connection, mint) || this;
        _this.config = config;
        return _this;
    }
    TransferFeeToken.create = function (connection, payer, params) {
        return __awaiter(this, void 0, void 0, function () {
            var mintKeypair, mintLen, lamports, transaction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mintKeypair = web3_js_1.Keypair.generate();
                        mintLen = (0, spl_token_1.getMintLen)([spl_token_1.ExtensionType.TransferFeeConfig]);
                        return [4 /*yield*/, connection.getMinimumBalanceForRentExemption(mintLen)];
                    case 1:
                        lamports = _a.sent();
                        transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.createAccount({
                            fromPubkey: payer.publicKey,
                            newAccountPubkey: mintKeypair.publicKey,
                            space: mintLen,
                            lamports: lamports,
                            programId: spl_token_1.TOKEN_2022_PROGRAM_ID,
                        }), (0, spl_token_1.createInitializeTransferFeeConfigInstruction)(mintKeypair.publicKey, params.transferFeeConfig.transferFeeConfigAuthority.publicKey, params.transferFeeConfig.withdrawWithheldAuthority.publicKey, params.transferFeeConfig.feeBasisPoints, params.transferFeeConfig.maxFee, spl_token_1.TOKEN_2022_PROGRAM_ID), (0, spl_token_1.createInitializeMintInstruction)(mintKeypair.publicKey, params.decimals, params.mintAuthority, null, spl_token_1.TOKEN_2022_PROGRAM_ID));
                        return [4 /*yield*/, (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [
                                payer,
                                mintKeypair,
                            ])];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, new TransferFeeToken(connection, mintKeypair.publicKey, {
                                feeBasisPoints: params.transferFeeConfig.feeBasisPoints,
                                maxFee: params.transferFeeConfig.maxFee,
                                transferFeeConfigAuthority: params.transferFeeConfig.transferFeeConfigAuthority,
                                withdrawWithheldAuthority: params.transferFeeConfig.withdrawWithheldAuthority,
                            })];
                }
            });
        });
    };
    TransferFeeToken.prototype.calculateFee = function (amount) {
        var fee = (amount * BigInt(this.config.feeBasisPoints)) / BigInt(10000);
        return fee > this.config.maxFee ? this.config.maxFee : fee;
    };
    TransferFeeToken.prototype.transfer = function (source, destination, owner, amount, decimals) {
        return __awaiter(this, void 0, void 0, function () {
            var fee;
            return __generator(this, function (_a) {
                fee = this.calculateFee(amount);
                return [2 /*return*/, this.transferWithFee(source, destination, owner, amount, decimals, Number(fee))];
            });
        });
    };
    TransferFeeToken.prototype.transferWithFee = function (source, destination, owner, amount, decimals, fee) {
        return __awaiter(this, void 0, void 0, function () {
            var transaction;
            return __generator(this, function (_a) {
                transaction = new web3_js_1.Transaction().add((0, spl_token_1.createTransferCheckedWithFeeInstruction)(source, this.mint, destination, owner.publicKey, amount, decimals, BigInt(fee), [], spl_token_1.TOKEN_2022_PROGRAM_ID));
                return [2 /*return*/, (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [owner])];
            });
        });
    };
    TransferFeeToken.prototype.harvestWithheldTokensToMint = function (accounts) {
        return __awaiter(this, void 0, void 0, function () {
            var transaction;
            return __generator(this, function (_a) {
                transaction = new web3_js_1.Transaction().add((0, spl_token_1.createHarvestWithheldTokensToMintInstruction)(this.mint, accounts, spl_token_1.TOKEN_2022_PROGRAM_ID));
                return [2 /*return*/, (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.config.withdrawWithheldAuthority])];
            });
        });
    };
    TransferFeeToken.prototype.withdrawFeesFromAccounts = function (accounts, destination) {
        return __awaiter(this, void 0, void 0, function () {
            var transaction;
            return __generator(this, function (_a) {
                transaction = new web3_js_1.Transaction().add((0, spl_token_1.createWithdrawWithheldTokensFromAccountsInstruction)(this.mint, destination, this.config.withdrawWithheldAuthority.publicKey, [], accounts, spl_token_1.TOKEN_2022_PROGRAM_ID));
                return [2 /*return*/, (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.config.withdrawWithheldAuthority])];
            });
        });
    };
    TransferFeeToken.prototype.withdrawFeesFromMint = function (destination) {
        return __awaiter(this, void 0, void 0, function () {
            var transaction;
            return __generator(this, function (_a) {
                transaction = new web3_js_1.Transaction().add((0, spl_token_1.createWithdrawWithheldTokensFromMintInstruction)(this.mint, destination, this.config.withdrawWithheldAuthority.publicKey, [], spl_token_1.TOKEN_2022_PROGRAM_ID));
                return [2 /*return*/, (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [this.config.withdrawWithheldAuthority])];
            });
        });
    };
    TransferFeeToken.prototype.createAccountAndMintTo = function (owner, payer, amount, mintAuthority) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenAccount, transaction, error_1, mintInstruction;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, spl_token_1.getAssociatedTokenAddress)(this.mint, owner, false, spl_token_1.TOKEN_2022_PROGRAM_ID)];
                    case 1:
                        tokenAccount = _a.sent();
                        transaction = new web3_js_1.Transaction();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, spl_token_1.getAccount)(this.connection, tokenAccount, "recent", spl_token_1.TOKEN_2022_PROGRAM_ID)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(payer.publicKey, tokenAccount, owner, this.mint, spl_token_1.TOKEN_2022_PROGRAM_ID));
                        return [3 /*break*/, 5];
                    case 5:
                        mintInstruction = (0, spl_token_1.createMintToInstruction)(this.mint, tokenAccount, mintAuthority.publicKey, amount, [], spl_token_1.TOKEN_2022_PROGRAM_ID);
                        transaction.add(mintInstruction);
                        return [4 /*yield*/, (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payer, mintAuthority])];
                    case 6:
                        _a.sent();
                        return [2 /*return*/, tokenAccount];
                }
            });
        });
    };
    TransferFeeToken.prototype.findAccountsWithWithheldFees = function () {
        return __awaiter(this, void 0, void 0, function () {
            var accounts, accountsWithFees, _i, accounts_1, pubkey, tokenAccount, feeAmount, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.connection.getProgramAccounts(spl_token_1.TOKEN_2022_PROGRAM_ID, {
                            commitment: "confirmed",
                            filters: [
                                {
                                    memcmp: {
                                        offset: 0,
                                        bytes: this.mint.toString(),
                                    },
                                },
                            ],
                        })];
                    case 1:
                        accounts = _a.sent();
                        accountsWithFees = [];
                        _i = 0, accounts_1 = accounts;
                        _a.label = 2;
                    case 2:
                        if (!(_i < accounts_1.length)) return [3 /*break*/, 7];
                        pubkey = accounts_1[_i].pubkey;
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, (0, spl_token_1.getAccount)(this.connection, pubkey, "confirmed", spl_token_1.TOKEN_2022_PROGRAM_ID)];
                    case 4:
                        tokenAccount = _a.sent();
                        feeAmount = (0, spl_token_1.getTransferFeeAmount)(tokenAccount);
                        if (feeAmount !== null && feeAmount.withheldAmount > 0) {
                            accountsWithFees.push(pubkey);
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, accountsWithFees];
                }
            });
        });
    };
    return TransferFeeToken;
}(token_1.Token));
exports.TransferFeeToken = TransferFeeToken;
