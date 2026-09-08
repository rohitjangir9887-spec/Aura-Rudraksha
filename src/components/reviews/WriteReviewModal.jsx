import React, { useState, useEffect } from "react";
import { Star, X, Camera, Sparkles, CheckCircle2, Upload, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../lib/db";
import { uploadMedia } from "../../lib/imageUtils";
import { authClient } from "../../lib/authClient";
import { emitToast } from "../../context/ToastContext";

export function WriteReviewModal({
  isOpen,
  onClose,
  product = null,
  orderId = "",
  onSuccess = null
}) {
  const user = authClient.getUser();
  
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const u = authClient.getUser();
      setName(u?.displayName || u?.name || "");
      setEmail(u?.email || "");
      setCity(u?.city || "Varanasi, UP");
      setRating(5);
      setTitle("");
      setText("");
      setImages([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const productName = product?.name || product?.title || "Sacred Rudraksha";
  const productId = product?.id || product?._id || "all";
  const productImg = product?.img || product?.image || (Array.isArray(product?.images) ? product.images[0] : null);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 5) {
      emitToast("You can upload a maximum of 5 photos.", "warning");
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          emitToast("Only photo and video files are supported.", "warning");
          continue;
        }
        if (file.size > 20 * 1024 * 1024) {
          emitToast(`File ${file.name} is too large (max 20MB).`, "warning");
          continue;
        }

        try {
          const res = await uploadMedia(file);
          if (res && res.url) {
            uploadedUrls.push(res.url);
          } else if (typeof res === "string" && res.startsWith("http")) {
            uploadedUrls.push(res);
          } else {
            // Fallback to local data URL reader
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            uploadedUrls.push(dataUrl);
          }
        } catch (uploadErr) {
          // If server upload fails, fallback to high-quality base64
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          });
          if (dataUrl) uploadedUrls.push(dataUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setImages(prev => [...prev, ...uploadedUrls].slice(0, 5));
        emitToast(`${uploadedUrls.length} photo(s) attached!`, "success");
      }
    } catch (err) {
      emitToast("Could not upload photo: " + (err.message || "Unknown error"), "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      emitToast("Please write your review experience.", "warning");
      return;
    }
    if (!name.trim()) {
      emitToast("Please enter your name.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewPayload = {
        productId: String(productId),
        productName: productName,
        name: name.trim(),
        email: email.trim(),
        city: city.trim() || "India",
        rating: Number(rating) || 5,
        title: title.trim() || (rating >= 4 ? "Blessed Spiritual Experience" : "Product Review"),
        text: text.trim(),
        images: images,
        img: images[0] || null,
        orderId: orderId || undefined,
        verified: true,
        source: "customer",
        status: "Approved",
        isAiGenerated: false,
        isSample: false,
        helpfulUp: 0,
        helpfulDown: 0,
        date: "Just now"
      };

      const saved = await db.saveReview(reviewPayload);
      emitToast("🙏 Dhanyawad! Your authentic review has been posted successfully.", "success");
      
      if (onSuccess) onSuccess(saved);
      onClose();
    } catch (err) {
      emitToast(err.message || "Failed to submit review. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (val) => {
    switch (val) {
      case 5: return "⭐⭐⭐⭐⭐ Divine & Exceptional (5/5)";
      case 4: return "⭐⭐⭐⭐ Very Good (4/5)";
      case 3: return "⭐⭐⭐ Good (3/5)";
      case 2: return "⭐⭐ Fair (2/5)";
      case 1: return "⭐ Needs Improvement (1/5)";
      default: return "Select Rating";
    }
  };

  return (
    <AnimatePresence>
      <div 
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20, 10, 5, 0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px"
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #ebdccb",
            boxShadow: "0 20px 45px rgba(43, 23, 13, 0.2)",
            width: "100%",
            maxWidth: "520px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: "18px 22px",
            borderBottom: "1px solid #ebdccb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(to right, #fdfbf7, #ffffff)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#fcf4ed",
                display: "grid",
                placeItems: "center",
                color: "#a54d2b"
              }}>
                <Sparkles size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontFamily: "Cormorant Garamond, serif", color: "#2b170d", fontWeight: 700 }}>
                  Write a Verified Devotee Review
                </h3>
                <span style={{ fontSize: "12px", color: "#7a685c" }}>
                  Share your consecrated Rudraksha experience
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: "none",
                border: "none",
                padding: "6px",
                cursor: "pointer",
                color: "#7a685c",
                borderRadius: "6px"
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>
            {/* Product summary card */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              background: "#fdf8f4",
              border: "1px solid #ebdccb",
              borderRadius: "10px",
              marginBottom: "18px"
            }}>
              {productImg && (
                <img 
                  src={productImg} 
                  alt={productName}
                  style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e0d0bf" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#2b170d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {productName}
                </p>
                {orderId && (
                  <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={11} /> Verified Delivered Purchase (#{orderId})
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Star Rating */}
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#2b170d", marginBottom: "6px" }}>
                  Overall Rating *
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: "3px",
                          cursor: "pointer",
                          color: isFilled ? "#d97706" : "#d1d5db",
                          transition: "transform 0.1s"
                        }}
                      >
                        <Star size={26} fill={isFilled ? "#d97706" : "none"} strokeWidth={1.5} />
                      </button>
                    );
                  })}
                  <span style={{ fontSize: "12px", color: "#d97706", fontWeight: 700, marginLeft: "8px" }}>
                    {getRatingLabel(hoverRating || rating)}
                  </span>
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                  Headline / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pure Nepali Rudraksha with powerful energy & vibration"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #ebdccb",
                    fontSize: "13px",
                    outline: "none"
                  }}
                />
              </div>

              {/* Review Text */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                  Your Experience *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share details about bead authenticity, laboratory X-Ray card, Haridwar consecration, daily meditation feel, packaging..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #ebdccb",
                    fontSize: "13px",
                    outline: "none",
                    resize: "vertical"
                  }}
                />
              </div>

              {/* Devotee Name & City */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #ebdccb",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4a3b32", marginBottom: "4px" }}>
                    City / State
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Varanasi, UP"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #ebdccb",
                      fontSize: "13px",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              {/* Photo Upload Section */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#4a3b32", marginBottom: "6px" }}>
                  Attach Photos / Videos (Optional, up to 5)
                </label>

                {images.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                    {images.map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          position: "relative", 
                          width: "56px", 
                          height: "56px", 
                          borderRadius: "8px", 
                          overflow: "hidden", 
                          border: "1px solid #ebdccb" 
                        }}
                      >
                        <img 
                          src={imgUrl} 
                          alt="Review attachment" 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            background: "rgba(0,0,0,0.65)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: "16px",
                            height: "16px",
                            display: "grid",
                            placeItems: "center",
                            cursor: "pointer",
                            fontSize: "10px",
                            padding: 0
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {images.length < 5 && (
                  <label style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px dashed #c4a997",
                    background: "#fdfbf7",
                    color: "#a54d2b",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: uploadingImage ? "not-allowed" : "pointer"
                  }}>
                    {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    <span>{uploadingImage ? "Uploading..." : "Upload Bead / Certificate Photo"}</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      disabled={uploadingImage}
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "10px",
                paddingTop: "14px",
                borderTop: "1px solid #ebdccb"
              }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  style={{
                    background: "#f4ece5",
                    color: "#6b584c",
                    border: "none",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingImage}
                  style={{
                    background: "#a54d2b",
                    color: "#ffffff",
                    border: "none",
                    padding: "9px 20px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Submitting Review...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Post Verified Review
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
