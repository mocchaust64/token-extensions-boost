# Hướng dẫn tạo token với Metadata và các Extension khác

## Giới thiệu

Solana Token Extension SDK cung cấp các phương thức để tạo token trên Solana với các tính năng mở rộng như Metadata, TransferFee, PermanentDelegate, và nhiều extension khác. Tài liệu này hướng dẫn cách sử dụng phương thức mới `createTokenWithMetadataAndExtensions` để tạo token với metadata và các extension khác trong cùng một giao dịch.

## Vấn đề với các phương pháp trước đây

Trước đây, khi cố gắng tạo token với cả metadata và các extension khác, có thể gặp lỗi "InvalidAccountData" do các vấn đề sau:

1. **Thứ tự không đúng**: Các extension cần được khởi tạo theo thứ tự cụ thể, với MetadataPointer trước khi khởi tạo mint.
2. **Kích thước tài khoản không đủ**: Tài khoản mint cần đủ không gian để chứa các extension và metadata.
3. **Các extension không tương thích**: Một số extension không thể hoạt động cùng nhau.

## Giải pháp: Phương thức createTokenWithMetadataAndExtensions

Phương thức mới `createTokenWithMetadataAndExtensions` giải quyết các vấn đề này bằng cách:

1. Đảm bảo thứ tự khởi tạo đúng các extension
2. Tính toán chính xác kích thước tài khoản cần thiết
3. Xử lý tất cả các extension trong cùng một giao dịch

## Cách sử dụng

### 1. Cài đặt thư viện

```bash
npm install solana-token-extension-boost
```

### 2. Import các thành phần cần thiết

```typescript
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TokenBuilder } from "solana-token-extension-boost";
```

### 3. Khởi tạo TokenBuilder và thêm các extension

```typescript
// Kết nối đến Solana
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Khởi tạo TokenBuilder
const tokenBuilder = new TokenBuilder(connection);

// Cấu hình token với các extension
tokenBuilder
  // Thông tin cơ bản
  .setTokenInfo(
    6, // Số chữ số thập phân
    payer.publicKey // Mint authority
  )
  
  // Thêm metadata
  .addTokenMetadata(
    "My Token", // Tên token
    "MTK", // Ký hiệu token
    "https://example.com/metadata.json", // URI đến metadata
    {
      "description": "My token with multiple extensions",
      "creator": "Token Extension SDK",
      "website": "https://example.com"
    } // Metadata bổ sung
  )
  
  // Thêm TransferFee (phí chuyển khoản 1%)
  .addTransferFee(
    100, // 1% (100 basis points)
    BigInt(1000000), // Phí tối đa (1 token với 6 decimals)
    payer.publicKey, // TransferFee config authority
    payer.publicKey // Withdraw withheld authority
  )
  
  // Thêm PermanentDelegate
  .addPermanentDelegate(
    delegateKeypair.publicKey
  );
```

### 4. Sử dụng phương thức createTokenWithMetadataAndExtensions

```typescript
// Tạo token với metadata và các extension
const { mint, transactionSignature, token } = await tokenBuilder.createTokenWithMetadataAndExtensions(payer);

console.log(`Token created successfully! Mint address: ${mint.toString()}`);
console.log(`Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`);
```

## Các extension hỗ trợ

Phương thức `createTokenWithMetadataAndExtensions` hỗ trợ các extension sau:

1. **Metadata** (thông qua MetadataPointer) - Thông tin mô tả token
2. **TransferFee** - Phí chuyển khoản tự động
3. **PermanentDelegate** - Địa chỉ có quyền chuyển token mà không cần chữ ký của chủ sở hữu
4. **TransferHook** - Cho phép chạy mã tùy chỉnh khi chuyển token
5. **InterestBearing** - Tính lãi tự động trên số dư token
6. **NonTransferable** - Giới hạn khả năng chuyển token

## Lưu ý

- **ConfidentialTransfer** extension chưa được hỗ trợ đầy đủ trong SDK hiện tại
- Một số extension có thể không tương thích với nhau, SDK sẽ kiểm tra và thông báo lỗi nếu có
- Khi kiểm tra token trên Solana Explorer, cần chọn đúng program ID (Token-2022) để xem đầy đủ các extension

## Ví dụ đầy đủ

Tham khảo file ví dụ tại `examples/metadata/combined-extensions.ts` để xem cách triển khai đầy đủ.

## Kết luận

Phương thức `createTokenWithMetadataAndExtensions` cung cấp cách đơn giản và đáng tin cậy để tạo token Solana với metadata và nhiều extension khác trong cùng một giao dịch. Phương thức này giải quyết các vấn đề về thứ tự khởi tạo và kích thước tài khoản, cho phép phát triển ứng dụng token mạnh mẽ hơn trên Solana. 