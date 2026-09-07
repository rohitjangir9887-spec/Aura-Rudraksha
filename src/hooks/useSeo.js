/**
 * Client-Side SEO & Head Tag Synchronization Hook
 * Keeps browser title, meta description, canonical, and OG tags updated on route transitions
 */

import { useEffect } from "react";
import { CANONICAL_APP_ORIGIN } from "../lib/authClient";

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
      setMetaTag("name", "twitter:image", ogImage);
    }

    // Canonical link
    // Normalize older page-level absolute domains to the single authoritative origin.
    if (canonical) {
      let canonicalUrl = canonical;
      try {
        const parsed = new URL(canonical, CANONICAL_APP_ORIGIN);
        canonicalUrl = `${CANONICAL_APP_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch (_) {}

      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonicalUrl);
      setMetaTag("property", "og:url", canonicalUrl);
    }
  }, [title, description, canonical, ogImage, ogType]);
}
