import { PublicKey } from '@solana/web3.js';
import { ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeInterestBearingMintInstruction } from '@solana/spl-token';

/**
 * Class cho tính năng Interest-Bearing (hưởng lãi) cho token
 */
export class InterestBearingExtension {
  /**
   * Tạo instruction để khởi tạo Interest-Bearing cho mint
   * @param mint - Địa chỉ mint
   * @param rateAuthority - Địa chỉ có quyền thay đổi lãi suất
   * @param rate - Lãi suất (basis points, 10000 = 100%)
   * @param programId - Program ID của Token Extension
   * @returns Instruction để khởi tạo Interest-Bearing
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
   * Tạo instruction để cập nhật lãi suất
   * @param mint - Địa chỉ mint
   * @param rateAuthority - Địa chỉ có quyền thay đổi lãi suất
   * @param rate - Lãi suất mới (basis points, 10000 = 100%)
   * @param programId - Program ID của Token Extension
   * @returns Instruction để cập nhật lãi suất
   */
  static createUpdateRateInterestBearingMintInstruction(
    mint: PublicKey,
    rateAuthority: PublicKey,
    rate: number,
    programId = TOKEN_2022_PROGRAM_ID
  ) {
    // Trong thực tế, bạn sẽ gọi hàm từ @solana/spl-token
    // Đây là phiên bản giả lập cho mục đích demo
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
   * Tính toán số lượng token hiện tại bao gồm lãi
   * @param initialAmount - Số lượng ban đầu
   * @param rate - Lãi suất (basis points, 10000 = 100%)
   * @param timeInSeconds - Thời gian đã trôi qua (giây)
   * @returns Số lượng token hiện tại bao gồm lãi
   */
  static calculateInterest(
    initialAmount: bigint,
    rate: number,
    timeInSeconds: number
  ): bigint {
    // Công thức tính lãi:
    // amount * (1 + rate/10000) ^ (timeInSeconds / secondsInYear)
    const secondsInYear = 31536000; // 365 * 24 * 60 * 60
    
    // Chuyển đổi rate từ basis points sang dạng thập phân
    const rateDecimal = rate / 10000;
    
    // Tính số năm
    const years = timeInSeconds / secondsInYear;
    
    // Tính hệ số lãi
    const interestFactor = Math.pow(1 + rateDecimal, years);
    
    // Tính số lượng token hiện tại
    return BigInt(Math.floor(Number(initialAmount) * interestFactor));
  }
} 