# Solana Token Extension SDK

SDK đơn giản hóa việc tương tác với các Token Extensions trên Solana, giúp developers dễ dàng tạo và quản lý tokens với các tính năng mở rộng mà không cần phải xử lý các chi tiết phức tạp của Solana Token Extensions Program.

## Giới thiệu

Solana Token Extensions (Token-2022) mang đến nhiều tính năng mới cho token trên Solana, giúp tokens trở nên linh hoạt và có thể tùy chỉnh hơn. SDK này được tạo ra nhằm mục đích đơn giản hóa việc sử dụng các tính năng này, giúp developers có thể tích hợp chúng vào ứng dụng của mình một cách dễ dàng.

## Tính năng hiện có

SDK hiện đang hỗ trợ các Token Extensions sau:

- **Transfer Fee**: Tạo token với phí chuyển khoản tự động
- **Metadata Pointer**: Lưu trữ và quản lý metadata cho token
- **Immutable Owner**: Tạo tài khoản token với chủ sở hữu không thể thay đổi
- **Confidential Transfer**: Thực hiện giao dịch chuyển token bảo mật, che giấu số lượng

## Roadmap

Các Token Extensions sắp được phát triển và tích hợp vào SDK:

- **Transfer Hooks**: Cho phép thực thi logic tùy chỉnh khi token được chuyển khoản
- **Permanent Delegation**: Ủy quyền vĩnh viễn quyền quản lý token cho một địa chỉ khác
- **Non-transferable**: Tạo token không thể chuyển nhượng (soulbound tokens)
- **Default Account State**: Thiết lập trạng thái mặc định cho các tài khoản token mới
- **Interest-Bearing**: Tạo token có khả năng tính lãi theo thời gian
- **Mint Close Authority**: Thiết lập quyền đóng tài khoản mint

Ưu tiên phát triển sẽ dựa trên phản hồi từ cộng đồng và nhu cầu của người dùng. Nếu bạn muốn đóng góp vào việc phát triển một trong các tính năng trên, vui lòng tạo issue hoặc liên hệ với chúng tôi.

## Cài đặt

```bash
npm install solana-token-extension-sdk
```

## Ví dụ

Xem các ví dụ đầy đủ trong thư mục `examples`:

- [Transfer Fee Example](./examples/basic-transfer-fee-example.ts): Ví dụ cơ bản về sử dụng Transfer Fee extension
- [Multi-account Transfer Fee Example](./examples/multi-account-transfer-fee-example.ts): Ví dụ nâng cao về Transfer Fee với nhiều tài khoản
- [Metadata Pointer Example](./examples/metadata-pointer-example.ts): Ví dụ về quản lý metadata cho token
- [Transfer Fee with Metadata Example](./examples/transfer-fee-with-metadata-example.ts): Ví dụ kết hợp cả Transfer Fee và Metadata
- [Immutable Owner Example](./examples/immutable-owner-example.ts): Ví dụ tạo tài khoản token với chủ sở hữu không thể thay đổi
- [Confidential Transfer Example](./examples/confidential-transfer-example.ts): Ví dụ thực hiện giao dịch chuyển token bảo mật

## Tài liệu hướng dẫn

Tài liệu hướng dẫn chi tiết sẽ sớm được cung cấp. Trong thời gian chờ đợi, bạn có thể tham khảo các ví dụ trong thư mục `examples` để hiểu cách sử dụng SDK.

## Đóng góp

Chúng tôi chào đón mọi đóng góp và góp ý để cải thiện SDK. Vui lòng tạo issue hoặc pull request để đóng góp.

## License

MIT 