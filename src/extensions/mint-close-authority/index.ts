import { PublicKey } from '@solana/web3.js';
import { ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeMintCloseAuthorityInstruction, createCloseAccountInstruction } from '@solana/spl-token';

/**
 * Class for setting up mint close authority
 */
export class MintCloseAuthorityExtension {
  /**
   * Create instruction to initialize mint close authority
   * @param mint - Mint address
   * @param closeAuthority - Address with authority to close the mint
   * @param programId - Token Extension Program ID
   * @returns Instruction to set close authority
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
   * Create instruction to close mint account
   * @param mint - Mint address to close
   * @param destination - Address to receive lamports
   * @param authority - Address with authority to close mint (mint close authority)
   * @param multiSigners - List of signers if authority is multisig (default empty array)
   * @param programId - Token Extension Program ID
   * @returns Instruction to close mint account
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