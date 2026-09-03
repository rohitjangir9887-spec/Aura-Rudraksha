import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Sparkles } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { useCart } from "../hooks/useCart";
import { isPublicProduct } from "../lib/db";

export function AllProductsSection({ products = [], isLoading = false }) {
  const { add } = useCart();

  // All active products from catalog
  const allActiveProducts = React.useMemo(() => {
    return (products || []).filter(isPublicProduct);
  }, [products]);

  return (
    <section className="section all-products-section" style={{ paddingTop: '25px', paddingBottom: '45px' }}>
      {/* Clean Section Heading: All Products */}
      <div className="section-heading fade-in-up-d1" style={{ marginBottom: '24px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '11px', 
            fontWeight: '700', 
            letterSpacing: '0.2em', 
            color: '#b85d25', 
            textTransform: 'uppercase',
            marginBottom: '6px'
          }}>
            <Sparkles size={13} />
            COMPLETE SACRED CATALOG
          </span>
          <h2 style={{ 
            fontFamily: '"Cormorant Garamond", Georgia, serif', 
            fontSize: '34px', 
            fontWeight: '700', 
            color: '#2a160d', 
            margin: '4px 0 8px',
            lineHeight: 1.15
          }}>
            All Products
          </h2>
          <p style={{ fontSize: '13.5px', color: '#7a6a5e', margin: '0 auto', maxWidth: '520px', lineHeight: 1.5 }}>
            Browse our full catalog of 100% authentic, lab-certified Nepali Rudrakshas, divine combinations, and consecrated malas.
          </p>
        </div>
      </div>

      {/* Product Grid using standard website layout */}
      <div className="product-grid swipeable">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
        ) : allActiveProducts.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '40px 20px', 
            background: '#fffdf9', 
            borderRadius: '12px',
            border: '1px dashed #decbb8' 
          }}>
            <p style={{ fontSize: '15px', color: '#7a6a5e', margin: '0 0 12px' }}>
              No products found in the catalog.
            </p>
            <Link to="/shop" className="primary-btn" style={{ fontSize: '13px', padding: '9px 18px' }}>
              Open Shop Catalog
            </Link>
          </div>
        ) : (
          allActiveProducts.map(p => (
            <ProductCard key={p.id} p={p} onAdd={add} />
          ))
        )}
      </div>

      {/* View All Products Button */}
      <div className="explore-more-container" style={{ marginTop: '36px', textAlign: 'center' }}>
        <Link 
          to="/shop" 
          className="explore-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #78270b 0%, #a84118 100%)',
            color: '#ffffff',
            padding: '13px 32px',
            borderRadius: '30px',
            fontSize: '14px',
            fontWeight: '700',
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(120, 39, 11, 0.25)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          <span>View All Products</span>
          <ChevronRight size={18} />
        </Link>
      </div>
    </section>
  );
}
