import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, ShoppingBag, ArrowRight, RotateCcw, Sparkles, ShieldCheck, Check, Maximize2 } from "lucide-react";
import {
  MALA_BEAD_CATEGORIES,
  MALA_BEAD_CATALOG,
  MALA_BEAD_SIZES,
  MALA_THREAD_OPTIONS,
  MALA_CAPPING_OPTIONS,
  MALA_PRESETS,
  calculateCustomMalaPricing,
  getBeadScaledPricing,
  buildCustomMalaItemPayload
} from "../../shared/customMalaCatalog";
import { useCart } from "../hooks/useCart";
import { emitToast } from "../context/ToastContext";
import { getProductPrimaryImage } from "../lib/imageUtils";
import { money } from "../data";

const INITIAL_CONFIG = {
  beads: {
    "5-mukhi-spacer": 27,
    "7-mukhi": 2,
    ganesh: 1
  },
  size: "large",
  thread: "red-silk",
  capping: "panchdhatu-cap",
  wearerNote: ""
};

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

  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [activeCategory, setActiveCategory] = useState("all");
  const [addedFeedback, setAddedFeedback] = useState(false);

  const pricing = useMemo(() => calculateCustomMalaPricing(config), [config]);

  const beadThumbMap = useMemo(() => {
    const map = {};
    for (const bead of MALA_BEAD_CATALOG) {
      map[bead.id] = findMatchingProductImage(bead, products);
    }
    return map;
  }, [products]);

  const filteredBeads = useMemo(() => {
    if (activeCategory === "all") return MALA_BEAD_CATALOG;
    return MALA_BEAD_CATALOG.filter((b) => b.category === activeCategory);
  }, [activeCategory]);

  const primaryVisualImage = useMemo(() => {
    const heroBead = pricing.items.find((it) => it.id !== "5-mukhi-spacer") || pricing.items[0];
    if (heroBead && beadThumbMap[heroBead.id]) return beadThumbMap[heroBead.id];
    const anyMatch = Object.values(beadThumbMap).find(Boolean);
    return anyMatch || "/images/placeholder.svg";
  }, [pricing.items, beadThumbMap]);

  // Build SVG ring beads capped to 54 visual beads for balanced sacred geometry preview
  const visualRingBeads = useMemo(() => {
    if (pricing.totalBeads === 0) return [];
    const expanded = [];
    // Place special/mukhi hero beads prominently near bottom-center (Sumaru) & alternating spacing
    const spacers = pricing.items.filter((i) => i.id === "5-mukhi-spacer");
    const heroes = pricing.items.filter((i) => i.id !== "5-mukhi-spacer");

    const heroPool = [];
    heroes.forEach((h) => {
      const cap = Math.min(h.qty, 18);
      for (let k = 0; k < cap; k++) {
        heroPool.push({ ...h, isHero: true });
      }
    });

    const spacerCount = spacers.reduce((s, x) => s + x.qty, 0);
    const maxTotalVisual = 48;
    const spacerSlots = Math.max(0, Math.min(spacerCount, maxTotalVisual - heroPool.length));

    const combined = [];
    if (spacerSlots === 0) {
      combined.push(...heroPool.slice(0, maxTotalVisual));
    } else if (heroPool.length === 0) {
      const spacerTemplate = spacers[0];
      for (let i = 0; i < spacerSlots; i++) {
        combined.push({ ...spacerTemplate, isHero: false });
      }
    } else {
      const totalVis = heroPool.length + spacerSlots;
      const step = totalVis / heroPool.length;
      let heroIdx = 0;
      const spacerTemplate = spacers[0];
      for (let i = 0; i < totalVis; i++) {
        if (heroIdx < heroPool.length && Math.abs(i - Math.round(heroIdx * step)) < 0.6) {
          combined.push(heroPool[heroIdx++]);
        } else {
          combined.push({ ...spacerTemplate, isHero: false });
        }
      }
      while (heroIdx < heroPool.length) {
        combined.push(heroPool[heroIdx++]);
      }
    }

    const count = combined.length;
    const radiusX = 112;
    const radiusY = 116;
    const cx = 150;
    const cy = 148;
    const baseBeadR = pricing.sizeObj?.visualRadius || 9.2;

    for (let i = 0; i < count; i++) {
      // Start at bottom (PI/2) clockwise so Sumaru/hero centers at bottom
      const angle = Math.PI / 2 + (i / count) * Math.PI * 2;
      const b = combined[i];
      const r = b.isHero ? Math.min(15.5, baseBeadR * 1.24) : Math.min(12.2, baseBeadR * 0.92);
      expanded.push({
        key: `${b.id}-${i}`,
        x: cx + Math.cos(angle) * radiusX,
        y: cy + Math.sin(angle) * radiusY,
        r,
        color: b.color || "#7a3b1e",
        accent: b.accent || "#c98b4e",
        isHero: b.isHero,
        isSumaru: i === 0
      });
    }
    return expanded;
  }, [pricing]);

  const setBeadQty = (beadId, nextQty) => {
    const clean = Math.max(0, Math.min(1080, Math.floor(Number(nextQty) || 0)));
    setConfig((prev) => {
      const nextBeads = { ...prev.beads };
      if (clean === 0) {
        delete nextBeads[beadId];
      } else {
        nextBeads[beadId] = clean;
      }
      return { ...prev, beads: nextBeads };
    });
  };

  const adjustBeadQty = (beadId, delta) => {
    const current = Number(config.beads[beadId] || 0);
    setBeadQty(beadId, current + delta);
  };

  const applyPreset = (preset) => {
    setConfig((prev) => ({
      ...prev,
      beads: { ...preset.beads },
      size: preset.size,
      thread: preset.thread,
      capping: preset.capping
    }));
    emitToast(`${preset.label} configuration loaded`, "info");
  };

  const handleReset = () => {
    setConfig((prev) => ({ ...prev, beads: {}, wearerNote: "" }));
    emitToast("Mala slate cleared — add any Rudraksha beads you wish", "info");
  };

  const handleAddToCart = () => {
    if (pricing.totalBeads <= 0) {
      emitToast("Please add at least 1 Rudraksha bead to build your custom mala.", "warning");
      return;
    }
    const payload = buildCustomMalaItemPayload(config, primaryVisualImage);
    add(payload, 1);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2200);
    emitToast(`Added ${payload.name} (${pricing.totalBeads} beads) to your cart!`, "success");
  };

  const handleOrderNow = () => {
    if (pricing.totalBeads <= 0) {
      emitToast("Please add at least 1 Rudraksha bead before ordering.", "warning");
      return;
    }
    const payload = buildCustomMalaItemPayload(config, primaryVisualImage);
    buyNow(payload, 1);
    emitToast("Custom Mala ready for checkout — choose COD or Online Payment!", "success");
    navigate("/checkout");
  };

  const savings = Math.max(0, pricing.mrp - pricing.unitPrice);

  return (
    <section
      id="customize-your-mala-section"
      aria-labelledby="custom-mala-heading"
      className="mx-auto my-8 max-w-[1280px] px-4 sm:px-6 lg:px-8"
    >
      <div className="overflow-hidden rounded-2xl border border-[#e6d5c1] bg-[#fdfaf5] shadow-[0_14px_40px_rgba(43,23,13,0.06)]">
        {/* Studio Header */}
        <div className="border-b border-[#ebdccb] bg-gradient-to-r from-[#fbf4ea] via-[#fdfaf5] to-[#f8efe2] px-5 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8c431f]">
                <Sparkles className="h-3.5 w-3.5 text-[#a54d2b]" />
                <span>Custom Rudraksha Mala Studio · Made to Order</span>
              </div>
              <h2
                id="custom-mala-heading"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                className="text-3xl font-bold tracking-tight text-[#2b170d] sm:text-4xl"
              >
                Customize Your Sacred Mala
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#5c483b]">
                Add any quantity of 1 to 14 Mukhi, Gauri Shankar, Ganesh, or 5 Mukhi Rudraksha beads, choose your ideal
                bead diameter including{" "}
                <strong className="font-semibold text-[#78270b]">Large Bold (13–15 mm)</strong> &amp;{" "}
                <strong className="font-semibold text-[#78270b]">Super-Large Collector (17–21 mm+)</strong> sizes — our
                artisans hand-string &amp; energize everything into one finished sacred mala for you.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              {MALA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="min-h-[38px] rounded-lg border border-[#dcc6af] bg-white px-3 py-1.5 text-xs font-semibold text-[#4a2b19] transition hover:border-[#a54d2b] hover:bg-[#fbf2e8] hover:text-[#78270b]"
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-[#7a675a] transition hover:bg-[#f2e7d9] hover:text-[#2b170d]"
                title="Clear all beads and start from 0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main 2-Column Studio Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT COLUMN: Live Sacred Mala Preview & Summary */}
          <div className="border-b border-[#ebdccb] bg-[#faf4eb]/60 p-5 sm:p-7 lg:col-span-5 lg:border-b-0 lg:border-r">
            <div className="lg:sticky lg:top-20">
              {/* Visual Mala Necklace Box */}
              <div className="relative flex flex-col items-center justify-center rounded-2xl border border-[#e7d6c3] bg-gradient-to-b from-[#fffdfa] to-[#f6ece0] p-4 shadow-inner">
                <div className="flex w-full items-center justify-between text-xs font-semibold text-[#6b4f3d]">
                  <span className="tabular-nums">
                    {pricing.totalBeads} Bead{pricing.totalBeads === 1 ? "" : "s"} Selected
                  </span>
                  <span className="flex items-center gap-1 text-[#78270b]">
                    <Maximize2 className="h-3 w-3" />
                    {pricing.sizeObj.shortLabel}
                  </span>
                </div>

                <svg
                  viewBox="0 0 300 315"
                  className="h-[260px] w-full max-w-[300px] sm:h-[290px]"
                  role="img"
                  aria-label={`Live preview of custom mala with ${pricing.totalBeads} Rudraksha beads`}
                >
                  <defs>
                    <radialGradient id="auraBeadGrad" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#c78349" />
                      <stop offset="55%" stopColor="#7a3418" />
                      <stop offset="100%" stopColor="#421809" />
                    </radialGradient>
                    <radialGradient id="auraHeroGrad" cx="35%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#e6aa65" />
                      <stop offset="50%" stopColor="#8d3616" />
                      <stop offset="100%" stopColor="#4c1908" />
                    </radialGradient>
                  </defs>

                  {/* Sacred Thread / Wire Ring */}
                  <ellipse
                    cx="150"
                    cy="148"
                    rx="112"
                    ry="116"
                    fill="none"
                    stroke={pricing.threadObj.color}
                    strokeWidth={pricing.totalBeads > 0 ? "3.2" : "2"}
                    strokeDasharray={
                      pricing.totalBeads === 0 ? "6 5" : pricing.threadObj.strokeDasharray
                    }
                    opacity={pricing.totalBeads > 0 ? 0.9 : 0.45}
                  />

                  {/* Sumaru Sacred Silk Tassel at 6 o'clock */}
                  {pricing.totalBeads > 0 && (
                    <g opacity="0.92">
                      <line x1="150" y1="270" x2="144" y2="306" stroke="#9e2a1f" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="150" y1="270" x2="150" y2="309" stroke="#b53324" strokeWidth="3" strokeLinecap="round" />
                      <line x1="150" y1="270" x2="156" y2="306" stroke="#9e2a1f" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="150" cy="272" r="4.5" fill={pricing.cappingObj.ringColor || "#d4af37"} />
                    </g>
                  )}

                  {/* Center Sacred Medallion Stats */}
                  <text
                    x="150"
                    y="138"
                    textAnchor="middle"
                    fill="#2b170d"
                    fontSize="28"
                    fontWeight="700"
                    style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontVariantNumeric: "tabular-nums" }}
                  >
                    {pricing.totalBeads}
                  </text>
                  <text
                    x="150"
                    y="156"
                    textAnchor="middle"
                    fill="#7a5e4e"
                    fontSize="10.5"
                    fontWeight="600"
                    letterSpacing="1.6"
                  >
                    {pricing.totalBeads === 0 ? "ADD BEADS" : "SACRED BEADS"}
                  </text>
                  <text
                    x="150"
                    y="174"
                    textAnchor="middle"
                    fill="#8c431f"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {pricing.sizeObj.shortLabel.toUpperCase()}
                  </text>

                  {/* Dynamic Beads Along Ring */}
                  {visualRingBeads.map((b) => (
                    <g key={b.key}>
                      {pricing.cappingObj.ringColor && b.isHero && (
                        <circle
                          cx={b.x}
                          cy={b.y}
                          r={b.r + 2.2}
                          fill="none"
                          stroke={pricing.cappingObj.ringColor}
                          strokeWidth="2"
                        />
                      )}
                      <circle
                        cx={b.x}
                        cy={b.y}
                        r={b.r}
                        fill={b.isHero ? "url(#auraHeroGrad)" : "url(#auraBeadGrad)"}
                        stroke="#3b160a"
                        strokeWidth="0.7"
                      />
                      {/* Natural Mukhi Seed Line Accent */}
                      <circle
                        cx={b.x - b.r * 0.28}
                        cy={b.y - b.r * 0.25}
                        r={Math.max(1.2, b.r * 0.18)}
                        fill="#f8d8a8"
                        opacity="0.45"
                      />
                    </g>
                  ))}
                </svg>

                <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11.5px] font-medium text-[#6f5849]">
                  <span>{pricing.threadObj.shortLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{pricing.cappingObj.shortLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>Pre-energized with Vedic Mantra</span>
                </div>
              </div>

              {/* Selected Bead Breakdown List */}
              <div className="mt-4 rounded-xl border border-[#e7d6c3] bg-white p-4">
                <div className="mb-2.5 flex items-center justify-between border-b border-[#f3e9dd] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5c483b]">
                    Your Mala Assembly ({pricing.totalBeads} Beads)
                  </span>
                  {pricing.items.length > 0 && (
                    <span className="text-xs font-semibold text-[#78270b] tabular-nums">
                      {pricing.items.length} type{pricing.items.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {pricing.items.length === 0 ? (
                  <p className="py-3 text-center text-xs text-[#8a7566]">
                    No beads selected yet. Tap <strong>+ Add</strong> on any Rudraksha bead on the right to start building your mala.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {pricing.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-xs text-[#2b170d]"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold">{item.qty}× {item.name}</span>
                          <span className="ml-1.5 text-[11px] text-[#806f62] tabular-nums">
                            ({money(item.unitPrice)}/bead)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold tabular-nums">{money(item.lineTotal)}</span>
                          <button
                            type="button"
                            onClick={() => setBeadQty(item.id, 0)}
                            aria-label={`Remove ${item.name}`}
                            className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-[#9a7f6d] hover:bg-[#fdf2ef] hover:text-[#b91c1c]"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Price Breakdown & CTAs */}
                <div className="mt-3 space-y-1.5 border-t border-[#f0e3d3] pt-3 text-xs text-[#5c483b]">
                  {pricing.threadFee > 0 && (
                    <div className="flex justify-between">
                      <span>{pricing.threadObj.label}</span>
                      <span className="font-semibold text-[#2b170d] tabular-nums">+{money(pricing.threadFee)}</span>
                    </div>
                  )}
                  {pricing.cappingFee > 0 && (
                    <div className="flex justify-between">
                      <span>{pricing.cappingObj.label}</span>
                      <span className="font-semibold text-[#2b170d] tabular-nums">+{money(pricing.cappingFee)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-sm font-bold text-[#2b170d]">Complete Assembled Mala Price</span>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-[#78270b] tabular-nums">
                        {money(pricing.unitPrice)}
                      </span>
                      {savings > 0 && (
                        <div className="flex items-center justify-end gap-1.5 text-[11px]">
                          <del className="text-[#948072] tabular-nums">{money(pricing.mrp)}</del>
                          <span className="font-semibold text-[#166534] tabular-nums">
                            Save {money(savings)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    id="custom-mala-add-cart-btn"
                    onClick={handleAddToCart}
                    disabled={pricing.totalBeads <= 0}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#78270b] bg-white px-4 py-2.5 text-sm font-bold text-[#78270b] transition hover:bg-[#fbf2eb] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {addedFeedback ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                    <span>{addedFeedback ? "Added to Cart" : "Add Mala to Cart"}</span>
                  </button>
                  <button
                    type="button"
                    id="custom-mala-order-now-btn"
                    onClick={handleOrderNow}
                    disabled={pricing.totalBeads <= 0}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#78270b] to-[#a54d2b] px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_18px_rgba(120,39,11,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>Order Custom Mala</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#166534]">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>Hand-strung into one single Mala · COD &amp; Online Payment available</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Size, Bead Picker & Finish Customizers */}
          <div className="p-5 sm:p-7 lg:col-span-7">
            {/* Step 1: Bead Size (Featuring Big & Collector Large Sizes) */}
            <div className="mb-6">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#2b170d]">
                  1. Choose Rudraksha Bead Size (Large &amp; Super-Large Available)
                </h3>
                <span className="text-xs font-semibold text-[#8c431f]">
                  {pricing.sizeObj.shortLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {MALA_BEAD_SIZES.map((sz) => {
                  const selected = config.size === sz.id;
                  return (
                    <button
                      key={sz.id}
                      type="button"
                      data-mala-size={sz.id}
                      onClick={() => setConfig((prev) => ({ ...prev, size: sz.id }))}
                      className={`flex min-h-[68px] flex-col items-start justify-between rounded-xl border p-3 text-left transition ${
                        selected
                          ? "border-[#78270b] bg-[#fbf1e6] shadow-sm ring-1 ring-[#78270b]/30"
                          : "border-[#e6d6c3] bg-white hover:border-[#c39e7a]"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-[13px] font-bold text-[#2b170d]">{sz.label}</span>
                        <span
                          className={`text-[11px] font-bold ${
                            selected ? "text-[#78270b]" : "text-[#806f62]"
                          }`}
                        >
                          {sz.tag}
                        </span>
                      </div>
                      <span className="mt-1 text-[11.5px] leading-snug text-[#6b5648]">
                        {sz.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select & Add Any Quantity of Rudraksha Beads */}
            <div className="mb-6">
              <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#2b170d]">
                  2. Add Sacred Rudraksha Beads (Any Quantity)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {MALA_BEAD_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        activeCategory === cat.id
                          ? "bg-[#78270b] text-white"
                          : "border border-[#e3d2bf] bg-white text-[#5c483b] hover:border-[#a54d2b]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {filteredBeads.map((bead) => {
                  const qty = Number(config.beads[bead.id] || 0);
                  const { unitPrice } = getBeadScaledPricing(bead, pricing.sizeObj);
                  const thumb = beadThumbMap[bead.id];

                  return (
                    <div
                      key={bead.id}
                      data-mala-bead={bead.id}
                      className={`flex flex-col justify-between rounded-xl border p-3 transition ${
                        qty > 0
                          ? "border-[#a54d2b] bg-[#fffaf3] shadow-[0_3px_12px_rgba(165,77,43,0.08)]"
                          : "border-[#eadbc9] bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Bead Visual / Photo */}
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#e6d5c1] bg-[#f7efe6]">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={bead.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                              style={{
                                background: `radial-gradient(circle at 35% 30%, ${bead.accent}, ${bead.color})`
                              }}
                            >
                              {bead.mukhi > 0 ? `${bead.mukhi}M` : "★"}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[13.5px] font-bold leading-tight text-[#2b170d]">
                              {bead.name}
                            </h4>
                            <span className="shrink-0 text-[13px] font-bold text-[#78270b] tabular-nums">
                              {money(unitPrice)}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] font-medium text-[#8c593b]">
                            {bead.deity}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[#6b584c]">
                            {bead.benefit}
                          </p>
                        </div>
                      </div>

                      {/* Stepper & Quick Multi-Add Controls */}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#f3e9dd] pt-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustBeadQty(bead.id, -1)}
                            disabled={qty <= 0}
                            aria-label={`Decrease ${bead.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e3d2bf] bg-[#faf6f0] text-[#2b170d] transition hover:border-[#a54d2b] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="1080"
                            aria-label={`${bead.name} quantity`}
                            value={qty}
                            onChange={(e) => setBeadQty(bead.id, e.target.value)}
                            className="h-9 w-12 rounded-lg border border-[#e3d2bf] bg-white text-center text-xs font-bold text-[#2b170d] tabular-nums focus:border-[#78270b] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => adjustBeadQty(bead.id, 1)}
                            aria-label={`Increase ${bead.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#78270b] bg-[#78270b] text-white transition hover:bg-[#5e1d08]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {bead.id === "5-mukhi-spacer" ? (
                            <>
                              {[27, 54, 108].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => adjustBeadQty(bead.id, n)}
                                  className="min-h-[34px] rounded-md border border-[#e3d2bf] bg-[#fdf8f1] px-2 text-[11px] font-bold text-[#78270b] hover:border-[#a54d2b] hover:bg-[#f9ecdc] tabular-nums"
                                >
                                  +{n}
                                </button>
                              ))}
                            </>
                          ) : (
                            <>
                              {[2, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => adjustBeadQty(bead.id, n)}
                                  className="min-h-[34px] rounded-md border border-[#e3d2bf] bg-[#fdf8f1] px-2 text-[11px] font-bold text-[#78270b] hover:border-[#a54d2b] hover:bg-[#f9ecdc] tabular-nums"
                                >
                                  +{n}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Thread / Wire & Metal Capping + Sankalp Note */}
            <div className="grid grid-cols-1 gap-5 border-t border-[#ebdccb] pt-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#2b170d]">
                  3. Thread / Sacred Wire
                </h3>
                <div className="space-y-2">
                  {MALA_THREAD_OPTIONS.map((th) => {
                    const selected = config.thread === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, thread: th.id }))}
                        className={`flex min-h-[42px] w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                          selected
                            ? "border-[#78270b] bg-[#fbf1e6] text-[#2b170d]"
                            : "border-[#e6d6c3] bg-white text-[#4f3d32] hover:border-[#c39e7a]"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-black/15"
                            style={{ backgroundColor: th.color }}
                          />
                          <span>{th.label}</span>
                        </span>
                        <span className="font-bold text-[#78270b] tabular-nums">
                          {th.fee > 0 ? `+${money(th.fee)}` : "Included"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#2b170d]">
                  4. Sacred Metal Capping
                </h3>
                <div className="space-y-2">
                  {MALA_CAPPING_OPTIONS.map((cap) => {
                    const selected = config.capping === cap.id;
                    return (
                      <button
                        key={cap.id}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, capping: cap.id }))}
                        className={`flex min-h-[42px] w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                          selected
                            ? "border-[#78270b] bg-[#fbf1e6] text-[#2b170d]"
                            : "border-[#e6d6c3] bg-white text-[#4f3d32] hover:border-[#c39e7a]"
                        }`}
                      >
                        <span>{cap.label}</span>
                        <span className="font-bold text-[#78270b] tabular-nums">
                          {cap.fee > 0 ? `+${money(cap.fee)}` : "Included"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Optional Wearer Sankalp / Pattern Instruction */}
            <div className="mt-4">
              <label
                htmlFor="custom-mala-sankalp-note"
                className="mb-1.5 block text-xs font-bold text-[#5c483b]"
              >
                Optional Sankalp / Wearer Name &amp; Pattern Note (e.g. Gauri Shankar in center)
              </label>
              <input
                id="custom-mala-sankalp-note"
                type="text"
                maxLength={120}
                value={config.wearerNote}
                onChange={(e) => setConfig((prev) => ({ ...prev, wearerNote: e.target.value }))}
                placeholder="Write wearer's name for Pran Pratishtha or bead arrangement note..."
                className="min-h-[42px] w-full rounded-xl border border-[#e3d2bf] bg-white px-3.5 py-2 text-xs text-[#2b170d] placeholder:text-[#9c8779] focus:border-[#78270b] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
