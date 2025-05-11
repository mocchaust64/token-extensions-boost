# Solana Token Extension SDK

SDK đơn giản hóa việc tương tác với các Token Extensions trên Solana, giúp developers dễ dàng tạo và quản lý tokens với các tính năng mở rộng.

## Cài đặt

```bash
npm install solana-token-extension-sdk
```

## Tính năng

SDK này hỗ trợ các Token Extensions sau:

- **Transfer Fee**: Tạo token với phí chuyển khoản tự động
- Các extension khác đang được phát triển...

## Cách sử dụng

### Transfer Fee Extension

Transfer Fee cho phép thu phí tự động khi token được chuyển. Phí được giữ lại tại tài khoản người nhận và có thể được thu thập bởi chủ sở hữu token.

#### Tạo token với Transfer Fee

```typescript
import { Connection, Keypair } from "@solana/web3.js";
import { TransferFeeToken } from "solana-token-extension-sdk";

// Kết nối tới Solana
const connection = new Connection("https://api.devnet.solana.com");

// Khởi tạo các keypair cần thiết
const payer = Keypair.fromSecretKey(/* keypair bí mật */);
const transferFeeConfigAuthority = Keypair.generate();
const withdrawWithheldAuthority = Keypair.generate();

// Tạo token với phí chuyển 1%
const token = await TransferFeeToken.create(
  connection,
  payer,
  {
    decimals: 9,
    mintAuthority: payer.publicKey,
    transferFeeConfig: {
      feeBasisPoints: 100, // 1%
      maxFee: BigInt(10_000_000_000), // Tối đa 10 token
      transferFeeConfigAuthority,
      withdrawWithheldAuthority,
    }
  }
);

// Lấy địa chỉ mint
const mintAddress = token.getMint();
console.log(`Token đã được tạo: ${mintAddress.toString()}`);
```

#### Chuyển token với fee

```typescript
// Chuyển token từ source đến destination
const signature = await token.transfer(
  sourceTokenAccount,
  destinationTokenAccount,
  owner, // Chủ sở hữu tài khoản nguồn
  BigInt(1_000_000_000), // Số lượng token (1 với 9 decimals)
  9 // số thập phân
);
```

#### Thu thập phí từ các tài khoản

```typescript
// Thu thập phí từ các tài khoản về mint
const signature = await token.harvestWithheldTokensToMint(
  [tokenAccount1, tokenAccount2]
);
```

#### Rút phí từ mint

```typescript
// Rút phí từ mint về tài khoản đích
const signature = await token.withdrawFeesFromMint(
  destinationTokenAccount
);
```

## Ví dụ đầy đủ

Xem ví dụ đầy đủ trong thư mục `examples`:

- [Transfer Fee Example](./examples/transfer-fee-example.ts): Ví dụ đầy đủ về sử dụng Transfer Fee extension

Để chạy ví dụ:

```bash
# Cài đặt các dependency
npm install

# Build SDK
npm run build

# Chạy ví dụ Transfer Fee trên devnet
npx ts-node examples/transfer-fee-example.ts
```

## Đóng góp

Chúng tôi chào đón mọi đóng góp và góp ý để cải thiện SDK. Vui lòng tạo issue hoặc pull request để đóng góp.

## License

MIT 