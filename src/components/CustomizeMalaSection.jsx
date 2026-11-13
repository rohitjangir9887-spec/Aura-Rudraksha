import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, ShoppingBag, ArrowRight, X, Check, ShieldCheck, Sparkles } from "lucide-react";
import {
  MALA_BEAD_CATALOG,
  MALA_BEAD_SIZES,
  calculateCustomMalaPricing,
  getBeadScaledPricing,
  buildCustomMalaItemPayload
} from "../../shared/customMalaCatalog";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { getProductPrimaryImage } from "../lib/imageUtils";
import { money } from "../data";

const BEAD_BY_ID = new Map(MALA_BEAD_CATALOG.map((b) => [b.id, b]));
const DEFAULT_SIZE_OBJ = MALA_BEAD_SIZES.find((s) => s.id === "standard") || MALA_BEAD_SIZES[1] || MALA_BEAD_SIZES[0];

function findMatchingProductImage(bead, products = []) {
  if (!Array.isArray(products) || products.length === 0 || !bead?.productMatch) {
    return null;
  }
  const match = products.find((p) => {
    const hay = `${p?.name || ""} ${p?.slug || ""} ${p?.id || ""}`.toLowerCase();
    return bead.productMatch.some((term) => hay.includes(term));
  });
  if (!match) return null;
  const img = getProductPrimaryImage(match);
  return img && !img.includes("placeholder.svg") ? img : null;
}

export function CustomizeMalaSection({ products = [] }) {
  const navigate = useNavigate();
  const { add, buyNow } = useCart();

  // Dynamic list of Rudraksha boxes — starts with 1 box & 1 pcs by default; user can add more
  const [rows, setRows] = useState([
    { uid: 1, beadId: "5-mukhi-spacer", qty: 1 }
  ]);
  const [nextUid, setNextUid] = useState(2);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Aggregate box rows into canonical customMala config
  const config = useMemo(() => {
    const beads = {};
    for (const row of rows) {
      const q = Math.floor(Number(row.qty) || 0);
      if (row.beadId && q > 0) {
        beads[row.beadId] = (beads[row.beadId] || 0) + q;
      }
    }
    return {
      beads,
      size: "standard",
      thread: "red-silk",
      capping: "none",
      wearerNote: ""
    };
  }, [rows]);

  const pricing = useMemo(() => calculateCustomMalaPricing(config), [config]);

  const beadThumbMap = useMemo(() => {
    const map = {};
    for (const bead of MALA_BEAD_CATALOG) {
      map[bead.id] = findMatchingProductImage(bead, products);
    }
    return map;
  }, [products]);

  const primaryVisualImage = useMemo(() => {
    const firstNonSpacer = rows.find((r) => r.beadId !== "5-mukhi-spacer" && r.qty > 0);
    const firstRow = firstNonSpacer || rows[0];
    if (firstRow && beadThumbMap[firstRow.beadId]) return beadThumbMap[firstRow.beadId];
    const anyMatch = Object.values(beadThumbMap).find(Boolean);
    return anyMatch || "/images/placeholder.svg";
  }, [rows, beadThumbMap]);

  const handleAddMoreBox = () => {
    const used = new Set(rows.map((r) => r.beadId));
    const preferredOrder = ["7-mukhi", "ganesh", "gauri-shankar", "1-mukhi", "5-mukhi", "11-mukhi", "8-mukhi"];
    const nextBead =
      preferredOrder.find((id) => !used.has(id)) ||
      MALA_BEAD_CATALOG.find((b) => !used.has(b.id))?.id ||
      "5-mukhi";

    setRows((prev) => [...prev, { uid: nextUid, beadId: nextBead, qty: 1 }]);
    setNextUid((u) => u + 1);
  };

  const handleRemoveBox = (uid) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.uid !== uid)));
  };

  const handleChangeBead = (uid, beadId) => {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, beadId } : r)));
  };

  const handleChangeQty = (uid, nextQty) => {
    const clean = Math.max(1, Math.min(1080, Math.floor(Number(nextQty) || 1)));
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, qty: clean } : r)));
  };

  const handleAddToCart = () => {
    if (pricing.totalBeads <= 0) {
      emitToast("Please select at least 1 Rudraksha bead.", "warning");
      return;
    }
    const payload = buildCustomMalaItemPayload(config, primaryVisualImage);
    add(payload, 1);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2200);
    emitToast(`Added ${payload.name} to cart!`, "success");
  };

  const handleBuyNow = () => {
    if (pricing.totalBeads <= 0) {
      emitToast("Please select at least 1 Rudraksha bead.", "warning");
      return;
    }
    const payload = buildCustomMalaItemPayload(config, primaryVisualImage);
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
      <div className="overflow-hidden rounded-xl border border-[#e6d5c1] bg-[#fdfaf5] shadow-[0_8px_24px_rgba(43,23,13,0.05)]">
        {/* Compact Header Bar */}
        <div className="border-b border-[#ebdccb] bg-gradient-to-r from-[#fbf4ea] via-[#fdfaf5] to-[#f7ede0] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c431f]">
                <Sparkles className="h-3 w-3 text-[#a54d2b]" />
                <span>Custom Sacred Mala</span>
              </div>
              <h2
                id="custom-mala-heading"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                className="text-xl font-bold tracking-tight text-[#2b170d] sm:text-2xl"
              >
                Customize Your Mala
              </h2>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#166534]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Energized &amp; Hand-Strung</span>
            </div>
          </div>
        </div>

        {/* Compact Main Content */}
        <div className="p-3.5 sm:p-4">
          {/* Row of Rudraksha Boxes + Inline "Add More" Box Right Beside It */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row, idx) => {
              const bead = BEAD_BY_ID.get(row.beadId) || MALA_BEAD_CATALOG[0];
              const { unitPrice } = getBeadScaledPricing(bead, DEFAULT_SIZE_OBJ);
              const rowTotal = unitPrice * (Number(row.qty) || 1);
              const thumb = beadThumbMap[bead.id];

              return (
                <div
                  key={row.uid}
                  data-mala-row={row.uid}
                  className="flex flex-col justify-between rounded-lg border border-[#e3d0ba] bg-white p-3 shadow-[0_2px_8px_rgba(43,23,13,0.03)]"
                >
                  <div>
                    {/* Compact Header + Pcs + Remove */}
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#78270b] tabular-nums">
                        Bead #{idx + 1} · {row.qty} pcs
                      </span>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBox(row.uid)}
                          aria-label={`Remove Bead Box ${idx + 1}`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-[#8c7566] transition hover:bg-[#fdf1ef] hover:text-[#b91c1c]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Left: 1:1 Full-Bleed Photo | Right: Rudraksha Name & Selector */}
                    <div className="flex items-center gap-2.5">
                      <div className="aspect-square h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#e6d5c1] bg-[#f7efe6]">
                        {thumb ? (
                          <img
                            key={thumb}
                            src={thumb}
                            alt={bead.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center text-xs font-bold text-white"
                            style={{
                              background: `radial-gradient(circle at 35% 30%, ${bead.accent}, ${bead.color})`
                            }}
                          >
                            {bead.mukhi > 0 ? `${bead.mukhi}M` : "★"}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold leading-snug text-[#2b170d]" title={bead.name}>
                          {bead.name}
                        </div>

                        <label
                          htmlFor={`mala-bead-select-${row.uid}`}
                          className="sr-only"
                        >
                          Change Rudraksha
                        </label>
                        <select
                          id={`mala-bead-select-${row.uid}`}
                          value={row.beadId}
                          onChange={(e) => handleChangeBead(row.uid, e.target.value)}
                          className="mt-1.5 h-8 w-full rounded-md border border-[#dcc8b3] bg-[#fffcf8] px-2 text-[11.5px] font-semibold text-[#2b170d] focus:border-[#78270b] focus:outline-none"
                        >
                          {MALA_BEAD_CATALOG.map((opt) => {
                            const { unitPrice: optPrice } = getBeadScaledPricing(opt, DEFAULT_SIZE_OBJ);
                            return (
                              <option key={opt.id} value={opt.id}>
                                {opt.name} ({money(optPrice)}/pcs)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Compact Quantity Stepper (Default 1 pcs) & Row Price */}
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#f3e9dd] pt-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleChangeQty(row.uid, row.qty - 1)}
                        disabled={row.qty <= 1}
                        aria-label="Decrease quantity"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[#e3d2bf] bg-[#faf6f0] text-[#2b170d] hover:border-[#a54d2b] disabled:opacity-40"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="1080"
                        value={row.qty}
                        aria-label={`Quantity for ${bead.name}`}
                        onChange={(e) => handleChangeQty(row.uid, e.target.value)}
                        className="h-7 w-11 rounded-md border border-[#e3d2bf] bg-white text-center text-xs font-bold text-[#2b170d] tabular-nums focus:border-[#78270b] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleChangeQty(row.uid, row.qty + 1)}
                        aria-label="Increase quantity"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[#78270b] bg-[#78270b] text-white hover:bg-[#5e1d08]"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="ml-0.5 text-[10.5px] font-semibold text-[#6b5546]">
                        pcs
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-[#78270b] tabular-nums">
                        {money(rowTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Inline Compact "+ Add More" Rudraksha Slot */}
            <button
              type="button"
              id="custom-mala-add-more-btn"
              onClick={handleAddMoreBox}
              className="flex min-h-[124px] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#c99b72] bg-[#fbf5ec] p-3 text-center transition hover:border-[#78270b] hover:bg-[#f7ebdc]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#78270b] text-white shadow-sm">
                <Plus className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-[#2b170d]">Add More Rudraksha</span>
            </button>
          </div>

          {/* Compact Bottom Added Items Price List + Final Price + Add to Cart & Buy Now */}
          <div className="mt-3 rounded-lg border border-[#e3cfb8] bg-gradient-to-r from-[#fbf2e6] to-[#fffaf3] px-4 py-3">
            <div className="mb-2.5 space-y-1 border-b border-[#ead8c3] pb-2">
              {rows.map((row, idx) => {
                const bead = BEAD_BY_ID.get(row.beadId) || MALA_BEAD_CATALOG[0];
                const { unitPrice } = getBeadScaledPricing(bead, DEFAULT_SIZE_OBJ);
                const rowTotal = unitPrice * (Number(row.qty) || 1);
                return (
                  <div
                    key={`summary-${row.uid}`}
                    className="flex items-center justify-between gap-2 text-[11.5px] text-[#3b2316]"
                  >
                    <span className="truncate font-medium">
                      <span className="font-bold text-[#78270b] tabular-nums">#{idx + 1}</span>{" "}
                      {bead.name} × <span className="font-semibold tabular-nums">{row.qty} pcs</span>
                    </span>
                    <span className="shrink-0 font-bold text-[#2b170d] tabular-nums">
                      {money(rowTotal)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold text-[#6b5546] tabular-nums">
                  Final Price · {pricing.totalBeads} Bead{pricing.totalBeads === 1 ? "" : "s"}
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#78270b] tabular-nums">
                    {money(pricing.unitPrice)}
                  </span>
                  {savings > 0 && (
                    <>
                      <del className="text-xs text-[#8a7566] tabular-nums">
                        {money(pricing.mrp)}
                      </del>
                      <span className="text-[11px] font-bold text-[#166534] tabular-nums">
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
                  className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-[#78270b] bg-white px-4 py-1.5 text-xs font-bold text-[#78270b] transition hover:bg-[#fbf2eb] disabled:opacity-50"
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
        </div>
      </div>
    </section>
  );
}
