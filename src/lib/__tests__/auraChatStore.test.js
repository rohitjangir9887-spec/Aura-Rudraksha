import { formatMessageTime } from "../auraChatStore.js";

describe("formatMessageTime", () => {
  it("should format valid ISO string correctly", () => {
    const isoString = "2023-10-10T10:30:00.000Z";
    const result = formatMessageTime(isoString);

    // Create expectations dynamically to avoid locale/timezone flaky tests
    const expectedDate = new Date(isoString);
    const expectedString = expectedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    expect(result).toBe(expectedString);
  });

  it("should return empty string for null or undefined", () => {
    expect(formatMessageTime(null)).toBe("");
    expect(formatMessageTime(undefined)).toBe("");
    expect(formatMessageTime("")).toBe("");
  });

  it("should return empty string for invalid date string", () => {
    expect(formatMessageTime("invalid-date")).toBe("");
  });
});
