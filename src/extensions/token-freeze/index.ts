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
 * Class để quản lý tính năng đóng băng (freeze) và mở đóng băng (thaw) token
 * Thiết kế để tương thích với wallet adapter trong môi trường web
 */
export class TokenFreezeExtension {
  /**
   * Tạo instruction để đóng băng (freeze) một tài khoản token
   * @param account - Địa chỉ tài khoản token
   * @param mint - Địa chỉ mint của token
   * @param authority - Địa chỉ có quyền freeze
   * @param multiSigners - Danh sách các signer nếu sử dụng multisig
   * @param programId - Program ID của Token Extension
   * @returns Instruction để đóng băng tài khoản
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
   * Tạo instruction để mở đóng băng (thaw) một tài khoản token
   * @param account - Địa chỉ tài khoản token
   * @param mint - Địa chỉ mint của token
   * @param authority - Địa chỉ có quyền freeze
   * @param multiSigners - Danh sách các signer nếu sử dụng multisig
   * @param programId - Program ID của Token Extension
   * @returns Instruction để mở đóng băng tài khoản
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
   * Tạo instruction để cập nhật trạng thái mặc định của token
   * @param mint - Địa chỉ mint
   * @param accountState - Trạng thái mặc định mới (frozen hoặc initialized)
   * @param freezeAuthority - Địa chỉ có quyền freeze
   * @param multiSigners - Danh sách các signer nếu sử dụng multisig
   * @param programId - Program ID của Token Extension
   * @returns Instruction để cập nhật trạng thái mặc định
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
   * Chuẩn bị transaction đóng băng (freeze) tài khoản token
   * Phiên bản tương thích với wallet adapter
   * 
   * @param account - Địa chỉ tài khoản token
   * @param mint - Địa chỉ mint của token
   * @param authority - Địa chỉ có quyền freeze
   * @param feePayer - Địa chỉ người trả phí giao dịch
   * @param multiSigners - Danh sách các signer nếu sử dụng multisig
   * @param programId - Program ID của Token Extension
   * @returns Transaction được cấu hình sẵn
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
   * Chuẩn bị transaction mở đóng băng (thaw) tài khoản token
   * Phiên bản tương thích với wallet adapter
   * 
   * @param account - Địa chỉ tài khoản token
   * @param mint - Địa chỉ mint của token
   * @param authority - Địa chỉ có quyền freeze
   * @param feePayer - Địa chỉ người trả phí giao dịch
   * @param multiSigners - Danh sách các signer nếu sử dụng multisig
   * @param programId - Program ID của Token Extension
   * @returns Transaction được cấu hình sẵn
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
   * Chuẩn bị transaction cập nhật trạng thái mặc định của token
   * Phiên bản tương thích với wallet adapter
   * 
   * @param mint - Địa chỉ mint của token
   * @param accountState - Trạng thái mặc định mới
   * @param freezeAuthority - Địa chỉ có quyền freeze
   * @param feePayer - Địa chỉ người trả phí giao dịch
   * @param multiSigners - Danh sách các signer nếu sử dụng multisig
   * @param programId - Program ID của Token Extension
   * @returns Transaction được cấu hình sẵn
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
   * Phương thức tiện ích để tạo transaction từ instructions
   * @param instructions - Instructions để thêm vào transaction
   * @param feePayer - Người trả phí giao dịch
   * @returns Transaction đã được cấu hình
   */
  static buildTransaction(instructions: TransactionInstruction[], feePayer: PublicKey): Transaction {
    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));
    transaction.feePayer = feePayer;
    return transaction;
  }
} 