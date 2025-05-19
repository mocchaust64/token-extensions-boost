# Confidential Transfer Token Extension

Ví dụ này minh họa cách sử dụng `ConfidentialTransferToken` từ SDK để tạo và quản lý token với khả năng chuyển khoản bí mật.

## Các tính năng chính

- Tạo token với extension Confidential Transfer
- Cài đặt tài khoản để sử dụng chuyển khoản bí mật
- Mint token với số lượng bí mật
- Thực hiện chuyển khoản không tiết lộ số lượng

## Cách chạy ví dụ

```bash
# Cài đặt dependencies
npm install

# Chạy ví dụ
npx ts-node index.ts
```

## Giải thích code

File `index.ts` minh họa quy trình cơ bản:
1. Tạo token với extension cho phép chuyển khoản bí mật
2. Cấu hình tài khoản cho người gửi và người nhận
3. Mint token cho người gửi
4. Thực hiện chuyển khoản bí mật giữa hai tài khoản

## Các API chính

```typescript
// Tạo token mới với extension chuyển khoản bí mật
const token = await ConfidentialTransferToken.create(
  connection,
  payer,
  {
    decimals: 9,
    mintAuthority: payer.publicKey,
    autoEnable: true
  }
);

// Cấu hình tài khoản cho chuyển khoản bí mật
await token.configureAccount(
  payer, // transaction fee payer
  accountOwner // owner of the account
);

// Mint token với số lượng bí mật
await token.mintToConfidential(
  payer,
  mintAuthority,
  destinationAccount,
  amount
);

// Thực hiện chuyển khoản bí mật
await token.confidentialTransfer(
  payer,
  sourceAccount,
  destinationAccount,
  owner,
  amount
);

// Tạo tài khoản mới đã cấu hình sẵn cho chuyển khoản bí mật
const { address, signature } = await token.createConfidentialAccount(
  payer,
  owner
);

// Kiểm tra tài khoản đã được cấu hình chưa
const isConfigured = await token.isConfiguredForConfidentialTransfers(tokenAccount);

// Tạo bằng chứng cho giao dịch (trong cài đặt thực tế)
const proof = await token.generateProof(amount, sourceAccount, destinationAccount);

// Áp dụng bằng chứng (trong cài đặt thực tế)
await token.applyProof(proofData, destinationAccount);
```

## Lưu ý quan trọng

Ví dụ này chỉ minh họa API trên một cài đặt đơn giản. Trong môi trường thực tế, chuyển khoản bí mật yêu cầu sử dụng các kỹ thuật mật mã tiên tiến như Zero-Knowledge Proofs, Bulletproofs hoặc zk-SNARKs. 