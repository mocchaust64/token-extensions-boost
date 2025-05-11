# Ví dụ sử dụng Solana Token Extension SDK

Thư mục này chứa các ví dụ về cách sử dụng Solana Token Extension SDK trong các tình huống thực tế.

## Cài đặt

Trước khi chạy ví dụ, đảm bảo bạn đã cài đặt các dependency:

```bash
npm install
```

## Ví dụ transfer-fee-example.ts

Ví dụ này minh họa cách tạo và sử dụng token với Transfer Fee extension.

### Tính năng được demo

- Tạo token với phí chuyển khoản 1%
- Mint token cho một địa chỉ
- Chuyển token với phí tự động được trừ
- Thu thập phí từ tài khoản người nhận về mint
- Rút phí từ mint vào tài khoản đích

### Cách chạy

```bash
# Build SDK
npm run build

# Chạy ví dụ
npx ts-node examples/transfer-fee-example.ts
```

### Yêu cầu

- Kết nối Solana CLI: `solana config set --url devnet`
- Tài khoản với SOL trên devnet: `solana airdrop 1 <địa chỉ ví> --url devnet`

### Output mẫu

Khi chạy thành công, bạn sẽ thấy output như sau:

```
Using wallet: 5YourWalletAddressHere123456789
Số dư: 1.5 SOL

1. Tạo token với phí chuyển khoản 1%
Token đã được tạo: TokenAddressHere123456789

2. Mint token cho người tạo
Đã mint 1000 token vào tài khoản TokenAccountAddressHere123456789

Người nhận: RecipientAddressHere123456789
Tài khoản token của người nhận: RecipientTokenAccountHere123456789

3. Chuyển token cho người nhận với phí 1%
Phí dự kiến: 1 token
Đã chuyển 100 token
Transaction: https://explorer.solana.com/tx/TransactionSignatureHere123456789?cluster=devnet

4. Thu thập phí từ tài khoản đích về mint
Đã thu thập phí về mint
Transaction: https://explorer.solana.com/tx/HarvestTransactionSignatureHere123456789?cluster=devnet

5. Rút phí từ mint về wallet
Đã rút phí về ví FeeRecipientTokenAccountHere123456789
Transaction: https://explorer.solana.com/tx/WithdrawTransactionSignatureHere123456789?cluster=devnet

===== TỔNG KẾT =====
- Token Address: TokenAddressHere123456789
- Owner Token Account: TokenAccountAddressHere123456789
- Recipient Token Account: RecipientTokenAccountHere123456789
- Fee Recipient Token Account: FeeRecipientTokenAccountHere123456789
Xem thông tin chi tiết trên Solana Explorer (devnet)
``` 