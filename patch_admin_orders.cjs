const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminOrders.jsx', 'utf-8');

if (!content.includes('handleSyncPayu')) {
  // Find where to put the handler
  content = content.replace(
    /const handleProcessRefund = async \(amount, reason, isFull\) => \{/,
    `const [syncingPayu, setSyncingPayu] = useState(false);
  const handleSyncPayu = async (orderId) => {
    if (!orderId) return;
    setSyncingPayu(true);
    try {
      const res = await db.syncPayuOrder(orderId);
      if (res?.success) {
        emitToast(res.message || "PayU Status Synced Successfully", "success");
        loadOrders();
        // Also update viewing state
        setViewing(res.order);
      }
    } catch (err) {
      emitToast(err.message || "Failed to sync PayU status", "error");
    } finally {
      setSyncingPayu(false);
    }
  };

  const handleProcessRefund = async (amount, reason, isFull) => {`
  );

  // Find where to place the button. We'll place it in the header actions of the viewing modal.
  content = content.replace(
    /<div style=\{\{ display: 'flex', gap: 8 \}\}>\n\s*<button\n\s*onClick=\{\(\) => setViewing\(null\)\}/,
    `<div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleSyncPayu(viewing.id)}
                          disabled={syncingPayu}
                          style={{
                            background: '#eff6ff',
                            color: '#1e40af',
                            border: '1px solid #bfdbfe',
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: syncingPayu ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <RefreshCw size={14} className={syncingPayu ? "animate-spin" : ""} />
                          {syncingPayu ? "Syncing..." : "Sync PayU Status"}
                        </button>
                        <button
                          onClick={() => setViewing(null)}`
  );

  fs.writeFileSync('src/pages/admin/AdminOrders.jsx', content);
}
