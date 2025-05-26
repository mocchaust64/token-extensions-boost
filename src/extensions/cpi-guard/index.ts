import { PublicKey } from '@solana/web3.js';
import { ExtensionType, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

/**
 * Tạo instruction để khởi tạo CPI Guard cho mint
 * @param mint - Địa chỉ mint
 * @param authority - (Optional) Địa chỉ authority có thể bật/tắt CPI Guard
 * @param programId - Program ID của Token Extension
 * @returns Instruction để khởi tạo CPI Guard
 */
export function createInitializeCpiGuardInstruction(
  mint: PublicKey,
  authority: PublicKey | null = null,
  programId = TOKEN_2022_PROGRAM_ID
): any {
  const keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
  ];
  
  if (authority) {
    keys.push({ pubkey: authority, isSigner: false, isWritable: false });
  }
  
  return {
    programId,
    keys,
    data: Buffer.from([0x00]), // Mock data để khởi tạo CPI Guard
  };
}

/**
 * Class cho việc bảo vệ chống lại CPI attacks
 */
export class CpiGuardExtension {
  /**
   * Tạo instruction để khởi tạo CPI Guard cho mint
   * @param mint - Địa chỉ mint
   * @param authority - (Optional) Địa chỉ authority có thể bật/tắt CPI Guard
   * @param programId - Program ID của Token Extension
   * @returns Instruction để khởi tạo CPI Guard
   */
  static createInitializeCpiGuardInstruction(
    mint: PublicKey,
    authority: PublicKey | null = null,
    programId = TOKEN_2022_PROGRAM_ID
  ) {
    return createInitializeCpiGuardInstruction(
      mint,
      authority,
      programId
    );
  }

  /**
   * Tạo instruction để bật CPI Guard cho một mint
   * @param mint - Địa chỉ mint
   * @param authority - Địa chỉ authority có thể bật/tắt CPI Guard
   * @param programId - Program ID của Token Extension
   * @returns Instruction để bật CPI Guard
   */
  static createEnableCpiGuardInstruction(
    mint: PublicKey,
    authority: PublicKey,
    programId = TOKEN_2022_PROGRAM_ID
  ) {
    // Trong thực tế, bạn sẽ gọi hàm từ @solana/spl-token
    // Đây là phiên bản giả lập cho mục đích demo
    return {
      programId,
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false }
      ],
      data: Buffer.from([0x01]), // Mock data
    };
  }

  /**
   * Tạo instruction để tắt CPI Guard cho một mint
   * @param mint - Địa chỉ mint
   * @param authority - Địa chỉ authority có thể bật/tắt CPI Guard
   * @param programId - Program ID của Token Extension
   * @returns Instruction để tắt CPI Guard
   */
  static createDisableCpiGuardInstruction(
    mint: PublicKey,
    authority: PublicKey,
    programId = TOKEN_2022_PROGRAM_ID
  ) {
    // Trong thực tế, bạn sẽ gọi hàm từ @solana/spl-token
    // Đây là phiên bản giả lập cho mục đích demo
    return {
      programId,
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false }
      ],
      data: Buffer.from([0x02]), // Mock data
    };
  }
} 