import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AdminAnalytics.jsx', 'utf8');

// Add Mail, MessageSquare to lucide-react imports if not there
if (!content.includes('Mail,')) {
  content = content.replace(
    'import { BarChart3, Sparkles, ShoppingBag, Globe, TrendingUp, RotateCcw, AlertCircle } from "lucide-react";',
    'import { BarChart3, Sparkles, ShoppingBag, Globe, TrendingUp, RotateCcw, AlertCircle, Mail, MessageSquare } from "lucide-react";'
  );
}

const commsBlock = `
          {/* Communications & Notifications Delivery Stats */}
          {stats.notificationStats && (
            <div className="admin-card" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', color: '#7a320c', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
                <Mail size={18} /> Communications & Delivery
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                
                {/* Email Delivery */}
                <div style={{ background: '#fffdf9', border: '1.5px solid #e8dac9', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: '700', color: '#3b322c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={16} color="#7a320c" /> Email Deliverability
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
                    <div>
                      <small style={{ color: '#806f62', display: 'block' }}>Attempted</small>
                      <b style={{ fontSize: '20px', color: '#2b170d' }}>{stats.notificationStats.emailSent}</b>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <small style={{ color: '#806f62', display: 'block' }}>Delivered</small>
                      <b style={{ fontSize: '20px', color: '#166534' }}>{stats.notificationStats.emailDelivered}</b>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <small style={{ color: '#806f62', display: 'block' }}>Bounced/Failed</small>
                      <b style={{ fontSize: '20px', color: '#dc2626' }}>{stats.notificationStats.emailFailed}</b>
                    </div>
                  </div>
                </div>

                {/* SMS Delivery */}
                <div style={{ background: '#fffdf9', border: '1.5px solid #e8dac9', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: '700', color: '#3b322c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={16} color="#7a320c" /> SMS Deliverability
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
                    <div>
                      <small style={{ color: '#806f62', display: 'block' }}>Attempted</small>
                      <b style={{ fontSize: '20px', color: '#2b170d' }}>{stats.notificationStats.smsSent}</b>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <small style={{ color: '#806f62', display: 'block' }}>Delivered</small>
                      <b style={{ fontSize: '20px', color: '#166534' }}>{stats.notificationStats.smsDelivered}</b>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <small style={{ color: '#806f62', display: 'block' }}>Bounced/Failed</small>
                      <b style={{ fontSize: '20px', color: '#dc2626' }}>{stats.notificationStats.smsFailed}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
`;

if (!content.includes('Communications & Notifications Delivery Stats')) {
  content = content.replace(
    '          <div className="admin-card" style={{textAlign: \'center\', padding: \'40px 20px\', color: \'#806f62\'}}>',
    commsBlock + '\n          <div className="admin-card" style={{textAlign: \'center\', padding: \'40px 20px\', color: \'#806f62\'}}>'
  );
}

fs.writeFileSync('src/pages/admin/AdminAnalytics.jsx', content);
console.log("Patched AdminAnalytics.jsx");
