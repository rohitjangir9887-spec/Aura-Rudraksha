const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminOffers.jsx', 'utf8');

const oldBlock = `<div className="admin-form-group">
                <label>Offer Status</label>
                <select value={editing.status || "Active"} onChange={e => setEditing({...editing, status: e.target.value})}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>`;

const newBlock = `<div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Background Color</label>
                  <input type="color" value={editing.bgColor || '#5a2e1d'} onChange={e => setEditing({...editing, bgColor: e.target.value})} style={{ height: 40, width: '100%' }} />
                </div>
                <div className="admin-form-group">
                  <label>Text Color</label>
                  <input type="color" value={editing.textColor || '#fbf5ef'} onChange={e => setEditing({...editing, textColor: e.target.value})} style={{ height: 40, width: '100%' }} />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Offer Status</label>
                <select value={editing.status || "Active"} onChange={e => setEditing({...editing, status: e.target.value})}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>`;

if (content.includes('Offer Status')) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync('src/pages/admin/AdminOffers.jsx', content);
  console.log("Patched AdminOffers.jsx with color pickers for banners.");
} else {
  console.log("Could not find the target block.");
}
