import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, ShoppingBag, ArrowRight, X, Check, ShieldCheck, Sparkles, Search, ChevronDown } from "lucide-react";
import {
  calculateCustomMalaPricing,
  buildCustomMalaItemPayload,
  getStoreProductId
} from "../../shared/customMalaCatalog";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { getProductPrimaryImage, getOptimizedImageUrl } from "../lib/imageUtils";
import { db, isPublicProduct } from "../lib/db";
import { money } from "../data";

export function CustomizeMalaSection({ products = [] }) {
  const navigate = useNavigate();
  const { add, buyNow } = useCart();

  // Strictly derive catalog from live Admin Dashboard store products (zero hardcoded demo names)
  const storeProducts = useMemo(() => {
    const source =
      Array.isArray(products) && products.length > 0
        ? products
        : db && typeof db.getProducts === "function"
          ? db.getProducts().filter(isPublicProduct)
          : [];

    const seen = new Set();
    const list = [];
    for (const p of source) {
      if (!p || typeof p !== "object") continue;
      if (p.status === "Inactive" || p.status === "Draft") continue;
      const pid = getStoreProductId(p);
      if (!pid || pid.startsWith("custom-mala-") || seen.has(pid)) continue;
      if (!(Number(p.price) > 0)) continue;
      seen.add(pid);
      list.push(p);
    }
    return list;
  }, [products]);

  const productById = useMemo(() => {
    const map = new Map();
    for (const p of storeProducts) {
      const pid = getStoreProductId(p);
      if (pid) map.set(pid, p);
      if (p._id) map.set(String(p._id), p);
      if (p.slug) map.set(String(p.slug), p);
    }
    return map;
  }, [storeProducts]);

  // Dynamic list of Rudraksha boxes — starts empty until user clicks Add Rudraksha
  const [rows, setRows] = useState([]);
  const [nextUid, setNextUid] = useState(1);
  const [isChooserOpen, setIsChooserOpen] = useState(false);
  const [chooserQuery, setChooserQuery] = useState("");
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Prune any row whose product was removed by Admin (never auto-insert a default product)
  useEffect(() => {
    if (storeProducts.length === 0) return;
    setRows((prev) => {
      if (prev.length === 0) return prev;
      const filtered = prev.filter((r) => productById.has(r.productId));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [storeProducts, productById]);

  const productThumbMap = useMemo(() => {
    const map = new Map();
    for (const p of storeProducts) {
      const pid = getStoreProductId(p);
      const rawImg = getProductPrimaryImage(p);
      const safeImg =
        rawImg && !rawImg.includes("placeholder.svg")
          ? getOptimizedImageUrl(rawImg, { width: 220, quality: 84 })
          : null;
      map.set(pid, safeImg);
    }
    return map;
  }, [storeProducts]);

  // Build canonical config backed strictly by real Admin Dashboard product IDs
  const config = useMemo(() => {
    const productsList = [];
    for (const row of rows) {
      const prod = productById.get(row.productId);
      const qty = Math.floor(Number(row.qty) || 0);
      if (prod && qty > 0) {
        productsList.push({ productId: getStoreProductId(prod), qty });
      }
    }
    return {
      products: productsList,
      size: "standard",
      thread: "red-silk",
      capping: "none",
      wearerNote: ""
    };
  }, [rows, productById]);

  const pricing = useMemo(
    () => calculateCustomMalaPricing(config, storeProducts),
    [config, storeProducts]
  );

  const primaryVisualImage = useMemo(() => {
    for (const row of rows) {
      const prod = productById.get(row.productId);
      if (prod) {
        const raw = getProductPrimaryImage(prod);
        if (raw && !raw.includes("placeholder.svg")) return raw;
      }
    }
    return "/images/placeholder.svg";
  }, [rows, productById]);

  const filteredChooserProducts = useMemo(() => {
    const q = chooserQuery.trim().toLowerCase();
    if (!q) return storeProducts;
    return storeProducts.filter((p) => {
      const hay = `${p.name || ""} ${p.category || ""} ${p.mukhi || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [storeProducts, chooserQuery]);

  const handleOpenChooser = () => {
    if (storeProducts.length === 0) return;
    setChooserQuery("");
    setIsChooserOpen((prev) => !prev);
  };

  const handlePickProductToAdd = (product) => {
    const pid = getStoreProductId(product);
    if (!pid) return;
    setRows((prev) => [...prev, { uid: nextUid, productId: pid, qty: 1 }]);
    setNextUid((u) => u + 1);
    setIsChooserOpen(false);
    setChooserQuery("");
  };

  const handleRemoveBox = (uid) => {
    setRows((prev) => prev.filter((r) => r.uid !== uid));
  };

  const handleChangeProduct = (uid, nextProductId) => {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, productId: nextProductId } : r)));
  };

  const handleChangeQty = (uid, nextQty) => {
    const clean = Math.max(1, Math.min(1080, Math.floor(Number(nextQty) || 1)));
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, qty: clean } : r)));
  };

  const handleAddToCart = () => {
    if (pricing.totalBeads <= 0) {
      emitToast("Please select at least 1 Rudraksha product.", "warning");
      return;
    }
    const payload = buildCustomMalaItemPayload(config, primaryVisualImage, storeProducts);
    add(payload, 1);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2200);
    emitToast(`Added ${payload.name} to cart!`, "success");
  };

  const handleBuyNow = () => {
    if (pricing.totalBeads <= 0) {
      emitToast("Please select at least 1 Rudraksha product.", "warning");
      return;
    }
    const payload = buildCustomMalaItemPayload(config, primaryVisualImage, storeProducts);
    buyNow(payload, 1);
    emitToast("Proceeding to Checkout with your Custom Mala!", "success");
    navigate("/checkout");
  };

  const savings = Math.max(0, pricing.mrp - pricing.unitPrice);

  return (
    <section
      id="customize-your-mala-section"
      aria-labelledby="custom-mala-heading"
      className="mx-auto my-5 max-w-[1040px] px-3 sm:px-5"
    >
      <div className="overflow-hidden rounded-2xl border border-[#e0cab0] bg-gradient-to-b from-[#fffdfa] via-[#fdf9f2] to-[#f8efe3] shadow-[0_10px_28px_rgba(43,23,13,0.06)]">
        {/* Compact Refined Header */}
        <div className="border-b border-[#e9d7c2] bg-gradient-to-r from-[#fbf2e6] via-[#fefaf4] to-[#f6ead9] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#78270b] to-[#b0572d] text-[#fdf6ec] shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c431f]">
                  Custom Mala Studio
                </div>
                <h2
                  id="custom-mala-heading"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                  className="text-xl font-bold leading-tight tracking-tight text-[#2b170d] sm:text-[23px]"
                >
                  Customize Your Mala
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {pricing.totalBeads > 0 && (
                <span className="inline-flex items-center rounded-md border border-[#e2cbb2] bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#78270b] tabular-nums shadow-[0_1px_2px_rgba(43,23,13,0.04)]">
                  {rows.length} Box · {pricing.totalBeads} pcs
                </span>
              )}
              <div className="hidden items-center gap-1 rounded-md border border-[#cde6d5] bg-[#f1faf4] px-2.5 py-1 text-[11px] font-semibold text-[#166534] sm:inline-flex">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Energized &amp; Hand-Strung</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Body */}
        <div className="p-3.5 sm:p-4">
          {storeProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#dcc4a9] bg-white/80 px-4 py-6 text-center text-xs font-medium text-[#6b5546]">
              Loading products from your store catalog...
            </div>
          ) : (
            <>
              {/* Grid of Added Admin-Product Boxes + Interactive Click-to-Choose "Add More" Slot */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row, idx) => {
                  const prod = productById.get(row.productId) || storeProducts[0];
                  const pid = getStoreProductId(prod);
                  const unitPrice = Math.max(0, Math.round(Number(prod?.price) || 0));
                  const rowTotal = unitPrice * (Number(row.qty) || 1);
                  const thumb = productThumbMap.get(pid);

                  return (
                    <div
                      key={row.uid}
                      data-mala-row={row.uid}
                      className="group flex flex-col justify-between rounded-xl border border-[#e3ceb7] bg-white p-3 shadow-[0_2px_10px_rgba(43,23,13,0.04)] transition-all duration-200 hover:border-[#c89668] hover:shadow-[0_6px_18px_rgba(120,39,11,0.08)]"
                    >
                      <div>
                        {/* Box Top Header */}
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded bg-[#faf2e8] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#78270b] tabular-nums">
                            Bead #{idx + 1} · {row.qty} pcs
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBox(row.uid)}
                            aria-label={`Remove Bead Box ${idx + 1}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#8c7566] transition hover:bg-[#fdeceb] hover:text-[#b91c1c]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Left: 1:1 Product Photo | Right: Real Admin Product Name & Dropdown */}
                        <div className="flex items-center gap-2.5">
                          <div className="aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#e5d0b8] bg-[#f8efe4] shadow-inner">
                            {thumb ? (
                              <img
                                key={`${pid}-${thumb}`}
                                src={thumb}
                                alt={prod?.name || "Sacred Product"}
                                loading="lazy"
                                className="aura-instant-fade-in h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#8c431f] to-[#5e240f] text-sm font-bold text-[#fdf6ec]">
                                {(prod?.name || "R").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate text-[12.5px] font-bold leading-snug text-[#2b170d]"
                              title={prod?.name}
                            >
                              {prod?.name}
                            </div>
                            <div className="mt-0.5 text-[10.5px] font-semibold text-[#8c431f] tabular-nums">
                              {money(unitPrice)} / pcs
                            </div>

                            <label htmlFor={`mala-bead-select-${row.uid}`} className="sr-only">
                              Select Product
                            </label>
                            <div className="relative mt-1.5">
                              <select
                                id={`mala-bead-select-${row.uid}`}
                                value={pid}
                                onChange={(e) => handleChangeProduct(row.uid, e.target.value)}
                                className="h-7 w-full appearance-none rounded-lg border border-[#d8c1a8] bg-[#fffcf7] pl-2 pr-6 text-[11px] font-semibold text-[#2b170d] transition focus:border-[#78270b] focus:bg-white focus:outline-none"
                              >
                                {storeProducts.map((opt) => {
                                  const optId = getStoreProductId(opt);
                                  const optPrice = Math.round(Number(opt.price) || 0);
                                  return (
                                    <option key={optId} value={optId}>
                                      {opt.name} — {money(optPrice)}
                                    </option>
                                  );
                                })}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#78270b]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Compact Qty Stepper & Row Price */}
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#f2e7d9] pt-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleChangeQty(row.uid, row.qty - 1)}
                            disabled={row.qty <= 1}
                            aria-label="Decrease quantity"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e0cdb8] bg-[#faf4ec] text-[#2b170d] transition hover:border-[#a54d2b] disabled:opacity-40"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="1080"
                            value={row.qty}
                            aria-label={`Quantity for ${prod?.name || "product"}`}
                            onChange={(e) => handleChangeQty(row.uid, e.target.value)}
                            className="h-7 w-11 rounded-lg border border-[#e0cdb8] bg-white text-center text-xs font-bold text-[#2b170d] tabular-nums focus:border-[#78270b] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleChangeQty(row.uid, row.qty + 1)}
                            aria-label="Increase quantity"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#78270b] bg-[#78270b] text-white transition hover:bg-[#5e1d08]"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <span className="ml-0.5 text-[10.5px] font-semibold text-[#6b5546]">pcs</span>
                        </div>

                        <div className="text-right">
                          <div className="text-[12.5px] font-extrabold text-[#78270b] tabular-nums">
                            {money(rowTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Interactive Add More Slot: Closed Button OR Choose-Rudraksha Picker */}
                {!isChooserOpen ? (
                  <button
                    type="button"
                    id="custom-mala-add-more-btn"
                    onClick={handleOpenChooser}
                    className="group flex min-h-[126px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#cca076] bg-gradient-to-b from-[#fdf8f0] to-[#f8ecdc] p-3 text-center transition-all duration-200 hover:border-[#78270b] hover:from-[#fbf2e4] hover:to-[#f4e2ca]"
                  >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#78270b] to-[#a84e2b] text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                      <Plus className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-bold text-[#2b170d]">
                      {rows.length === 0 ? "Add Rudraksha" : "Add More Rudraksha"}
                    </span>
                    <span className="text-[10.5px] font-medium text-[#7c6150]">
                      Click to choose product
                    </span>
                  </button>
                ) : (
                  <div
                    id="custom-mala-product-chooser"
                    role="region"
                    aria-label="Choose Rudraksha to add"
                    className="aura-instant-fade-in flex min-h-[126px] flex-col rounded-xl border-2 border-[#78270b] bg-white p-2.5 shadow-[0_8px_22px_rgba(120,39,11,0.12)]"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-[#efe2d3] pb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#78270b]">
                        Choose Rudraksha to Add
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsChooserOpen(false)}
                        aria-label="Close product chooser"
                        className="inline-flex h-5 w-5 items-center justify-center rounded text-[#8c7566] hover:bg-[#fdeceb] hover:text-[#b91c1c]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {storeProducts.length > 4 && (
                      <div className="relative mb-1.5">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#8c7566]" />
                        <input
                          type="text"
                          value={chooserQuery}
                          onChange={(e) => setChooserQuery(e.target.value)}
                          placeholder="Search Rudraksha..."
                          aria-label="Search store products"
                          className="h-7 w-full rounded-md border border-[#dfd0bf] bg-[#fffdf9] pl-6 pr-2 text-[11px] text-[#2b170d] placeholder-[#9c8576] focus:border-[#78270b] focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="max-h-[138px] space-y-1 overflow-y-auto pr-0.5">
                      {filteredChooserProducts.length === 0 ? (
                        <div className="py-3 text-center text-[11px] text-[#8c7566]">
                          No matching products found
                        </div>
                      ) : (
                        filteredChooserProducts.map((opt) => {
                          const optId = getStoreProductId(opt);
                          const optImg = productThumbMap.get(optId);
                          const optPrice = Math.round(Number(opt.price) || 0);
                          return (
                            <button
                              key={`pick-${optId}`}
                              type="button"
                              onClick={() => handlePickProductToAdd(opt)}
                              className="flex w-full items-center gap-2 rounded-lg border border-[#efe3d5] bg-[#fffcf8] px-2 py-1.5 text-left transition hover:border-[#78270b] hover:bg-[#fbf1e4]"
                            >
                              <div className="aspect-square h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[#e5d2bc] bg-[#f7efe4]">
                                {optImg ? (
                                  <img
                                    src={optImg}
                                    alt={opt.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[#78270b] text-[10px] font-bold text-white">
                                    {(opt.name || "R").slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[11.5px] font-bold text-[#2b170d]">
                                  {opt.name}
                                </div>
                                <div className="text-[10.5px] font-semibold text-[#78270b] tabular-nums">
                                  {money(optPrice)} / pcs
                                </div>
                              </div>
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#78270b] text-white">
                                <Plus className="h-3.5 w-3.5" />
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Bottom Itemized Price List + Final Price + Add to Cart & Buy Now */}
              <div className="mt-3 rounded-xl border border-[#e1cbb2] bg-gradient-to-r from-[#fbf1e3] via-[#fdf7ee] to-[#fffaf3] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                {rows.length > 0 && (
                  <div className="mb-2.5 space-y-1 border-b border-[#e8d5bf] pb-2">
                    {rows.map((row, idx) => {
                      const prod = productById.get(row.productId) || storeProducts[0];
                      const unitPrice = Math.max(0, Math.round(Number(prod?.price) || 0));
                      const rowTotal = unitPrice * (Number(row.qty) || 1);
                      return (
                        <div
                          key={`summary-${row.uid}`}
                          className="flex items-center justify-between gap-2 text-[11.5px] text-[#3b2316]"
                        >
                          <span className="truncate font-medium">
                            <span className="font-bold text-[#78270b] tabular-nums">#{idx + 1}</span>{" "}
                            {prod?.name} × <span className="font-semibold tabular-nums">{row.qty} pcs</span>
                          </span>
                          <span className="shrink-0 font-bold text-[#2b170d] tabular-nums">
                            {money(rowTotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-[#6b5546] tabular-nums">
                      {pricing.totalBeads > 0
                        ? `Final Price · ${pricing.totalBeads} Bead${pricing.totalBeads === 1 ? "" : "s"}`
                        : "Click 'Add Rudraksha' above to select beads for your mala"}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-[#78270b] tabular-nums">
                        {money(pricing.totalBeads > 0 ? pricing.unitPrice : 0)}
                      </span>
                      {savings > 0 && (
                        <>
                          <del className="text-xs text-[#8a7566] tabular-nums">
                            {money(pricing.mrp)}
                          </del>
                          <span className="rounded bg-[#dcfce7] px-1.5 py-0.5 text-[10.5px] font-bold text-[#166534] tabular-nums">
                            Save {money(savings)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      id="custom-mala-add-cart-btn"
                      onClick={handleAddToCart}
                      disabled={pricing.totalBeads <= 0}
                      className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#78270b] bg-white px-4 py-1.5 text-xs font-bold text-[#78270b] shadow-sm transition hover:bg-[#fbf2eb] disabled:opacity-50"
                    >
                      {addedFeedback ? <Check className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
                      <span>{addedFeedback ? "Added to Cart" : "Add to Cart"}</span>
                    </button>

                    <button
                      type="button"
                      id="custom-mala-order-now-btn"
                      onClick={handleBuyNow}
                      disabled={pricing.totalBeads <= 0}
                      className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#78270b] to-[#a54d2b] px-5 py-1.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(120,39,11,0.22)] transition hover:brightness-105 disabled:opacity-50"
                    >
                      <span>Buy Now</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
