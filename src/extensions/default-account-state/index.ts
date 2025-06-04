import { PublicKey } from '@solana/web3.js';
import { AccountState, ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeDefaultAccountStateInstruction } from '@solana/spl-token';

/**
 * Class for setting default state for token accounts
 */
export class DefaultAccountStateExtension {
  /**
   * Create instruction to initialize default account state for mint
   * @param mint - Mint address
   * @param accountState - Default state (frozen or initialized)
   * @param programId - Token Extension Program ID
   * @returns Instruction to initialize default account state
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