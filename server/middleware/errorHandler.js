// Middleware for error handling.
// - Detailed errors are logged SERVER-SIDE ONLY (stack, message, params).
// - Clients get friendly, generic messages - never stack traces, internal
//   paths, driver errors or secrets.
const FRIENDLY_MESSAGES = {
  400: "Your request could not be processed. Please check the details and try again.",
  401: "Please sign in again to continue.",
  403: "You do not have permission to perform this action.",
  404: "The requested item was not found.",
  429: "Too many requests. Please wait a moment and try again."
};

function isCastOrValidation(err) {
  return err?.name === "CastError" || err?.name === "ValidationError" || err?.code === 11000;
}

export function errorHandler(err, req, res, next) {
  // Server-side detailed log (safe to include request context)
  console.error("❌ [API Error]:", err?.stack || err?.message || err, req.method, req.originalUrl);

  const existing = res.statusCode && res.statusCode !== 200 ? res.statusCode : null;
  if (existing && existing < 500) {
    // Already a client-facing status set by a controller - keep it
    return res.status(existing).json({
      success: false,
      message: res.statusMessage || err?.message || FRIENDLY_MESSAGES[existing]
    });
  }

  if (isCastOrValidation(err)) {
    // Bad input (NoSQL-injection-shaped payloads, duplicate keys, failed casts)
    return res.status(400).json({ success: false, message: FRIENDLY_MESSAGES[400] });
  }

  const status = err?.status || err?.statusCode || 500;
  const message =
    status < 500
      ? (FRIENDLY_MESSAGES[status] || err?.message || "Something went wrong.")
      : "Something went wrong on our side. Please try again in a moment. If the problem persists, contact support.";

  return res.status(status).json({ success: false, message });
}
