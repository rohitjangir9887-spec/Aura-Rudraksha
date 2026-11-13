import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, ShoppingBag, ArrowRight, X, Check, ShieldCheck, Sparkles } from "lucide-react";
import {
  MALA_BEAD_CATALOG,
  MALA_BEAD_SIZES,
  MALA_THREAD_OPTIONS,
  MALA_CAPPING_OPTIONS,
  calculateCustomMalaPricing,
  getBeadScaledPricing,
  buildCustomMalaItemPayload
} from "../../shared/customMalaCatalog";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { getProductPrimaryImage } from "../lib/imageUtils";
import { money } from "../data";

const BEAD_BY_ID = new Map(MALA_BEAD_CATALOG.map((b) => [b.id, b]));

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

  const [size, setSize] = useState("large");
  const [thread, setThread] = useState("red-silk");
  const [capping, setCapping] = useState("panchdhatu-cap");
  const [wearerNote, setWearerNote] = useState("");
  const [addedFeedback, setAddedFeedback] = useState(false);

  const sizeObj = useMemo(
    () => MALA_BEAD_SIZES.find((s) => s.id === size) || MALA_BEAD_SIZES[2],
    [size]
  );

  // Aggregate box rows into canonical customMala config
  const config = useMemo(() => {
    const beads = {};
    for (const row of rows) {
      const q = Math.floor(Number(row.qty) || 0);
      if (row.beadId && q > 0) {
        beads[row.beadId] = (beads[row.beadId] || 0) + q;
      }
    }
    return { beads, size, thread, capping, wearerNote };
  }, [rows, size, thread, capping, wearerNote]);

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
    // Pick a sensible next Rudraksha default that isn't already picked, else 7-mukhi
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
      className="mx-auto my-8 max-w-[1240px] px-4 sm:px-6 lg:px-8"
    >
      <div className="overflow-hidden rounded-2xl border border-[#e6d5c1] bg-[#fdfaf5] shadow-[0_12px_36px_rgba(43,23,13,0.06)]">
        {/* Header Bar */}
        <div className="border-b border-[#ebdccb] bg-gradient-to-r from-[#fbf4ea] via-[#fdfaf5] to-[#f7ede0] px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8c431f]">
                <Sparkles className="h-3.5 w-3.5 text-[#a54d2b]" />
                <span>Hand-Strung Custom Sacred Mala</span>
              </div>
              <h2
                id="custom-mala-heading"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                className="text-3xl font-bold tracking-tight text-[#2b170d] sm:text-4xl"
              >
                Customize Your Mala
              </h2>
              <p className="mt-1 text-sm text-[#5c483b]">
                Select your Rudraksha bead in the box below, tap{" "}
                <strong className="font-semibold text-[#78270b]">+ Add More</strong> right beside it to add as many beads as you want, and order everything crafted into one single energized mala.
              </p>
            </div>
            <div className="text-xs font-semibold text-[#166534] flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="h-4 w-4" />
              <span>Energized &amp; Hand-Strung Together</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-5 sm:p-7">
          {/* Row of Rudraksha Boxes + Inline "Add More" Box Right Beside It */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row, idx) => {
              const bead = BEAD_BY_ID.get(row.beadId) || MALA_BEAD_CATALOG[0];
              const { unitPrice } = getBeadScaledPricing(bead, sizeObj);
              const rowTotal = unitPrice * (Number(row.qty) || 1);
              const thumb = beadThumbMap[bead.id];

              return (
                <div
                  key={row.uid}
                  data-mala-row={row.uid}
                  className="flex flex-col justify-between rounded-xl border border-[#e3d0ba] bg-white p-4 shadow-[0_3px_12px_rgba(43,23,13,0.04)]"
                >
                  <div>
                    {/* Box Title + Pcs + Remove */}
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#78270b] tabular-nums">
                        Bead Box #{idx + 1} · {row.qty} pcs
                      </span>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBox(row.uid)}
                          aria-label={`Remove Bead Box ${idx + 1}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8c7566] transition hover:bg-[#fdf1ef] hover:text-[#b91c1c]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Left: Rudraksha Name & Selector | Right: 1:1 Photo */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold leading-snug text-[#2b170d]" title={bead.name}>
                          {bead.name}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] font-medium text-[#8c431f]">
                          {bead.deity}
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
                          className="mt-2 min-h-[38px] w-full rounded-lg border border-[#dcc8b3] bg-[#fffcf8] px-2.5 py-1.5 text-xs font-semibold text-[#2b170d] focus:border-[#78270b] focus:outline-none"
                        >
                          {MALA_BEAD_CATALOG.map((opt) => {
                            const { unitPrice: optPrice } = getBeadScaledPricing(opt, sizeObj);
                            return (
                              <option key={opt.id} value={opt.id}>
                                {opt.name} ({money(optPrice)}/pcs)
                              </option>
                            );
                          })}
                        </select>

                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[#6b584c]">
                          {bead.benefit}
                        </p>
                      </div>

                      {/* Right Side: 1:1 Full-Bleed Photo */}
                      <div className="aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[#e6d5c1] bg-[#f7efe6] sm:h-[104px] sm:w-[104px]">
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
                            className="flex h-full w-full items-center justify-center text-base font-bold text-white"
                            style={{
                              background: `radial-gradient(circle at 35% 30%, ${bead.accent}, ${bead.color})`
                            }}
                          >
                            {bead.mukhi > 0 ? `${bead.mukhi} Mukhi` : "★"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Quantity Stepper (Default 1 pcs) & Row Price */}
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#f3e9dd] pt-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleChangeQty(row.uid, row.qty - 1)}
                        disabled={row.qty <= 1}
                        aria-label="Decrease quantity"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3d2bf] bg-[#faf6f0] text-[#2b170d] hover:border-[#a54d2b] disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="1080"
                        value={row.qty}
                        aria-label={`Quantity for ${bead.name}`}
                        onChange={(e) => handleChangeQty(row.uid, e.target.value)}
                        className="h-8 w-12 rounded-lg border border-[#e3d2bf] bg-white text-center text-xs font-bold text-[#2b170d] tabular-nums focus:border-[#78270b] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleChangeQty(row.uid, row.qty + 1)}
                        aria-label="Increase quantity"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#78270b] bg-[#78270b] text-white hover:bg-[#5e1d08]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="ml-1 text-[11px] font-semibold text-[#6b5546]">
                        pcs
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-[10.5px] font-medium text-[#806f62] tabular-nums">
                        {money(unitPrice)} × {row.qty} pcs
                      </div>
                      <div className="text-sm font-bold text-[#78270b] tabular-nums">
                        {money(rowTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Right Beside the Box(es): "+ Add More" Rudraksha Slot */}
            <button
              type="button"
              id="custom-mala-add-more-btn"
              onClick={handleAddMoreBox}
              className="flex min-h-[190px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#c99b72] bg-[#fbf5ec] p-5 text-center transition hover:border-[#78270b] hover:bg-[#f7ebdc]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#78270b] text-white shadow-sm">
                <Plus className="h-6 w-6" />
              </span>
              <span className="text-base font-bold text-[#2b170d]">Add More Rudraksha</span>
              <span className="max-w-[210px] text-xs leading-relaxed text-[#6b5546]">
                Tap here to add another Rudraksha bead box (jitne chahiye utne add karein)
              </span>
            </button>
          </div>

          {/* Compact Mala Specifications: Bead Size (with Large / Super-Large), Thread, Capping & Optional Note */}
          <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-[#ebdccb] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                htmlFor="custom-mala-size-select"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#5c483b]"
              >
                Bead Size (Large Available)
              </label>
              <select
                id="custom-mala-size-select"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="min-h-[42px] w-full rounded-lg border border-[#dcc8b3] bg-[#fffcf8] px-3 py-2 text-xs font-semibold text-[#2b170d] focus:border-[#78270b] focus:outline-none"
              >
                {MALA_BEAD_SIZES.map((sz) => (
                  <option key={sz.id} value={sz.id}>
                    {sz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="custom-mala-thread-select"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#5c483b]"
              >
                Thread / Sacred Wire
              </label>
              <select
                id="custom-mala-thread-select"
                value={thread}
                onChange={(e) => setThread(e.target.value)}
                className="min-h-[42px] w-full rounded-lg border border-[#dcc8b3] bg-[#fffcf8] px-3 py-2 text-xs font-semibold text-[#2b170d] focus:border-[#78270b] focus:outline-none"
              >
                {MALA_THREAD_OPTIONS.map((th) => (
                  <option key={th.id} value={th.id}>
                    {th.label} {th.fee > 0 ? `(+${money(th.fee)})` : "(Free)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="custom-mala-capping-select"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#5c483b]"
              >
                Metal Capping
              </label>
              <select
                id="custom-mala-capping-select"
                value={capping}
                onChange={(e) => setCapping(e.target.value)}
                className="min-h-[42px] w-full rounded-lg border border-[#dcc8b3] bg-[#fffcf8] px-3 py-2 text-xs font-semibold text-[#2b170d] focus:border-[#78270b] focus:outline-none"
              >
                {MALA_CAPPING_OPTIONS.map((cap) => (
                  <option key={cap.id} value={cap.id}>
                    {cap.label} {cap.fee > 0 ? `(+${money(cap.fee)})` : "(Free)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="custom-mala-sankalp-note"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#5c483b]"
              >
                Wearer / Sankalp Note (Optional)
              </label>
              <input
                id="custom-mala-sankalp-note"
                type="text"
                maxLength={120}
                value={wearerNote}
                onChange={(e) => setWearerNote(e.target.value)}
                placeholder="Name or bead order note..."
                className="min-h-[42px] w-full rounded-lg border border-[#dcc8b3] bg-[#fffcf8] px-3 py-2 text-xs text-[#2b170d] placeholder:text-[#9c8779] focus:border-[#78270b] focus:outline-none"
              />
            </div>
          </div>

          {/* Bottom Added Items Price Breakdown + Final Price + Add to Cart & Buy Now */}
          <div className="mt-5 rounded-xl border border-[#e3cfb8] bg-gradient-to-r from-[#fbf2e6] to-[#fffaf3] px-5 py-4">
            {/* Live Price List for Every Added Rudraksha Box */}
            <div className="mb-3.5 space-y-1.5 border-b border-[#ead8c3] pb-3">
              {rows.map((row, idx) => {
                const bead = BEAD_BY_ID.get(row.beadId) || MALA_BEAD_CATALOG[0];
                const { unitPrice } = getBeadScaledPricing(bead, sizeObj);
                const rowTotal = unitPrice * (Number(row.qty) || 1);
                return (
                  <div
                    key={`summary-${row.uid}`}
                    className="flex items-center justify-between gap-3 text-xs text-[#3b2316]"
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

              {(pricing.threadFee > 0 || pricing.cappingFee > 0) && (
                <div className="flex items-center justify-between gap-3 text-xs text-[#6b5546]">
                  <span className="truncate">
                    Craft &amp; Finishing ({pricing.threadObj.shortLabel} + {pricing.cappingObj.shortLabel})
                  </span>
                  <span className="shrink-0 font-semibold text-[#2b170d] tabular-nums">
                    +{money(pricing.threadFee + pricing.cappingFee)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-semibold text-[#6b5546] tabular-nums">
                  Final Price · {pricing.totalBeads} Rudraksha Bead{pricing.totalBeads === 1 ? "" : "s"} ({pricing.sizeObj.shortLabel})
                </div>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-2.5">
                  <span className="text-3xl font-bold text-[#78270b] tabular-nums">
                    {money(pricing.unitPrice)}
                  </span>
                  {savings > 0 && (
                    <>
                      <del className="text-sm text-[#8a7566] tabular-nums">
                        {money(pricing.mrp)}
                      </del>
                      <span className="text-xs font-bold text-[#166534] tabular-nums">
                        You Save {money(savings)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center">
                <button
                  type="button"
                  id="custom-mala-add-cart-btn"
                  onClick={handleAddToCart}
                  disabled={pricing.totalBeads <= 0}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#78270b] bg-white px-5 py-2.5 text-sm font-bold text-[#78270b] transition hover:bg-[#fbf2eb] disabled:opacity-50"
                >
                  {addedFeedback ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                  <span>{addedFeedback ? "Added to Cart" : "Add to Cart"}</span>
                </button>

                <button
                  type="button"
                  id="custom-mala-order-now-btn"
                  onClick={handleBuyNow}
                  disabled={pricing.totalBeads <= 0}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#78270b] to-[#a54d2b] px-6 py-2.5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(120,39,11,0.25)] transition hover:brightness-105 disabled:opacity-50"
                >
                  <span>Buy Now</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
