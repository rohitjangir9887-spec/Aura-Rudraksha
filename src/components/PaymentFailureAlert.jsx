import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Clock, X, RefreshCw, ExternalLink, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authClient } from '../lib/authClient';
import { db } from '../lib/db';

export function PaymentFailureAlert() {
  const [alertData, setAlertData] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const navigate = useNavigate();
  const pollIntervalRef = useRef(null);

  const fetchAlert = async () => {
    const user = authClient.getUser();
    if (!user || user.isAnonymous) return;

    try {
      const res = await fetch("/api/orders/my/payment-alert", {
        headers: {
          "Authorization": "Bearer " + localStorage.getItem("aura_token")
        }
      });
      const result = await res.json();
      if (result.success && result.hasNotification && result.data) {
        setAlertData(result.data);
      } else {
        setAlertData(null);
      }
    } catch (err) {
      console.error("Failed to fetch payment alert", err);
    }
  };

  useEffect(() => {
    fetchAlert();
    
    // Poll every 30 seconds for updates without reloading page
    pollIntervalRef.current = setInterval(() => {
      fetchAlert();
    }, 30000);

    return () => clearInterval(pollIntervalRef.current);
  }, []);

  useEffect(() => {
    if (!alertData) return;

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(alertData.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setAlertData(null); // auto-hide
      } else {
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [alertData]);

  if (!alertData || !isVisible) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await db.retryPayment(alertData.orderNumber);
      
    } catch (err) {
      console.error(err);
    } finally {
      setIsRetrying(false);
    }
  };

  const isCancelled = alertData.paymentStatus === "Cancelled";
  
  return (
    <div style={{ padding: '0 16px', margin: '16px 0', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        background: '#fffbf2',
        border: '1px solid #ebdccb',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(43, 23, 13, 0.08)',
        position: 'relative',
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <button 
          onClick={() => setIsVisible(false)}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#806f62',
            padding: '4px'
          }}
          aria-label="Close alert"
        >
          <X size={16} />
        </button>

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingRight: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a54d2b', fontWeight: '700', fontSize: '15px' }}>
            <AlertTriangle size={18} />
            {isCancelled ? "Payment Cancelled" : "Payment Failed"}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#806f62', fontSize: '12px', fontWeight: '600' }}>
            <Clock size={12} />
            {timeLeft}
          </div>
        </div>

        <p style={{ color: '#4a3f35', fontSize: '13px', margin: '0 0 12px 0', lineHeight: 1.4 }}>
          {isCancelled 
            ? "Your recent payment was cancelled." 
            : "Your recent payment could not be completed."}
        </p>

        {/* Info Grid */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '8px', 
          padding: '12px',
          border: '1px solid #f4ece5',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#806f62' }}>Order #{alertData.orderNumber}</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#2b170d' }}>
              ₹{(alertData.amount || 0).toLocaleString('en-IN')}
            </span>
          </div>
          
          <div style={{ fontSize: '13px', color: '#2b170d', fontWeight: '600', marginBottom: '8px' }}>
            {alertData.productName}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: '#736257' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ minWidth: '85px', color: '#806f62' }}>Payment:</span>
              <span>PayU Hosted Checkout</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ minWidth: '85px', color: '#806f62' }}>Merchant Txn:</span>
              <span style={{ wordBreak: 'break-all' }}>{alertData.transactionId}</span>
            </div>
            {alertData.payuPaymentId && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <span style={{ minWidth: '85px', color: '#806f62' }}>PayU ID:</span>
                <span style={{ fontWeight: '600', color: '#2b170d' }}>{alertData.payuPaymentId}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '4px' }}>
              <span style={{ minWidth: '85px', color: '#806f62' }}>Status:</span>
              <span style={{ color: '#a54d2b', fontWeight: '600' }}>{alertData.paymentStatus}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleRetry}
            disabled={isRetrying}
            style={{
              flex: '1',
              minWidth: '110px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              background: 'linear-gradient(135deg, #a54d2b 0%, #7c3114 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: isRetrying ? 'wait' : 'pointer',
              boxShadow: '0 2px 6px rgba(165, 77, 43, 0.25)'
            }}
          >
            <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
            {isRetrying ? 'Connecting...' : 'Retry Payment'}
          </button>
          
          <Link 
            to={`/account/orders/${alertData.orderNumber}`}
            style={{
              flex: '1',
              minWidth: '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              background: '#ffffff',
              color: '#2b170d',
              border: '1px solid #ebdccb',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            <ExternalLink size={14} />
            View Order
          </Link>
          
          <Link 
            to="/support"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              background: '#f4ece5',
              color: '#4a3f35',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            <MessageCircle size={14} />
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
