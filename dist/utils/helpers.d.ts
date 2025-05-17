import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
export declare function basisPointsToPercentage(basisPoints: number): number;
export declare function percentageToBasisPoints(percentage: number): number;
export declare function calculateFeeAmount(amount: number, feeBasisPoints: number): number;
export declare function getTokenAccountAddress(connection: Connection, mint: PublicKey, owner: PublicKey): Promise<PublicKey>;
export declare function addInstruction(transaction: Transaction, instruction: TransactionInstruction): Transaction;
