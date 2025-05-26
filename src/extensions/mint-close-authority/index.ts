import { PublicKey } from '@solana/web3.js';
import { ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeMintCloseAuthorityInstruction } from '@solana/spl-token';

/**
 * Class cho việc thiết lập quyền đóng mint account
 */
export class MintCloseAuthorityExtension {
  /**
   * Tạo instruction để khởi tạo mint close authority
   * @param mint - Địa chỉ mint
   * @param closeAuthority - Địa chỉ có quyền đóng mint
   * @param programId - Program ID của Token Extension
   * @returns Instruction để thiết lập close authority
   */
  static createInitializeMintCloseAuthorityInstruction(
    mint: PublicKey,
    closeAuthority: PublicKey,
    programId = TOKEN_2022_PROGRAM_ID
  ) {
    return createInitializeMintCloseAuthorityInstruction(
      mint,
      closeAuthority,
      programId
    );
  }
} 