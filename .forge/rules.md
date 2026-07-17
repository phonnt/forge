# Review Rules

## Quy tắc chung

1. Không hardcode credentials, API keys, tokens
2. Validate tất cả user input
3. Xử lý lỗi đầy đủ (try-catch, error boundaries)
4. Không sử dụng `any` type (TypeScript)
5. Ưu tiên `const` và immutable data

## Checklist Review

### Security (Bảo mật)
- [ ] Không có SQL injection
- [ ] Không có XSS vulnerabilities
- [ ] Authentication & Authorization đúng
- [ ] Sensitive data không bị log/expose

### Performance (Hiệu năng)
- [ ] Không có N+1 queries
- [ ] Tránh memory leaks (event listeners, timers, subscriptions)
- [ ] Sử dụng caching khi cần thiết
- [ ] Lazy loading cho heavy components

### Code Quality (Chất lượng code)
- [ ] Function/class single responsibility
- [ ] Đặt tên rõ ràng, nhất quán
- [ ] Không có dead code hoặc commented-out code
- [ ] Magic numbers được extract thành constants
- [ ] Tuân thủ coding convention của dự án

### Error Handling (Xử lý lỗi)
- [ ] Edge cases được xử lý
- [ ] Error messages có ý nghĩa
- [ ] Retry logic cho transient failures
- [ ] Graceful degradation

### Testing (Kiểm thử)
- [ ] Unit test cho business logic
- [ ] Integration test cho API endpoints
- [ ] Edge case coverage
