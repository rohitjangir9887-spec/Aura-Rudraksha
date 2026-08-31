import React, { useRef, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db, onStoreUpdate } from "../lib/db";

export function ShopByCategory() {
  const scrollRef = useRef(null);
  const location = useLocation();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const [categories, setCategories] = useState(() => {
    const settings = db.getSettings();
    return (settings.shopCategories && settings.shopCategories.length > 0) ? settings.shopCategories : [
      {
        id: "rudraksha",
        name: "Rudraksha",
        desc: "Authentic Nepal beads",
        image: "/images/product-5mukhi.jpg",
        fallback: "/images/product-5mukhi.jpg",
        link: "/shop?q=Rudraksha"
      },
      {
        id: "malas",
        name: "Malas",
        desc: "108+1 Japa malas",
        image: "/images/product-mala.jpg",
        fallback: "/images/product-mala.jpg",
        link: "/shop?q=Mala"
      },
      {
        id: "puja-samagri",
        name: "Puja Samagri",
        desc: "Sacred ritual essentials",
        image: "https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=500&q=80",
        fallback: "/images/product-7mukhi.jpg",
        link: "/shop?q=Puja"
      },
      {
        id: "bracelets",
        name: "Bracelets",
        desc: "Energized wristbands",
        image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=500&q=80",
        fallback: "/images/product-1mukhi.jpg",
        link: "/shop?q=Bracelet"
      },
      {
        id: "crystals",
        name: "Crystals",
        desc: "Natural healing stones",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80",
        fallback: "/images/product-11mukhi.jpg",
        link: "/shop?q=Crystal"
      },
      {
        id: "spiritual-essentials",
        name: "Spiritual Essentials",
        desc: "Vedic divine accessories",
        image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=500&q=80",
        fallback: "/images/product-5mukhi.jpg",
        link: "/shop?q=Spiritual"
      }
    ];
  });

  useEffect(() => {
    const unsub = onStoreUpdate(() => {
      const settings = db.getSettings();
      if (settings.shopCategories && settings.shopCategories.length > 0) {
        setCategories(settings.shopCategories);
      }
    });
    return () => unsub();
  }, [location.pathname]);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section 
      className="aura-shop-by-category"
      style={{
        padding: "16px 4% 12px",
        background: "#fcf9f4",
        borderTop: "1px solid #ebdccb",
        borderBottom: "1px solid #ebdccb",
        position: "relative"
      }}
      aria-label="Shop by Category"
    >
      <div style={{ maxWidth: "1320px", margin: "0 auto", position: "relative" }}>
        
        {/* Section Header */}
        <div style={{ 
          display: "flex", 
          alignItems: "flex-end", 
          justifyContent: "space-between",
          marginBottom: "12px" 
        }}>
          <div>
            <span style={{ 
              display: "block", 
              fontSize: "9.5px", 
              fontWeight: 700, 
              letterSpacing: "1.5px", 
              color: "#a54d2b", 
              textTransform: "uppercase",
              marginBottom: "2px" 
            }}>
              COLLECTIONS
            </span>
            <h2 style={{ 
              fontFamily: "'Cormorant Garamond', Georgia, serif", 
              fontSize: "21px", 
              fontWeight: 600, 
              color: "#2b170d", 
              margin: 0,
              lineHeight: 1.15
            }}>
              Shop by Category
            </h2>
            <p style={{ 
              color: "#806f62", 
              fontSize: "11.5px", 
              margin: "2px 0 0 0",
              letterSpacing: "0.2px"
            }}>
              Explore our spiritual essentials
            </p>
          </div>

          {/* Desktop Navigation Arrows (hidden on small mobile) */}
          <div className="cat-carousel-controls" style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Previous categories"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "1px solid #e0d2c3",
                background: canScrollLeft ? "#fffdf9" : "#f5efe6",
                color: canScrollLeft ? "#4a3828" : "#b8a99b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canScrollLeft ? "pointer" : "default",
                transition: "all 0.2s ease",
                opacity: canScrollLeft ? 1 : 0.4
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Next categories"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "1px solid #e0d2c3",
                background: canScrollRight ? "#fffdf9" : "#f5efe6",
                color: canScrollRight ? "#4a3828" : "#b8a99b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canScrollRight ? "pointer" : "default",
                transition: "all 0.2s ease",
                opacity: canScrollRight ? 1 : 0.4
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Categories Carousel */}
        <div
          ref={scrollRef}
          onScroll={checkScrollButtons}
          className="aura-cat-carousel"
          style={{
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            padding: "4px 2px 10px 2px",
            msOverflowStyle: "none",
            scrollbarWidth: "none"
          }}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.link}
              className="aura-cat-card group"
              id={`cat-card-${cat.id}`}
              style={{
                flex: "0 0 calc(42% - 8px)",
                minWidth: "135px",
                maxWidth: "200px",
                scrollSnapAlign: "start",
                background: "#fffdf9",
                border: "1px solid #ebdccb",
                borderRadius: "12px",
                overflow: "hidden",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(43, 23, 13, 0.04)",
                transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                display: "flex",
                flexDirection: "column"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = "#c89b3c";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(43, 23, 13, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "#ebdccb";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(43, 23, 13, 0.04)";
              }}
            >
              {/* Product Image Box */}
              <div 
                style={{ 
                  width: "100%", 
                  aspectRatio: "1.15 / 1", 
                  overflow: "hidden",
                  background: "#f4eee6",
                  position: "relative"
                }}
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    if (cat.fallback && !e.currentTarget.src.includes(cat.fallback.replace(/^\//, ''))) {
                      e.currentTarget.src = cat.fallback;
                    }
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transition: "transform 0.35s ease"
                  }}
                />
              </div>

              {/* Card Bottom Text */}
              <div style={{ 
                padding: "8px 6px 9px", 
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "2px"
              }}>
                <span style={{ 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: "#2b170d",
                  lineHeight: 1.2,
                  letterSpacing: "0.1px"
                }}>
                  {cat.name}
                </span>
                <span style={{ 
                  fontSize: "10px", 
                  color: "#806f62",
                  lineHeight: 1.15,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {cat.desc}
                </span>
              </div>
            </Link>
          ))}
        </div>

      </div>

      <style>{`
        .aura-cat-carousel::-webkit-scrollbar {
          display: none;
        }
        @media (min-width: 640px) {
          .aura-cat-card {
            flex: 0 0 calc(28% - 10px) !important;
            max-width: 190px !important;
          }
        }
        @media (min-width: 1024px) {
          .aura-cat-card {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            max-width: none !important;
          }
          .cat-carousel-controls {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
