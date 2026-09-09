import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AdminCustomers.jsx', 'utf8');

if (!content.includes('EmailModal')) {
    // We will add a simple modal for sending emails
    
    // First imports
    content = content.replace(
        'import { Search, Plus, Filter, User, Calendar, MapPin, Eye, ArrowLeft } from "lucide-react";',
        'import { Search, Plus, Filter, User, Calendar, MapPin, Eye, ArrowLeft, Mail, X } from "lucide-react";'
    );
    
    // State for modal
    const stateRegex = /const \[searchTerm, setSearchTerm\] = useState\(''\);/;
    const newStates = `const [searchTerm, setSearchTerm] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState('all'); // 'all', 'selected', 'viewing'
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
`;
    content = content.replace(stateRegex, newStates);
    
    // Checkbox toggle logic
    const fetchRegex = /useEffect\(\(\) => \{/;
    const selectLogic = `
  const toggleSelectCustomer = (id) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };
  
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailMessage.trim()) return alert("Subject and Message are required");
    setSendingEmail(true);
    try {
      const res = await fetch("/api/customers/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: emailTarget === 'viewing' ? 'selected' : emailTarget,
          customerIds: emailTarget === 'viewing' ? [viewing.id] : selectedCustomers,
          subject: emailSubject,
          message: emailMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowEmailModal(false);
        setEmailSubject('');
        setEmailMessage('');
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      alert("Error sending email: " + err.message);
    }
    setSendingEmail(false);
  };
  
  useEffect(() => {
`;
    content = content.replace(fetchRegex, selectLogic);
    
    // Add Email Button to individual profile view
    const viewBackRegex = /<ArrowLeft size=\{16\} \/> Back to Customers\n      <\/button>/;
    const viewBackReplace = `<ArrowLeft size={16} /> Back to Customers
      </button>
      <button 
        className="admin-btn primary" 
        onClick={() => { setEmailTarget('viewing'); setShowEmailModal(true); }}
      >
        <Mail size={16} /> Send Email
      </button>`;
    content = content.replace(viewBackRegex, viewBackReplace);
    
    // Add Email Button to main list header
    const mainHeaderRegex = /<p className="admin-page-subtitle">\{customers\.length\} store customers recorded<\/p>\n        <\/div>\n      <\/div>/;
    const mainHeaderReplace = `<p className="admin-page-subtitle">{customers.length} store customers recorded</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="admin-btn secondary" 
            onClick={() => { setEmailTarget('selected'); setShowEmailModal(true); }}
            disabled={selectedCustomers.length === 0}
          >
            <Mail size={16} /> Send Selected ({selectedCustomers.length})
          </button>
          <button 
            className="admin-btn primary" 
            onClick={() => { setEmailTarget('all'); setShowEmailModal(true); }}
          >
            <Mail size={16} /> Send All
          </button>
        </div>
      </div>`;
    content = content.replace(mainHeaderRegex, mainHeaderReplace);
    
    // Add Checkboxes to desktop table
    const tableHeaderRegex = /<th>Name<\/th>/;
    content = content.replace(tableHeaderRegex, '<th style={{width: 40}}></th>\n                <th>Name</th>');
    
    const tableRowRegex = /<td>\n                    <b>\{c\.name \|\| 'Customer'\}/g;
    content = content.replace(tableRowRegex, `<td>
                    <input type="checkbox" checked={selectedCustomers.includes(c.id)} onChange={() => toggleSelectCustomer(c.id)} />
                  </td>
                  <td>
                    <b>{c.name || 'Customer'}`);
                    
    // Email Modal UI at the end
    const modalUI = `
      {showEmailModal && (
        <div className="admin-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="admin-modal-content" style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', margin: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#2b170d' }}>Send Email ({emailTarget === 'all' ? 'All Customers' : emailTarget === 'viewing' ? viewing?.name : selectedCustomers.length + ' Selected'})</h2>
              <button onClick={() => setShowEmailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSendEmail}>
              <div className="admin-form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>Subject</label>
                <input required type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div className="admin-form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>Message</label>
                <textarea required rows="6" value={emailMessage} onChange={e => setEmailMessage(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }}></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="admin-btn secondary" onClick={() => setShowEmailModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn primary" disabled={sendingEmail}>
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}`;
    content = content.replace(/<\/AdminLayout>\n\s*\);\n\}/, modalUI);
    
    fs.writeFileSync('src/pages/admin/AdminCustomers.jsx', content);
    console.log("Patched AdminCustomers.jsx with email modal UI");
}
