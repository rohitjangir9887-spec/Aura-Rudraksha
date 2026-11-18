// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { rememberCheckout, finishCheckout, paymentConfirmed } from "../checkoutCompletion";

it("recognizes only a paid order or confirmed COD", () => {
  expect(paymentConfirmed(null)).toBe(false);
  expect(paymentConfirmed({ status: "Pending", paymentMode: "COD" })).toBe(false);
  expect(paymentConfirmed({ status: "Cancelled", paymentStatus: "COD" })).toBe(false);
  expect(paymentConfirmed({ status: "Confirmed", paymentStatus: "COD" })).toBe(true);
  expect(paymentConfirmed({ paymentStatus: "Paid" })).toBe(true);
});

it("keeps the cart and any newer Buy Now intent when opening an older result", () => {
  const clear = vi.fn();
  rememberCheckout(sessionStorage, "a", "first");
  sessionStorage.setItem("aura_buy_now_intent", "second");
  finishCheckout(sessionStorage, "a", clear);
  expect(clear).not.toHaveBeenCalled();
  expect(sessionStorage.getItem("aura_buy_now_intent")).toBe("second");
});

it("clears a completed cart checkout only once", () => {
  const clear = vi.fn();
  rememberCheckout(sessionStorage, "b", null);
  finishCheckout(sessionStorage, "b", clear);
  finishCheckout(sessionStorage, "b", clear);
  expect(clear).toHaveBeenCalledTimes(1);
});
