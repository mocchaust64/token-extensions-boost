import { 
  Connection, 
  PublicKey, 
  Signer, 
  Transaction, 
  TransactionInstruction,
  ConfirmOptions
} from '@solana/web3.js';

import {
  AccountState,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createFreezeAccountInstruction,
  createThawAccountInstruction,
  createUpdateDefaultAccountStateInstruction
} from '@solana/spl-token';

/**
 * Class for managing token freeze and thaw functionality
 * Designed to be compatible with wallet adapter in web environments
 */
export class TokenFreezeExtension {
  /**
   * Create instruction to freeze a token account
   * @param account - Token account address
   * @param mint - Token mint address
   * @param authority - Freeze authority address
   * @param multiSigners - List of signers if using multisig
   * @param programId - Token Extension Program ID
   * @returns Instruction to freeze the account
   */
  static createFreezeAccountInstruction(
    account: PublicKey,
    mint: PublicKey,
    authority: PublicKey,
    multiSigners: (Signer | PublicKey)[] = [],
    programId = TOKEN_2022_PROGRAM_ID
  ): TransactionInstruction {
    return createFreezeAccountInstruction(
      account,
      mint,
      authority,
      multiSigners,
      programId
    );
  }

  /**
   * Create instruction to thaw a token account
   * @param account - Token account address
   * @param mint - Token mint address
   * @param authority - Freeze authority address
   * @param multiSigners - List of signers if using multisig
   * @param programId - Token Extension Program ID
   * @returns Instruction to thaw the account
   */
  static createThawAccountInstruction(
    account: PublicKey,
    mint: PublicKey,
    authority: PublicKey,
    multiSigners: (Signer | PublicKey)[] = [],
    programId = TOKEN_2022_PROGRAM_ID
  ): TransactionInstruction {
    return createThawAccountInstruction(
      account,
      mint,
      authority,
      multiSigners,
      programId
    );
  }

  /**
   * Create instruction to update the default account state of a token
   * @param mint - Mint address
   * @param accountState - New default state (frozen or initialized)
   * @param freezeAuthority - Freeze authority address
   * @param multiSigners - List of signers if using multisig
   * @param programId - Token Extension Program ID
   * @returns Instruction to update the default state
   */
  static createUpdateDefaultAccountStateInstruction(
    mint: PublicKey,
    accountState: AccountState,
    freezeAuthority: PublicKey,
    multiSigners: (Signer | PublicKey)[] = [],
    programId = TOKEN_2022_PROGRAM_ID
  ): TransactionInstruction {
    return createUpdateDefaultAccountStateInstruction(
      mint,
      accountState,
      freezeAuthority,
      multiSigners,
      programId
    );
  }

  /**
   * Prepare a transaction to freeze a token account
   * Wallet adapter compatible version
   * 
   * @param account - Token account address
   * @param mint - Token mint address
   * @param authority - Freeze authority address
   * @param feePayer - Transaction fee payer address
   * @param multiSigners - List of signers if using multisig
   * @param programId - Token Extension Program ID
   * @returns Configured transaction
   */
  static prepareFreezeAccountTransaction(
    account: PublicKey,
    mint: PublicKey,
    authority: PublicKey,
    feePayer: PublicKey,
    multiSigners: PublicKey[] = [],
    programId = TOKEN_2022_PROGRAM_ID
  ): Transaction {
    const instruction = this.createFreezeAccountInstruction(
      account,
      mint,
      authority,
      multiSigners,
      programId
    );

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = feePayer;
    
    return transaction;
  }

  /**
   * Prepare a transaction to thaw a token account
   * Wallet adapter compatible version
   * 
   * @param account - Token account address
   * @param mint - Token mint address
   * @param authority - Freeze authority address
   * @param feePayer - Transaction fee payer address
   * @param multiSigners - List of signers if using multisig
   * @param programId - Token Extension Program ID
   * @returns Configured transaction
   */
  static prepareThawAccountTransaction(
    account: PublicKey,
    mint: PublicKey,
    authority: PublicKey,
    feePayer: PublicKey,
    multiSigners: PublicKey[] = [],
    programId = TOKEN_2022_PROGRAM_ID
  ): Transaction {
    const instruction = this.createThawAccountInstruction(
      account,
      mint,
      authority,
      multiSigners,
      programId
    );

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = feePayer;
    
    return transaction;
  }

  /**
   * Prepare a transaction to update the default account state of a token
   * Wallet adapter compatible version
   * 
   * @param mint - Token mint address
   * @param accountState - New default state
   * @param freezeAuthority - Freeze authority address
   * @param feePayer - Transaction fee payer address
   * @param multiSigners - List of signers if using multisig
   * @param programId - Token Extension Program ID
   * @returns Configured transaction
   */
  static prepareUpdateDefaultAccountStateTransaction(
    mint: PublicKey,
    accountState: AccountState,
    freezeAuthority: PublicKey,
    feePayer: PublicKey,
    multiSigners: PublicKey[] = [],
    programId = TOKEN_2022_PROGRAM_ID
  ): Transaction {
    const instruction = this.createUpdateDefaultAccountStateInstruction(
      mint,
      accountState,
      freezeAuthority,
      multiSigners,
      programId
    );

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = feePayer;
    
    return transaction;
  }

  /**
   * Utility method to create a transaction from instructions
   * @param instructions - Instructions to add to the transaction
   * @param feePayer - Transaction fee payer
   * @returns Configured transaction
   */
  static buildTransaction(instructions: TransactionInstruction[], feePayer: PublicKey): Transaction {
    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));
    transaction.feePayer = feePayer;
    return transaction;
  }
} 