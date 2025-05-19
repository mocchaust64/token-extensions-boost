# Tương thích giữa các Token Extension

Tài liệu này tổng hợp kết quả kiểm tra tương thích giữa các extension trong Token Extensions (Token-2022) của Solana. Việc hiểu rõ các extension nào có thể kết hợp với nhau là rất quan trọng khi thiết kế token.

## Tổng quan

Các extension trong Token-2022 cho phép bạn mở rộng chức năng của token, nhưng không phải tất cả các extension đều có thể kết hợp với nhau. Một số extension có thể xung đột về logic hoặc gặp vấn đề kỹ thuật khi kết hợp.

## Bảng tương thích

Dưới đây là bảng tổng hợp tương thích giữa các extension phổ biến:

| Extension 1 | Extension 2 | Tương thích lý thuyết | Tương thích thực tế | Ghi chú |
|-------------|-------------|:---------------------:|:-------------------:|---------|
| NonTransferable | PermanentDelegate | ✅ | ✅ | Hoạt động tốt |
| TransferFee | PermanentDelegate | ✅ | ✅ | Hoạt động tốt |
| TransferFee | TransferHook | ✅ | ✅ | Hoạt động tốt |
| MetadataPointer | PermanentDelegate | ✅ | ❌ | Lỗi "InvalidAccountData" |
| NonTransferable | MetadataPointer | ✅ | ❌ | Lỗi "InvalidAccountData" |
| NonTransferable | TransferFee | ❌ | ❌ | Không tương thích về mặt logic |
| NonTransferable | TransferHook | ❌ | ❌ | Không tương thích về mặt logic |
| ConfidentialTransfer | TransferFee | ❌ | ❌ | Không tương thích (cho đến Solana 1.18) |
| ConfidentialTransfer | TransferHook | ❌ | ❌ | Không thể truy cập số lượng chuyển |
| ConfidentialTransfer | PermanentDelegate | ❌ | ❌ | Xung đột về quyền |

## Phân tích chi tiết

### Các cặp hoạt động tốt

1. **NonTransferable + PermanentDelegate**
   - Hoạt động tốt mặc dù có vẻ mâu thuẫn về mặt logic
   - PermanentDelegate vẫn có thể chuyển token ngay cả khi token là NonTransferable
   - Đây là một cách để tạo token không thể chuyển nhưng vẫn cho phép một số địa chỉ đặc biệt chuyển

2. **TransferFee + PermanentDelegate**
   - Kết hợp tốt, cho phép thu phí chuyển khoản và có một địa chỉ đặc biệt có thể chuyển token
   - Hữu ích cho các ứng dụng cần thu phí và có quyền kiểm soát đặc biệt

3. **TransferFee + TransferHook**
   - Kết hợp tốt, cho phép thu phí và thực hiện logic tùy chỉnh khi chuyển token
   - Rất hữu ích cho các ứng dụng DeFi phức tạp

### Các cặp gặp vấn đề kỹ thuật

1. **MetadataPointer + PermanentDelegate**
   - Tương thích về mặt logic nhưng gặp lỗi kỹ thuật "InvalidAccountData"
   - Có thể do cách xử lý không gian bộ nhớ cho metadata

2. **NonTransferable + MetadataPointer**
   - Tương thích về mặt logic nhưng gặp lỗi kỹ thuật "InvalidAccountData"
   - Có thể do cách xử lý không gian bộ nhớ cho metadata

### Các cặp không tương thích về mặt logic

1. **NonTransferable + TransferFee**
   - Không tương thích vì mâu thuẫn về mặt logic
   - Không có ý nghĩa khi thu phí chuyển khoản cho token không thể chuyển

2. **NonTransferable + TransferHook**
   - Không tương thích vì mâu thuẫn về mặt logic
   - Không có ý nghĩa khi thêm logic chuyển khoản cho token không thể chuyển

3. **ConfidentialTransfer + các extension khác**
   - Gặp nhiều hạn chế do tính chất bảo mật của giao dịch

## Khuyến nghị

1. **Khi sử dụng MetadataPointer**:
   - Nên tạo token với MetadataPointer riêng, sau đó tạo token khác với các extension khác
   - Hoặc sử dụng cách tiếp cận khác để lưu trữ metadata (như lưu trữ off-chain)

2. **Khi cần NonTransferable**:
   - Kết hợp với PermanentDelegate nếu cần một số địa chỉ đặc biệt có thể chuyển token
   - Tránh kết hợp với các extension liên quan đến chuyển khoản

3. **Khi cần TransferFee hoặc TransferHook**:
   - Có thể kết hợp với nhau hoặc với PermanentDelegate
   - Tránh kết hợp với NonTransferable hoặc ConfidentialTransfer

## Kết luận

Việc kết hợp các extension trong Token-2022 cần được cân nhắc kỹ lưỡng. Một số cặp hoạt động tốt, trong khi một số khác gặp vấn đề kỹ thuật hoặc không tương thích về mặt logic. Hiện tại, MetadataPointer vẫn gặp một số vấn đề khi kết hợp với các extension khác, có thể cần phương pháp tiếp cận khác để xử lý metadata cho token.

Chúng tôi sẽ tiếp tục cập nhật tài liệu này khi có thêm thông tin và cải tiến cho SDK. 