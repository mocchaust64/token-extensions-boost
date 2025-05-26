import { Connection, PublicKey, Signer, Commitment, ConfirmOptions } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount as getOrCreateAssociatedTokenAccountBase, Account } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

/**
 * Get or create associated token account for owner and mint
 * 
 * @param connection Connection to use
 * @param payer Transaction and initialization fee payer
 * @param mint Mint associated with the account to establish or verify
 * @param owner Owner of the account to establish or verify
 * @param allowOwnerOffCurve Allow the owner account to be a PDA (Program Derived Address)
 * @param commitment Desired commitment level for the query state
 * @param confirmOptions Transaction confirmation options
 * @param programId SPL Token program account
 * @param associatedTokenProgramId SPL Associated Token program account
 * 
 * @return Address of the new associated token account
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