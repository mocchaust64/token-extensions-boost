import { Connection, PublicKey, Signer, Commitment, ConfirmOptions } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount as getOrCreateAssociatedTokenAccountBase, Account } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

/**
 * Lấy hoặc tạo tài khoản token liên kết cho chủ sở hữu và mint
 * 
 * @param connection Connection để sử dụng
 * @param payer Người trả phí giao dịch và phí khởi tạo
 * @param mint Mint liên kết với tài khoản cần thiết lập hoặc xác minh
 * @param owner Chủ sở hữu của tài khoản cần thiết lập hoặc xác minh
 * @param allowOwnerOffCurve Cho phép tài khoản chủ sở hữu là PDA (Program Derived Address)
 * @param commitment Mức độ cam kết mong muốn để truy vấn trạng thái
 * @param confirmOptions Tùy chọn xác nhận giao dịch
 * @param programId Tài khoản chương trình SPL Token
 * @param associatedTokenProgramId Tài khoản chương trình SPL Associated Token
 * 
 * @return Địa chỉ của tài khoản token liên kết mới
 */
export async function getOrCreateTokenAccount(
  connection: Connection,
  payer: Signer,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  commitment?: Commitment,
  confirmOptions?: ConfirmOptions,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<Account> {
  return getOrCreateAssociatedTokenAccountBase(
    connection,
    payer,
    mint,
    owner,
    allowOwnerOffCurve,
    commitment,
    confirmOptions,
    programId,
    associatedTokenProgramId
  );
} 