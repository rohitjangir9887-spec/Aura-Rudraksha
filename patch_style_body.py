with open("src/components/ProductCard.jsx", "r") as f:
    code = f.read()

target = """      {/* 2. Card Content Area */}
      <div className="aura-card-body">"""

replacement = """      {/* 2. Card Content Area */}
      <div className="aura-card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>"""

code = code.replace(target, replacement)

with open("src/components/ProductCard.jsx", "w") as f:
    f.write(code)
