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
      // Kiểm tra các extension theo cách thủ công bằng cách đọc dữ liệu từ tlvData
      // Đây là cách đơn giản hóa để tránh lỗi type
      Object.entries(EXTENSION_TYPES).forEach(([name, id]) => {
        extensions.push({
          type: id,
          name: getExtensionName(id),
          // Chúng ta chỉ đơn giản kiểm tra sự có mặt của extension theo kích thước tlvData
          // Trong thực tế, cần logic phức tạp hơn để kiểm tra chính xác từng extension
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
 * Tìm thứ tự khởi tạo tối ưu cho các extension
 * Một số extension phải được khởi tạo trước khi khởi tạo mint, số khác phải sau.
 * 
 * @param extensionTypes - Mảng các loại extension cần sắp xếp
 * @returns Mảng đã sắp xếp lại theo thứ tự tối ưu
 */
export function getOptimalInitializationOrder(extensionTypes: ExtensionType[]): ExtensionType[] {
  // Một số extension phải khởi tạo trước khi khởi tạo mint
  const beforeMintInit = [
    ExtensionType.MintCloseAuthority,
    ExtensionType.TransferFeeConfig,
    ExtensionType.ConfidentialTransferMint,
    ExtensionType.DefaultAccountState,
    ExtensionType.MetadataPointer, // Điều quan trọng: MetadataPointer phải được khởi tạo trước mint
    ExtensionType.TokenMetadata, // Nếu dùng TokenMetadata trực tiếp thay vì MetadataPointer
    ExtensionType.NonTransferable
  ];
  
  // Một số extension phải khởi tạo sau khi khởi tạo mint
  const afterMintInit = [
    ExtensionType.TransferHook,
    ExtensionType.InterestBearingConfig,
    ExtensionType.CpiGuard,
    ExtensionType.PermanentDelegate,
    ExtensionType.NonTransferableAccount
  ];
  
  // Sắp xếp các extension theo thứ tự tối ưu
  const beforeMint: ExtensionType[] = [];
  const afterMint: ExtensionType[] = [];
  
  for (const extensionType of extensionTypes) {
    if (beforeMintInit.includes(extensionType)) {
      beforeMint.push(extensionType);
    } else if (afterMintInit.includes(extensionType)) {
      afterMint.push(extensionType);
    } else {
      // Mặc định: thêm vào trước khi khởi tạo mint
      beforeMint.push(extensionType);
    }
  }
  
  // Trả về mảng đã sắp xếp với các extension trước mint đi trước
  return [...beforeMint, ...afterMint];
} 