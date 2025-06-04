import { PublicKey } from '@solana/web3.js';
import { ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeInterestBearingMintInstruction } from '@solana/spl-token';

/**
 * Class for Interest-Bearing token functionality
 */
export class InterestBearingExtension {
  /**
   * Create instruction to initialize Interest-Bearing for mint
   * @param mint - Mint address
   * @param rateAuthority - Authority address that can change interest rate
   * @param rate - Interest rate (basis points, 10000 = 100%)
   * @param programId - Token Extension Program ID
   * @returns Instruction to initialize Interest-Bearing
   */
  static createInitializeInterestBearingMintInstruction(
    mint: PublicKey,
    rateAuthority: PublicKey,
    rate: number,
    programId = TOKEN_2022_PROGRAM_ID
  ) {
    return createInitializeInterestBearingMintInstruction(
      mint,
      rateAuthority,
      rate,
      programId
    );
  }

  /**
   * Create instruction to update interest rate
   * @param mint - Mint address
   * @param rateAuthority - Authority address that can change interest rate
   * @param rate - New interest rate (basis points, 10000 = 100%)
   * @param programId - Token Extension Program ID
   * @returns Instruction to update interest rate
   */
  static createUpdateRateInterestBearingMintInstruction(
    mint: PublicKey,
    rateAuthority: PublicKey,
    rate: number,
    programId = TOKEN_2022_PROGRAM_ID
  ) {
    // In practice, you would call a function from @solana/spl-token
    // This is a simulated version for demo purposes
    return {
      programId,
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: rateAuthority, isSigner: true, isWritable: false },
      ],
      data: Buffer.from([0x20, ...new Uint8Array(new Uint16Array([rate]).buffer)]), // Mock data
    };
  }

  /**
   * Calculate current token amount including interest
   * @param initialAmount - Initial amount
   * @param rate - Interest rate (basis points, 10000 = 100%)
   * @param timeInSeconds - Elapsed time (seconds)
   * @returns Current token amount including interest
   */
  static calculateInterest(
    initialAmount: bigint,
    rate: number,
    timeInSeconds: number
  ): bigint {
    // Interest calculation formula:
    // amount * (1 + rate/10000) ^ (timeInSeconds / secondsInYear)
    const secondsInYear = 31536000; // 365 * 24 * 60 * 60
    
    // Convert rate from basis points to decimal
    const rateDecimal = rate / 10000;
    
    // Calculate years
    const years = timeInSeconds / secondsInYear;
    
    // Calculate interest factor
    const interestFactor = Math.pow(1 + rateDecimal, years);
    
    // Calculate current token amount
    return BigInt(Math.floor(Number(initialAmount) * interestFactor));
  }
} 