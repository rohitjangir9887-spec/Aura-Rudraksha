/**
 * Client-Side SEO & Head Tag Synchronization Hook
 * Keeps browser title, meta description, canonical, and OG tags updated on route transitions
 */

import { useEffect } from "react";

export function useSeo({
  title,
  description,
  canonical,
  ogImage,
  ogType = "website"
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

    if (title) {
      setMetaTag("property", "og:title", title);
      setMetaTag("name", "twitter:title", title);
    }

    if (ogType) {
      setMetaTag("property", "og:type", ogType);
    }

    if (ogImage) {
      setMetaTag("property", "og:image", ogImage);
      setMetaTag("property", "og:image:secure_url", ogImage);
      if (title) setMetaTag("property", "og:image:alt", title);
      setMetaTag("name", "twitter:image", ogImage);
    }

    // Canonical link & OG URL
    if (canonical) {
      const cleanCanonical = canonical
        .replace(/^https?:\/\/(www\.)?(aurarudraksha\.bond|aurarudraksha\.com|aura-rudraksha\.vercel\.app)/i, "https://aurarudraksha.bond")
        .replace(/^http:\/\/aurarudraksha\.bond/i, "https://aurarudraksha.bond");
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", cleanCanonical);
      setMetaTag("property", "og:url", cleanCanonical);
    }
  }, [title, description, canonical, ogImage, ogType]);
}
