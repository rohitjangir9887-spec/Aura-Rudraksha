import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck, Flame, Compass } from "lucide-react";

export function AuraEditorialSection() {
  return (
    <section className="aura-editorial-section py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-[1320px] mx-auto" id="editorial-discovery">
      {/* 1. Section Hierarchy & Header */}
      <div className="text-center mb-8 md:mb-12 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#A54D2B] font-sans">
          THE AURA EDITORIAL
        </span>
        <h2 
          className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-[#2B170D] mt-2.5 mb-3.5"
          style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
        >
          Sacred Pieces, Beautifully Chosen
        </h2>
        <p className="text-sm sm:text-base text-[#6B5344] font-normal leading-relaxed max-w-2xl mx-auto">
          Explore timeless Rudraksha, malas and spiritual essentials selected for everyday devotion.
        </p>
      </div>

      {/* 2. Asymmetric Editorial Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-stretch">
        
        {/* LEFT / HERO CARD (Large - 7 cols on Desktop) */}
        <Link 
          to="/shop?q=mala"
          className="lg:col-span-7 group relative rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(43,23,13,0.08)] border border-[#E8DAC9]/80 bg-[#2B170D] flex flex-col justify-end min-h-[440px] sm:min-h-[500px] lg:min-h-[560px]"
        >
          {/* Background Image with smooth hover scale */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src="https://i.ibb.co/vvjdFqNQ/file-0000000057548208a095c1d1fc26f78c.jpg"
              alt="Sacred Japa and Dhyana Malas"
              className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
              loading="lazy"
              onError={(e) => {
                // Fallback to local mala image if network image fails
                if (!e.currentTarget.src.includes("product-mala.jpg")) { e.currentTarget.src = "/images/product-mala.jpg"; }
              }}
            />
          </div>
        </Link>

        {/* RIGHT / STACKED GRID (5 cols on Desktop) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4 sm:gap-5 lg:gap-5 flex-col justify-between">
          
          {/* Card 1: Nepali Mukhis */}
          <Link
            to="/shop?category=Rudraksha"
            className="group relative rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(43,23,13,0.06)] border border-[#E8DAC9]/80 bg-[#2B170D] min-h-[220px] sm:min-h-[245px] lg:min-h-[260px] flex flex-col justify-end p-4 sm:p-5 transition-all duration-300 hover:shadow-xl"
          >
            <div className="absolute inset-0 overflow-hidden">
              <img
                src="https://i.ibb.co/nMzc8B8k/file-00000000243482118ca7430425cda1ba.png"
                alt="1 to 14 Mukhi Beads"
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500 ease-out"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (!e.currentTarget.src.includes("product-5mukhi.jpg")) { e.currentTarget.src = "/images/product-5mukhi.jpg"; }
                }}
              />
            </div>
          </Link>

          {/* Card 2: Sacred Wrist Bracelets */}
          <Link
            to="/shop?q=bracelet"
            className="group relative rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(43,23,13,0.06)] border border-[#E8DAC9]/80 bg-[#2B170D] min-h-[220px] sm:min-h-[245px] lg:min-h-[260px] flex flex-col justify-end p-4 sm:p-5 transition-all duration-300 hover:shadow-xl"
          >
            <div className="absolute inset-0 overflow-hidden">
              <img
                src="https://aurarudraksha.com/wp-content/uploads/2024/02/IMG_1020.jpg"
                alt="Sacred Wrist Bracelets"
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500 ease-out"
                loading="lazy"
                onError={(e) => {
                  if (!e.currentTarget.src.includes("product-11mukhi.jpg")) { e.currentTarget.src = "/images/product-11mukhi.jpg"; }
                }}
              />
            </div>
          </Link>

          {/* Card 3: Full Width across bottom (Col span 2) */}
          <Link
            to="/shop?q=puja"
            className="col-span-2 group relative rounded-2xl overflow-hidden shadow-[0_6px_20px_rgba(43,23,13,0.06)] border border-[#E8DAC9]/80 bg-[#2B170D] min-h-[220px] sm:min-h-[240px] lg:min-h-[260px] flex flex-col justify-end p-5 sm:p-6 transition-all duration-300 hover:shadow-xl"
          >
            <div className="absolute inset-0 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&w=1200&q=80"
                alt="Puja Essentials and Brass Diyas"
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-600 ease-out"
                loading="lazy"
                onError={(e) => {
                  if (!e.currentTarget.src.includes("BVtGczcQ")) { e.currentTarget.src = "https://i.ibb.co/BVtGczcQ/file-00000000ee808211869df734ac614fe5.png"; }
                }}
              />
            </div>
          </Link>

        </div>

      </div>
    </section>
  );
}
