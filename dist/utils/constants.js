"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMO_PROGRAM_ID = exports.TOKEN_GROUP_PROGRAM_ID = exports.MAX_INTEREST_RATE = exports.MAX_FEE_BASIS_POINTS = exports.BASIS_POINTS_DIVISOR = exports.METADATA_PROGRAM_ID = exports.INTEREST_BEARING_PROGRAM_ID = exports.TRANSFER_HOOK_PROGRAM_ID = exports.TRANSFER_FEE_PROGRAM_ID = exports.CONFIDENTIAL_TRANSFER_PROGRAM_ID = exports.TOKEN_2022_PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
exports.TOKEN_2022_PROGRAM_ID = new web3_js_1.PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
exports.CONFIDENTIAL_TRANSFER_PROGRAM_ID = new web3_js_1.PublicKey('8ZykFvMJkEeXmzpNxtVKvBepSWjKJof87gPPpPjXJBPs');
exports.TRANSFER_FEE_PROGRAM_ID = new web3_js_1.PublicKey('AfzietZSP2Q6PpMQNHUeP8kzKRHn2xrJWvYQtAdXJZSD');
exports.TRANSFER_HOOK_PROGRAM_ID = new web3_js_1.PublicKey('BouneFUXXmYBMjkgiE6SgJEZGMnFVr33gWXQTm6YXvd1');
exports.INTEREST_BEARING_PROGRAM_ID = new web3_js_1.PublicKey('FcPCaoxWigqP9DhvZzqe17fMDxD85XUyPxMxkySXCb9h');
exports.METADATA_PROGRAM_ID = new web3_js_1.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
exports.BASIS_POINTS_DIVISOR = 10000;
exports.MAX_FEE_BASIS_POINTS = 10000;
exports.MAX_INTEREST_RATE = 10000;
// Các constant cho token groups
exports.TOKEN_GROUP_PROGRAM_ID = new web3_js_1.PublicKey('GvKz32Paa9aWjMTGfEv5VxvEFxzjdnzP9Hm32Y9hhQAB');
// Các constant cho memo
exports.MEMO_PROGRAM_ID = new web3_js_1.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
