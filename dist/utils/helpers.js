"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.basisPointsToPercentage = basisPointsToPercentage;
exports.percentageToBasisPoints = percentageToBasisPoints;
exports.calculateFeeAmount = calculateFeeAmount;
exports.getTokenAccountAddress = getTokenAccountAddress;
exports.addInstruction = addInstruction;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
function basisPointsToPercentage(basisPoints) {
    return basisPoints / constants_1.BASIS_POINTS_DIVISOR;
}
function percentageToBasisPoints(percentage) {
    return Math.round(percentage * constants_1.BASIS_POINTS_DIVISOR);
}
function calculateFeeAmount(amount, feeBasisPoints) {
    return Math.floor((amount * feeBasisPoints) / constants_1.BASIS_POINTS_DIVISOR);
}
async function getTokenAccountAddress(connection, mint, owner) {
    const [address] = await web3_js_1.PublicKey.findProgramAddress([owner.toBuffer(), mint.toBuffer()], new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'));
    return address;
}
function addInstruction(transaction, instruction) {
    transaction.add(instruction);
    return transaction;
}
