# Hướng dẫn tạo token với Metadata và các Extension khác

## Giới thiệu

Solana Token Extension SDK cung cấp các phương thức để tạo token trên Solana với các tính năng mở rộng như Metadata, TransferFee, PermanentDelegate, và nhiều extension khác. Tài liệu này hướng dẫn cách sử dụng phương thức `createTokenWithMetadataAndExtensions` để tạo token với metadata và các extension khác trong cùng một giao dịch.

## Vấn đề với các phương pháp trước đây

Trước đây, khi cố gắng tạo token với cả metadata và các extension khác, có thể gặp lỗi "InvalidAccountData" do các vấn đề sau:

1. **Thứ tự không đúng**: Các extension cần được khởi tạo theo thứ tự cụ thể, với MetadataPointer trước khi khởi tạo mint.
2. **Kích thước tài khoản không đủ**: Tài khoản mint cần đủ không gian để chứa các extension.
3. **Xung đột giữa các extension**: Một số extension không thể kết hợp với nhau.

## Cách tạo token với Metadata và các Extension

### Lựa chọn tốt nhất: Sử dụng TokenBuilder với createTokenWithMetadataAndExtensions

```typescript
import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import { TokenBuilder } from "solana-token-extension-boost";

// Kết nối đến Solana network
const connection = new Connection(clusterApiUrl("devnet"));

// Khởi tạo TokenBuilder
const tokenBuilder = new TokenBuilder(connection)
  .setTokenInfo(
    9, // số thập phân
    payer.publicKey, // mint authority
    null // freeze authority
  )
  // Thêm metadata
  .addMetadata(
    "Token Name",
    "SYM",
    "https://example.com/metadata.json",
    {
      // Metadata tùy chọn
      "website": "https://example.com",
      "twitter": "@example"
    }
  )
  // Thêm extension Transfer Fee
  .addTransferFee(
    100, // 1% fee (basis points)
    BigInt(1000000000), // max fee 1 token
    payer.publicKey, // transfer fee authority
    payer.publicKey // withdraw authority
  )
  // Thêm các extension khác theo nhu cầu
  .addNonTransferable();

// Tạo token với tất cả extension
const { mint, transactionSignature, token } = await tokenBuilder.createTokenWithMetadataAndExtensions(payer);

console.log(`Token đã được tạo: ${mint.toBase58()}`);
console.log(`Transaction: ${transactionSignature}`);
```

### Cách tiếp cận mới vs. cách cũ

Các thay đổi mới trong SDK:

1. **Đánh dấu phương thức `build()` là deprecated**: Khuyến nghị sử dụng `createTokenWithExtensions()` hoặc `createTokenWithMetadataAndExtensions()` thay thế.

2. **Hỗ trợ nhiều extension tốt hơn**: Phương thức mới xử lý đúng thứ tự khởi tạo các extension, cấp phát không gian đầy đủ cho tài khoản mint, và kết hợp các extension một cách hiệu quả.

3. **Phương pháp khuyên dùng**:
   - `createTokenWithExtensions()`: Khi tạo token với một extension hoặc nhiều extension không bao gồm metadata.
   - `createTokenWithMetadataAndExtensions()`: Khi tạo token với metadata và các extension khác.

## Các Extension được hỗ trợ

SDK hỗ trợ các extension sau:

| Extension | Phương thức | Mô tả |
|-----------|-------------|-------|
| Metadata | addMetadata() | Thêm thông tin mô tả cho token |
| Transfer Fee | addTransferFee() | Thêm phí chuyển token |
| Permanent Delegate | addPermanentDelegate() | Thêm ủy quyền vĩnh viễn |
| Non-Transferable | addNonTransferable() | Tạo token không thể chuyển nhượng |
| Transfer Hook | addTransferHook() | Thêm hook xử lý khi chuyển token |
| Interest Bearing | addInterestBearing() | Tạo token có lãi suất |
| Confidential Transfer | addConfidentialTransfer() | Hỗ trợ chuyển token bí mật |

## Cảnh báo và khuyến nghị

1. **Tránh sử dụng Token2022Factory trực tiếp**: Các phương thức của Token2022Factory đã được đánh dấu là `deprecated` và sẽ bị loại bỏ trong các phiên bản tương lai. Thay vào đó, hãy sử dụng TokenBuilder trực tiếp.

2. **Tránh sử dụng phương thức `build()`**: Phương thức này được giữ lại để đảm bảo tương thích ngược nhưng không được khuyến khích sử dụng trong mã mới.

3. **Kiểm tra tính tương thích của extension**: Không phải tất cả các extension đều có thể được kết hợp với nhau. SDK sẽ kiểm tra tính tương thích và báo lỗi nếu cần thiết.

## Ví dụ đầy đủ

```typescript
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  ExtensionType,
  getMint,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { TokenBuilder } from "solana-token-extension-boost";

async function main() {
  // Kết nối đến Solana devnet
  console.log("Kết nối đến Solana devnet...");
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // Tạo hoặc load keypair
  const payer = Keypair.generate();
  
  // Airdrop SOL cho testing
  const airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
  console.log(`Đã airdrop 2 SOL cho ${payer.publicKey.toBase58()}`);
  
  // Tạo token builder
  const tokenBuilder = new TokenBuilder(connection)
    .setTokenInfo(9, payer.publicKey, null)
    .addMetadata(
      "My Combined Token",
      "MCT",
      "https://example.com/metadata.json",
      { "website": "https://mytoken.example" }
    )
    .addTransferFee(
      100, // 1% phí
      BigInt(1000000000), // max phí 1 token
      payer.publicKey,
      payer.publicKey
    )
    .addPermanentDelegate(payer.publicKey)
    .addNonTransferable();
  
  console.log("Đang tạo token với metadata và các extension khác...");
  const { mint, transactionSignature } = await tokenBuilder.createTokenWithMetadataAndExtensions(payer);
  
  console.log(`Token đã được tạo thành công!`);
  console.log(`Địa chỉ mint: ${mint.toBase58()}`);
  console.log(`Transaction: ${transactionSignature}`);
  
  // Xác minh token đã được tạo
  console.log("\nĐang đọc thông tin mint...");
  try {
    const mintInfo = await getMint(
      connection,
      mint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    
    console.log("Mint Info:");
    console.log(`Decimals: ${mintInfo.decimals}`);
    console.log(`Mint Authority: ${mintInfo.mintAuthority?.toString()}`);
    console.log(`Supply: ${mintInfo.supply}`);
    
    // Đọc metadata
    try {
      const metadata = await getTokenMetadata(connection, mint);
      console.log("\nMetadata:");
      console.log(`Name: ${metadata.name}`);
      console.log(`Symbol: ${metadata.symbol}`);
      console.log(`URI: ${metadata.uri}`);
      
      if (metadata.additionalMetadata.length > 0) {
        console.log("Additional Metadata:");
        for (const [key, value] of metadata.additionalMetadata) {
          console.log(`  ${key}: ${value}`);
        }
      }
    } catch (err) {
      console.log("Không thể đọc metadata:", err);
    }
  } catch (err) {
    console.error("Lỗi khi đọc thông tin mint:", err);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

## Xem token trên Solana Explorer

Sau khi tạo token, bạn có thể xem thông tin về token và các extension của nó trên Solana Explorer:

1. Truy cập https://explorer.solana.com
2. Chuyển sang mạng bạn đã sử dụng (ví dụ: devnet)
3. Tìm kiếm địa chỉ mint của token
4. Trong phần "Token" của trang chi tiết, bạn sẽ thấy thông tin về token và các extension đã được áp dụng

URL trực tiếp: `https://explorer.solana.com/address/<địa_chỉ_mint>?cluster=devnet` 