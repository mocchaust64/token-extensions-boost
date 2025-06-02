import { Connection, PublicKey } from '@solana/web3.js';
import {
  getMint,
  getExtensionTypes,
  getTransferFeeConfig,
  getMetadataPointerState,
  getTokenMetadata,
  getTransferHook,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
} from '@solana/spl-token';

// Định nghĩa các loại extension hợp lệ từ ExtensionType
const EXTENSION_TYPES: { [key in ExtensionType]: string } = {
  [ExtensionType.Uninitialized]: 'Uninitialized',
  [ExtensionType.TransferFeeConfig]: 'TransferFeeConfig',
  [ExtensionType.TransferFeeAmount]: 'TransferFeeAmount',
  [ExtensionType.MintCloseAuthority]: 'MintCloseAuthority',
  [ExtensionType.ConfidentialTransferMint]: 'ConfidentialTransferMint',
  [ExtensionType.ConfidentialTransferAccount]: 'ConfidentialTransferAccount',
  [ExtensionType.DefaultAccountState]: 'DefaultAccountState',
  [ExtensionType.ImmutableOwner]: 'ImmutableOwner',
  [ExtensionType.MemoTransfer]: 'MemoTransfer',
  [ExtensionType.NonTransferable]: 'NonTransferable',
  [ExtensionType.NonTransferableAccount]: 'NonTransferableAccount',
  [ExtensionType.InterestBearingConfig]: 'InterestBearingConfig',
  [ExtensionType.CpiGuard]: 'CpiGuard',
  [ExtensionType.PermanentDelegate]: 'PermanentDelegate',
  [ExtensionType.TransferHook]: 'TransferHook',
  [ExtensionType.TransferHookAccount]: 'TransferHookAccount',
  [ExtensionType.MetadataPointer]: 'MetadataPointer',
  [ExtensionType.TokenMetadata]: 'TokenMetadata',
};

// Ánh xạ các extension không có trong ExtensionType (dựa trên mã nguồn Rust)
const CUSTOM_EXTENSION_TYPES: { [key: number]: string } = {
  6: 'GroupPointer', // Dựa trên mã nguồn Rust
  7: 'TokenGroup', // Thay cho GroupConfig
  8: 'GroupMemberPointer',
  9: 'TokenGroupMember',
  11: 'ConfidentialTransferFeeConfig', // Giả định giá trị số
  12: 'ConfidentialTransferFeeAmount', // Giả định giá trị số
};

async function getTokenExtensions(mintAddress: string) {
  // Kiểm tra địa chỉ mint hợp lệ
  if (!PublicKey.isOnCurve(mintAddress)) {
    throw new Error('Địa chỉ mint không hợp lệ: ' + mintAddress);
  }

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const mintPublicKey = new PublicKey(mintAddress);

  try {
    // Lấy thông tin mint
    const mintInfo = await getMint(connection, mintPublicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
    console.log('Mint đã được khởi tạo:', mintInfo.isInitialized);

    // Danh sách các extension được phát hiện
    const enabledExtensions: string[] = [];

    // 1. Kiểm tra extension bằng getExtensionTypes
    const accountInfo = await connection.getAccountInfo(mintPublicKey);
    if (accountInfo?.data) {
      const extensionTypes = await getExtensionTypes(accountInfo.data);
      extensionTypes.forEach((type) => {
        const extensionName = EXTENSION_TYPES[type];
        console.log(`Extension ${extensionName} đang bật (từ getExtensionTypes)`);
        if (!enabledExtensions.includes(extensionName)) {
          enabledExtensions.push(extensionName);
        }
      });
    } else {
      console.log('Không lấy được dữ liệu tài khoản mint');
    }

    // 2. Kiểm tra chi tiết các extension được hỗ trợ bởi hàm tiện ích
    const transferFeeConfig = await getTransferFeeConfig(mintInfo);
    if (transferFeeConfig && !enabledExtensions.includes('TransferFeeConfig')) {
      console.log('Extension TransferFeeConfig đang bật:', transferFeeConfig);
      enabledExtensions.push('TransferFeeConfig');
    }

    const metadataPointer = await getMetadataPointerState(mintInfo);
    if (metadataPointer && !enabledExtensions.includes('MetadataPointer')) {
      console.log('Extension MetadataPointer đang bật:', metadataPointer);
      enabledExtensions.push('MetadataPointer');
    }

    const metadata = await getTokenMetadata(connection, mintPublicKey);
    if (metadata && !enabledExtensions.includes('TokenMetadata')) {
      console.log('Extension TokenMetadata đang bật:', metadata);
      enabledExtensions.push('TokenMetadata');
    }

    const transferHook = await getTransferHook(mintInfo);
    if (transferHook && !enabledExtensions.includes('TransferHook')) {
      console.log('Extension TransferHook đang bật:', transferHook);
      enabledExtensions.push('TransferHook');
    }

    // 3. Phân tích dữ liệu thô để kiểm tra các extension còn lại
    if (accountInfo?.data) {
      console.log('Dữ liệu tài khoản mint:', accountInfo.data.toString('hex'));
      // Bỏ qua 74 byte đầu tiên (các trường cơ bản của mint)
      let offset = 74; // mintAuthority (32) + supply (8) + decimals (1) + isInitialized (1) + freezeAuthority (32)

      while (offset < accountInfo.data.length) {
        // Đọc extensionType (1 byte)
        const extensionType = accountInfo.data.readUInt8(offset);
        let extensionName: string;

        if (extensionType in EXTENSION_TYPES) {
          extensionName = EXTENSION_TYPES[extensionType as ExtensionType];
        } else if (extensionType in CUSTOM_EXTENSION_TYPES) {
          extensionName = CUSTOM_EXTENSION_TYPES[extensionType];
        } else {
          extensionName = `UnknownExtension(${extensionType})`;
          console.warn(`Extension không xác định: ${extensionType} tại offset ${offset}`);
        }

        if (!enabledExtensions.includes(extensionName)) {
          console.log(`Extension ${extensionName} đang bật (từ dữ liệu thô)`);
          enabledExtensions.push(extensionName);
        }

        // Đọc độ dài của extension (4 byte, little-endian)
        if (offset + 4 >= accountInfo.data.length) {
          console.warn('Dữ liệu buffer không đủ để đọc độ dài extension tại offset', offset);
          break;
        }
        const length = accountInfo.data.readUInt32LE(offset + 1);

        // Kiểm tra độ dài hợp lệ
        if (offset + 5 + length > accountInfo.data.length) {
          console.warn(`Extension ${extensionType} có độ dài không hợp lệ: ${length} tại offset ${offset}`);
          break;
        }

        // Bỏ qua extension hiện tại để đến extension tiếp theo
        offset += 1 + 4 + length; // 1 byte (type) + 4 byte (length) + length (dữ liệu)
      }
    }

    // In kết quả
    if (enabledExtensions.length > 0) {
      console.log('Các extension đang bật:');
      enabledExtensions.forEach((ext) => console.log(`- ${ext}`));
    } else {
      console.log('Không có extension nào được bật.');
    }

    return enabledExtensions;
  } catch (error) {
    console.error('Lỗi khi kiểm tra extension:', error);
    throw error;
  }
}

// Ví dụ sử dụng
const mintAddress = 'DgPaySCyLuL7y9L8DuDVFVF37YR6LeQoP4quDaaXGdnD'; // Lấy từ output trước
getTokenExtensions(mintAddress)
  .then((extensions) => {
    console.log('Danh sách extension:', extensions);
  })
  .catch((error) => {
    console.error(error);
  });