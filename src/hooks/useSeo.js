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
  ogType = "website",
  schemas = [],
  schema = null
}) {
  const resolvedSchemas = Array.isArray(schemas) && schemas.length > 0
    ? schemas
    : (schema ? (Array.isArray(schema) ? schema : [schema]) : []);

  useEffect(() => {
    if (title) {
      document.title = title;
    }

    const setMetaTag = (attrName, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", attrValue);
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

    // Canonicals always use the trusted production origin and exclude query/hash noise.
    if (canonical) {
      let cleanCanonical = canonical;
      try {
        const parsed = new URL(canonical, "https://aurarudraksha.bond");
        const pathname = parsed.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
        cleanCanonical = `https://aurarudraksha.bond${pathname}`;
      } catch (_) {
        cleanCanonical = String(canonical)
          .replace(/^https?:\/\/(www\.)?(aurarudraksha\.bond|aurarudraksha\.com|aura-rudraksha\.vercel\.app|[a-z0-9-]+\.(?:vercel\.app|run\.app))/i, "https://aurarudraksha.bond")
          .replace(/^http:\/\/aurarudraksha\.bond/i, "https://aurarudraksha.bond")
          .split("?")[0]
          .split("#")[0];
      }

      document.querySelectorAll('link[rel="canonical"]').forEach((el, index) => {
        if (index > 0) el.remove();
      });
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", cleanCanonical);
      setMetaTag("property", "og:url", cleanCanonical);
    }

    // SSR already places trusted JSON-LD in the initial HTML. Replace the
    // SEO-managed SSR/client set after hydration so Product/Breadcrumb schemas
    // never exist twice in the live DOM.
    document.querySelectorAll('script[data-seo-schema="true"], script[data-client-seo="true"]').forEach(el => el.remove());

    resolvedSchemas.forEach(item => {
      try {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-client-seo", "true");
        script.setAttribute("data-seo-schema", "true");
        script.textContent = JSON.stringify(item);
        document.head.appendChild(script);
      } catch (_) {}
    });

    return () => {
      document.querySelectorAll('script[data-client-seo="true"], script[data-seo-schema="true"]').forEach(el => el.remove());
    };
  }, [title, description, canonical, ogImage, ogType, JSON.stringify(resolvedSchemas)]);
}
