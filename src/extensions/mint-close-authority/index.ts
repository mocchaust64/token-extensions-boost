import { PublicKey } from '@solana/web3.js';
import { ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeMintCloseAuthorityInstruction, createCloseAccountInstruction } from '@solana/spl-token';

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

  /**
   * Tạo instruction để đóng mint account
   * @param mint - Địa chỉ mint cần đóng
   * @param destination - Địa chỉ nhận lamports
   * @param authority - Địa chỉ có quyền đóng mint (mint close authority)
   * @param multiSigners - Danh sách các signer nếu authority là multisig (mặc định là mảng rỗng)
   * @param programId - Program ID của Token Extension
   * @returns Instruction để đóng mint account
   */
  static createCloseAccountInstruction(
    mint: PublicKey,
    destination: PublicKey,
    authority: PublicKey,
    multiSigners = [],
    programId = TOKEN_2022_PROGRAM_ID
  ) {
    return createCloseAccountInstruction(
      mint,
      destination,
      authority,
      multiSigners,
      programId
    );
  }
} 