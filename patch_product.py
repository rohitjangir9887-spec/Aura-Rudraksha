with open("server/controllers/productController.js", "r") as f:
    code = f.read()

target = """    if (!isDbConnected()) {
      const cleanTarget = cleanId.toLowerCase();
      const product = (inMemoryStore.products || []).find(p => 
        String(p.id).toLowerCase() === cleanTarget || 
        String(p.slug || "").toLowerCase() === cleanTarget
      );
      if (product) {
        return res.json({ success: true, data: product, isFallback: true });
      }
      return res.status(404).json({ success: false, message: "Product not found" });
    }"""

replacement = """    if (!isDbConnected()) {
      const cleanTarget = cleanId.toLowerCase();
      let product = (inMemoryStore.products || []).find(p => 
        String(p.id).toLowerCase() === cleanTarget || 
        String(p.slug || "").toLowerCase() === cleanTarget
      );
      if (!product) {
        product = (inMemoryStore.products || []).find(p => {
          const pSlug = String(p.slug || "").toLowerCase();
          const pName = String(p.name || "").toLowerCase();
          const pSlugifiedName = pName.replace(/[^\\w\\s-]/g, "").replace(/\\s+/g, "-");
          return pSlug === cleanTarget ||
                  pSlugifiedName === cleanTarget ||
                  (cleanTarget.length >= 3 && pSlug.includes(cleanTarget)) ||
                 (cleanTarget.length >= 3 && cleanTarget.includes(pSlug)) ||
                 (cleanTarget.length >= 3 && pSlugifiedName.includes(cleanTarget)) ||
                 (cleanTarget.length >= 3 && cleanTarget.includes(pSlugifiedName));
        });
      }
      if (product) {
        return res.json({ success: true, data: product, isFallback: true });
      }
      return res.status(404).json({ success: false, message: "Product not found" });
    }"""

code = code.replace(target, replacement)

with open("server/controllers/productController.js", "w") as f:
    f.write(code)
