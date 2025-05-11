import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { BASIS_POINTS_DIVISOR } from './constants';

/**
 * Convert basis points to percentage
 */
export function basisPointsToPercentage(basisPoints: number): number {
  return basisPoints / BASIS_POINTS_DIVISOR;
}

/**
 * Convert percentage to basis points
 */
export function percentageToBasisPoints(percentage: number): number {
  return Math.round(percentage * BASIS_POINTS_DIVISOR);
}

/**
 * Calculate fee amount from basis points
 */
export function calculateFeeAmount(amount: number, feeBasisPoints: number): number {
  return Math.floor((amount * feeBasisPoints) / BASIS_POINTS_DIVISOR);
}

/**
 * Get token account address
 */
export async function getTokenAccountAddress(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const [address] = await PublicKey.findProgramAddress(
    [owner.toBuffer(), mint.toBuffer()],
    new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
  );
  return address;
}

/**
 * Add instruction to transaction
 */
export function addInstruction(
  transaction: Transaction,
  instruction: TransactionInstruction
): Transaction {
  transaction.add(instruction);
  return transaction;
} 