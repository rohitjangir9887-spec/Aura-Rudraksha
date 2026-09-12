import React, { useState, useEffect, useRef } from "react";
import { preloadImage } from "../lib/imageUtils";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";

/**
 * FastImage Component
 * High-performance image renderer with IntersectionObserver lazy loading,
 * native browser cache detection, smooth skeleton shimmer, and fallback handling.
 */
export function FastImage({
  src,
  alt = "",
  className = "",
  style = {},
  fallbackSrc = "/images/placeholder.svg",
  priority = false,
  width,
  height,
  rootMargin = "250px 0px",
  threshold = 0.01,
  ...props
}) {
  const containerRef = useRef(null);

  const isIntersecting = useIntersectionObserver(containerRef, {
    rootMargin,
    threshold,
    enabled: !priority,
    freezeOnceVisible: true,
  });

  const isVisible = priority || isIntersecting;

  const [imgSrc, setImgSrc] = useState(() => (isVisible ? (src || fallbackSrc) : ""));
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!isVisible) return;

    if (!src) {
      setImgSrc(fallbackSrc);
      setIsLoaded(true);
      return;
    }

    if (priority) {
      preloadImage(src, true);
    }

    setImgSrc(src);
    setHasError(false);

    // If image is already cached in browser memory, show immediately
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src, fallbackSrc, priority, isVisible]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        width: width || style.width || "100%",
        height: height || style.height || "100%",
        aspectRatio: style.aspectRatio || (width && height ? `${width} / ${height}` : "auto"),
        display: style.display || "block",
        borderRadius: style.borderRadius || "inherit",
        background: isLoaded ? "transparent" : "linear-gradient(110deg, #f7efe4 8%, #eee2d3 18%, #f7efe4 33%)",
        backgroundSize: "200% 100%",
        animation: isLoaded ? "none" : "fastImageSkeletonShimmer 1.2s infinite linear",
        ...style
      }}
    >
      {isVisible && (
        <img
          ref={imgRef}
          src={imgSrc || src || fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchpriority={priority ? "high" : "auto"}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (!hasError) {
              setHasError(true);
              setImgSrc(fallbackSrc);
              setIsLoaded(true); // Stop skeleton since fallback is loaded
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: style.objectFit || "cover",
            opacity: isLoaded ? 1 : 0,
            transition: "opacity 0.2s ease-in-out",
            display: "block"
          }}
          {...props}
        />
      )}
    </div>
  );
}
