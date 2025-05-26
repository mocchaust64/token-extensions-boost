import { PublicKey } from '@solana/web3.js';
import { AccountState, ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeDefaultAccountStateInstruction } from '@solana/spl-token';

/**
 * Class cho việc thiết lập trạng thái mặc định cho tài khoản token
 */
export class DefaultAccountStateExtension {
  /**
   * Tạo instruction để khởi tạo trạng thái mặc định cho mint
   * @param mint - Địa chỉ mint
   * @param accountState - Trạng thái mặc định (frozen hoặc initialized)
   * @param programId - Program ID của Token Extension
   * @returns Instruction để khởi tạo trạng thái mặc định
   */
  static createInitializeDefaultAccountStateInstruction(
    mint: PublicKey,
    accountState: AccountState,
    programId = TOKEN_2022_PROGRAM_ID
  ) {
    return createInitializeDefaultAccountStateInstruction(
      mint,
      accountState,
      programId
    );
  }
} 