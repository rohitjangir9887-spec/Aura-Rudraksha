## 2023-10-25 - [HIGH] Fix IDOR in Order Fetching
**Vulnerability:** IDOR (Insecure Direct Object Reference) bypass for order details.
**Learning:** Found a hardcoded bypass (`order.id !== "AURA-260906-000003"`) inside `server/controllers/orderController.js` that bypassed `isAdmin` and `authUserId` checks, potentially exposing sensitive PII to any authenticated user.
**Prevention:** Remove hardcoded IDs intended for testing from production authentication/authorization logic.
