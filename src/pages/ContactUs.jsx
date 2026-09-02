import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { 
  Headphones, Mail, Phone, MapPin, 
  MessageCircle, Send, CheckCircle2, Clock, 
  Sparkles, Compass, HelpCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { db } from "../lib/db";
import { motion, AnimatePresence } from "framer-motion";

export function ContactUs() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Astrological Mukhi Recommendation",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(-1);
  const settings = db.getSettings();
  const supportEmail = settings?.supportEmail || "aurarudrakshaofficial@gmail.com";

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const FAQS = [
    {
      q: "How do I know which Rudraksha Mukhi is right for me?",
      a: "Our Vedic astrologers and AI spiritual assistant analyze your Kundali Rashi, birth date, and spiritual or career intentions. You can consult Aura AI directly on the website or message our astrologers on WhatsApp."
    },
    {
      q: "Are the beads already energized and ready to wear?",
      a: "Yes! Every single Rudraksha is consecrated in a temple setting with Gangajal, Panchamrit, and 1,008 Vedic Beej Mantras before dispatch. It arrives energized and ready to be worn."
    },
    {
      q: "What is the delivery time across India?",
      a: "Orders are dispatched within 24 to 48 hours via premium express air couriers (DTDC/Delhivery). Standard domestic delivery takes 2 to 4 business days."
    },
    {
      q: "Can I verify the lab test report online?",
      a: "Yes. Every bead is accompanied by a laboratory certification card featuring a holographic QR code that can be scanned to view the digital X-Ray analysis."
    }
  ];

  return (
    <Shell>
      <div className="contact-us-page" style={{ background: "#fdfbf7", minHeight: "100vh", padding: "40px 16px 80px" }}>
        <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#fcf4ed",
              border: "1px solid #ebdccb",
              borderRadius: "30px",
              padding: "5px 14px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#a54d2b",
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              marginBottom: "10px"
            }}>
              <Headphones size={13} /> DEDICATED DEVOTEE SUPPORT
            </div>
            <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "36px", color: "#2b170d", margin: "0 0 10px" }}>
              Contact Aura Rudraksha
            </h1>
            <p style={{ color: "#7d6d62", fontSize: "14.5px", maxWidth: "600px", margin: "0 auto" }}>
              Whether you need guidance choosing the right Mukhi, order tracking assistance, or bulk temple supplies — our spiritual desk is here for you.
            </p>
          </div>

          {/* Quick Contact Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "40px"
          }}>
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #ebdccb", textAlign: "center" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#fcf4ed", display: "grid", placeItems: "center", color: "#a54d2b", margin: "0 auto 10px" }}>
                <Phone size={20} />
              </div>
              <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "17px", color: "#2b170d", margin: "0 0 2px" }}>Direct Helpline</h4>
              <p style={{ fontSize: "12px", color: "#7d6d62", margin: "0 0 8px" }}>Mon - Sat: 9 AM to 7 PM IST</p>
              <a href="tel:+919672996531" style={{ color: "#a54d2b", fontWeight: 700, fontSize: "13px", textDecoration: "none" }}>
                +91 9672996531
              </a>
            </div>

            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #ebdccb", textAlign: "center" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#edfbf0", display: "grid", placeItems: "center", color: "#16a34a", margin: "0 auto 10px" }}>
                <MessageCircle size={20} />
              </div>
              <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "17px", color: "#2b170d", margin: "0 0 2px" }}>WhatsApp Astrologer</h4>
              <p style={{ fontSize: "12px", color: "#7d6d62", margin: "0 0 8px" }}>Instant Chat & Photo Guidance</p>
              <a href="https://wa.me/919672996531?text=Namaste%20I%20need%20assistance" target="_blank" rel="noreferrer" style={{ color: "#16a34a", fontWeight: 700, fontSize: "13px", textDecoration: "none" }}>
                Start WhatsApp Chat
              </a>
            </div>

            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #ebdccb", textAlign: "center" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#fcf4ed", display: "grid", placeItems: "center", color: "#a54d2b", margin: "0 auto 10px" }}>
                <Mail size={20} />
              </div>
              <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "17px", color: "#2b170d", margin: "0 0 2px" }}>Official Email</h4>
              <p style={{ fontSize: "12px", color: "#7d6d62", margin: "0 0 8px" }}>Response within 24 hours</p>
              <a href={`mailto:${supportEmail}`} style={{ color: "#a54d2b", fontWeight: 700, fontSize: "13px", textDecoration: "none" }}>
                {supportEmail}
              </a>
            </div>

            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #ebdccb", textAlign: "center" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#fcf4ed", display: "grid", placeItems: "center", color: "#a54d2b", margin: "0 auto 10px" }}>
                <MapPin size={20} />
              </div>
              <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "17px", color: "#2b170d", margin: "0 0 2px" }}>Ashram & Center</h4>
              <p style={{ fontSize: "12px", color: "#7d6d62", margin: "0 0 8px" }}>Aura Rudraksha, Sikar</p>
              <span style={{ color: "#4a3b32", fontWeight: 600, fontSize: "12.5px" }}>
                Rajasthan - 332001
              </span>
            </div>
          </div>

          {/* Form & Astrological Callout */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px", alignItems: "start", marginBottom: "48px" }}>
            
            {/* Form */}
            <div style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #ebdccb",
              padding: "32px 28px",
              boxShadow: "0 4px 20px rgba(43, 23, 13, 0.04)"
            }}>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "24px", color: "#2b170d", margin: "0 0 6px" }}>
                Send Us a Sacred Query
              </h2>
              <p style={{ fontSize: "13px", color: "#7d6d62", marginBottom: "20px" }}>
                Leave your query and our team will get back with personalized guidance.
              </p>

              {submitted ? (
                <div style={{
                  background: "#edfbf0",
                  border: "1px solid #b7ebc5",
                  borderRadius: "10px",
                  padding: "24px",
                  textAlign: "center"
                }}>
                  <CheckCircle2 size={36} color="#16a34a" style={{ margin: "0 auto 10px" }} />
                  <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "20px", color: "#15803d", margin: "0 0 4px" }}>
                    Message Received!
                  </h3>
                  <p style={{ fontSize: "13px", color: "#166534", margin: "0 0 16px" }}>
                    Thank you {form.name || "Devotee"}. Our astrological counselor will respond to {form.email || form.phone} shortly.
                  </p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    style={{
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Your Full Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Rajesh Sharma"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ebdccb", fontSize: "13px" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Mobile / WhatsApp
                      </label>
                      <input 
                        type="tel" 
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ebdccb", fontSize: "13px" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Email Address
                      </label>
                      <input 
                        type="email" 
                        placeholder="yourname@gmail.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ebdccb", fontSize: "13px" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Topic / Subject
                      </label>
                      <select 
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ebdccb", fontSize: "13px", background: "#ffffff" }}
                      >
                        <option>Astrological Mukhi Recommendation</option>
                        <option>Order Status & Tracking</option>
                        <option>Certificate Verification</option>
                        <option>Custom Silver / Gold Capping</option>
                        <option>Bulk / Ashram Supplies</option>
                        <option>Other Query</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                      Your Message or Date of Birth Details
                    </label>
                    <textarea 
                      rows={4}
                      placeholder="Share your question or your Date/Time/Place of Birth if asking for Kundali recommendation..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ebdccb", fontSize: "13px" }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: "#a54d2b",
                      color: "#ffffff",
                      border: "none",
                      padding: "12px 20px",
                      borderRadius: "8px",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      marginTop: "6px"
                    }}
                  >
                    Submit Message <Send size={15} />
                  </button>
                </form>
              )}
            </div>

            {/* AI Advisor Banner */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{
                background: "linear-gradient(135deg, #2b170d 0%, #150904 100%)",
                borderRadius: "16px",
                padding: "28px 24px",
                color: "#fbf5ef",
                border: "1px solid rgba(200, 155, 60, 0.3)"
              }}>
                <span style={{ fontSize: "11px", color: "#c89b3c", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
                  INSTANT AI ASTROLOGICAL GUIDANCE
                </span>
                <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "24px", color: "#ffffff", margin: "4px 0 10px" }}>
                  Try Aura AI Assistant
                </h3>
                <p style={{ fontSize: "13px", color: "#d8c7b8", lineHeight: 1.5, marginBottom: "20px" }}>
                  Don't want to wait? Get real-time Shastric Mukhi recommendations instantly using our trained AI Vedic assistant.
                </p>
                <Link 
                  to="/aura-ai"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#c89b3c",
                    color: "#1a0d06",
                    padding: "11px 22px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    fontSize: "13px",
                    textDecoration: "none"
                  }}
                >
                  <Compass size={16} /> Open Aura AI Assistant
                </Link>
              </div>

              {/* Operating Hours Box */}
              <div style={{
                background: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #ebdccb",
                padding: "22px 20px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "#a54d2b" }}>
                  <Clock size={18} />
                  <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#2b170d", margin: 0 }}>
                    Support Working Hours
                  </h4>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px", color: "#6b584c" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Monday – Friday:</span>
                    <strong>9:00 AM – 7:30 PM IST</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Saturday:</span>
                    <strong>10:00 AM – 6:00 PM IST</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Sunday:</span>
                    <strong style={{ color: "#a54d2b" }}>WhatsApp Support Active</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Quick FAQ Section */}
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #ebdccb",
            padding: "28px 24px"
          }}>
            <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "24px", color: "#2b170d", textAlign: "center", margin: "0 0 20px" }}>
              Frequently Asked Questions
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "800px", margin: "0 auto" }}>
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} style={{ border: "1px solid #ebdccb", borderRadius: "8px", background: "#fdfbf7", overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? -1 : i)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontFamily: "Cormorant Garamond, serif",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#2b170d",
                        cursor: "pointer"
                      }}
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp size={16} color="#a54d2b" /> : <ChevronDown size={16} color="#806f62" />}
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 16px 12px", fontSize: "12.5px", color: "#63544a", lineHeight: 1.5, borderTop: "1px solid #f2e6da", paddingTop: "8px" }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </Shell>
  );
}
