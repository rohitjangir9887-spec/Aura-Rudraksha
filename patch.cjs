const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminProducts.jsx', 'utf8');

// 1. Add description to default state
code = code.replace(
  /category: "Rudraksha",\s*status: "Active",/,
  `category: "Rudraksha",\n        description: "",\n        status: "Active",`
);

// 2. Import Sparkles if not present
if (!code.includes('Sparkles')) {
  code = code.replace(/Star, X, Check } from "lucide-react";/, `Star, X, Check, Sparkles } from "lucide-react";`);
}

// 3. Add AI generate function
const generateFn = `  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  const handleGenerateDescription = async () => {
    if (!editing?.name) {
      emitToast("Please enter a product name first", "error");
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const res = await fetch("/api/aura-ai/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + localStorage.getItem("aura_token")
        },
        body: JSON.stringify({ name: editing.name, category: editing.category })
      });
      const data = await res.json();
      if (data.success && data.description) {
        setEditing({ ...editing, description: data.description });
        emitToast("Description generated successfully ✨", "success");
      } else {
        emitToast(data.message || "Failed to generate description", "error");
      }
    } catch (err) {
      emitToast("Error connecting to Aura AI", "error");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

`;

code = code.replace(/const handleEdit = \(p\) => {/, generateFn + 'const handleEdit = (p) => {');

// 4. Add the finalProduct update to include description
code = code.replace(
  /category: editing.category \|\| "Rudraksha",/,
  `category: editing.category || "Rudraksha",\n      description: editing.description || "",`
);

// 5. Add the Description UI
const descUI = `          <div className="admin-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <label style={{ marginBottom: 0 }}>Product Description *</label>
              <button 
                type="button" 
                onClick={handleGenerateDescription}
                disabled={isGeneratingDesc}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg, #a54d2b, #d97706)',
                  color: '#fff', border: 'none', borderRadius: '6px',
                  padding: '6px 12px', fontSize: '12px', fontWeight: '600',
                  cursor: isGeneratingDesc ? 'not-allowed' : 'pointer',
                  opacity: isGeneratingDesc ? 0.7 : 1
                }}
              >
                <Sparkles size={14} />
                {isGeneratingDesc ? "Generating..." : "Aura AI Write"}
              </button>
            </div>
            <textarea 
              rows="5"
              value={editing.description || ""} 
              onChange={e => setEditing({...editing, description: e.target.value})}
              placeholder="Detailed description of the product... You can use **bold** text."
              style={{ width: '100%', padding: '12px', border: '1px solid #ebdccb', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

`;

code = code.replace(
  /<div className="admin-form-row">\s*<div className="admin-form-group">\s*<label>Status \*<\/label>/,
  descUI + '          <div className="admin-form-row">\n            <div className="admin-form-group">\n              <label>Status *</label>'
);

fs.writeFileSync('src/pages/admin/AdminProducts.jsx', code);
console.log("Patched AdminProducts.jsx");
