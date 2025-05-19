# Ví dụ về Token với Nhiều Extension

Thư mục này chứa các ví dụ về việc tạo token với nhiều extension cùng một lúc.

## Các ví dụ thành công

Những ví dụ dưới đây đã được kiểm tra và hoạt động ổn định:

1. **test-custom-extensions.ts** - Tạo token với nhiều kết hợp extension khác nhau
   ```bash
   npx ts-node examples/multi-extension-example/test-custom-extensions.ts
   ```
   
2. **transfer-hook-with-fee.ts** - Tạo token với kết hợp TransferFee + TransferHook
   ```bash
   npx ts-node examples/multi-extension-example/transfer-hook-with-fee.ts
   ```

3. **test-extension-compatibility.ts** - Kiểm tra tính tương thích giữa các extension
   ```bash
   npx ts-node examples/multi-extension-example/test-extension-compatibility.ts
   ```

4. **test-additional-extensions.ts** - Kiểm tra các kết hợp extension phức tạp và nâng cao
   ```bash
   npx ts-node examples/multi-extension-example/test-additional-extensions.ts
   ```

5. **immutable-owner-example/immutable-owner-test.ts** - Kiểm tra ImmutableOwner với các Token Account
   ```bash
   npx ts-node examples/immutable-owner-example/immutable-owner-test.ts
   ```

## Bảng tương thích extension

Không phải tất cả các extension đều có thể kết hợp với nhau. Dưới đây là những cặp extension đã được kiểm tra và kết quả:

### Các kết hợp 2 extension

| Extension 1 | Extension 2 | Tương thích | Ghi chú |
|-------------|-------------|:-----------:|---------|
| NonTransferable | PermanentDelegate | ✅ | Hoạt động tốt |
| TransferFee | PermanentDelegate | ✅ | Hoạt động tốt |
| TransferFee | TransferHook | ✅ | Hoạt động tốt |
| PermanentDelegate | TransferHook | ✅ | Hoạt động tốt |
| NonTransferable | TransferFee | ❌ | Không tương thích về mặt logic |
| NonTransferable | TransferHook | ❌ | Không tương thích về mặt logic |
| NonTransferable | ConfidentialTransfer | ❌ | Không tương thích về mặt logic |
| ConfidentialTransfer | TransferFee | ❌ | Không tương thích về mặt logic |
| ConfidentialTransfer | TransferHook | ❌ | Không tương thích về mặt logic |
| ConfidentialTransfer | PermanentDelegate | ❌ | Không tương thích về mặt logic |

### Các kết hợp 3 extension trở lên

| Extension 1 | Extension 2 | Extension 3 | Tương thích | Ghi chú |
|-------------|-------------|-------------|:-----------:|---------|
| TransferFee | TransferHook | PermanentDelegate | ✅ | Hoạt động tốt |
| TransferFee | NonTransferable | PermanentDelegate | ❌ | Không tương thích (NonTransferable + TransferFee) |

### Các extension đơn lẻ

| Extension | Hoạt động | Áp dụng cho | Ghi chú |
|-----------|:---------:|:-----------:|---------|
| TransferFee | ✅ | Mint | Hoạt động tốt |
| TransferHook | ✅ | Mint | Hoạt động tốt |
| PermanentDelegate | ✅ | Mint | Hoạt động tốt |
| NonTransferable | ✅ | Mint | Hoạt động tốt |
| ConfidentialTransfer | ❌ | Mint | Gặp vấn đề "invalid account data" |
| Metadata | ❌ | Mint | Gặp vấn đề với "InvalidAccountData", cần điều tra thêm |
| ImmutableOwner | ✅ | Token Account | ImmutableOwner là extension cho Token Account, không phải Mint |
| MetadataPointer | ❌ | Mint | Lỗi "invalid account data", cần sửa thứ tự khởi tạo |

## Vấn đề phát hiện và khắc phục

1. **ImmutableOwner Extension**: 
   - **Vấn đề**: Đã áp dụng sai cho Mint Account thay vì Token Account
   - **Cách khắc phục**: Tạo lớp `TokenAccountBuilder` tạo và cấu hình Token Account với ImmutableOwner
   - **Ví dụ**: Xem `examples/immutable-owner-example/immutable-owner-test.ts`

2. **MetadataPointer Extension**: 
   - **Vấn đề**: Thứ tự khởi tạo không đúng
   - **Cách khắc phục**: Cập nhật `MetadataHelper` để đảm bảo đúng thứ tự khởi tạo

3. **ConfidentialTransfer Extension**: 
   - **Vấn đề**: Chưa có triển khai đầy đủ cho instruction
   - **Cách khắc phục**: Cần triển khai đầy đủ các instruction cho ConfidentialTransfer

## Các extension chưa được kiểm tra đầy đủ

- DefaultAccountState
- InterestBearingMint
- MemoTransfer
- CpiGuard
- MintCloseAuthority
- GroupPointer

## Triển khai mới cho Token Extensions

Chúng tôi đã giới thiệu những cải tiến mới trong SDK:

### 1. TokenBuilder - Builder Pattern cho Mint

Sử dụng builder pattern để dễ dàng tạo token với nhiều extension:

```typescript
// Tạo TokenBuilder
const builder = new TokenBuilder(connection)
  .setTokenInfo(9, payer.publicKey)
  .addTransferFee(100, BigInt(1_000_000_000), feeAuthority, withdrawAuthority)
  .addTransferHook(programId)
  .addPermanentDelegate(delegatePublicKey);

// Xây dựng token
const { mint, transactionSignature, token } = await builder.build(payer);
```

### 2. TokenAccountBuilder - Builder Pattern cho Token Account

Sử dụng builder pattern để tạo Token Account với các extension như ImmutableOwner:

```typescript
// Tạo TokenAccountBuilder
const builder = new TokenAccountBuilder(connection, mint, owner.publicKey)
  .addImmutableOwner();

// Tạo Token Account thông thường
const { tokenAccount, transactionSignature } = await builder.buildStandardAccount(payer);

// Hoặc tạo Associated Token Account (đã có sẵn ImmutableOwner)
const { tokenAccount: ata, transactionSignature: ataTxSig } = 
  await builder.buildAssociatedAccount(payer);
```

### 3. Phương thức Token2022Factory.createToken()

```typescript
const factory = new Token2022Factory(connection);
const result = await factory.createToken(
  payer,
  {
    decimals: 9,
    mintAuthority: payer.publicKey,
    extensions: {
      transferFee: {
        feeBasisPoints: 100, // 1%
        maxFee: BigInt(1_000_000_000),
        transferFeeConfigAuthority: authority.publicKey,
        withdrawWithheldAuthority: authority.publicKey
      },
      transferHook: {
        programId: programId
      },
      permanentDelegate: delegate.publicKey
    }
  }
);
```

## Chú ý khi sử dụng

- TokenBuilder tự động kiểm tra tính tương thích giữa các extension
- TokenBuilder sẽ sắp xếp các extension theo thứ tự tối ưu để khởi tạo
- ImmutableOwner chỉ dùng cho Token Account, không áp dụng cho Mint
- Các extension TransferFee, TransferHook, PermanentDelegate và NonTransferable đã được kiểm tra kỹ và hoạt động ổn định
- MetadataPointer và ConfidentialTransfer cần được cải thiện hơn nữa

## Ưu điểm của TokenBuilder

1. **Dễ sử dụng** - API trực quan với method chaining
2. **An toàn** - Tự động kiểm tra tính tương thích giữa các extension
3. **Tối ưu** - Sắp xếp các extension theo thứ tự tối ưu
4. **Mở rộng** - Dễ dàng thêm extension mới trong tương lai

## Ưu điểm của việc sử dụng nhiều extension

1. **Tính đa dạng** - Kết hợp nhiều tính năng trong cùng một token
2. **Tối ưu chi phí** - Tiết kiệm phí giao dịch so với việc tạo nhiều token riêng biệt
3. **UX tốt hơn** - Người dùng chỉ cần tương tác với một token duy nhất
4. **Quản lý dễ dàng** - API đơn giản để quản lý tất cả tính năng

## Các yêu cầu

- Solana CLI Tools
- Node.js và npm/yarn
- Đủ SOL trong ví (tối thiểu 1 SOL) để thực hiện giao dịch 