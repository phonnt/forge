# Custom Review Rules

Customize the AI agent's code review criteria by editing `.forge/rules.md`.

---

## Rule Structure

Rules are written in Markdown and structured into sections. Each section contains a checklist that the AI agent evaluates against every changed file.

```markdown
# Section Title

Description of what to check.

## Sub-section

- [ ] Specific check item
- [ ] Another check item (optional: can group related items)
```

---

## Example Rules (Comprehensive)

```markdown
# Review Rules

## Quy tắc chung

1. Không hardcode credentials, API keys, tokens
2. Validate tất cả user input
3. Xử lý lỗi đầy đủ (try-catch, error boundaries)
4. Không sử dụng \`any\` type (TypeScript)
5. Ưu tiên \`const\` và immutable data

## Checklist Review

### Security (Bảo mật)
- [ ] Không có SQL injection
- [ ] Không có XSS vulnerabilities
- [ ] Authentication & Authorization đúng
- [ ] Sensitive data không bị log/expose
- [ ] CSRF protection enabled
- [ ] Input validation & sanitization
- [ ] Rate limiting implemented
- [ ] HTTPS enforced

### Performance (Hiệu năng)
- [ ] Không có N+1 queries
- [ ] Tránh memory leaks (event listeners, timers, subscriptions)
- [ ] Sử dụng caching khi cần thiết
- [ ] Lazy loading cho heavy components
- [ ] Database query optimization (indexes, eager loading)
- [ ] Bundle size optimization (tree shaking, code splitting)
- [ ] API response pagination
- [ ] Debounce/throttle for frequent operations

### Code Quality (Chất lượng code)
- [ ] Function/class single responsibility
- [ ] Đặt tên rõ ràng, nhất quán
- [ ] Không có dead code hoặc commented-out code
- [ ] Magic numbers được extract thành constants
- [ ] Tuân thủ coding convention của dự án
- [ ] DRY principle (don't repeat yourself)
- [ ] Cyclomatic complexity under threshold
- [ ] Proper TypeScript types (no implicit any)

### Error Handling (Xử lý lỗi)
- [ ] Edge cases được xử lý
- [ ] Error messages có ý nghĩa
- [ ] Retry logic cho transient failures
- [ ] Graceful degradation
- [ ] Proper HTTP status codes
- [ ] Structured error responses
- [ ] Circuit breaker for external services
- [ ] Timeout handling

### Testing (Kiểm thử)
- [ ] Unit test cho business logic
- [ ] Integration test cho API endpoints
- [ ] Edge case coverage
- [ ] Mock external dependencies
- [ ] Test naming convention followed

### API Design
- [ ] RESTful conventions followed
- [ ] Consistent response format
- [ ] API versioning strategy
- [ ] Proper HTTP methods (GET, POST, PUT, DELETE)
- [ ] Request validation
- [ ] Pagination metadata included

### Frontend (if applicable)
- [ ] Accessibility (a11y) standards
- [ ] Responsive design
- [ ] Loading and error states
- [ ] Component reusability
- [ ] State management best practices

### Documentation
- [ ] New endpoints documented
- [ ] Complex logic has inline comments
- [ ] README updated if needed
- [ ] Breaking changes documented
```

---

## Severity Guidelines

The AI assigns severity levels to each finding:

| Severity | When to use | Example |
|----------|-------------|---------|
| **critical** | Must fix before merge — security holes, data loss, crashes | SQL injection, hardcoded API key |
| **major** | Should fix before merge — bugs, significant perf issues | N+1 query, missing error handling |
| **minor** | Nice to fix — style, minor improvements | Naming convention, unused variable |
| **info** | Observation or suggestion | Optional optimization, refactoring idea |

---

## Category Reference

| Category | What it covers |
|----------|---------------|
| `security` | SQL injection, XSS, hardcoded secrets, auth issues |
| `performance` | N+1 queries, memory leaks, missing caching, slow operations |
| `bug` | Logic errors, null references, race conditions, edge cases |
| `style` | Naming conventions, formatting, code structure |
| `maintainability` | Complexity, coupling, testability, code repetition |
| `naming` | Unclear or inconsistent variable/function names |
| `other` | Any issue not fitting the above |

---

## Using Custom Rules Per Review

You can override the default rules for a single review:

```bash
forge review https://github.com/owner/repo/pull/42 --rules ./security-focus-rules.md
```

---

## Excluding Files

Add exclusions in `.forge/skills.yaml`:

```yaml
skills:
  code-review:
    enabled: true
    options:
      exclude_patterns:
        - "*.test.*"
        - "*.spec.*"
        - "*.config.*"
        - "node_modules/**"
        - "dist/**"
        - ".forge/**"
```

---

## Tips

1. **Start with the default template** and iterate based on common issues you find
2. **Keep rules specific** — vague rules produce vague results
3. **Organize by domain** (security, performance, etc.) for easier maintenance
4. **Review findings regularly** and update rules to reduce false positives
5. **Use context** in rule descriptions — explain WHY, not just WHAT
