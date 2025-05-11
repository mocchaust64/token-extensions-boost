"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.basisPointsToPercentage = basisPointsToPercentage;
exports.percentageToBasisPoints = percentageToBasisPoints;
exports.calculateFeeAmount = calculateFeeAmount;
exports.getTokenAccountAddress = getTokenAccountAddress;
exports.addInstruction = addInstruction;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
/**
 * Convert basis points to percentage
 */
function basisPointsToPercentage(basisPoints) {
    return basisPoints / constants_1.BASIS_POINTS_DIVISOR;
}
/**
 * Convert percentage to basis points
 */
function percentageToBasisPoints(percentage) {
    return Math.round(percentage * constants_1.BASIS_POINTS_DIVISOR);
}
/**
 * Calculate fee amount from basis points
 */
function calculateFeeAmount(amount, feeBasisPoints) {
    return Math.floor((amount * feeBasisPoints) / constants_1.BASIS_POINTS_DIVISOR);
}
/**
 * Get token account address
 */
async function getTokenAccountAddress(connection, mint, owner) {
    const [address] = await web3_js_1.PublicKey.findProgramAddress([owner.toBuffer(), mint.toBuffer()], new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'));
    return address;
}
/**
 * Add instruction to transaction
 */
function addInstruction(transaction, instruction) {
    transaction.add(instruction);
    return transaction;
}
