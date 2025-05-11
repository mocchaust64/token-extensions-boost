"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_INTEREST_RATE = exports.MAX_FEE_BASIS_POINTS = exports.BASIS_POINTS_DIVISOR = exports.METADATA_PROGRAM_ID = exports.INTEREST_BEARING_PROGRAM_ID = exports.TRANSFER_HOOK_PROGRAM_ID = exports.TRANSFER_FEE_PROGRAM_ID = exports.CONFIDENTIAL_TRANSFER_PROGRAM_ID = exports.TOKEN_2022_PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
// Token Program IDs
exports.TOKEN_2022_PROGRAM_ID = new web3_js_1.PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
// Extension Program IDs
exports.CONFIDENTIAL_TRANSFER_PROGRAM_ID = new web3_js_1.PublicKey('confidential_transfer_program_id');
exports.TRANSFER_FEE_PROGRAM_ID = new web3_js_1.PublicKey('transfer_fee_program_id');
exports.TRANSFER_HOOK_PROGRAM_ID = new web3_js_1.PublicKey('transfer_hook_program_id');
exports.INTEREST_BEARING_PROGRAM_ID = new web3_js_1.PublicKey('interest_bearing_program_id');
exports.METADATA_PROGRAM_ID = new web3_js_1.PublicKey('metadata_program_id');
// Constants
exports.BASIS_POINTS_DIVISOR = 10000;
exports.MAX_FEE_BASIS_POINTS = 10000; // 100%
exports.MAX_INTEREST_RATE = 10000; // 100% 
