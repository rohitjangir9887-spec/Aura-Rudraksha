import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { 
  Building2, Award, ShieldCheck, CheckCircle2, 
  Send, Phone, MessageCircle, ArrowRight, Sparkles,
  Truck, Gem, FileCheck
} from "lucide-react";
import { motion } from "framer-motion";

export function Wholesale() {
  const [form, setForm] = useState({
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
    city: "",
    productInterest: "5 Mukhi Nepali Beads",
    quantity: "50-100 pcs",
    notes: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Shell>
      <div className="wholesale-page" style={{ background: "#fdfbf7", minHeight: "100vh", padding: "40px 16px 80px" }}>
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
              <Building2 size={13} /> B2B, TEMPLE TRUSTS & WHOLESALE SUPPLY
            </div>
            <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "36px", color: "#2b170d", margin: "0 0 10px" }}>
              Wholesale & Bulk Consecrated Rudraksha
            </h1>
            <p style={{ color: "#7d6d62", fontSize: "14.5px", maxWidth: "640px", margin: "0 auto" }}>
              Direct origin sourcing from Nepal for Ashrams, Temple Trusts, Yoga Centers, Astrologers, and Sacred Jewellery Retailers.
            </p>
          </div>

          {/* 3 Pillars of Bulk Program */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginBottom: "40px"
          }}>
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #ebdccb" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#fcf4ed", display: "grid", placeItems: "center", color: "#a54d2b", marginBottom: "10px" }}>
                <Gem size={20} />
              </div>
              <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#2b170d", margin: "0 0 4px" }}>
                Direct Himalayan Harvest
              </h3>
              <p style={{ fontSize: "12.5px", color: "#7d6d62", margin: 0, lineHeight: 1.45 }}>
                Directly sourced from high-altitude trees in Sankhuwasabha & Bhojpur, Nepal without middle-agent markups.
              </p>
            </div>

            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #ebdccb" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#fcf4ed", display: "grid", placeItems: "center", color: "#a54d2b", marginBottom: "10px" }}>
                <FileCheck size={20} />
              </div>
              <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#2b170d", margin: "0 0 4px" }}>
                Individual Lab Certificates
              </h3>
              <p style={{ fontSize: "12.5px", color: "#7d6d62", margin: 0, lineHeight: 1.45 }}>
                Every single Mukhi bead in your bulk shipment comes with its own laboratory certificate card and QR scan.
              </p>
            </div>

            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #ebdccb" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#fcf4ed", display: "grid", placeItems: "center", color: "#a54d2b", marginBottom: "10px" }}>
                <Truck size={20} />
              </div>
              <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#2b170d", margin: "0 0 4px" }}>
                Insured Express Freight
              </h3>
              <p style={{ fontSize: "12.5px", color: "#7d6d62", margin: 0, lineHeight: 1.45 }}>
                Secure nationwide air express delivery with 100% transit insurance and tamper-proof sanctified packaging.
              </p>
            </div>
          </div>

          {/* Form & Contact Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px", alignItems: "start" }}>
            
            {/* Left: Wholesale Enquiry Form */}
            <div style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #ebdccb",
              padding: "32px 28px",
              boxShadow: "0 4px 20px rgba(43, 23, 13, 0.04)"
            }}>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "24px", color: "#2b170d", margin: "0 0 6px" }}>
                Request Wholesale Price Catalog
              </h2>
              <p style={{ fontSize: "13px", color: "#7d6d62", marginBottom: "20px" }}>
                Fill out the details below and our B2B desk will provide wholesale rate slabs within 2 to 4 business hours.
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
                    Enquiry Received!
                  </h3>
                  <p style={{ fontSize: "13px", color: "#166534", margin: "0 0 16px" }}>
                    Thank you {form.contactPerson || "Devotee"}. Our B2B coordinator will connect on {form.phone || "your number"} shortly.
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
                    Submit Another Enquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Organization / Trust / Business
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Shiva Mandir Trust / Jewellers"
                        value={form.businessName}
                        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                        required
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ebdccb", fontSize: "13px" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Contact Person Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="Your Full Name"
                        value={form.contactPerson}
                        onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                        required
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ebdccb", fontSize: "13px" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Mobile Number / WhatsApp
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

                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        City & State
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Mumbai, Maharashtra"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        required
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ebdccb", fontSize: "13px" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Primary Category of Interest
                      </label>
                      <select 
                        value={form.productInterest}
                        onChange={(e) => setForm({ ...form, productInterest: e.target.value })}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ebdccb", fontSize: "13px", background: "#ffffff" }}
                      >
                        <option>5 Mukhi Nepali Loose Beads</option>
                        <option>1 to 14 Mukhi Collector Beads</option>
                        <option>108+1 Japa Malas</option>
                        <option>Silver Capped Rudraksha Bracelets</option>
                        <option>Gauri Shankar & Rare Beads</option>
                        <option>Custom Mix / Complete Assortment</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                        Estimated Quantity
                      </label>
                      <select 
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ebdccb", fontSize: "13px", background: "#ffffff" }}
                      >
                        <option>25 - 50 pcs (Sample Batch)</option>
                        <option>50 - 200 pcs</option>
                        <option>200 - 500 pcs</option>
                        <option>500 - 2,000+ pcs</option>
                        <option>Monthly Recurring Supply</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                      Specific Requirements / Custom Silver Capping
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Mention any custom bead size (mm), silver purity, or energisation requests..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                    Submit Wholesale Enquiry <ArrowRight size={16} />
                  </button>
                </form>
              )}
            </div>

            {/* Right: Direct B2B Desk Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{
                background: "linear-gradient(135deg, #2b170d 0%, #150904 100%)",
                borderRadius: "16px",
                padding: "28px 24px",
                color: "#fbf5ef",
                border: "1px solid rgba(200, 155, 60, 0.3)"
              }}>
                <span style={{ fontSize: "11px", color: "#c89b3c", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>
                  DIRECT B2B HELPDESK
                </span>
                <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "24px", color: "#ffffff", margin: "4px 0 10px" }}>
                  Need Immediate Bulk Quotation?
                </h3>
                <p style={{ fontSize: "13px", color: "#d8c7b8", lineHeight: 1.5, marginBottom: "20px" }}>
                  Connect directly with our Wholesale Coordinator on WhatsApp for instant digital catalogs, live stock videos, and proforma invoices.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <a 
                    href="https://wa.me/919672996531?text=Namaste%20I%20am%20interested%20in%20Wholesale%20Rudraksha%20Orders"
                    target="_blank" 
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#20a95a",
                      color: "#ffffff",
                      padding: "12px",
                      borderRadius: "8px",
                      fontWeight: 700,
                      fontSize: "13.5px",
                      textDecoration: "none"
                    }}
                  >
                    <MessageCircle size={18} /> Chat on WhatsApp B2B Desk
                  </a>

                  <a 
                    href="tel:+919672996531"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(200,155,60,0.3)",
                      color: "#ffffff",
                      padding: "12px",
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "13.5px",
                      textDecoration: "none"
                    }}
                  >
                    <Phone size={16} color="#c89b3c" /> Call +91 9672996531
                  </a>
                </div>
              </div>

              {/* Wholesale Benefits Checklist */}
              <div style={{
                background: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #ebdccb",
                padding: "22px 20px"
              }}>
                <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "18px", color: "#2b170d", margin: "0 0 12px" }}>
                  Wholesale Partner Privileges
                </h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#4a3b32" }}>
                    <CheckCircle2 size={15} color="#16a34a" /> Dedicated B2B Relationship Manager
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#4a3b32" }}>
                    <CheckCircle2 size={15} color="#16a34a" /> Custom Pooja Energisation on Trust's Name
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#16a34a" }}>
                    <CheckCircle2 size={15} color="#16a34a" /> Tiered Volume Discounts up to 45%
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#4a3b32" }}>
                    <CheckCircle2 size={15} color="#16a34a" /> GST Invoice with Full Input Credit
                  </li>
                </ul>
              </div>
            </div>

          </div>

        </div>
      </div>
    </Shell>
  );
}
