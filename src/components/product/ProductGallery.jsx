import { getProductPrimaryImage, getProductGalleryImages, getOptimizedImageUrl } from "../../lib/imageUtils";
import { OptimizedImage } from "../OptimizedImage";
import { getProductRoute } from "../../lib/routes";
import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, ChevronRight, Heart, ZoomIn, X, Play, Volume2, Sparkles, Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OfferBadge } from "../OfferBadge";
import { pct } from "../../data";

export function ProductGallery({ product, isWishlisted, onToggleWishlist }) {
  if (!product) return null;

  const rawImages = (Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : getProductGalleryImages(product);

  // Unique list of valid image URLs
  const images = rawImages.filter(Boolean);
  if (images.length === 0) images.push("/images/placeholder.svg");

  const [activeImg, setActiveImg] = useState(images[0]);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Desktop hover zoom state
  const [isHoverZooming, setIsHoverZooming] = useState(false);
  const [zoomTransform, setZoomTransform] = useState({ originX: "50%", originY: "50%", scale: 1 });

  // Touch gesture refs for mobile swipe
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Sync activeImg when product or active image array changes
  useEffect(() => {
    if (images.length > 0) {
      setActiveImg(images[0]);
    }
  }, [product?.id, images[0]]);

  const currentIndex = images.indexOf(activeImg);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const discountPct = pct(product);

  // Preload images
  useEffect(() => {
    images.forEach(src => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [images]);

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (images.length <= 1) return;
    setSlideDirection(-1);
    const prevIdx = (activeIndex - 1 + images.length) % images.length;
    setActiveImg(images[prevIdx]);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (images.length <= 1) return;
    setSlideDirection(1);
    const nextIdx = (activeIndex + 1) % images.length;
    setActiveImg(images[nextIdx]);
  };

  const handleSelectThumbnail = (imgUrl, idx) => {
    if (imgUrl === activeImg) return;
    setSlideDirection(idx > activeIndex ? 1 : -1);
    setActiveImg(imgUrl);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (e.changedTouches && e.changedTouches[0]) {
      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      const diffY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX > 0) handleNext();
        else handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Hover zoom for desktop
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomTransform({
      originX: `${x}%`,
      originY: `${y}%`,
      scale: 2.2
    });
    setIsHoverZooming(true);
  };

  const handleMouseLeave = () => {
    setZoomTransform({ originX: "50%", originY: "50%", scale: 1 });
    setIsHoverZooming(false);
  };

  // Keyboard navigation for zoom modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isZoomOpen) {
        if (e.key === "Escape") setIsZoomOpen(false);
        if (e.key === "ArrowLeft") handlePrev();
        if (e.key === "ArrowRight") handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomOpen, activeIndex, images]);

  const hasVideo = Boolean(product.videoUrl || product.video);

  return (
    <div className="aura-product-gallery-wrapper">
      {/* Main Image Frame */}
      <div 
        className="aura-gallery-main-frame"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        id="aura-main-image-frame"
      >
        {/* Badges Overlay */}
        <div className="aura-gallery-badges">
          {product.badge && !product.customOffer && (
            <span className="aura-gallery-badge primary">
              <Sparkles size={11} /> {product.badge}
            </span>
          )}
          {discountPct > 0 && (
            <span className="aura-gallery-badge discount">
              {discountPct}% OFF
            </span>
          )}
          <OfferBadge product={product} variant="image" />
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          className={`aura-gallery-wishlist-btn ${isWishlisted ? "active" : ""}`}
          onClick={() => onToggleWishlist(product.id, product.name)}
          aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <Heart 
            size={19} 
            fill={isWishlisted ? "#8c2b10" : "none"} 
            color={isWishlisted ? "#8c2b10" : "#5a3a29"} 
          />
        </button>

        {/* Previous & Next Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="aura-gallery-arrow prev"
              onClick={handlePrev}
              aria-label="Previous Image"
            >
              <ChevronLeft size={22} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              className="aura-gallery-arrow next"
              onClick={handleNext}
              aria-label="Next Image"
            >
              <ChevronRight size={22} strokeWidth={2.4} />
            </button>
          </>
        )}

        {/* Counter Chip */}
        {images.length > 1 && (
          <div className="aura-gallery-counter">
            {activeIndex + 1} / {images.length}
          </div>
        )}

        {/* Zoom Lightbox Trigger */}
        <button
          type="button"
          className="aura-gallery-zoom-trigger"
          onClick={() => setIsZoomOpen(true)}
          title="Zoom full image"
          aria-label="Zoom image"
        >
          <ZoomIn size={17} />
        </button>

        {/* Video Trigger (if video exists) */}
        {hasVideo && (
          <button
            type="button"
            className="aura-gallery-video-trigger"
            onClick={() => setIsVideoModalOpen(true)}
            title="Watch Sacred Video"
          >
            <Play size={15} fill="currentColor" />
            <span>Watch Bead Video</span>
          </button>
        )}

        {/* Viewport for Desktop Hover Zoom */}
        <div 
          className="aura-gallery-viewport"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={activeImg || images[0]}
              src={getOptimizedImageUrl(activeImg || images[0], { width: 800, quality: 84 })}
              alt={`${product.name} - Sacred View ${activeIndex + 1}`}
              className="aura-gallery-hero-img"
              loading="eager"
              decoding="async"
              fetchpriority="high"
              style={{
                transformOrigin: `${zoomTransform.originX} ${zoomTransform.originY}`,
                transform: `scale(${zoomTransform.scale})`,
                transition: isHoverZooming ? "transform 0.05s ease-out" : "transform 0.25s ease-out, transform-origin 0.25s ease-out"
              }}
              initial={{ opacity: 0, x: slideDirection * 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -slideDirection * 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onError={(e) => {
                if (!e.target.src.includes("product-5mukhi.jpg")) {
                  e.target.src = "/images/placeholder.svg";
                }
              }}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Thumbnails Row */}
      {images.length > 1 && (
        <div className="aura-gallery-thumbs-row" role="tablist" aria-label="Product thumbnails">
          {images.map((imgUrl, idx) => {
            const isActive = (activeImg || images[0]) === imgUrl;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`View photo ${idx + 1}`}
                className={`aura-thumb-btn ${isActive ? "active" : ""}`}
                onClick={() => handleSelectThumbnail(imgUrl, idx)}
              >
                <OptimizedImage
                  src={imgUrl}
                  alt={`${product.name} thumbnail ${idx + 1}`}
                  width={120}
                  quality={70}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Zoom Modal */}
      <AnimatePresence>
        {isZoomOpen && (
          <motion.div
            className="aura-lightbox-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomOpen(false)}
          >
            <div className="aura-lightbox-box" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="aura-lightbox-close-btn"
                onClick={() => setIsZoomOpen(false)}
                aria-label="Close modal"
              >
                <X size={22} />
              </button>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="aura-lightbox-arrow prev"
                    onClick={handlePrev}
                    aria-label="Previous Image"
                  >
                    <ChevronLeft size={28} />
                  </button>
                  <button
                    type="button"
                    className="aura-lightbox-arrow next"
                    onClick={handleNext}
                    aria-label="Next Image"
                  >
                    <ChevronRight size={28} />
                  </button>
                </>
              )}

              <img
                src={activeImg || images[0]}
                alt={product.name}
                className="aura-lightbox-image"
                decoding="async"
              />

              <div className="aura-lightbox-footer">
                <span className="aura-lb-title">{product.name}</span>
                <span className="aura-lb-step">
                  {activeIndex + 1} of {images.length}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoModalOpen && hasVideo && (
          <motion.div
            className="aura-lightbox-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsVideoModalOpen(false)}
          >
            <div className="aura-video-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="aura-video-modal-header">
                <h3>Sacred Consecration Video • {product.name}</h3>
                <button
                  type="button"
                  className="aura-lightbox-close-btn"
                  onClick={() => setIsVideoModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="aura-video-viewport">
                <iframe
                  src={product.videoUrl || product.video}
                  title="Product Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aura-video-iframe"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
