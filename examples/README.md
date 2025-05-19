# Solana Token Extension Boost - Examples

Thư mục này chứa các ví dụ về cách sử dụng SDK Solana Token Extension Boost để làm việc với các extension của Solana Token 2022.

## Cấu trúc thư mục

Mỗi extension có thư mục riêng với mã nguồn và tài liệu hướng dẫn:

- **[transfer-fee](./transfer-fee/)** - Ví dụ về tạo token với khả năng tính phí chuyển khoản tự động
- **[confidential-transfer](./confidential-transfer/)** - Ví dụ về token với chuyển khoản bí mật
- **[metadata-pointer](./metadata-pointer/)** - Ví dụ về token với metadata phong phú
- **[immutable-owner](./immutable-owner/)** - Ví dụ về token account với owner không thể thay đổi
- **[permanent-delegate](./permanent-delegate/)** - Ví dụ về token với khả năng kiểm soát bởi permanent delegate

## Cách chạy ví dụ

Mỗi thư mục ví dụ chứa file `index.ts` có thể chạy độc lập. Để chạy một ví dụ:

```bash
# Di chuyển vào thư mục của extension bạn muốn thử
cd transfer-fee

# Cài đặt dependencies
npm install

# Chạy ví dụ
npx ts-node index.ts
```

## Yêu cầu

- Node.js 14+ và npm
- Solana CLI Tools (để tạo ví trên Solana devnet)
- Ví Solana với một số SOL trên devnet

## Cách thiết lập môi trường

1. **Cài đặt Solana CLI Tools**:
   ```
   sh -c "$(curl -sSfL https://release.solana.com/v1.17.5/install)"
   ```

2. **Tạo ví Solana**:
   ```
   solana-keygen new
   ```

3. **Chuyển sang devnet**:
   ```
   solana config set --url devnet
   ```

4. **Airdrop SOL cho ví**:
   ```
   solana airdrop 1
   ```

## Giải thích Token-2022 Extensions

### Transfer Fee

Extension này cho phép token tự động thu phí khi được chuyển, mở ra khả năng tạo tokenomics phức tạp và mô hình doanh thu đa dạng.

### Confidential Transfer

Extension này cho phép thực hiện các giao dịch bí mật không tiết lộ số lượng, tăng cường quyền riêng tư cho người dùng token.

### Metadata Pointer

Extension này lưu trữ và quản lý metadata phong phú cho token, cho phép token chứa thông tin và thuộc tính bổ sung.

### Immutable Owner

Extension này đảm bảo rằng owner của tài khoản token không thể thay đổi, tăng cường bảo mật chống lại các cuộc tấn công chiếm đoạt.

### Permanent Delegate

Extension này cho phép chỉ định một địa chỉ có khả năng chuyển token từ bất kỳ tài khoản nào mà không cần sự đồng ý, hữu ích cho các token cần khả năng thu hồi.

## Tích hợp với dự án của bạn

```javascript
// Cài đặt SDK
npm install solana-token-extension-boost

// Import extension bạn cần
import { TransferFeeToken } from "solana-token-extension-boost";

// Sử dụng extension
const token = await TransferFeeToken.create(
  connection,
  payer,
  {
    decimals: 9,
    mintAuthority: mintAuthority.publicKey,
    transferFeeConfig: {
      feeBasisPoints: 100, // 1%
      maxFee: BigInt(1000000000),
      transferFeeConfigAuthority,
      withdrawWithheldAuthority
    }
  }
);
``` 

## Token Extension Examples

This directory contains examples for using the Token Extension Boost SDK with various token extensions.

### Available Examples

- **Transfer Fee**: Examples showing how to create and use tokens with transfer fees
  - Create a token with transfer fee
  - Withdraw withheld fees
  - Transfer tokens with fees

- **Metadata**: Examples showing how to create tokens with embedded metadata
  - Create a token with metadata (new simplified API)
  - Read and update token metadata
  - Create NFTs with rich metadata

- **Non-transferable**: Examples showing how to create non-transferable tokens (soulbound tokens)
  - Create a non-transferable token
  - Mint non-transferable tokens to an account
  - Verify non-transferable properties

- **Multi-extension Examples**: Examples showing how to create tokens with multiple extensions
  - Create a token with both transfer fee and metadata
  - Create a token with metadata and non-transferable extension
  - Create a token with transfer hook and metadata

### Running the Examples

To run an example, use the following commands:

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run a specific example
npx ts-node examples/non-transferable/create-non-transferable-token.ts
```

### Prerequisites

- Node.js and npm installed
- A Solana wallet (will be generated if not available)
- SOL in your wallet for transactions (examples will try to airdrop on devnet)

### Using the Examples as Reference

These examples demonstrate common patterns for working with Token Extensions:

1. Connect to a Solana cluster
2. Create a new token with specific extensions
3. Initialize the extensions with appropriate parameters
4. Interact with the token based on its extension features
5. Query and display information about the token and its extensions 