# Permanent Delegate Token Extension

Ví dụ này minh họa cách sử dụng `PermanentDelegateToken` từ SDK để tạo và quản lý token với permanent delegate - một entity có thể di chuyển token từ bất kỳ tài khoản nào mà không cần sự đồng ý.

## Các tính năng chính

- Tạo token với permanent delegate
- Chuyển token từ bất kỳ tài khoản nào mà không cần sự đồng ý của chủ sở hữu
- Kiểm tra và xác thực quyền permanent delegate
- Tạo và quản lý tài khoản token

## Cách chạy ví dụ

```bash
# Cài đặt dependencies
npm install

# Chạy ví dụ
npx ts-node index.ts
```

## Giải thích code

File `index.ts` minh họa quy trình cơ bản:
1. Tạo token với permanent delegate (thường là một quyền hành chính)
2. Tạo tài khoản token cho người dùng
3. Chuyển token từ tài khoản người dùng dưới quyền permanent delegate
4. Kiểm tra thông tin permanent delegate

## Các API chính

```typescript
// Tạo token mới với permanent delegate
const token = await PermanentDelegateToken.create(
  connection,
  payer,
  {
    decimals: 9,
    mintAuthority: payer.publicKey,
    permanentDelegate: delegatePublicKey
  }
);

// Tạo token account
const userTokenAccount = await token.createTokenAccount(
  payer,
  userPublicKey
);

// Chuyển token bằng quyền permanent delegate
const signature = await token.transferAsDelegate(
  delegateKeypair, 
  sourceAccount, 
  destinationAccount, 
  amount
);

// Kiểm tra xem một địa chỉ có phải là permanent delegate hay không
const isDelegate = await token.isPermanentDelegate(address);

// Lấy địa chỉ permanent delegate của token
const delegate = await token.getPermanentDelegate();

// Tạo hoặc lấy token account hiện có
const { address, signature } = await token.createOrGetTokenAccount(
  payer,
  ownerPublicKey
);
```

## Trường hợp sử dụng

Permanent Delegate rất hữu ích trong các trường hợp sau:

1. **Token giáo dục hoặc tài năng** - Có thể thu hồi nếu người dùng không đáp ứng các yêu cầu

2. **Token quản trị** - Cho phép can thiệp hành chính khi cần thiết

3. **Token tuân thủ quy định** - Cho phép cơ quan quản lý tương tác với token khi cần

4. **Ứng dụng chống gian lận** - Cho phép thu hồi token từ tài khoản vi phạm

## Cân nhắc bảo mật

Permanent Delegate có quyền chuyển token mà không cần sự đồng ý của chủ sở hữu, vì vậy:

- Chỉ sử dụng cho các trường hợp thực sự cần thiết
- Permanent delegate nên được bảo mật và kiểm soát chặt chẽ
- Người dùng nên được thông báo rõ ràng về sự tồn tại của permanent delegate
- Trong nhiều trường hợp, nên sử dụng cơ chế đa chữ ký hoặc DAO để kiểm soát quyền permanent delegate 