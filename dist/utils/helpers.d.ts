import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
/**
 * Convert basis points to percentage
 */
export declare function basisPointsToPercentage(basisPoints: number): number;
/**
 * Convert percentage to basis points
 */
export declare function percentageToBasisPoints(percentage: number): number;
/**
 * Calculate fee amount from basis points
 */
export declare function calculateFeeAmount(amount: number, feeBasisPoints: number): number;
/**
 * Get token account address
 */
export declare function getTokenAccountAddress(connection: Connection, mint: PublicKey, owner: PublicKey): Promise<PublicKey>;
/**
 * Add instruction to transaction
 */
export declare function addInstruction(transaction: Transaction, instruction: TransactionInstruction): Transaction;
