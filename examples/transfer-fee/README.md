# Ví dụ Transfer Fee

Thư mục này chứa các ví dụ về cách sử dụng Transfer Fee Extension với token SPL Token-2022.

## Các ví dụ

### 1. Cơ bản (index.ts)

Ví dụ cơ bản về cách tạo và sử dụng một token với TransferFee extension. Ví dụ này bao gồm:

- Tạo token với phí chuyển khoản 1%
- Mint token cho chủ sở hữu
- Chuyển token và tự động tính toán phí
- Thu thập (harvest) phí từ tài khoản giao dịch về mint
- Rút phí từ mint về ví của người thu phí

Để chạy:
```bash
ts-node examples/transfer-fee/index.ts
```

### 2. Quản lý nhiều tài khoản (multi-account.ts)

Ví dụ nâng cao về cách quản lý phí với nhiều tài khoản. Ví dụ này minh họa:

- Tạo token với phí chuyển khoản 1%
- Chuyển token đến nhiều tài khoản khác nhau
- Tìm tất cả các tài khoản đang giữ phí
- Thu thập phí từ nhiều tài khoản cùng một lúc
- Rút phí về một địa chỉ duy nhất

Để chạy:
```bash
ts-node examples/transfer-fee/multi-account.ts
```

## Chức năng chính

TransferFeeToken cung cấp các phương thức sau:

- `create()` - Tạo token mới với TransferFeeConfig extension
- `calculateFee()` - Tính toán phí cho một giao dịch
- `transfer()` - Chuyển token với phí
- `harvestWithheldTokensToMint()` - Thu thập phí từ các tài khoản về mint
- `withdrawFeesFromMint()` - Rút phí từ mint về địa chỉ chỉ định
- `findAccountsWithWithheldFees()` - Tìm tất cả tài khoản đang giữ phí

## Các yêu cầu

- Solana CLI Tools
- Node.js và npm/yarn
- Đủ SOL trong ví (tối thiểu 1 SOL) để thực hiện giao dịch 