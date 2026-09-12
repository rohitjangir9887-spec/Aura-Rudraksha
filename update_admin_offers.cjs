const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminOffers.jsx', 'utf8');

// Insert discount field
const badgeTextGroup = `<div className="admin-form-group">
                  <label>Badge Text *</label>
                  <input required value={editing.badgeText || ''} onChange={e => setEditing({...editing, badgeText: e.target.value})} placeholder="e.g. 20% OFF or ₹200 OFF" />
                </div>`;

const newBadgeGroup = `<div className="admin-form-group">
                  <label>Badge Text *</label>
                  <input required value={editing.badgeText || ''} onChange={e => setEditing({...editing, badgeText: e.target.value})} placeholder="e.g. 20% OFF or ₹200 OFF" />
                </div>
                <div className="admin-form-group">
                  <label>Discount Value (Optional)</label>
                  <input type="number" value={editing.discount || ''} onChange={e => setEditing({...editing, discount: e.target.value})} placeholder="e.g. 20" />
                </div>`;

code = code.replace(badgeTextGroup, newBadgeGroup);
fs.writeFileSync('src/pages/admin/AdminOffers.jsx', code);
