## 2026-08-28 - XSS via unsanitized product description in ProductInfoTabs
**Vulnerability:** The plain-text fallback branch built raw HTML strings from the description text and injected them via `dangerouslySetInnerHTML` without escaping, making it susceptible to XSS attacks.
**Learning:** Even fallback paths that process text require careful sanitization when rendering HTML, especially since it processes dynamically constructed strings.
**Prevention:** Always use `DOMPurify.sanitize` (or an equivalent sanitization library) before passing data to `dangerouslySetInnerHTML`, regardless of whether the original source is assumed to be plain text or HTML.
