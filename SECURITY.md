# Security Policy

## Supported Versions

The following versions of Aura Rudraksha are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Aura Rudraksha and our users' data extremely seriously. If you discover a security vulnerability, please report it privately.

- **Email**: security@aurarudraksha.com
- **Scope**: Any potential vulnerabilities including IDOR, authentication bypass, payment tampering, rate limit evasion, or data exposure.

Please do not disclose security issues publicly until our security team has addressed and resolved them.

## Security Architecture & Defenses

1. **Server-Authoritative Pricing & Checkout**: All order amounts, discounts, shipping charges, and totals are computed strictly on the server using secure product and pricing services. Client payloads are never trusted for financial calculations.
2. **Strict Firebase Authentication & Authorization**: All API requests involving private user data or admin mutations require verified Firebase ID tokens (`requireAuth`). Role checks are performed server-side (`requireAdmin`) against trusted MongoDB records and initial admin configurations. Client-supplied role flags are ignored.
3. **IDOR Prevention**: All customer endpoints (orders, addresses, wishlist, tickets, profile) strictly verify resource ownership against `req.user.authUserId`.
4. **Distributed Rate Limiting**: Powered by `@upstash/ratelimit` and Upstash Redis with robust in-memory fallback, protecting sensitive endpoints (login, admin login, checkout, Aura AI, coupon validation, support, reviews).
5. **Security Headers**: Production responses enforce strict Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and X-Frame-Options.
6. **Secret Management**: All sensitive credentials (MongoDB URI, Firebase private keys, Razorpay secret keys, NVIDIA API keys) remain strictly server-side.
