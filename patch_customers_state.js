import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/AdminCustomers.jsx', 'utf8');
if (!content.includes('const [selectedCustomers, setSelectedCustomers]')) {
  content = content.replace(
    'const [viewing, setViewing] = useState(null);',
    'const [viewing, setViewing] = useState(null);\n  const [selectedCustomers, setSelectedCustomers] = useState([]);'
  );
  
  if (!content.includes('const [emailTarget, setEmailTarget]')) {
      content = content.replace(
          'const [selectedCustomers, setSelectedCustomers] = useState([]);',
          'const [selectedCustomers, setSelectedCustomers] = useState([]);\n  const [emailTarget, setEmailTarget] = useState("all");\n  const [showEmailModal, setShowEmailModal] = useState(false);\n  const [messageType, setMessageType] = useState("email");\n  const [emailSubject, setEmailSubject] = useState("");\n  const [emailMessage, setEmailMessage] = useState("");\n  const [sendingEmail, setSendingEmail] = useState(false);'
      );
  }
  
  fs.writeFileSync('src/pages/admin/AdminCustomers.jsx', content);
  console.log('patched');
}
