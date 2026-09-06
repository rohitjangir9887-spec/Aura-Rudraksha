import React, { useState } from "react";
import { Award, CheckCircle2, ShieldCheck, FileCheck, Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ProductCertification({ product }) {
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  const certImg = product?.certificateImg || product?.certificate || "/images/sample-rudraksha-cert.jpg";
  const hasCustomCert = Boolean(product?.certificateImg || product?.certificate);

  return (
    <div className="aura-lab-cert-showcase">
      <div className="aura-lab-cert-header">
        <div className="cert-badge-icon">
          <Award size={24} />
        </div>
        <div className="cert-header-text">
          <h3 className="cert-heading">Government Recognized Lab Certification</h3>
          <p className="cert-subheading">
            Every Aura Rudraksha is independently tested and authenticated by certified gemological labs.
          </p>
        </div>
      </div>

      <div className="aura-lab-cert-body">
        <div className="cert-features-grid">
          <div className="cert-feat-item">
            <CheckCircle2 size={15} className="feat-check" />
            <div>
              <strong>100% Botanical Authenticity:</strong>
              <span>Verified natural Elaeocarpus ganitrus seed with intact internal compartments.</span>
            </div>
          </div>

          <div className="cert-feat-item">
            <CheckCircle2 size={15} className="feat-check" />
            <div>
              <strong>X-Ray &amp; Microscopic Line Scan:</strong>
              <span>Complete verification of natural seed grooves without carving or artificial glue.</span>
            </div>
          </div>

          <div className="cert-feat-item">
            <CheckCircle2 size={15} className="feat-check" />
            <div>
              <strong>Specific Gravity &amp; Density Test:</strong>
              <span>Ensures authentic high-density Himalayan origin bead.</span>
            </div>
          </div>

          <div className="cert-feat-item">
            <CheckCircle2 size={15} className="feat-check" />
            <div>
              <strong>Physical Lab Card Included:</strong>
              <span>Delivered inside your parcel with unique verification number and QR code.</span>
            </div>
          </div>
        </div>

        {/* Mini Certificate Card Specimen */}
        <div className="cert-specimen-card" onClick={() => setIsCertModalOpen(true)}>
          <div className="specimen-header">
            <div className="specimen-seal">
              <Award size={14} />
            </div>
            <div className="specimen-brand">
              <span>CERTIFICATE OF AUTHENTICITY</span>
              <small>GOVT RECOGNIZED GEM LAB</small>
            </div>
          </div>
          <div className="specimen-body">
            <div className="specimen-row">
              <span>Specimen:</span>
              <strong>Natural Rudraksha</strong>
            </div>
            <div className="specimen-row">
              <span>Mukhi:</span>
              <strong>{product?.mukhi ? `${product.mukhi} Mukhi` : "Natural Grooves"}</strong>
            </div>
            <div className="specimen-row">
              <span>Origin:</span>
              <strong>{product?.origin || "Nepal / Himalayas"}</strong>
            </div>
            <div className="specimen-row">
              <span>Status:</span>
              <strong className="status-pass">TESTED &amp; PASSED ✓</strong>
            </div>
          </div>
          <button type="button" className="specimen-view-btn">
            <Eye size={13} /> View Certificate Details
          </button>
        </div>
      </div>

      {/* Certificate Modal */}
      <AnimatePresence>
        {isCertModalOpen && (
          <motion.div
            className="aura-lightbox-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCertModalOpen(false)}
          >
            <div className="aura-cert-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="aura-cert-modal-header">
                <div>
                  <h4>Lab Certificate Specification</h4>
                  <span>Authenticity Guarantee for {product?.name}</span>
                </div>
                <button
                  type="button"
                  className="aura-lightbox-close-btn"
                  onClick={() => setIsCertModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="aura-cert-modal-content">
                <div className="cert-modal-specimen-view">
                  <div className="cert-pass-banner">
                    <ShieldCheck size={20} />
                    <span>Certified 100% Genuine Natural Rudraksha</span>
                  </div>

                  <div className="cert-details-table">
                    <div className="cert-row">
                      <span>Product:</span>
                      <strong>{product?.name}</strong>
                    </div>
                    <div className="cert-row">
                      <span>Category:</span>
                      <strong>{product?.category || "Rudraksha Bead"}</strong>
                    </div>
                    <div className="cert-row">
                      <span>Origin:</span>
                      <strong>{product?.origin || "Himalayan Region (Nepal)"}</strong>
                    </div>
                    <div className="cert-row">
                      <span>Test Method:</span>
                      <strong>X-Ray Imaging, Specific Gravity, Microscopic Inspection</strong>
                    </div>
                    <div className="cert-row">
                      <span>Physical Card:</span>
                      <strong>Included in Luxury Velvet Box with QR Security Code</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
