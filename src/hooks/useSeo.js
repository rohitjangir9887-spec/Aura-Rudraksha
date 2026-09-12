/**
 * Client-Side SEO & Head Tag Synchronization Hook
 * Keeps browser title, meta description, keywords, canonical, robots, OG tags, and JSON-LD schema updated on route transitions
 */

import { useEffect } from "react";
import { SITE_URL } from "../config/site";

const DEFAULT_KEYWORDS = "Aura Rudraksha, original rudraksha, nepali rudraksha, lab certified rudraksha, 1 to 21 mukhi rudraksha, 5 mukhi mala 108 beads, gauri shankar rudraksha, rudraksha price, original nepali rudraksha, buy rudraksha online, authentic rudraksha certificate, rudraksha for rashi, rudraksha calculator";

export function useSeo({
  title,
  description,
  keywords = DEFAULT_KEYWORDS,
  canonical,
  ogImage,
  ogType = "website",
  noindex = false,
  schemas = []
}) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    // Helper to update or create meta tag
    const setMetaTag = (attrName, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    if (description) {
      setMetaTag("name", "description", description);
      setMetaTag("property", "og:description", description);
      setMetaTag("name", "twitter:description", description);
    }

    if (keywords) {
      setMetaTag("name", "keywords", keywords);
    }

    if (title) {
      setMetaTag("property", "og:title", title);
      setMetaTag("name", "twitter:title", title);
    }

    setMetaTag("property", "og:site_name", "Aura Rudraksha");
    setMetaTag("name", "twitter:card", "summary_large_image");

    if (ogType) {
      setMetaTag("property", "og:type", ogType);
    }

    // Robots directive
    const robotsDirective = noindex 
      ? "noindex, nofollow" 
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
    setMetaTag("name", "robots", robotsDirective);
    setMetaTag("name", "googlebot", robotsDirective);
    setMetaTag("name", "bingbot", robotsDirective);

    const safeOgImage = ogImage || `${SITE_URL}/og-image.jpg`;
    setMetaTag("property", "og:image", safeOgImage);
    setMetaTag("property", "og:image:secure_url", safeOgImage);
    if (title) setMetaTag("property", "og:image:alt", title);
    setMetaTag("name", "twitter:image", safeOgImage);

    // Canonical link
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
      setMetaTag("property", "og:url", canonical);
    }

    // Dynamic JSON-LD Schema Injection
    if (schemas && Array.isArray(schemas) && schemas.length > 0) {
      let script = document.getElementById("dynamic-seo-schema");
      if (!script) {
        script = document.createElement("script");
        script.id = "dynamic-seo-schema";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : {
        "@context": "https://schema.org",
        "@graph": schemas
      });
    }
  }, [title, description, keywords, canonical, ogImage, ogType, noindex, JSON.stringify(schemas)]);
}

