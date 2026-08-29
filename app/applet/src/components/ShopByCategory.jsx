import React, { useRef } from "react";
import { Link } from "react-router-dom";

export function ShopByCategory() {
  const scrollRef = useRef(null);

  const categories = [
    {
      name: "Rudraksha",
      desc: "Authentic beads",
      img: "/images/product-5mukhi.jpg",
      link: "/shop?category=Rudraksha"
    },
    {
      name: "Malas",
      desc: "Sacred Japa malas",
      img: "/images/product-7mukhi.jpg",
      link: "/shop?category=Malas"
    },
    {
      name: "Puja Samagri",
      desc: "Daily rituals",
      img: "/images/product-11mukhi.jpg", // Using placeholder, can be replaced
      link: "/shop?category=Puja Samagri"
    },
    {
      name: "Bracelets",
      desc: "Spiritual wear",
      img: "/images/product-1mukhi.jpg",
      link: "/shop?category=Bracelets"
    },
    {
      name: "Crystals",
      desc: "Healing stones",
      img: "/images/product-5mukhi.jpg",
      link: "/shop?category=Crystals"
    },
    {
      name: "Spiritual",
      desc: "Divine items",
      img: "/images/product-7mukhi.jpg",
      link: "/shop?category=Spiritual Essentials"
    }
  ];

  return (
    <section 
      style={{
        padding: "30px 4%",
        background: "#fffdf9",
        borderBottom: "1px solid #f0ebe4"
      }}
      aria-label="Shop by Category"
    >
      <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
        
        {/* Header */}
        <style>
          {`
            .cat-hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2 style={{ 
            fontFamily: "'Cormorant Garamond', serif", 
            fontSize: "26px", 
            fontWeight: 600, 
            color: "#2b170d", 
            margin: "0 0 4px 0" 
          }}>
            Shop by Category
          </h2>
          <p style={{ 
            color: "#806f62", 
            fontSize: "13px", 
            margin: 0,
            fontStyle: "italic"
          }}>
            Explore our spiritual essentials
          </p>
        </div>

        {/* Carousel */}
        <div 
          ref={scrollRef}
          className="cat-hide-scrollbar"
          style={{
            display: "flex",
            gap: "14px",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            paddingBottom: "10px",
            msOverflowStyle: "none",
            scrollbarWidth: "none"
          }}
        >
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              to={cat.link}
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: "140px",
                flexShrink: 0,
                scrollSnapAlign: "start",
                background: "#fdfbf7",
                border: "1px solid #e8e0d8",
                borderRadius: "14px",
                overflow: "hidden",
                textDecoration: "none",
                boxShadow: "0 2px 8px rgba(43,23,13,0.03)",
                transition: "transform 0.2s ease, border-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#c89b3c";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e8e0d8";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Image Area */}
              <div style={{ width: "100%", aspectRatio: "4/3", backgroundColor: "#fdfbf7" }}>
                <img 
                  src={cat.img} 
                  alt={cat.name} 
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block"
                  }}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = "/images/product-5mukhi.jpg";
                  }}
                />
              </div>

              {/* Text Area */}
              <div style={{ padding: "12px 10px", textAlign: "center" }}>
                <span style={{ 
                  display: "block", 
                  fontSize: "14px", 
                  fontWeight: 600, 
                  color: "#2b170d",
                  marginBottom: "2px"
                }}>
                  {cat.name}
                </span>
                <span style={{ 
                  display: "block", 
                  fontSize: "11px", 
                  color: "#8c7a6e"
                }}>
                  {cat.desc}
                </span>
              </div>
            </Link>
          ))}
        </div>
        
      </div>
    </section>
  );
}
