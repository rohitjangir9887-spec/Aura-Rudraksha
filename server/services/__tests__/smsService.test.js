import { describe, it, expect } from "vitest";
import { normalizeIndianPhone, formatOrderSuccessSmsMessage, getSmsConfig } from "../smsService.js";

describe("SMS Service Unit Tests", () => {
  it("normalizes various Indian phone formats to 10 digits", () => {
    expect(normalizeIndianPhone("+919876543210")).toBe("9876543210");
    expect(normalizeIndianPhone("09876543210")).toBe("9876543210");
    expect(normalizeIndianPhone("919876543210")).toBe("9876543210");
    expect(normalizeIndianPhone("9876543210")).toBe("9876543210");
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("9876543210");
  });

  it("rejects invalid phone numbers", () => {
    expect(normalizeIndianPhone("12345")).toBeNull();
    expect(normalizeIndianPhone("abcdefghij")).toBeNull();
    expect(normalizeIndianPhone("")).toBeNull();
    expect(normalizeIndianPhone(null)).toBeNull();
  });

  it("formats transactional confirmation SMS message", () => {
    const order = { orderNumber: "AURA-260904-001234", finalAmount: 2450 };
    const msg = formatOrderSuccessSmsMessage(order);
    expect(msg).toContain("Aura Rudraksha:");
    expect(msg).toContain("#AURA-260904-001234");
    expect(msg).toContain("Rs 2450");
  });

  it("returns default SMS configuration structure", () => {
    const config = getSmsConfig();
    expect(config).toHaveProperty("provider");
    expect(config).toHaveProperty("isConfigured");
  });
});
