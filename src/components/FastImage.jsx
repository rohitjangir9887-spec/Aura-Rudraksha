import React, { useState, useEffect } from "react";
import { preloadImage } from "../lib/imageUtils";

/**
 * FastImage Component
 * High-performance image renderer with instant browser cache detection,
 * smooth skeleton loading state, decoding="async", and fallback image handling.
 */
export function FastImage({
  src,
  alt = "",
  className = "",
  style = {},
  fallbackSrc = "/images/product-5mukhi.jpg",
  priority = false,
  width,
  height,
  ...props
}) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImgSrc(fallbackSrc);
      setIsLoaded(true);
      return;
    }

    // Add to global cache queue (non-blocking)
    preloadImage(src);

    setImgSrc(src);
    setHasError(false);

    // Check if image is already cached in browser memory
    const img = new Image();
    img.src = src;
    if (img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src, fallbackSrc]);

  return (
    <div
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
      <img
        src={imgSrc}
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
      <style>{`
        @keyframes fastImageSkeletonShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fastImageSkeletonShimmer {
            animation: none !important;
            background: #eee2d3 !important;
          }
        }
      `}</style>
    </div>
  );
}
