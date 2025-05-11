"use strict";
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
var web3_js_1 = require("@solana/web3.js");
var transfer_fee_1 = require("../src/extensions/transfer-fee");
var fs = require("fs");
var path = require("path");
var spl_token_1 = require("@solana/spl-token");
/**
 * Ví dụ sử dụng Transfer Fee SDK
 *
 * Script này thực hiện các bước:
 * 1. Tạo token mới với phí chuyển khoản 1%
 * 2. Mint token cho người tạo
 * 3. Chuyển token cho người nhận với phí tự động được tính
 * 4. Thu thập phí từ tài khoản đích vào mint
 * 5. Rút phí từ mint vào ví của chủ sở hữu
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var connection, payer, walletPath, secretKeyString, secretKey, balance, mintAuthority, transferFeeConfigAuthority, withdrawWithheldAuthority, token, mintAddress, mintAmount, ownerTokenAccount, recipient, recipientTokenAccount, transferAmount, expectedFee, transferSignature, harvestSignature, feeRecipientTokenAccount, withdrawSignature;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    connection = new web3_js_1.Connection("https://api.devnet.solana.com", "confirmed");
                    walletPath = path.join(process.env.HOME, ".config", "solana", "id.json");
                    try {
                        secretKeyString = fs.readFileSync(walletPath, { encoding: "utf8" });
                        secretKey = Uint8Array.from(JSON.parse(secretKeyString));
                        payer = web3_js_1.Keypair.fromSecretKey(secretKey);
                        console.log("Using wallet: ".concat(payer.publicKey.toString()));
                    }
                    catch (error) {
                        console.log("Không tìm thấy ví, tạo ví mới...");
                        payer = web3_js_1.Keypair.generate();
                        console.log("\u0110\u00E3 t\u1EA1o v\u00ED m\u1EDBi: ".concat(payer.publicKey.toString()));
                    }
                    return [4 /*yield*/, connection.getBalance(payer.publicKey)];
                case 1:
                    balance = _a.sent();
                    console.log("S\u1ED1 d\u01B0: ".concat(balance / 1e9, " SOL"));
                    if (balance < 1e9) {
                        console.log("Cần ít nhất 1 SOL để thực hiện ví dụ này");
                        console.log("Sử dụng lệnh: solana airdrop 1 <địa chỉ ví> --url devnet");
                        return [2 /*return*/];
                    }
                    mintAuthority = web3_js_1.Keypair.generate();
                    transferFeeConfigAuthority = web3_js_1.Keypair.generate();
                    withdrawWithheldAuthority = web3_js_1.Keypair.generate();
                    console.log("\n1. Tạo token với phí chuyển khoản 1%");
                    return [4 /*yield*/, transfer_fee_1.TransferFeeToken.create(connection, payer, {
                            decimals: 9, // 9 số thập phân như SOL
                            mintAuthority: payer.publicKey, // Người tạo là chủ sở hữu mint
                            transferFeeConfig: {
                                feeBasisPoints: 100, // 1% phí chuyển khoản
                                maxFee: BigInt(10000000000), // Phí tối đa 10 token
                                transferFeeConfigAuthority: transferFeeConfigAuthority, // Authority để cấu hình phí
                                withdrawWithheldAuthority: withdrawWithheldAuthority,
                            },
                        })];
                case 2:
                    token = _a.sent();
                    mintAddress = token.getMint();
                    console.log("Token \u0111\u00E3 \u0111\u01B0\u1EE3c t\u1EA1o: ".concat(mintAddress.toString()));
                    console.log("\n2. Mint token cho người tạo");
                    mintAmount = BigInt(1000000000000);
                    return [4 /*yield*/, token.createAccountAndMintTo(payer.publicKey, // Chủ sở hữu tài khoản
                        payer, // Người trả phí giao dịch
                        mintAmount, // Số lượng token
                        payer // Người có quyền mint
                        )];
                case 3:
                    ownerTokenAccount = _a.sent();
                    console.log("\u0110\u00E3 mint ".concat(Number(mintAmount) / 1e9, " token v\u00E0o t\u00E0i kho\u1EA3n ").concat(ownerTokenAccount.toString()));
                    recipient = web3_js_1.Keypair.generate();
                    console.log("\nNg\u01B0\u1EDDi nh\u1EADn: ".concat(recipient.publicKey.toString()));
                    return [4 /*yield*/, (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, payer, mintAddress, recipient.publicKey, false, "confirmed", { skipPreflight: true }, token.getProgramId())];
                case 4:
                    recipientTokenAccount = _a.sent();
                    console.log("T\u00E0i kho\u1EA3n token c\u1EE7a ng\u01B0\u1EDDi nh\u1EADn: ".concat(recipientTokenAccount.address.toString()));
                    console.log("\n3. Chuyển token cho người nhận với phí 1%");
                    transferAmount = BigInt(100000000000);
                    expectedFee = token.calculateFee(transferAmount);
                    console.log("Ph\u00ED d\u1EF1 ki\u1EBFn: ".concat(Number(expectedFee) / 1e9, " token"));
                    return [4 /*yield*/, token.transfer(ownerTokenAccount, recipientTokenAccount.address, payer, transferAmount, 9 // số thập phân
                        )];
                case 5:
                    transferSignature = _a.sent();
                    console.log("\u0110\u00E3 chuy\u1EC3n ".concat(Number(transferAmount) / 1e9, " token"));
                    console.log("Transaction: https://explorer.solana.com/tx/".concat(transferSignature, "?cluster=devnet"));
                    console.log("\n4. Thu thập phí từ tài khoản đích về mint");
                    return [4 /*yield*/, token.harvestWithheldTokensToMint([recipientTokenAccount.address])];
                case 6:
                    harvestSignature = _a.sent();
                    console.log("\u0110\u00E3 thu th\u1EADp ph\u00ED v\u1EC1 mint");
                    console.log("Transaction: https://explorer.solana.com/tx/".concat(harvestSignature, "?cluster=devnet"));
                    console.log("\n5. Rút phí từ mint về wallet");
                    return [4 /*yield*/, (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, payer, mintAddress, withdrawWithheldAuthority.publicKey, false, "confirmed", { skipPreflight: true }, token.getProgramId())];
                case 7:
                    feeRecipientTokenAccount = _a.sent();
                    return [4 /*yield*/, token.withdrawFeesFromMint(feeRecipientTokenAccount.address)];
                case 8:
                    withdrawSignature = _a.sent();
                    console.log("\u0110\u00E3 r\u00FAt ph\u00ED v\u1EC1 v\u00ED ".concat(feeRecipientTokenAccount.address.toString()));
                    console.log("Transaction: https://explorer.solana.com/tx/".concat(withdrawSignature, "?cluster=devnet"));
                    console.log("\n===== TỔNG KẾT =====");
                    console.log("- Token Address: ".concat(mintAddress.toString()));
                    console.log("- Owner Token Account: ".concat(ownerTokenAccount.toString()));
                    console.log("- Recipient Token Account: ".concat(recipientTokenAccount.address.toString()));
                    console.log("- Fee Recipient Token Account: ".concat(feeRecipientTokenAccount.address.toString()));
                    console.log("Xem thông tin chi tiết trên Solana Explorer (devnet)");
                    return [2 /*return*/];
            }
        });
    });
}
// Chạy ví dụ
main()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error("Lỗi:", error);
    process.exit(1);
});
