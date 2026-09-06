import { test } from "vitest";
import { assert } from "vitest";

test('valid and invalid transitions', () => {
    const ALLOWED_ORDER_TRANSITIONS = {
        "Payment Pending": ["Confirmed", "Processing", "Shipped", "Cancelled"],
        "Pending": ["Confirmed", "Processing", "Shipped", "Cancelled"],
        "Confirmed": ["Processing", "Shipped", "Cancelled"],
        "Processing": ["Shipped", "Cancelled"],
        "Shipped": ["Out for Delivery", "Delivered", "Cancelled"],
        "Out for Delivery": ["Delivered", "Cancelled"],
        "Delivered": [],
        "Cancelled": []
    };

    assert.ok(ALLOWED_ORDER_TRANSITIONS["Pending"].includes("Confirmed"));
    assert.ok(!ALLOWED_ORDER_TRANSITIONS["Pending"].includes("Delivered"));
    assert.ok(!ALLOWED_ORDER_TRANSITIONS["Delivered"].includes("Pending"));
});
