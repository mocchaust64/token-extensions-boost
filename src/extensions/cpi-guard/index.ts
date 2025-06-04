import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction, 
  SystemProgram,
  Keypair 
} from '@solana/web3.js';
import { 
  ExtensionType, 
  TOKEN_2022_PROGRAM_ID, 
  createInitializeMintInstruction,
  getMintLen,
  getMint
} from '@solana/spl-token';

/**
 * Create instruction to initialize CPI Guard for mint
 * @param mint - Mint address
 * @param authority - (Optional) Authority address that can enable/disable CPI Guard
 * @param programId - Token Extension Program ID
 * @returns Instruction to initialize CPI Guard
 */
export function createInitializeCpiGuardInstruction(
  mint: PublicKey,
  authority: PublicKey | null = null,
  programId = TOKEN_2022_PROGRAM_ID
): TransactionInstruction {
  const keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
  ];
  
  if (authority) {
    keys.push({ pubkey: authority, isSigner: false, isWritable: false });
  }
  
  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.from([
      ExtensionType.CpiGuard & 0xff, 
      (ExtensionType.CpiGuard >> 8) & 0xff, 
      (ExtensionType.CpiGuard >> 16) & 0xff, 
      (ExtensionType.CpiGuard >> 24) & 0xff,
      authority ? 1 : 0 // 1 if authority is provided, 0 otherwise
    ]),
  });
}

/**
 * Class for protection against CPI attacks
 */
export class CpiGuardExtension {
  private connection: Connection;
  private mint: PublicKey;
  
  /**
   * Create a new CpiGuardExtension instance
   * @param connection - Connection to Solana cluster
   * @param mint - Mint address
   */
  constructor(connection: Connection, mint: PublicKey) {
    this.connection = connection;
    this.mint = mint;
  }
  
  /**
   * Create instruction to initialize CPI Guard for mint
   * @param mint - Mint address
   * @param authority - (Optional) Authority address that can enable/disable CPI Guard
   * @param programId - Token Extension Program ID
   * @returns Instruction to initialize CPI Guard
   */
  static createInitializeCpiGuardInstruction(
    mint: PublicKey,
    authority: PublicKey | null = null,
    programId = TOKEN_2022_PROGRAM_ID
  ): TransactionInstruction {
    return createInitializeCpiGuardInstruction(
      mint,
      authority,
      programId
    );
  }

  /**
   * Create instruction to enable CPI Guard for a mint
   * @param mint - Mint address
   * @param authority - Authority address that can enable/disable CPI Guard
   * @param programId - Token Extension Program ID
   * @returns Instruction to enable CPI Guard
   */
  static createEnableCpiGuardInstruction(
    mint: PublicKey,
    authority: PublicKey,
    programId = TOKEN_2022_PROGRAM_ID
  ): TransactionInstruction {
    return new TransactionInstruction({
      programId,
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false }
      ],
      data: Buffer.from([
        ExtensionType.CpiGuard & 0xff, 
        (ExtensionType.CpiGuard >> 8) & 0xff, 
        (ExtensionType.CpiGuard >> 16) & 0xff, 
        (ExtensionType.CpiGuard >> 24) & 0xff,
        1 // Enable CPI Guard
      ]),
    });
  }

  /**
   * Create instruction to disable CPI Guard for a mint
   * @param mint - Mint address
   * @param authority - Authority address that can enable/disable CPI Guard
   * @param programId - Token Extension Program ID
   * @returns Instruction to disable CPI Guard
   */
  static createDisableCpiGuardInstruction(
    mint: PublicKey,
    authority: PublicKey,
    programId = TOKEN_2022_PROGRAM_ID
  ): TransactionInstruction {
    return new TransactionInstruction({
      programId,
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false }
      ],
      data: Buffer.from([
        ExtensionType.CpiGuard & 0xff, 
        (ExtensionType.CpiGuard >> 8) & 0xff, 
        (ExtensionType.CpiGuard >> 16) & 0xff, 
        (ExtensionType.CpiGuard >> 24) & 0xff,
        0 // Disable CPI Guard
      ]),
    });
  }
  
  /**
   * Check if CPI Guard is enabled for a mint
   * @param connection - Connection to Solana cluster
   * @param mint - Mint address
   * @param programId - Token Extension Program ID
   * @returns Promise resolving to boolean indicating if CPI Guard is enabled
   */
  static async isCpiGuardEnabled(
    connection: Connection,
    mint: PublicKey,
    programId = TOKEN_2022_PROGRAM_ID
  ): Promise<boolean> {
    try {
      const mintInfo = await getMint(
        connection,
        mint,
        'confirmed',
        programId
      );
      
      // Check the TLV data for CPI Guard extension
      if (mintInfo.tlvData) {
        let offset = 0;
        while (offset < mintInfo.tlvData.length) {
          if (offset + 8 > mintInfo.tlvData.length) break;
          
          const type = mintInfo.tlvData.readUInt32LE(offset);
          const length = mintInfo.tlvData.readUInt32LE(offset + 4);
          
          if (type === ExtensionType.CpiGuard) {
            // CPI Guard found, check if it's enabled
            if (offset + 8 + length > mintInfo.tlvData.length) break;
            return mintInfo.tlvData.readUInt8(offset + 8) === 1;
          }
          
          offset += 8 + length;
        }
      }
      
      return false; // CPI Guard not found or not enabled
    } catch (error) {
      console.error('Error checking CPI Guard status:', error);
      return false;
    }
  }
  
  /**
   * Get CPI Guard authority for a mint
   * @param connection - Connection to Solana cluster
   * @param mint - Mint address
   * @param programId - Token Extension Program ID
   * @returns Promise resolving to the authority public key or null if no authority
   */
  static async getCpiGuardAuthority(
    connection: Connection,
    mint: PublicKey,
    programId = TOKEN_2022_PROGRAM_ID
  ): Promise<PublicKey | null> {
    try {
      const mintInfo = await getMint(
        connection,
        mint,
        'confirmed',
        programId
      );
      
      // Check the TLV data for CPI Guard extension
      if (mintInfo.tlvData) {
        let offset = 0;
        while (offset < mintInfo.tlvData.length) {
          if (offset + 8 > mintInfo.tlvData.length) break;
          
          const type = mintInfo.tlvData.readUInt32LE(offset);
          const length = mintInfo.tlvData.readUInt32LE(offset + 4);
          
          if (type === ExtensionType.CpiGuard) {
            // CPI Guard found, check if it has an authority
            if (offset + 8 + length > mintInfo.tlvData.length) break;
            if (length >= 33) { // Authority is present
              const authorityBytes = mintInfo.tlvData.slice(offset + 9, offset + 9 + 32);
              return new PublicKey(authorityBytes);
            }
            return null; // No authority
          }
          
          offset += 8 + length;
        }
      }
      
      return null; // CPI Guard not found
    } catch (error) {
      console.error('Error getting CPI Guard authority:', error);
      return null;
    }
  }
  
  /**
   * Create instructions to create a new token with CPI Guard
   * @param connection - Connection to Solana cluster
   * @param payer - Public key of the fee payer
   * @param mintAuthority - Mint authority
   * @param decimals - Number of decimals
   * @param cpiGuardAuthority - (Optional) Authority that can enable/disable CPI Guard
   * @returns Instructions, signers, and mint address
   */
  static async createTokenWithCpiGuardInstructions(
    connection: Connection,
    payer: PublicKey,
    mintAuthority: PublicKey,
    decimals: number,
    cpiGuardAuthority?: PublicKey
  ): Promise<{
    instructions: TransactionInstruction[];
    signers: Keypair[];
    mint: PublicKey;
  }> {
    // Generate a new keypair for the mint
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    
    // Calculate the space needed for the mint with CPI Guard extension
    const mintLen = getMintLen([ExtensionType.CpiGuard]);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
    
    // Create instructions array
    const instructions: TransactionInstruction[] = [];
    
    // Add instruction to create account
    instructions.push(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mint,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );
    
    // Add instruction to initialize CPI Guard
    instructions.push(
      createInitializeCpiGuardInstruction(
        mint,
        cpiGuardAuthority || null,
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    // Add instruction to initialize mint
    instructions.push(
      createInitializeMintInstruction(
        mint,
        decimals,
        mintAuthority,
        null, // freeze authority
        TOKEN_2022_PROGRAM_ID
      )
    );
    
    return {
      instructions,
      signers: [mintKeypair],
      mint,
    };
  }
  
  /**
   * Check if this mint has CPI Guard enabled
   * @returns Promise resolving to boolean indicating if CPI Guard is enabled
   */
  async isCpiGuardEnabled(): Promise<boolean> {
    return CpiGuardExtension.isCpiGuardEnabled(
      this.connection,
      this.mint,
      TOKEN_2022_PROGRAM_ID
    );
  }
  
  /**
   * Get the CPI Guard authority for this mint
   * @returns Promise resolving to the authority public key or null if no authority
   */
  async getCpiGuardAuthority(): Promise<PublicKey | null> {
    return CpiGuardExtension.getCpiGuardAuthority(
      this.connection,
      this.mint,
      TOKEN_2022_PROGRAM_ID
    );
  }
  
  /**
   * Create instruction to enable CPI Guard for this mint
   * @param authority - Authority address that can enable/disable CPI Guard
   * @returns Instruction to enable CPI Guard
   */
  createEnableCpiGuardInstruction(authority: PublicKey): TransactionInstruction {
    return CpiGuardExtension.createEnableCpiGuardInstruction(
      this.mint,
      authority,
      TOKEN_2022_PROGRAM_ID
    );
  }
  
  /**
   * Create instruction to disable CPI Guard for this mint
   * @param authority - Authority address that can enable/disable CPI Guard
   * @returns Instruction to disable CPI Guard
   */
  createDisableCpiGuardInstruction(authority: PublicKey): TransactionInstruction {
    return CpiGuardExtension.createDisableCpiGuardInstruction(
      this.mint,
      authority,
      TOKEN_2022_PROGRAM_ID
    );
  }
} 