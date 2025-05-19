# Metadata trong Token Extensions

Thư mục này chứa các ví dụ về cách sử dụng Metadata Extension từ Token Extensions.

## API Mới - Đơn giản và Dễ sử dụng

Chúng tôi đã phát triển một API mới đơn giản hơn để tạo token với metadata. API mới này xử lý đúng thứ tự khởi tạo, tự động tính toán kích thước cần thiết và chia nhỏ các transaction để đảm bảo thành công.

### Cách 1: Sử dụng MetadataHelper trực tiếp (Đơn giản nhất)

```typescript
import { MetadataHelper } from "solana-token-extension-boost";

const result = await MetadataHelper.createTokenWithMetadata(
  connection,
  payer,
  {
    decimals: 9,
    mintAuthority: payer.publicKey,
    name: "My Token",
    symbol: "TKN",
    uri: "https://example.com/metadata.json",
    additionalMetadata: {
      "description": "Token với metadata"
    }
  }
);

console.log(`Token tạo thành công: ${result.mint.toString()}`);
```

### Cách 2: Sử dụng TokenBuilder (Khuyến nghị)

```typescript
import { TokenBuilder } from "solana-token-extension-boost";

const tokenBuilder = new TokenBuilder(connection);

tokenBuilder
  .setTokenInfo(9, payer.publicKey)
  .addTokenMetadata(
    "My Token",
    "TKN",
    "https://example.com/metadata.json",
    {
      "description": "My token description",
      "creator": "Creator name"
    }
  );

const { mint, transactionSignature, token } = await tokenBuilder.build(payer);
```

## Các vấn đề đã khắc phục

Chúng tôi đã sửa các vấn đề sau:

1. **Thứ tự khởi tạo không đúng**: API mới đảm bảo thứ tự khởi tạo đúng theo quy định của Solana.
2. **Không gian tài khoản không đủ**: Tự động tính toán không gian cần thiết với padding dư dả.
3. **Lỗi "invalid account data"**: Chia nhỏ transaction để tránh lỗi này.
4. **Lỗi khi kết hợp với extension khác**: Xử lý đặc biệt cho trường hợp metadata + extensions khác.

## Thứ tự khởi tạo đúng

API mới đảm bảo thứ tự khởi tạo đúng theo 5 bước:

1. Tạo account với không gian đủ lớn
2. Khởi tạo MetadataPointer (trỏ đến chính mint)
3. Khởi tạo Mint
4. Khởi tạo Metadata
5. Thêm các trường metadata bổ sung

## Chạy ví dụ

Chạy ví dụ đơn giản:

```bash
npx ts-node examples/metadata/simple-metadata.ts
```

Chạy ví dụ đầy đủ:

```bash
npx ts-node examples/metadata/index.ts
```

## Đọc metadata từ token

```typescript
import { getTokenMetadata } from "@solana/spl-token";

const tokenMetadata = await getTokenMetadata(
  connection,
  mintAddress,
  "confirmed"
);

console.log(`Name: ${tokenMetadata?.name}`);
console.log(`Symbol: ${tokenMetadata?.symbol}`);
console.log(`URI: ${tokenMetadata?.uri}`);

// Đọc metadata bổ sung
if (tokenMetadata?.additionalMetadata) {
  for (const [key, value] of tokenMetadata.additionalMetadata) {
    console.log(`${key}: ${value}`);
  }
}
```

## Ví dụ mã nguồn

- [simple-metadata.ts](./simple-metadata.ts): Ví dụ đơn giản nhất để tạo token với metadata
- [index.ts](./index.ts): Ví dụ đầy đủ hơn với nhiều phương pháp
- [MetadataHelper](../../src/utils/metadata-helper.ts): Mã nguồn của MetadataHelper