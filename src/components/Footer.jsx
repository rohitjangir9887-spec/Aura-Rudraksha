import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Headphones, PackageSearch, RefreshCcw, 
  Instagram, Facebook, Youtube, Send, ArrowRight,
  ShieldCheck, Beaker, Truck, Phone
} from "lucide-react";
import { db, onStoreUpdate } from "../lib/db";
import { motion } from "framer-motion";

export function FooterHelpStrip() {
  return (
    <div className="n-footer-help-strip">
      <div className="nf-help-item">
        <Headphones size={22} strokeWidth={1.5} className="nf-icon" />
        <div className="nf-help-text">
          <b>Happy to help</b>
          <span>Chat or email</span>
        </div>
      </div>
      <div className="nf-help-item">
        <PackageSearch size={22} strokeWidth={1.5} className="nf-icon" />
        <div className="nf-help-text">
          <b>Check order status</b>
          <span>Updates & tracking</span>
        </div>
      </div>
      <div className="nf-help-item">
        <RefreshCcw size={22} strokeWidth={1.5} className="nf-icon" />
        <div className="nf-help-text">
          <b>Returns & exchanges</b>
          <span>Quick & hassle-free</span>
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  const [settings, setSettings] = useState(() => db.getSettings());
  const location = useLocation();

  useEffect(() => {
    setSettings(db.getSettings());
    const unsub = onStoreUpdate(() => {
      setSettings(db.getSettings());
    });
    return () => unsub();
  }, [location.pathname]);

  const supportPhone = settings.supportPhone || "+91 9672996531";
  const supportEmail = settings.supportEmail || "aurarudrakshaofficial@gmail.com";
  const cleanPhone = supportPhone.replace(/[^0-9]/g, "");

  const instagramUrl = settings.instagramUrl || "https://instagram.com/aurarudraksha";
  const facebookUrl = settings.facebookUrl || "https://facebook.com/aurarudraksha";
  const youtubeUrl = settings.youtubeUrl || "https://youtube.com/@aurarudraksha";
  const whatsappUrl = "https://wa.me/91" + (cleanPhone.startsWith('91') ? cleanPhone.substring(2) : cleanPhone);

  return (
    <footer id="contact" className="n-footer-root">
      <FooterHelpStrip />
      
      <div className="n-footer-main">
        {/* 2. Brand Section */}
        <div className="n-footer-brand">
          <img 
            src="https://i.ibb.co/Q3C3gZTd/file-00000000fb188211907f8ce113ccb17a.png" 
            alt="Aura Rudraksha Logo" 
            className="nf-logo"
            referrerPolicy="no-referrer"
            onError={(e) => { if (e.target.src !== window.location.origin + "/logo-horizontal.png") e.target.src = "/logo-horizontal.png"; }}
          />
          <h3 className="nf-tagline">Sacred. Natural. Powerful.</h3>
          <p className="nf-desc">
            Carefully selected, lab-tested and energised Rudraksha for your spiritual journey. Bringing balance, peace and positivity into your life.
          </p>
          <div className="nf-socials">
            <a href={instagramUrl} target="_blank" rel="noreferrer"><Instagram size={18} strokeWidth={1.5} /></a>
            <a href={facebookUrl} target="_blank" rel="noreferrer"><Facebook size={18} strokeWidth={1.5} /></a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer"><Send size={18} strokeWidth={1.5} /></a>
            <a href={youtubeUrl} target="_blank" rel="noreferrer"><Youtube size={18} strokeWidth={1.5} /></a>
          </div>
        </div>

        {/* 3. Two Clean Columns */}
        <div className="n-footer-links-grid">
          <div className="nf-links-col">
            <h4>QUICK LINKS</h4>
            <Link to="/about">About Us</Link>
            <Link to="/track-order">Track Order</Link>
            <Link to="/shop">All Products</Link>
            <Link to="/categories">Categories</Link>
            <Link to="/wholesale">Bulk / Wholesale</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/terms">Terms & Conditions</Link>
          </div>
          <div className="nf-links-col">
            <h4>POLICIES</h4>
            <Link to="/return-policy">Refund & Return Policy</Link>
            <Link to="/shipping-policy">Shipping Policy</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cancellation">Cancellation Policy</Link>
            <Link to="/secure-payment">Secure Payment</Link>
          </div>
        </div>

        {/* 4. Get in Touch */}
        <div className="n-footer-contact">
          <h4>GET IN TOUCH</h4>
          <a href={`tel:${cleanPhone}`}>{supportPhone}</a>
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          <p>Aura Rudraksha, Sikar, Rajasthan - 332001</p>
        </div>

        {/* 5. Newsletter */}
        <div className="n-footer-newsletter">
          <h4>NEWSLETTER</h4>
          <p>Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.</p>
          <form className="nf-newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Your email address" required />
            <button type="submit" aria-label="Subscribe"><ArrowRight size={18} /></button>
          </form>
        </div>
      </div>

      {/* 6. Service Benefits Strip */}
      <div className="n-footer-benefits">
        <div className="nf-benefit-item">
          <div className="nf-b-icon"><ShieldCheck size={20} strokeWidth={1.5} /></div>
          <div className="nf-b-text">
            <b>100% Authentic</b>
            <span>Lab Tested & Certified</span>
          </div>
        </div>
        <div className="nf-benefit-item">
          <div className="nf-b-icon"><Beaker size={20} strokeWidth={1.5} /></div>
          <div className="nf-b-text">
            <b>Lab Tested</b>
            <span>Purity You Can Trust</span>
          </div>
        </div>
        <div className="nf-benefit-item">
          <div className="nf-b-icon"><Truck size={20} strokeWidth={1.5} /></div>
          <div className="nf-b-text">
            <b>Free Shipping</b>
            <span>{(settings.freeShippingThreshold ?? 0) > 0 ? `On orders above ₹${settings.freeShippingThreshold}` : "On all orders nationwide"}</span>
          </div>
        </div>
        <div className="nf-benefit-item">
          <div className="nf-b-icon"><Phone size={20} strokeWidth={1.5} /></div>
          <div className="nf-b-text">
            <b>Support 24/7</b>
            <span>We're Always Here</span>
          </div>
        </div>
      </div>

      {/* 7. Bottom Copyright */}
      <div className="n-footer-copyright">
        <p>© 2025 Aura Rudraksha. All Rights Reserved.</p>
        <p>Made with ❤️ for your spiritual journey.</p>
      </div>
      
      {/* Spacer for fixed bottom nav */}
      <div style={{ height: '64px' }}></div>
    </footer>
  );
}
