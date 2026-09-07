import React, { useState } from "react";
import { Award, CheckCircle2, ShieldCheck, FileCheck, Eye, X, Leaf, Sparkles, Droplets } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isRudrakshaProduct } from "../../lib/productHelper";

export function ProductCertification({ product }) {
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  if (!product) return null;

  const isRudraksha = isRudrakshaProduct(product);

  // If non-rudraksha Puja Samagri or user opted out of lab cert
  if (!isRudraksha) {
    return (
      <div className="aura-lab-cert-showcase" style={{ background: '#fcfaf6', borderColor: '#e8dbce' }}>
        <div className="aura-lab-cert-header">
          <div className="cert-badge-icon" style={{ background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)' }}>
            <Leaf size={24} />
          </div>
          <div className="cert-header-text">
            <h3 className="cert-heading">100% Pure, Natural &amp; Sanctified Guarantee</h3>
            <p className="cert-subheading">
              Every Puja Samagri product is prepared with 100% pure, natural ingredients and energized with sacred Vedic mantras.
            </p>
          </div>
        </div>

        <div className="aura-lab-cert-body">
          <div className="cert-features-grid">
            <div className="cert-feat-item">
              <CheckCircle2 size={15} className="feat-check" style={{ color: '#16a34a' }} />
              <div>
                <strong>100% Pure &amp; Chemical-Free:</strong>
                <span>Zero synthetic chemicals, artificial fragrances, or toxic burning residue.</span>
              </div>
            </div>

            <div className="cert-feat-item">
              <CheckCircle2 size={15} className="feat-check" style={{ color: '#16a34a' }} />
              <div>
                <strong>Vedic Prana Pratishtha:</strong>
                <span>Purified and energized with holy Ganga Jal and Vedic stotras before shipment.</span>
              </div>
            </div>

            <div className="cert-feat-item">
              <CheckCircle2 size={15} className="feat-check" style={{ color: '#16a34a' }} />
              <div>
                <strong>Authentic Sacred Sourcing:</strong>
                <span>Sourced directly from sacred pilgrimage centers (Haridwar / Kashi / Mathura).</span>
              </div>
            </div>

            <div className="cert-feat-item">
              <CheckCircle2 size={15} className="feat-check" style={{ color: '#16a34a' }} />
              <div>
                <strong>Airtight Freshness Packaging:</strong>
                <span>Hermetically sealed to lock in natural divine aroma and long shelf life.</span>
              </div>
            </div>
          </div>

          {/* Mini Purity Guarantee Specimen Card */}
          <div className="cert-specimen-card" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }} onClick={() => setIsCertModalOpen(true)}>
            <div className="specimen-header">
              <div className="specimen-seal" style={{ background: '#16a34a', color: '#fff' }}>
                <ShieldCheck size={14} />
              </div>
              <div className="specimen-brand">
                <span style={{ color: '#166534' }}>VEDIC PURITY GUARANTEE</span>
                <small style={{ color: '#15803d' }}>100% SATTVIC ASSURANCE</small>
              </div>
            </div>
            <div className="specimen-body">
              <div className="specimen-row">
                <span>Product:</span>
                <strong>{product?.name}</strong>
              </div>
              <div className="specimen-row">
                <span>Category:</span>
                <strong>{product?.category || "Puja Samagri"}</strong>
              </div>
              <div className="specimen-row">
                <span>Quality Grade:</span>
                <strong>100% Pure &amp; Natural</strong>
              </div>
              <div className="specimen-row">
                <span>Status:</span>
                <strong className="status-pass" style={{ color: '#16a34a' }}>VERIFIED SATTVIC ✓</strong>
              </div>
            </div>
            <button type="button" className="specimen-view-btn" style={{ color: '#166534', background: '#dcfce7' }}>
              <Eye size={13} /> View Purity Guarantee
            </button>
          </div>
        </div>

        {/* Purity Guarantee Modal */}
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
                    <h4>Vedic Purity &amp; Quality Guarantee</h4>
                    <span>Authenticity &amp; Sanctity Promise for {product?.name}</span>
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
                    <div className="cert-pass-banner" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
                      <ShieldCheck size={20} style={{ color: '#16a34a' }} />
                      <span>Guaranteed 100% Natural, Pure &amp; Vedic Sanctified</span>
                    </div>

                    <div className="cert-details-table">
                      <div className="cert-row">
                        <span>Product Name:</span>
                        <strong>{product?.name}</strong>
                      </div>
                      <div className="cert-row">
                        <span>Category:</span>
                        <strong>{product?.category || "Puja Samagri"}</strong>
                      </div>
                      <div className="cert-row">
                        <span>Purity Grade:</span>
                        <strong>100% Pure, Sattvic &amp; Chemical-Free</strong>
                      </div>
                      <div className="cert-row">
                        <span>Sanctification:</span>
                        <strong>Consecrated with Haridwar Ganga Jal &amp; Vedic Stotras</strong>
                      </div>
                      <div className="cert-row">
                        <span>Packaging:</span>
                        <strong>Hermetically Sealed Airtight Tamper-Proof Box</strong>
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

  // Rudraksha Bead Certificate
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

