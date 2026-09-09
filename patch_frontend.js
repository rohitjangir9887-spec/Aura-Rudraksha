import fs from 'fs';

let content = fs.readFileSync('src/pages/account/OrderDetail.jsx', 'utf8');

// Insert the Failed Payment Info Box
const targetUI = `{order.amountRefunded > 0 && (`;
const insertUI = `{order.paymentStatus === 'Failed' && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#991b1b', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Payment Failed or Timeout</div>
                  <div style={{ lineHeight: 1.4 }}>
                    Your payment was not completed successfully. If money was deducted from your bank account, it will automatically be refunded by your bank within 3-5 business days (as per RBI guidelines).
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <a href="/contact" style={{ color: '#a54d2b', textDecoration: 'underline', fontWeight: 600 }}>Contact Support / Raise Ticket</a>
                  </div>
                </div>
              </div>
            )}
            
            {order.amountRefunded > 0 && (`;

if (!content.includes('Payment Failed or Timeout')) {
    content = content.replace(targetUI, insertUI);
    fs.writeFileSync('src/pages/account/OrderDetail.jsx', content);
    console.log("Patched OrderDetail.jsx");
}
