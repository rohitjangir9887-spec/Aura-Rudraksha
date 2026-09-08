/**
 * Utility for Indian phone number normalization and query matching.
 * Handles:
 *   +91 9811092834
 *   +919811092834
 *   919811092834
 *   09811092834
 *   9811092834
 */

export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return "";
  const str = String(rawPhone).trim();
  const digits = str.replace(/\D/g, "");
  
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91${digits.slice(2)}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length > 10) {
    const last10 = digits.slice(-10);
    return `+91${last10}`;
  }
  return str;
}

export function extractRaw10DigitPhone(rawPhone) {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Builds MongoDB $or query conditions to match an Indian phone in all standard formats.
 */
export function buildPhoneQueryVariants(rawPhone, fields = ["customerPhone", "phone", "shippingAddress.phone"]) {
  const tenDigit = extractRaw10DigitPhone(rawPhone);
  if (!tenDigit || tenDigit.length < 10) {
    if (!rawPhone) return [];
    const clean = String(rawPhone).trim();
    return fields.map(f => ({ [f]: clean }));
  }

  const variants = [
    tenDigit,
    `+91${tenDigit}`,
    `+91 ${tenDigit}`,
    `91${tenDigit}`,
    `0${tenDigit}`,
    `+91-${tenDigit}`
  ];

  const orConditions = [];
  for (const field of fields) {
    for (const v of variants) {
      orConditions.push({ [field]: v });
    }
    // Also add regex suffix match for resilience
    orConditions.push({ [field]: { $regex: `${tenDigit}$` } });
  }

  return orConditions;
}
