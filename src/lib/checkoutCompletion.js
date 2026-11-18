export function isConfirmedCod(order) {
  const state = String(order?.orderStatus || order?.status || "").toLowerCase();
  const cod = order?.paymentStatus === "COD" || order?.paymentMode?.toLowerCase() === "cod" ||
    /cash on delivery|\bcod\b/i.test(order?.paymentMethod || "");
  return cod && ["confirmed", "processing", "packed", "shipped", "out for delivery", "delivered"].includes(state);
}

export function paymentConfirmed(order) {
  return order?.paymentStatus === "Paid" || isConfirmedCod(order);
}

export function rememberCheckout(storage, orderId, intent) {
  if (orderId) storage.setItem(`aura_checkout_scope_${orderId}`, JSON.stringify({ intent }));
}

export function finishCheckout(storage, orderId, clearCart) {
  const key = `aura_checkout_scope_${orderId}`;
  const raw = storage.getItem(key);
  if (!raw) return;
  const { intent } = JSON.parse(raw);
  if (intent == null) clearCart();
  else if (storage.getItem("aura_buy_now_intent") === intent) storage.removeItem("aura_buy_now_intent");
  storage.removeItem(key);
}
