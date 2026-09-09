with open("src/components/ProductCard.jsx", "r") as f:
    code = f.read()

target = """        {/* Auspicious / Curated Badge (Bottom Left) */}
        {p.badge && !isOutOfStock && (
          <span className="aura-card-badge-pill">
            {p.badge}
          </span>
        )}"""

replacement = """        {/* Auspicious / Curated Badge (Bottom Left) */}
        {p.badge && !isOutOfStock && (
          <span className="aura-card-badge-pill" style={{ display: 'none' }}>
            {p.badge}
          </span>
        )}"""

code = code.replace(target, replacement)

with open("src/components/ProductCard.jsx", "w") as f:
    f.write(code)
