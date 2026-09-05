import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RefreshCw, ShoppingCart, Check, Sparkles, MessageCircle, ArrowRight } from "lucide-react";

export function PanditjiResult({
  result,
  setResult,
  handleAddToCart,
  handleAskInChat,
  addedSuccess
}) {
  if (!result) return null;

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      style={{
        background: 'linear-gradient(135deg, #FFFDF9 0%, #FAF4EB 100%)',
        border: '2px solid #D4AF37',
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: '0 4px 18px rgba(74, 14, 23, 0.07)',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Card Header with Devotee details & recalculate */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
        borderBottom: '1px dashed #ebd6bf',
        paddingBottom: 10
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18 }}>🕉️</span>
            <h3 style={{
              margin: 0,
              fontSize: 'clamp(15px, 3.5vw, 17px)',
              color: '#4A0E17',
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: 700,
              wordBreak: 'break-word',
              overflowWrap: 'anywhere'
            }}>
              श्री {result.devoteeName} जी का वैदिक रुद्राक्ष परामर्श
            </h3>
          </div>
          <div style={{ fontSize: '11.5px', color: '#7a685b', marginTop: 2, wordBreak: 'break-word' }}>
            जन्म: {new Date(result.dob).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {result.birthPlace}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setResult(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: '1px solid #C89B3C',
            color: '#4A0E17',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <RefreshCw size={11} /> अन्य कुंडली
        </button>
      </div>

      {/* 4 Pillars: Rashi, Planet, Element, Numerology */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
        gap: 8,
        marginBottom: 12
      }}>
        <div style={{ background: '#ffffff', border: '1px solid #ebdccb', borderRadius: 7, padding: '6px 10px', minWidth: 0 }}>
          <div style={{ fontSize: '9.5px', color: '#8c786a', textTransform: 'uppercase' }}>राशि (Rashi)</div>
          <b style={{ fontSize: '12px', color: '#4A0E17', display: 'block', wordBreak: 'break-word' }}>
            {result.symbol} {result.rashiHindi} ({result.rashiEng})
          </b>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #ebdccb', borderRadius: 7, padding: '6px 10px', minWidth: 0 }}>
          <div style={{ fontSize: '9.5px', color: '#8c786a', textTransform: 'uppercase' }}>स्वामी ग्रह</div>
          <b style={{ fontSize: '11.5px', color: '#4A0E17', display: 'block', wordBreak: 'break-word' }}>
            {result.lord}
          </b>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #ebdccb', borderRadius: 7, padding: '6px 10px', minWidth: 0 }}>
          <div style={{ fontSize: '9.5px', color: '#8c786a', textTransform: 'uppercase' }}>तत्व (Element)</div>
          <b style={{ fontSize: '11.5px', color: '#4A0E17', display: 'block', wordBreak: 'break-word' }}>
            {result.element}
          </b>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #ebdccb', borderRadius: 7, padding: '6px 10px', minWidth: 0 }}>
          <div style={{ fontSize: '9.5px', color: '#8c786a', textTransform: 'uppercase' }}>भाग्यांक (Mulank)</div>
          <b style={{ fontSize: '11.5px', color: '#4A0E17', display: 'block' }}>
            अंक {result.mulank}
          </b>
        </div>
      </div>

      {/* Core Recommendation Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #4A0E17 0%, #681523 100%)',
        color: '#FFFDF7',
        borderRadius: 9,
        padding: '12px 14px',
        marginBottom: 12,
        border: '1px solid #D4AF37'
      }}>
        <div style={{ fontSize: '10px', color: '#FFE082', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>
          ★ पंडित जी द्वारा अनुशंसित सर्वोत्तम रुद्राक्ष:
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: 4, wordBreak: 'break-word' }}>
          {result.recommendedMukhi}
        </div>
        <p style={{ fontSize: '11.5px', color: '#f5e6d3', margin: '0 0 8px 0', lineHeight: 1.45, wordBreak: 'break-word' }}>
          {result.astroReason}
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 6 }}>
          <span>📿 बीज मंत्र: <b style={{ color: '#FFE082' }}>{result.beejMantra}</b></span>
          <span>🗓️ शुभ धारण वार: <b style={{ color: '#FFE082' }}>{result.wearingDay}</b></span>
        </div>
      </div>

      {/* Matched Product & Instant Purchase CTA */}
      {result.matchedProduct && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          background: '#ffffff',
          border: '1px solid #e8dac9',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <img
              src={result.matchedProduct.img || "/images/product-5mukhi.jpg"}
              alt={result.matchedProduct.name}
              style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid #ebdccb', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: '13px', color: '#2b170d', display: 'block', wordBreak: 'break-word' }}>
                {result.matchedProduct.name}
              </b>
              <div style={{ fontSize: '11px', color: '#8a6850' }}>
                100% नेपाल रुद्राक्ष • सिद्ध लैब प्रमाणित
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#a54d2b' }}>
                ₹{result.matchedProduct.price.toLocaleString('en-IN')}
              </span>
              {result.matchedProduct.mrp && (
                <span style={{ fontSize: '10px', color: '#999', textDecoration: 'line-through', marginLeft: 3 }}>
                  ₹{result.matchedProduct.mrp.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: addedSuccess ? '#16a34a' : '#a54d2b',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {addedSuccess ? (
                <>
                  <Check size={13} /> कार्ट में जोड़ा
                </>
              ) : (
                <>
                  <ShoppingCart size={13} /> अभी खरीदें
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* QUICK VEDIC QUERY CHIPS FOR INSTANT AI CHAT */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#78350f', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={11} color="#C89B3C" /> पंडित जी से तुरंत पूछें (1-क्लिक AI प्रश्न):
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            "धारण विधि व शुभ मुहूर्त बताएं",
            "क्या महिलाएं इसे पहन सकती हैं?",
            "खान-पान और नित्य नियम क्या हैं?",
            "शनि साढ़े साती निवारण कैसे करें?",
            "ओरिजिनल रुद्राक्ष की पहचान कैसे करें?"
          ].map((qText, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAskInChat(`नमस्ते पंडित जी 🙏 ${qText} (मेरी राशि: ${result.rashiHindi}, अनुशंसित: ${result.recommendedMukhi})`)}
              style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                color: '#92400e',
                padding: '3px 8px',
                borderRadius: 14,
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {qText}
            </button>
          ))}
        </div>
      </div>

      {/* Actions: Ask More to Pandit Ji via AI Chat */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => handleAskInChat()}
          style={{
            flex: 1,
            minWidth: '180px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            background: '#fdf3e7',
            border: '1px solid #d4af37',
            color: '#4A0E17',
            padding: '8px 14px',
            borderRadius: 7,
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <MessageCircle size={15} color="#a54d2b" />
          <span>पंडित जी से AI Chat में और पूछें</span>
        </button>

        <Link
          to="/shop?category=Rudraksha"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '8px 12px',
            borderRadius: 7,
            fontSize: '12px',
            color: '#665548',
            textDecoration: 'none',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
        >
          <span>सभी रुद्राक्ष</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </motion.div>
  );
}
