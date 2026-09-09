with open("server/services/seoService.js", "r") as f:
    code = f.read()

# 1. Add import
if "import { inMemoryStore }" not in code:
    code = code.replace('import { getSiteBaseUrl }', 'import { getSiteBaseUrl } from "./indexNowService.js";\nimport { inMemoryStore } from "../data/inMemoryStore.js";')

# 2. Fix getPublicProductsForSeo
target_public = """export async function getPublicProductsForSeo() {
  if (!isDbConnected()) {
    return [];
  }"""
replacement_public = """export async function getPublicProductsForSeo() {
  if (!isDbConnected()) {
    return (inMemoryStore.products || []).filter(p => !["Draft", "draft", "Inactive", "inactive", "Archived", "archived"].includes(p.status));
  }"""
code = code.replace(target_public, replacement_public)

# 3. Fix findProductForSeo
target_find = """export async function findProductForSeo(idOrSlug) {
  if (!idOrSlug) return null;
  const clean = String(idOrSlug).trim().toLowerCase();

  if (!isDbConnected()) {
    return null;
  }"""
replacement_find = """export async function findProductForSeo(idOrSlug) {
  if (!idOrSlug) return null;
  const clean = String(idOrSlug).trim().toLowerCase();

  if (!isDbConnected()) {
    let product = (inMemoryStore.products || []).find(p => 
      String(p.id).toLowerCase() === clean || 
      String(p.slug || "").toLowerCase() === clean
    );
    if (!product) {
      product = (inMemoryStore.products || []).find(p => {
        const pSlug = String(p.slug || "").toLowerCase();
        const pName = String(p.name || "").toLowerCase();
        const pSlugifiedName = pName.replace(/[^\\w\\s-]/g, "").replace(/\\s+/g, "-");
        return pSlug === clean ||
                pSlugifiedName === clean ||
                (clean.length >= 3 && pSlug.includes(clean)) ||
               (clean.length >= 3 && clean.includes(pSlug)) ||
               (clean.length >= 3 && pSlugifiedName.includes(clean)) ||
               (clean.length >= 3 && clean.includes(pSlugifiedName));
      });
    }
    return product || null;
  }"""
code = code.replace(target_find, replacement_find)

with open("server/services/seoService.js", "w") as f:
    f.write(code)
