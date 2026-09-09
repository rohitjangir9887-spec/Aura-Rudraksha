import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AdminCustomers.jsx', 'utf8');

// Replace standard email state variables with message variables
content = content.replace(
  /const \[showEmailModal, setShowEmailModal\] = useState\(false\);/,
  `const [showEmailModal, setShowEmailModal] = useState(false);\n  const [messageType, setMessageType] = useState('email');`
);

// We need to inject the radio buttons inside the modal
const newModalHeader = `
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#2b170d' }}>Send {messageType === 'email' ? 'Email' : 'SMS'} ({emailTarget === 'all' ? 'All Customers' : emailTarget === 'viewing' ? viewing?.name : selectedCustomers.length + ' Selected'})</h2>
              <button type="button" onClick={() => setShowEmailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                <input type="radio" name="msgType" checked={messageType === 'email'} onChange={() => setMessageType('email')} />
                Email
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                <input type="radio" name="msgType" checked={messageType === 'sms'} onChange={() => setMessageType('sms')} />
                SMS
              </label>
            </div>
`;

content = content.replace(
  /<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>[\s\S]*?<\/div>/,
  newModalHeader
);

// We need to hide Subject if SMS
const newSubjectField = `
              {messageType === 'email' && (
                <div className="admin-form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>Subject</label>
                  <input required type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
              )}
`;

content = content.replace(
  /<div className="admin-form-group" style={{ marginBottom: '15px' }}>[\s\S]*?<label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>Subject<\/label>[\s\S]*?<\/div>/,
  newSubjectField
);

// Update button text
content = content.replace(
  /\{sendingEmail \? 'Sending\.\.\.' : 'Send Email'\}/,
  `{sendingEmail ? 'Sending...' : (messageType === 'email' ? 'Send Email' : 'Send SMS')}`
);

// And we need to update the handleSendEmail function to post to the right endpoint
const newHandleSendEmail = `
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (messageType === 'email' && !emailSubject.trim()) return alert("Subject is required");
    if (!emailMessage.trim()) return alert("Message is required");
    
    // Confirm before bulk send
    if (emailTarget === 'all' || (emailTarget === 'selected' && selectedCustomers.length > 5)) {
       const confirmSend = window.confirm(\`Are you sure you want to send this \${messageType.toUpperCase()} to \${emailTarget === 'all' ? 'ALL' : selectedCustomers.length} customers?\`);
       if (!confirmSend) return;
    }

    setSendingEmail(true);
    try {
      const endpoint = messageType === 'email' ? '/api/customers/send-email' : '/api/customers/send-sms';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${localStorage.getItem('adminToken')}\` },
        body: JSON.stringify({
          target: emailTarget,
          customerIds: emailTarget === 'viewing' ? viewing?.id : selectedCustomers,
          subject: emailSubject,
          message: emailMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(\`\${messageType.toUpperCase()} sent successfully!\`);
        setShowEmailModal(false);
        setEmailSubject('');
        setEmailMessage('');
        setSelectedCustomers([]);
      } else {
        alert(data.message || \`Failed to send \${messageType.toUpperCase()}\`);
      }
    } catch (err) {
      alert("Error sending message");
    } finally {
      setSendingEmail(false);
    }
  };
`;

content = content.replace(
  /const handleSendEmail = async \(e\) => \{[\s\S]*?finally \{\s*setSendingEmail\(false\);\s*\}\s*\};/,
  newHandleSendEmail
);

fs.writeFileSync('src/pages/admin/AdminCustomers.jsx', content);
console.log("Patched AdminCustomers.jsx");
