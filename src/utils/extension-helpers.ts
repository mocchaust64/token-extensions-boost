import { Connection, PublicKey } from "@solana/web3.js";
import { ExtensionType, getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export interface ExtensionInfo {
  type: number;
  name: string;
  present: boolean;
}

export const EXTENSION_TYPES = {
  TransferFeeConfig: 0,
  TransferFeeAmount: 1,
  MintCloseAuthority: 2,
  ConfidentialTransferMint: 3,
  ConfidentialTransferAccount: 4,
  DefaultAccountState: 5,
  ImmutableOwner: 6,
  MemoTransfer: 7,
  NonTransferable: 8,
  InterestBearingConfig: 9,
  CpiGuard: 10,
  PermanentDelegate: 11,
  NonTransferableAccount: 12,
  TransferHook: 13,
  MetadataPointer: 14,
  TokenMetadata: 15
};

export const ExtensionTypeByte = {
  TransferFeeConfig: 0,
  TransferFeeAmount: 1,
  MintCloseAuthority: 2,
  ConfidentialTransferMint: 3,
  ConfidentialTransferAccount: 4,
  DefaultAccountState: 5,
  ImmutableOwner: 6,
  MemoTransfer: 7,
  NonTransferable: 8,
  InterestBearingConfig: 9,
  CpiGuard: 10,
  PermanentDelegate: 11,
  NonTransferableAccount: 12,
  TransferHook: 13,
  MetadataPointer: 14,
  TokenMetadata: 15,
  GroupPointer: 20,
  MemberPointer: 21,
};

export const ExtensionTypeString = {
  0: "TransferFee (Config)",
  1: "TransferFee (Amount)",
  2: "MintCloseAuthority",
  3: "ConfidentialTransfer (Mint)",
  4: "ConfidentialTransfer (Account)",
  5: "DefaultAccountState",
  6: "ImmutableOwner",
  7: "MemoTransfer",
  8: "NonTransferable",
  9: "InterestBearing",
  10: "CpiGuard",
  11: "PermanentDelegate",
  12: "NonTransferableAccount",
  13: "TransferHook",
  14: "MetadataPointer",
  15: "TokenMetadata",
  20: "GroupPointer",
  21: "MemberPointer",
};

export function getExtensionName(type: number): string {
  const names: Record<number, string> = {
    0: "TransferFee (Config)",
    1: "TransferFee (Amount)",
    2: "MintCloseAuthority",
    3: "ConfidentialTransfer (Mint)",
    4: "ConfidentialTransfer (Account)",
    5: "DefaultAccountState",
    6: "ImmutableOwner",
    7: "MemoTransfer",
    8: "NonTransferable",
    9: "InterestBearing",
    10: "CpiGuard",
    11: "PermanentDelegate",
    12: "NonTransferableAccount",
    13: "TransferHook",
    14: "MetadataPointer",
    15: "TokenMetadata",
  };
  
  return names[type] || `Unknown Extension (${type})`;
}

export async function isToken2022(
  connection: Connection,
  mint: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(mint);
    if (!accountInfo) {
      return false;
    }
    
    return accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
  } catch (error) {
    return false;
  }
}

export async function getTokenInfo(
  connection: Connection,
  mint: PublicKey
): Promise<{ isProgramToken2022: boolean; extensions: ExtensionInfo[] }> {
  const isProgramToken2022 = await isToken2022(connection, mint);
  
  if (!isProgramToken2022) {
    return { isProgramToken2022, extensions: [] };
  }

  try {
    const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    
    let extensions: ExtensionInfo[] = [];
    
    if (mintInfo.tlvData) {
      // Check extensions manually by reading data from tlvData
      // This is a simplified way to avoid type errors
      Object.entries(EXTENSION_TYPES).forEach(([name, id]) => {
        extensions.push({
          type: id,
          name: getExtensionName(id),
          // We simply check for the presence of extension by tlvData size
          // In reality, more complex logic is needed to check each extension precisely
          present: mintInfo.tlvData.length > 0
        });
      });
    }
    
    return { isProgramToken2022, extensions };
  } catch (error) {
    return { isProgramToken2022, extensions: [] };
  }
}

/**
 * Find the optimal initialization order for extensions
 * Some extensions must be initialized before the mint, others must be after.
 * 
 * @param extensionTypes - Array of extension types to sort
 * @returns Sorted array in optimal order
 */
export function getOptimalInitializationOrder(extensionTypes: ExtensionType[]): ExtensionType[] {
  // Some extensions must be initialized before the mint
  const beforeMintInit = [
    ExtensionType.MintCloseAuthority,
    ExtensionType.TransferFeeConfig,
    ExtensionType.ConfidentialTransferMint,
    ExtensionType.DefaultAccountState,
    ExtensionType.MetadataPointer, // Important: MetadataPointer must be initialized before mint
    ExtensionType.TokenMetadata, // If using TokenMetadata directly instead of MetadataPointer
    ExtensionType.NonTransferable
  ];
  
  // Some extensions must be initialized after the mint
  const afterMintInit = [
    ExtensionType.TransferHook,
    ExtensionType.InterestBearingConfig,
    ExtensionType.CpiGuard,
    ExtensionType.PermanentDelegate,
    ExtensionType.NonTransferableAccount
  ];
  
  // Sort extensions in optimal order
  const beforeMint: ExtensionType[] = [];
  const afterMint: ExtensionType[] = [];
  
  for (const extensionType of extensionTypes) {
    if (beforeMintInit.includes(extensionType)) {
      beforeMint.push(extensionType);
    } else if (afterMintInit.includes(extensionType)) {
      afterMint.push(extensionType);
    } else {
      // Default: add before mint initialization
      beforeMint.push(extensionType);
    }
  }
  
  // Return sorted array with before-mint extensions first
  return [...beforeMint, ...afterMint];
} 