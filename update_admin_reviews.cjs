const fs = require('fs');
const file = 'src/pages/admin/AdminReviews.jsx';
let content = fs.readFileSync(file, 'utf8');

// 3. Update Generator Form
const oldFormStart = content.indexOf('<form onSubmit={handleGenerateAiDrafts}>');
const oldFormEnd = content.indexOf('{/* Results Board */}');

if (oldFormStart !== -1 && oldFormEnd !== -1) {
  const newForm = `<form onSubmit={handleGenerateAiDrafts}>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>Target Product / Store Scope</label>
                  <select 
                    value={aiGenForm.productId}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, productId: e.target.value })}
                    className="aura-input"
                  >
                    <option value="all">🏛️ General Aura Rudraksha Store Experience</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>🕉️ {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>Draft Batch Count</label>
                  <select 
                    value={aiGenForm.count}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, count: Number(e.target.value) })}
                    className="aura-input"
                  >
                    <option value={1}>1 Single Draft</option>
                    <option value={5}>5 Drafts (Standard)</option>
                    <option value={10}>10 Drafts (Batch)</option>
                    <option value={25}>25 Drafts (Bulk Preview)</option>
                    <option value={50}>50 Drafts (Full Catalog Testing)</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-row" style={{ marginTop: "16px" }}>
                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>⭐ Star Rating Mix</label>
                  <select 
                    value={aiGenForm.ratingMix}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, ratingMix: e.target.value })}
                    className="aura-input"
                  >
                    <option value="Natural">Natural Mix (Mostly 5 & 4, some 3,2,1)</option>
                    <option value="Balanced">Balanced (Equal 5 & 4)</option>
                    <option value="Custom">Custom Percentage Mix</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>🌐 Language Mix</label>
                  <select 
                    value={aiGenForm.languageMix}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, languageMix: e.target.value })}
                    className="aura-input"
                  >
                    <option value="Auto">Auto Mix (English/Hindi/Hinglish)</option>
                    <option value="English">English Only</option>
                    <option value="Hindi">Hindi Only</option>
                    <option value="Hinglish">Hinglish Only</option>
                    <option value="Custom">Custom Percentage Mix</option>
                  </select>
                </div>
              </div>
              
              {/* Custom Sliders for Ratings & Language if Custom is selected */}
              {(aiGenForm.ratingMix === "Custom" || aiGenForm.languageMix === "Custom") && (
                <div className="admin-form-row" style={{ marginTop: "16px", padding: "16px", background: "#fff", borderRadius: "12px", border: "1px solid #eadecd" }}>
                  {aiGenForm.ratingMix === "Custom" && (
                    <div style={{ flex: 1 }}>
                      <label style={{ fontWeight: "600", color: "#3b322c", display: "block", marginBottom: "8px" }}>Custom Rating %</label>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {[5,4,3,2,1].map(r => (
                          <div key={r} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: "bold" }}>{r}★</span>
                            <input type="number" min="0" max="100" style={{ width: "50px", textAlign: "center", padding: "4px", borderRadius: "6px", border: "1px solid #dcd1c6" }} value={aiGenForm.customRatings[\`r\${r}\`]} onChange={(e) => setAiGenForm({...aiGenForm, customRatings: {...aiGenForm.customRatings, [\`r\${r}\`]: parseInt(e.target.value) || 0}})} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiGenForm.languageMix === "Custom" && (
                    <div style={{ flex: 1 }}>
                      <label style={{ fontWeight: "600", color: "#3b322c", display: "block", marginBottom: "8px" }}>Custom Language %</label>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {['english', 'hindi', 'hinglish'].map(l => (
                          <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "capitalize" }}>{l}</span>
                            <input type="number" min="0" max="100" style={{ width: "60px", textAlign: "center", padding: "4px", borderRadius: "6px", border: "1px solid #dcd1c6" }} value={aiGenForm.customLanguages[l]} onChange={(e) => setAiGenForm({...aiGenForm, customLanguages: {...aiGenForm.customLanguages, [l]: parseInt(e.target.value) || 0}})} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="admin-form-row" style={{ marginTop: "16px" }}>
                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>Tone & Devotional Atmosphere</label>
                  <select 
                    value={aiGenForm.tone}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, tone: e.target.value })}
                    className="aura-input"
                  >
                    <option value="Devotional/Spiritual">🙏 Devotional & Spiritual (Reverence, Puja, Meditation, Peace)</option>
                    <option value="Authentic/Practical">🔍 Authentic & Practical (Authenticity, Lab Certificate, Texture, Delivery)</option>
                    <option value="Concise/Direct">⚡ Concise & Direct (1–2 sharp, natural sentences)</option>
                    <option value="Joyful/Grateful">✨ Joyful & Grateful (Expressive gratitude, uplifted aura)</option>
                  </select>
                </div>
                <div className="admin-form-group" style={{ display: "flex", alignItems: "center", paddingTop: "24px" }}>
                   <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                     <input type="checkbox" checked={aiGenForm.useRAG} onChange={(e) => setAiGenForm({...aiGenForm, useRAG: e.target.checked})} style={{ width: "20px", height: "20px", accentColor: "#7a320c" }} />
                     <span style={{ fontWeight: "600", color: "#3b322c" }}>🧠 Use RAG Reference Library</span>
                   </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #ebdccb" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#806f62" }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Jaccard + Semantic Duplicate Detection Active</span>
                </div>

                <button 
                  type="submit" 
                  className="admin-btn"
                  disabled={isGeneratingDrafts}
                  style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "220px", justifyContent: "center" }}
                >
                  {isGeneratingDrafts ? (
                    <>
                      <RefreshCw size={16} className="aura-spin" />
                      <span>Generating AI Reviews...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Generate Drafts</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          `;
  content = content.substring(0, oldFormStart) + newForm + content.substring(oldFormEnd);
  console.log("Updated form successfully.");
}

fs.writeFileSync(file, content);
