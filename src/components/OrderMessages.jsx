import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { db } from '../lib/db';
import { emitToast } from '../context/ToastContext';


export function OrderMessages({ orderId, messages = [], onMessageAdded, isAdmin = false }) {
  
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setSubmitting(true);
      const res = await db.api.post(`/orders/${orderId}/message`, { message: text.trim() });
      if (res.success && res.data) {
        setText('');
        if (onMessageAdded) onMessageAdded(res.data);
      } else {
        throw new Error(res.message || "Failed to send message");
      }
    } catch (err) {
      emitToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: '32px', marginBottom: '32px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MessageSquare size={18} color="#0f172a" />
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
          {isAdmin ? "Customer Communication" : "Support Messages"}
        </h3>
      </div>
      
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto', background: '#ffffff' }}>
        {messages.length === 0 ? (
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
            {isAdmin ? "No messages yet." : "Need help with this order? Send a message to our support team."}
          </p>
        ) : (
          messages.map((msg, idx) => {
            const isMine = isAdmin ? msg.sender === 'admin' : msg.sender === 'customer';
            return (
              <div key={idx} style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{
                  background: isMine ? '#2563eb' : '#f1f5f9',
                  color: isMine ? '#ffffff' : '#0f172a',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  borderBottomRightRadius: isMine ? '4px' : '16px',
                  borderBottomLeftRadius: !isMine ? '4px' : '16px',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {msg.message}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#94a3b8', 
                  textAlign: isMine ? 'right' : 'left',
                  padding: '0 4px'
                }}>
                  {msg.senderName || (msg.sender === 'admin' ? 'Support' : 'Customer')} • {new Date(msg.createdAt).toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: '16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isAdmin ? "Type a reply to the customer..." : "Type your message here..."}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              background: '#ffffff'
            }}
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            style={{
              padding: '0 20px',
              background: submitting || !text.trim() ? '#94a3b8' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: submitting || !text.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
