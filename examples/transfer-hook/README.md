# Transfer Hook Extension

Transfer Hook là một extension mạnh mẽ của SPL-Token 2022, cho phép thực thi một đoạn code tùy chỉnh mỗi khi token được chuyển. Extension này mở ra rất nhiều khả năng như:

- Thực thi xác thực quyền sở hữu hoặc kiểm tra whitelist/blacklist
- Thu phí tự động bằng các token khác
- Thực thi royalty NFT
- Tích lũy dữ liệu chuyển token
- Tạo event khi chuyển token
- Nhiều use case khác...

## Cách hoạt động

1. Tạo một Token với Extension Transfer Hook, chỉ định địa chỉ của một chương trình Transfer Hook
2. Khi một người dùng chuyển token, chương trình Token 2022 sẽ gọi CPI (Cross-Program Invocation) đến chương trình Transfer Hook đã chỉ định
3. Chương trình Transfer Hook có thể:
   - Thực hiện các hành động phụ
   - Lưu trữ dữ liệu
   - Kiểm tra các điều kiện
   - Từ chối giao dịch nếu các điều kiện không đáp ứng

## Hướng dẫn sử dụng

### 1. Tạo một token với Transfer Hook

```typescript
// Tạo Transfer Hook Program thực tế và deploy nó
const transferHookProgramId = new PublicKey("YOUR_HOOK_PROGRAM_ID");

// Khởi tạo Token2022Factory
const factory = new Token2022Factory(connection);

// Tạo token với Transfer Hook
const transferHookToken = await factory.createTransferHookToken(
  payer,
  {
    decimals: 9,
    mintAuthority: payer.publicKey,
    transferHookProgramId: transferHookProgramId,
    freezeAuthority: null
  }
);
```

### 2. Chuyển token với Transfer Hook

```typescript
// Tạo token account cho người nhận
const { address: recipientTokenAccount } = await transferHookToken.createOrGetTokenAccount(
  payer,
  recipient.publicKey
);

// Chuyển token
const transferSignature = await transferHookToken.transfer(
  ownerTokenAccount,
  recipientTokenAccount,
  payer,
  transferAmount,
  decimals,
  extraAccounts // Tùy chọn: Các tài khoản bổ sung cho transfer hook
);
```

### 3. Kết hợp Transfer Hook với các extension khác

Bạn có thể kết hợp Transfer Hook với các extension khác như Metadata:

```typescript
const { transferHookToken, metadataToken, mint } = await factory.createTransferHookWithMetadataToken(
  payer,
  {
    decimals: 9,
    mintAuthority: payer.publicKey,
    transferHook: {
      programId: transferHookProgramId
    },
    metadata: {
      name: "Hook Token",
      symbol: "HOOK",
      uri: "https://example.com/metadata/hook-token.json",
      additionalMetadata: {
        "description": "A token with transfer hook and metadata"
      }
    }
  }
);
```

## Thực hiện Transfer Hook Program

Để sử dụng đầy đủ tính năng Transfer Hook, bạn cần:

1. **Xây dựng và triển khai một Transfer Hook Program** thực hiện Interface SPL Transfer Hook
2. **Tạo một ExtraAccountMetaList PDA** để lưu trữ các tài khoản bổ sung cần thiết cho Transfer Hook
3. **Khởi tạo các tài khoản bổ sung** (nếu cần) cho Transfer Hook Program

Ví dụ về một Transfer Hook Program đơn giản sử dụng Anchor Framework có thể tìm thấy tại:
https://github.com/solana-labs/solana-program-library/tree/master/token/transfer-hook/example

## Lưu ý quan trọng

- Transfer Hook chỉ có thể thực thi code trong chương trình đã được chỉ định khi tạo token
- Chương trình Transfer Hook không thể thay đổi sau khi đã tạo token (trừ khi bạn chỉ định quyền thay đổi)
- Các tài khoản gốc (source, destination) được chuyển vào Transfer Hook dưới dạng read-only, không thể thay đổi
- Khi sử dụng Transfer Hook với các UI/wallet hiện tại, các trình ký giao dịch cần hỗ trợ giải quyết ExtraAccountMetaList

## Ví dụ

Xem ví dụ đầy đủ tại [examples/transfer-hook/index.ts](./index.ts) và [examples/multi-extension-example/transfer-hook-with-fee.ts](../multi-extension-example/transfer-hook-with-fee.ts) 