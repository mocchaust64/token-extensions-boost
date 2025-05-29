# Token Extensions Boost - Wallet Adapter Demo

Demo đơn giản sử dụng Token Extensions Boost SDK để tạo token SPL-22 trực tiếp từ trình duyệt với Phantom wallet.

## Cài đặt trình duyệt

1. Đảm bảo bạn đã cài đặt [Phantom wallet extension](https://phantom.app/download) cho trình duyệt
2. Chuyển Phantom sang chế độ Devnet:
   - Mở Phantom wallet
   - Vào Settings (biểu tượng bánh răng)
   - Chọn "Developer Settings"
   - Chọn "Change Network" và chuyển sang "Devnet"

## Chạy demo

Có ba cách để chạy demo:

### Cách 1: Sử dụng HTTP server đơn giản

```bash
# Cài đặt http-server nếu chưa có
npm install -g http-server

# Chạy HTTP server trong thư mục ví dụ
cd examples/wallet-adapter-example
http-server -p 8080
```

Sau đó mở trình duyệt và truy cập http://localhost:8080

### Cách 2: Mở trực tiếp file HTML

Bạn có thể mở file `examples/wallet-adapter-example/index.html` trực tiếp trong trình duyệt.

### Cách 3: Sử dụng npm/yarn (Khuyến nghị)

```bash
# Cài đặt dependencies
cd examples/wallet-adapter-example
npm install
# hoặc
yarn

# Chạy dev server
npm run dev
# hoặc
yarn dev
```

Trang web sẽ tự động mở tại http://localhost:3000

## Cách sử dụng

1. Kết nối Phantom wallet bằng cách bấm nút "Kết nối ví"
2. Điền thông tin token:
   - Tên token
   - Ký hiệu token (symbol)
   - Số thập phân (decimals)
   - Tùy chọn phí chuyển khoản (transfer fee)
3. Nhấn nút "Tạo Token"
4. Xác nhận giao dịch trong Phantom wallet
5. Xem thông tin token đã tạo trên Solana Explorer

## Lưu ý

- Demo này kết nối với Solana Devnet
- Bạn cần có SOL trên Devnet để thanh toán phí giao dịch
- Có thể lấy SOL Devnet miễn phí từ [Solana Faucet](https://solfaucet.com/) 