## 2024-05-20 - Unsanitized Plain Text Fallback XSS
**Vulnerability:** The `ProductInfoTabs.jsx` component formatted plain text into HTML (replacing markdown bold syntax) and passed the resulting `formattedHtml` directly into `dangerouslySetInnerHTML` without escaping, allowing XSS through product descriptions.
**Learning:** Even when handling supposedly "plain text" descriptions that just need line breaks or simple bolding, dynamically constructing HTML and injecting it via `dangerouslySetInnerHTML` is an XSS vector if not sanitized.
**Prevention:** Always sanitize dynamically constructed HTML with `DOMPurify.sanitize` (or an equivalent) before passing it to `dangerouslySetInnerHTML`, even in fallback or plain text paths.
