import React, { useState, useEffect, useRef } from "react";
import { getOptimizedImageUrl, markProxyFailed } from "../lib/imageUtils";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";

/**
 * OptimizedImage Component
 * Features:
 * - IntersectionObserver-based lazy loading with pre-buffering (250px rootMargin)
 * - Automatic low-res blur placeholder (LQIP)
 * - Smooth opacity fade-in transition once high-res image finishes loading
 * - Priority mode bypass for instant LCP rendering
 * - Robust proxy error handling & fallbacks
 */
export function OptimizedImage({
  src,
  alt = "",
  width = 400,
  height,
  quality = 80,
  priority = false,
  className = "",
  style = {},
  containerClassName = "",
  containerStyle: customContainerStyle = {},
  aspectRatio,
  rootMargin = "250px 0px",
  threshold = 0.01,
  intersectionThreshold,
  onError,
  onLoad,
  ...restProps
}) {
  const containerRef = useRef(null);
  
  // If priority is true, consider it immediately visible to optimize LCP
  const isIntersecting = useIntersectionObserver(containerRef, {
    rootMargin,
    threshold: intersectionThreshold ?? threshold,
    enabled: !priority,
    freezeOnceVisible: true,
  });

  const isVisible = priority || isIntersecting;

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() =>
    isVisible ? getOptimizedImageUrl(src, { width, quality }) : ""
  );

  const imgRef = useRef(null);

  // Low-resolution placeholder (24px width blurred preview) - ONLY generate for non-priority images to save CPU & payload
  const placeholderSrc = React.useMemo(() => {
    if (priority) return null; // Eager LCP candidates should paint immediately without blur distraction
    if (!src || typeof src !== "string") return "/images/placeholder.svg";
    if (src.startsWith("data:") || src.endsWith(".svg")) return src;
    return getOptimizedImageUrl(src, { width: 24, quality: 20 });
  }, [src, priority]);

  // Update image src when `src`, `width`, `quality`, or visibility changes
  useEffect(() => {
    if (isVisible) {
      setIsLoaded(false);
      setHasError(false);
      const newOptimizedSrc = getOptimizedImageUrl(src, { width, quality });
      setCurrentSrc(newOptimizedSrc);
    }
  }, [src, width, quality, isVisible]);

  // Handle cached image instant loads & complete status
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setIsLoaded(true);
      } else if (imgRef.current.naturalWidth === 0 && currentSrc) {
        handleImageError();
      }
    }
  }, [currentSrc]);

  const handleImageLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleImageError = (e) => {
    markProxyFailed(src);
    if (!hasError) {
      setHasError(true);
      // Fallback: Try raw unproxied src if proxy failed, or fallback placeholder
      if (currentSrc !== src && src && typeof src === "string") {
        setCurrentSrc(src);
      } else if (!currentSrc.includes("product-5mukhi.jpg") && !currentSrc.includes("placeholder.svg")) {
        const name = (alt || "").toLowerCase();
        if (name.includes("5 mukhi") || name.includes("panch mukhi")) {
          setCurrentSrc("/images/product-5mukhi.jpg");
        } else {
          setCurrentSrc("/images/placeholder.svg");
        }
      } else {
        setIsLoaded(true);
      }
    } else {
      setIsLoaded(true);
    }
    if (onError) onError(e);
  };

  const containerStyle = {
    position: "relative",
    overflow: "hidden",
    display: "block",
    width: "100%",
    ...(aspectRatio ? { aspectRatio } : {}),
    ...customContainerStyle,
  };

  return (
    <span
      ref={containerRef}
      style={containerStyle}
      className={`aura-opt-img-container ${containerClassName}`.trim()}
    >
      {/* Low-Res Blurred Placeholder for lazy images */}
      {!isLoaded && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: style.objectFit || "cover",
            objectPosition: style.objectPosition || "center",
            filter: "blur(10px) scale(1.04)",
            opacity: 0.85,
            transition: "opacity 0.3s ease-out",
            pointerEvents: "none",
            zIndex: 1,
            background: "#f7f2eb",
          }}
        />
      )}

      {/* High-Res Actual Image with IntersectionObserver lazy loading & fetchpriority */}
      {isVisible && (
        <img
          ref={imgRef}
          src={currentSrc || getOptimizedImageUrl(src, { width, quality })}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchpriority={priority ? "high" : "low"}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={className}
          style={{
            ...style,
            position: "relative",
            zIndex: 2,
            opacity: (isLoaded || priority) ? 1 : 0,
            transition: priority ? "none" : "opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: priority ? "auto" : "opacity",
          }}
          {...restProps}
        />
      )}
    </span>
  );
}

export default OptimizedImage;
