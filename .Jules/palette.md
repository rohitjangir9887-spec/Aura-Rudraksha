## 2024-09-14 - Improve Support Ticket Actions UX
**Learning:** Discovered that support ticket action buttons (delete and send follow-up) lacked loading states for async operations and the icon-only delete button missed an `aria-label`.
**Action:** Always ensure icon-only buttons have descriptive `aria-label`s and provide visual loading feedback (`Loader2` + `animate-spin`) for all async actions to prevent user confusion and double-clicks.
