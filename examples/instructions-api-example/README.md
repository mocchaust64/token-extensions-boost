# Ví dụ sử dụng API mới (Instructions-based) của Token Extension Boost SDK

Thư mục này chứa các ví dụ minh họa về cách sử dụng API mới dựa trên instructions của Token Extension Boost SDK. Các ví dụ này được thiết kế để hoạt động tốt với wallet adapter và cải thiện bảo mật bằng cách không yêu cầu truyền vào Keypair.

## Các ví dụ bao gồm

1. `create-token.ts` - Tạo token với MetadataPointer và TransferFee extensions
2. `mint-token.ts` - Mint token vào token account
3. `transfer-token.ts` - Chuyển token giữa các tài khoản với phí tự động
4. `withdraw-fees.ts` - Rút phí đã được giữ lại từ các token account

## Ưu điểm của API mới

| API cũ (dựa trên Keypair) | API mới (dựa trên Instructions) |
|--------------------------|--------------------------------|
| Yêu cầu truyền Keypair vào hàm | Chỉ cần truyền PublicKey của wallet |
| Không tích hợp được với wallet adapter | Tích hợp dễ dàng với wallet adapter |
| Không thể kết hợp nhiều instructions | Có thể kết hợp nhiều instructions từ các nguồn khác nhau |
| Thực thi transaction ngay lập tức | Người dùng có thể xem trước transaction trước khi ký |

## Cài đặt

```bash
npm install
```

## Chạy ví dụ

1. **Tạo token mới**:
```bash
npx ts-node src/create-token.ts
```

2. **Mint token**:
```bash
npx ts-node src/mint-token.ts <mint-address> <payer-secret-key>
```

3. **Chuyển token**:
```bash
npx ts-node src/transfer-token.ts <mint-address> <source-token-account> <payer-secret-key>
```

4. **Rút phí từ token account**:
```bash
npx ts-node src/withdraw-fees.ts <mint-address> <payer-secret-key>
```

## Lưu ý quan trọng

- Các ví dụ này sử dụng secret key của keypair cho mục đích demo. Trong môi trường thực tế, bạn nên sử dụng wallet adapter để ký transactions.
- Tất cả các ví dụ đều sử dụng Solana devnet. Bạn có thể dễ dàng điều chỉnh để sử dụng trên mainnet-beta hoặc testnet.
- Phương pháp API mới (instructions-based) là cách được khuyến nghị để triển khai ứng dụng với Token Extension Boost SDK.

## Tóm tắt các phương thức API mới

### TokenBuilder
- `createTokenInstructions()`: Trả về các instructions để tạo token với extensions

### TransferFeeToken
- `createTransferInstruction()`: Trả về instruction để chuyển token với phí tự động
- `createAccountAndMintToInstructions()`: Trả về các instructions để tạo token account và mint tokens
- `createWithdrawFeesFromAccountsInstruction()`: Trả về instruction để rút phí từ các token accounts

## Tích hợp với Wallet Adapter

Đây là mẫu cơ bản để tích hợp với wallet adapter trong ứng dụng React:

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TokenBuilder } from 'solana-token-extension-boost';

function CreateTokenButton() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  const handleCreateToken = async () => {
    if (!publicKey) return;
    
    const tokenBuilder = new TokenBuilder(connection);
    tokenBuilder.setTokenInfo(9, publicKey, null);
    tokenBuilder.addMetadata('My Token', 'TOKEN', 'https://example.com/logo.png');
    
    const { instructions, signers, mint } = await tokenBuilder.createTokenInstructions(publicKey);
    
    const transaction = new Transaction().add(...instructions);
    
    // Wallet adapter sẽ xử lý việc ký transaction
    await sendTransaction(transaction, connection, { signers });
    
    console.log(`Token created: ${mint.toString()}`);
  };
  
  return <button onClick={handleCreateToken}>Create Token</button>;
}
``` 