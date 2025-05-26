# Ví dụ cơ bản về Burn và Transfer

Ví dụ này minh họa cách sử dụng các phương thức mới `transfer` và `burn` từ lớp Token gốc.

## Các tính năng

Ví dụ minh họa:
- Tạo một token cơ bản
- Tạo các tài khoản token cho người dùng
- Mint tokens cho người dùng
- Chuyển tokens giữa các tài khoản
- Burn (đốt) tokens

## Cách chạy

```bash
npx ts-node examples/basic-burn-transfer/index.ts
```

## Lưu ý

Ví dụ này sử dụng:
1. Phương thức `transfer` từ lớp Token gốc để chuyển tokens
2. Phương thức `burnTokens` từ lớp Token gốc để đốt tokens
3. Hàm `mintTo` từ thư viện `@solana/spl-token` để mint tokens (vì Token gốc không có phương thức mint)

Để triển khai đầy đủ, bạn có thể cân nhắc tạo phương thức mint trong lớp Token gốc hoặc sử dụng các lớp extension cụ thể. 