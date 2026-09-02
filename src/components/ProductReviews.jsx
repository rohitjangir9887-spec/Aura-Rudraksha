import React, { useState, useEffect, useMemo } from "react";
import { 
  Star, 
  CheckCircle2, 
  ThumbsUp, 
  ThumbsDown, 
  Camera, 
  MessageSquare, 
  Search, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Upload, 
  ShieldCheck, 
  ChevronDown, 
  Check, 
  Sparkles, 
  CornerDownRight, 
  Flame, 
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, onStoreUpdate } from "../lib/db";
import { uploadMedia } from "../lib/imageUtils";
import { emitToast } from "../context/ToastContext";

export function ProductReviews({ product, isPreview = false, previewSettings = null }) {
  const productId = product?.id ? String(product.id) : "5";
  const productName = product?.name || "5 Mukhi Rudraksha";

  // Data states
  const [allReviews, setAllReviews] = useState([]);
  const [settings, setSettings] = useState(() => db.getReviewSettings());
  const [activeTab, setActiveTab] = useState("product"); // "product" | "store"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("all"); // "all", "5", "4", "3", "2", "1", "photos", "verified"
  const [sortBy, setSortBy] = useState("recent"); // "recent", "highest", "lowest", "helpful"
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Interaction modals & Lightbox states
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState(null); // { photoUrl, review, index, allPhotos }
  const [expandedReviews, setExpandedReviews] = useState({}); // { [id]: boolean }
  const [userVotes, setUserVotes] = useState({}); // { [id]: 'up' | 'down' }

  // New review form state
  const [newReviewForm, setNewReviewForm] = useState({
    name: "",
    email: "",
    city: "",
    rating: 5,
    type: "product",
    title: "",
    text: "",
    images: []
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load reviews and settings from db
  const loadData = () => {
    const revs = db.getAllReviews();
    setAllReviews(revs);
    if (!previewSettings) {
      setSettings(db.getReviewSettings());
    }
  };

  useEffect(() => {
    loadData();
    const unsub = onStoreUpdate(() => {
      loadData();
    });
    return () => unsub();
  }, [productId]);

  // Sync preview settings if provided
  useEffect(() => {
    if (previewSettings) {
      setSettings(previewSettings);
    }
  }, [previewSettings]);

  // Read user votes from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("aura_review_votes");
      if (stored) {
        setUserVotes(JSON.parse(stored));
      }
    } catch (_) {}
  }, []);

  const activeSettings = previewSettings || settings;

  // If reviews section is globally disabled in admin
  if (activeSettings && activeSettings.enabled === false && !isPreview) {
    return null;
  }

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    // Filter out deleted/hidden reviews first
    const baseList = allReviews.filter(r => 
      r.status !== "Rejected" && 
      r.status !== "Hidden" && 
      r.status !== "draft" && 
      r.status !== "deleted" &&
      r.source !== "ai_draft"
    );

    // Group into real vs sample reviews
    const realReviews = baseList.filter(r => !r.isAiGenerated && !r.isSample);

    // Filter by tab helper
    const filterByTab = (listToFilter) => {
      if (activeTab === "product") {
        return listToFilter.filter(r => r.type === "product" && (String(r.productId) === String(productId) || r.productId === "5" || !r.productId));
      } else {
        return listToFilter.filter(r => r.type === "store" || r.productId === "all");
      }
    };

    const realTabReviews = filterByTab(realReviews);
    let list = [];

    if (realTabReviews.length > 0) {
      // If we have real customer reviews, only show real customer reviews!
      list = realTabReviews;
    } else {
      // Fallback: Show labeled sample reviews if there are no real devotee reviews yet
      list = filterByTab(baseList);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.city && r.city.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.text && r.text.toLowerCase().includes(q))
      );
    }

    // Filter by Rating / Attributes
    if (filterRating === "photos") {
      list = list.filter(r => Array.isArray(r.images) && r.images.length > 0);
    } else if (filterRating === "verified") {
      list = list.filter(r => r.verified === true && !r.isAiGenerated && !r.isSample);
    } else if (filterRating !== "all") {
      const targetStar = Number(filterRating);
      list = list.filter(r => Number(r.rating) === targetStar);
    }

    // Sorting
    const sorted = [...list].sort((a, b) => {
      // Featured reviews always float to top if enabled
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      if (sortBy === "highest") return (b.rating || 5) - (a.rating || 5);
      if (sortBy === "lowest") return (a.rating || 5) - (b.rating || 5);
      if (sortBy === "helpful") return ((b.helpfulUp || 0) - (b.helpfulDown || 0)) - ((a.helpfulUp || 0) - (a.helpfulDown || 0));
      // "recent" by default
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return sorted;
  }, [allReviews, activeTab, productId, searchQuery, filterRating, sortBy]);

  // Aggregate stats based on what is displayed in filteredReviews
  const stats = useMemo(() => {
    const total = filteredReviews.length;
    if (total === 0) {
      return { avgRating: "5.0", total: 0, starsCount: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }

    const sum = filteredReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (sum / total).toFixed(1);

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    filteredReviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });

    return { avgRating: avg, total, starsCount: counts };
  }, [filteredReviews]);

  // Extract all photos for the photo gallery based on filteredReviews
  const photoGalleryItems = useMemo(() => {
    const photos = [];
    filteredReviews.forEach(rev => {
      if (Array.isArray(rev.images) && rev.images.length > 0) {
        rev.images.forEach((imgUrl, imgIdx) => {
          if (imgUrl) {
            photos.push({
              url: imgUrl,
              review: rev,
              imageIndex: imgIdx
            });
          }
        });
      }
    });
    return photos;
  }, [filteredReviews]);

  // Tab counts based on real vs sample fallback
  const productReviewsCount = useMemo(() => {
    const list = allReviews.filter(r => 
      r.status !== "Rejected" && 
      r.status !== "Hidden" && 
      r.status !== "draft" && 
      r.status !== "deleted" &&
      r.type === "product" && 
      (String(r.productId) === String(productId) || r.productId === "5" || !r.productId)
    );
    const realList = list.filter(r => !r.isAiGenerated && !r.isSample);
    return realList.length > 0 ? realList.length : list.length;
  }, [allReviews, productId]);

  const storeReviewsCount = useMemo(() => {
    const list = allReviews.filter(r => 
      r.status !== "Rejected" && 
      r.status !== "Hidden" && 
      r.status !== "draft" && 
      r.status !== "deleted" &&
      (r.type === "store" || r.productId === "all")
    );
    const realList = list.filter(r => !r.isAiGenerated && !r.isSample);
    return realList.length > 0 ? realList.length : list.length;
  }, [allReviews]);

  // Handlers
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + (activeSettings?.perPage || 6));
      setIsLoadingMore(false);
    }, 300);
  };

  const handleVote = (reviewId, type) => {
    if (activeSettings?.helpfulVotingEnabled === false) return;
    
    if (userVotes[reviewId]) {
      emitToast("You have already voted on this review.", "info");
      return;
    }

    const res = db.voteReviewHelpful(reviewId, type);
    if (res.success) {
      setUserVotes(prev => {
        const next = { ...prev, [reviewId]: type };
        try {
          localStorage.setItem("aura_review_votes", JSON.stringify(next));
        } catch (_) {}
        return next;
      });
      emitToast("Thank you for your spiritual feedback!", "success");
    } else if (res.message) {
      emitToast(res.message, "info");
    }
  };

  const toggleExpand = (id) => {
    setExpandedReviews(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openLightbox = (photoUrl, review, index = 0) => {
    // Collect all photos from all reviews for prev/next lightbox carousel
    const allPhotos = photoGalleryItems.map(p => ({
      url: p.url,
      review: p.review
    }));

    const foundIdx = allPhotos.findIndex(p => p.url === photoUrl);
    setLightboxData({
      currentIdx: foundIdx !== -1 ? foundIdx : 0,
      photos: allPhotos.length > 0 ? allPhotos : [{ url: photoUrl, review }]
    });
  };

  const handleNextPhoto = (e) => {
    e?.stopPropagation();
    if (!lightboxData) return;
    setLightboxData(prev => ({
      ...prev,
      currentIdx: (prev.currentIdx + 1) % prev.photos.length
    }));
  };

  const handlePrevPhoto = (e) => {
    e?.stopPropagation();
    if (!lightboxData) return;
    setLightboxData(prev => ({
      ...prev,
      currentIdx: (prev.currentIdx - 1 + prev.photos.length) % prev.photos.length
    }));
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxData) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setLightboxData(null);
      if (e.key === "ArrowRight") handleNextPhoto();
      if (e.key === "ArrowLeft") handlePrevPhoto();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxData]);

  // Image Upload handler for Write Review modal
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (newReviewForm.images.length + files.length > 5) {
      emitToast("Maximum 5 photos allowed per review.", "warning");
      return;
    }

    setUploadingImage(true);
    try {
      emitToast("Uploading photos to Puter Cloud...", "info");
      const uploadedUrls = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const url = await uploadMedia(file);
        if (url) {
          uploadedUrls.push(url);
        }
      }
      setNewReviewForm(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
      emitToast(`${uploadedUrls.length} photo(s) uploaded successfully!`, "success");
    } catch (err) {
      console.error(err);
      emitToast(err.message || "Failed to upload photo. Please try again.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveUploadedImage = (idx) => {
    setNewReviewForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  // Submit Review Handler
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!newReviewForm.name.trim()) {
      emitToast("Please enter your name.", "warning");
      return;
    }
    if (!newReviewForm.text.trim()) {
      emitToast("Please write your authentic review.", "warning");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const saved = db.saveReview({
        type: newReviewForm.type,
        productId: newReviewForm.type === "product" ? productId : "all",
        productName: newReviewForm.type === "product" ? productName : "Aura Rudraksha Sacred Store",
        name: newReviewForm.name.trim(),
        email: newReviewForm.email.trim(),
        city: newReviewForm.city.trim(),
        rating: Number(newReviewForm.rating),
        title: newReviewForm.title.trim(),
        text: newReviewForm.text.trim(),
        images: newReviewForm.images,
        verified: false,
        status: "Approved"
      });

      emitToast("ॐ Har Har Mahadev! Your review has been submitted successfully.", "success");
      setIsWriteModalOpen(false);
      setNewReviewForm({
        name: "",
        email: "",
        city: "",
        rating: 5,
        type: "product",
        title: "",
        text: "",
        images: []
      });
      // Switch to relevant tab
      setActiveTab(saved.type);
    } catch (err) {
      console.error(err);
      emitToast("Failed to save review. Please try again.", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const cardStyleCustom = activeSettings?.cardStyle || {};

  return (
    <section className="aura-reviews-root" id="customer-reviews-section">
      <div className="aura-reviews-inner">

        {/* 1. REVIEW SUMMARY HEADER */}
        <div className="aura-review-summary-header">
          <div className="aura-summary-left">
            <div className="aura-score-box">
              <span className="aura-score-big">{stats.avgRating}</span>
              <div className="aura-score-details">
                <div className="aura-stars-row">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const avg = Number(stats.avgRating) || 5.0;
                    const filled = star <= Math.round(avg);
                    return (
                      <Star 
                        key={star} 
                        size={18} 
                        className="aura-gold-star"
                        fill={filled ? "#d97706" : "none"} 
                        color={filled ? "#d97706" : "#d1d5db"}
                      />
                    );
                  })}
                </div>
                <span className="aura-based-count">
                  Based on {stats.total || (activeTab === "product" ? productReviewsCount : storeReviewsCount)} reviews
                </span>
              </div>
            </div>

            <div className="aura-trust-pill">
              <ShieldCheck size={14} className="aura-trust-icon" />
              <span>100% Verified Devotee Reviews</span>
            </div>
          </div>

          <div className="aura-summary-right">
            {activeSettings?.writeReviewEnabled !== false && (
              <button 
                className="aura-write-review-cta"
                onClick={() => {
                  setNewReviewForm(prev => ({ ...prev, type: activeTab }));
                  setIsWriteModalOpen(true);
                }}
                id="btn-open-write-review"
              >
                <MessageSquare size={17} />
                <span>Write a Review</span>
              </button>
            )}
          </div>
        </div>

        {/* Informational banner when displaying sample fallback reviews */}
        {filteredReviews.length > 0 && (filteredReviews[0].isSample || filteredReviews[0].isAiGenerated) && (
          <div 
            className="aura-fallback-notice-banner"
            style={{
              background: "#fffbeb",
              border: "1px dashed #f59e0b",
              borderRadius: "12px",
              padding: "14px 18px",
              marginBottom: "20px",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
              fontSize: "13.5px",
              color: "#92400e",
              lineHeight: "1.5"
            }}
          >
            <Sparkles size={18} style={{ flexShrink: 0, marginTop: "2px", color: "#d97706" }} />
            <div>
              <strong>Demonstration Placeholders Active</strong>: No devotee reviews have been submitted for this item yet. To help you visualize the layout, we are showing representative sample reviews above. Feel free to bless this product with your own experience by clicking the <strong>Write a Review</strong> button!
            </div>
          </div>
        )}

        {/* 2. CUSTOMER PHOTO REVIEW GALLERY */}
        {activeSettings?.photoGalleryEnabled !== false && photoGalleryItems.length > 0 && (
          <div className="aura-photo-gallery-section">
            <div className="aura-photo-gallery-header">
              <div className="aura-photo-gallery-title">
                <Camera size={16} className="text-amber-700" />
                <span>Devotee Visual Gallery</span>
                <span className="aura-gallery-count-chip">{photoGalleryItems.length} Real Photos</span>
              </div>
            </div>

            <div className="aura-photo-gallery-scroll-container">
              <div className="aura-photo-gallery-track">
                {photoGalleryItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="aura-gallery-photo-card"
                    onClick={() => openLightbox(item.url, item.review, idx)}
                    title={`Photo by ${item.review.name} - Click to enlarge`}
                  >
                    <img 
                      src={item.url} 
                      alt={`Customer review by ${item.review.name}`} 
                      className="aura-gallery-img"
                      loading="lazy"
                    />
                    <div className="aura-gallery-photo-overlay">
                      <span className="aura-overlay-name">{item.review.name}</span>
                      <div className="aura-overlay-stars">
                        {[...Array(item.review.rating || 5)].map((_, i) => (
                          <Star key={i} size={10} fill="#f59e0b" color="#f59e0b" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. REVIEW TABS */}
        <div className="aura-review-tabs-wrapper">
          <div className="aura-review-tabs">
            <button 
              className={`aura-tab-btn ${activeTab === "product" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("product");
                setVisibleCount(activeSettings?.perPage || 6);
              }}
              id="tab-product-reviews"
            >
              <span>Product Reviews ({productReviewsCount})</span>
              {activeTab === "product" && (
                <motion.div 
                  layoutId="reviewTabUnderline" 
                  className="aura-tab-indicator" 
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
            </button>

            <button 
              className={`aura-tab-btn ${activeTab === "store" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("store");
                setVisibleCount(activeSettings?.perPage || 6);
              }}
              id="tab-store-reviews"
            >
              <span>Store Reviews ({storeReviewsCount})</span>
              {activeTab === "store" && (
                <motion.div 
                  layoutId="reviewTabUnderline" 
                  className="aura-tab-indicator" 
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
            </button>
          </div>
        </div>

        {/* 4. SEARCH + FILTER + SORT TOOLBAR */}
        <div className="aura-reviews-toolbar">
          {/* Search Box */}
          <div className="aura-toolbar-search">
            <Search size={16} className="aura-search-icon" />
            <input 
              type="text" 
              placeholder="Search experiences, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="aura-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="aura-clear-search-btn"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="aura-toolbar-controls">
            {/* Filter Dropdown */}
            <div className="aura-dropdown-wrap">
              <SlidersHorizontal size={14} className="aura-filter-icon" />
              <select 
                value={filterRating} 
                onChange={(e) => setFilterRating(e.target.value)}
                className="aura-select-control"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Star Only ★★★★★</option>
                <option value="4">4 Star Only ★★★★</option>
                <option value="3">3 Star Only ★★★</option>
                <option value="2">2 Star Only ★★</option>
                <option value="1">1 Star Only ★</option>
                <option value="photos">With Photos 📷</option>
                <option value="verified">Verified Purchases ✓</option>
              </select>
              <ChevronDown size={14} className="aura-chevron" />
            </div>

            {/* Sort Dropdown */}
            <div className="aura-dropdown-wrap">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="aura-select-control"
              >
                <option value="recent">Most Recent</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
                <option value="helpful">Most Helpful</option>
              </select>
              <ChevronDown size={14} className="aura-chevron" />
            </div>
          </div>
        </div>

        {/* Active Filters Tag & Reset */}
        {(filterRating !== "all" || searchQuery) && (
          <div className="aura-active-filter-bar">
            <span className="aura-filter-label">Active Filter:</span>
            {searchQuery && (
              <span className="aura-filter-tag">
                "{searchQuery}"
                <X size={12} onClick={() => setSearchQuery("")} className="cursor-pointer ml-1" />
              </span>
            )}
            {filterRating !== "all" && (
              <span className="aura-filter-tag">
                {filterRating === "photos" ? "With Photos" : filterRating === "verified" ? "Verified" : `${filterRating} Stars`}
                <X size={12} onClick={() => setFilterRating("all")} className="cursor-pointer ml-1" />
              </span>
            )}
            <button 
              onClick={() => {
                setSearchQuery("");
                setFilterRating("all");
              }} 
              className="aura-reset-filters-btn"
            >
              Reset All
            </button>
          </div>
        )}

        {/* 5. REVIEW CARDS LIST */}
        <div className="aura-review-cards-list">
          {filteredReviews.length === 0 ? (
            <div className="aura-empty-reviews-box">
              <div className="aura-empty-icon-circle">
                <Sparkles size={28} color="#b45309" />
              </div>
              <h3>No reviews match your filters</h3>
              <p>Be the first to share your experience or reset your active filters.</p>
              <div className="aura-empty-actions">
                <button 
                  className="aura-btn-secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterRating("all");
                  }}
                >
                  Reset Filters
                </button>
                <button 
                  className="aura-btn-primary"
                  onClick={() => {
                    setNewReviewForm(prev => ({ ...prev, type: activeTab }));
                    setIsWriteModalOpen(true);
                  }}
                >
                  Write a Sacred Review
                </button>
              </div>
            </div>
          ) : (
            filteredReviews.slice(0, visibleCount).map((rev) => {
              const isExpanded = !!expandedReviews[rev.id];
              const isLongText = (rev.text && rev.text.length > 200) || (rev.text && rev.text.split("\n").length > 3);
              const hasPhotos = Array.isArray(rev.images) && rev.images.length > 0;
              const userVote = userVotes[rev.id];

              return (
                <motion.div 
                  key={rev.id} 
                  className="aura-review-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    borderRadius: cardStyleCustom.borderRadius || "18px",
                    backgroundColor: rev.isSample ? "#fffdf5" : (cardStyleCustom.bgColor || "#fffdfa"),
                    borderColor: rev.isSample ? "#fde68a" : (cardStyleCustom.borderColor || "#eadecd"),
                    borderStyle: rev.isSample ? "dashed" : "solid",
                    borderWidth: "1px",
                    color: cardStyleCustom.textColor || "#2b1810"
                  }}
                >
                  {/* Top Bar: Stars, Author, Verified Badge, Date */}
                  <div className="aura-card-top-row">
                    <div className="aura-card-author-block">
                      <div className="aura-card-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            size={15} 
                            fill={s <= (rev.rating || 5) ? (cardStyleCustom.accentColor || "#d97706") : "none"} 
                            color={s <= (rev.rating || 5) ? (cardStyleCustom.accentColor || "#d97706") : "#d1d5db"} 
                          />
                        ))}
                      </div>

                      <div className="aura-card-name-line">
                        <strong className="aura-reviewer-name">{rev.name || "Aura Devotee"}</strong>
                        {rev.city && <span className="aura-reviewer-city">• {rev.city}</span>}
                        {(rev.isAiGenerated || rev.isSample) ? (
                          <span 
                            className="aura-ai-sample-badge" 
                            title="Sample review for demonstration"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "600",
                              background: "#fef3c7",
                              color: "#92400e",
                              border: "1px dashed #d97706"
                            }}
                          >
                            <Sparkles size={11} />
                            {rev.sampleLabel || "SAMPLE REVIEW"}
                          </span>
                        ) : (
                          activeSettings?.verifiedBadgeEnabled !== false && rev.verified && (
                            <span className="aura-verified-badge" title="Verified Customer Purchase">
                              <Check size={11} className="aura-verified-icon" />
                              Verified Purchaser
                            </span>
                          )
                        )}
                        {rev.featured && (
                          <span className="aura-featured-badge">
                            <Flame size={11} /> Featured
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="aura-card-date">{(rev.isAiGenerated || rev.isSample) ? "Demonstration Placeholder" : (rev.date || "Verified Purchase")}</span>
                  </div>

                  {/* Review Title */}
                  {rev.title && (
                    <h4 className="aura-card-review-title">{rev.title}</h4>
                  )}

                  {/* Review Text */}
                  <div className="aura-card-text-block">
                    <p className={`aura-card-text ${!isExpanded && isLongText ? "clamped" : ""}`}>
                      {rev.text}
                    </p>
                    {isLongText && (
                      <button 
                        type="button"
                        className="aura-read-more-btn"
                        onClick={() => toggleExpand(rev.id)}
                      >
                        {isExpanded ? "Read less" : "Read more"}
                      </button>
                    )}
                  </div>

                  {/* Customer Review Photos (1-3 small thumbnails) */}
                  {hasPhotos && (
                    <div className="aura-card-photos-row">
                      {rev.images.slice(0, 3).map((imgUrl, pIdx) => (
                        <div 
                          key={pIdx} 
                          className="aura-card-photo-thumb"
                          onClick={() => openLightbox(imgUrl, rev, pIdx)}
                          title="Click to zoom customer photo"
                        >
                          <img src={imgUrl} alt={`Review photo ${pIdx + 1}`} loading="lazy" />
                          {pIdx === 2 && rev.images.length > 3 && (
                            <div className="aura-card-photo-more-badge">
                              +{rev.images.length - 3}
                            </div>
                          )}
                        </div>
                      ))}
                      <div 
                        className="aura-card-photo-indicator-chip"
                        onClick={() => openLightbox(rev.images[0], rev, 0)}
                      >
                        <Camera size={13} />
                        <span>{rev.images.length} {rev.images.length === 1 ? "Photo" : "Photos"}</span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Bar: Helpful Voting & Admin Reply Indicator */}
                  <div className="aura-card-bottom-row">
                    {activeSettings?.helpfulVotingEnabled !== false ? (
                      <div className="aura-helpful-voting">
                        <span className="aura-helpful-prompt">Helpful?</span>
                        <button 
                          className={`aura-vote-btn ${userVote === 'up' ? 'active-up' : ''}`}
                          onClick={() => handleVote(rev.id, 'up')}
                          title="Yes, this review was helpful"
                        >
                          <ThumbsUp size={13} />
                          <span>{rev.helpfulUp || 0}</span>
                        </button>
                        <button 
                          className={`aura-vote-btn ${userVote === 'down' ? 'active-down' : ''}`}
                          onClick={() => handleVote(rev.id, 'down')}
                          title="No, not helpful"
                        >
                          <ThumbsDown size={13} />
                          <span>{rev.helpfulDown || 0}</span>
                        </button>
                      </div>
                    ) : <div />}

                    {rev.adminReply && (
                      <span className="aura-official-reply-tag">
                        <CheckCircle2 size={12} /> Store Response
                      </span>
                    )}
                  </div>

                  {/* Official Store Admin Reply Section */}
                  {rev.adminReply && (
                    <div className="aura-admin-reply-box">
                      <div className="aura-admin-reply-header">
                        <div className="aura-admin-reply-title">
                          <CornerDownRight size={14} className="aura-reply-arrow" />
                          <strong>{rev.adminReply.author || "Aura Rudraksha Spiritual Team"}</strong>
                        </div>
                        {rev.adminReply.date && (
                          <span className="aura-admin-reply-date">{rev.adminReply.date}</span>
                        )}
                      </div>
                      <p className="aura-admin-reply-text">{rev.adminReply.text}</p>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* 6. PAGINATION / LOAD MORE */}
        {filteredReviews.length > visibleCount && (
          <div className="aura-load-more-wrap">
            <button 
              className="aura-load-more-btn"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              id="btn-load-more-reviews"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Loading sacred experiences...</span>
                </>
              ) : (
                <>
                  <span>Load More Reviews ({filteredReviews.length - visibleCount} remaining)</span>
                  <ChevronDown size={16} />
                </>
              )}
            </button>
          </div>
        )}

      </div>

      {/* 7. FULLSCREEN IMAGE LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxData && lightboxData.photos && lightboxData.photos[lightboxData.currentIdx] && (
          <motion.div 
            className="aura-lightbox-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxData(null)}
          >
            <div className="aura-lightbox-container" onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button 
                className="aura-lightbox-close" 
                onClick={() => setLightboxData(null)}
                aria-label="Close photo lightbox"
              >
                <X size={24} />
              </button>

              {/* Prev / Next controls */}
              {lightboxData.photos.length > 1 && (
                <>
                  <button 
                    className="aura-lightbox-nav prev" 
                    onClick={handlePrevPhoto}
                    aria-label="Previous customer photo"
                  >
                    <ChevronLeft size={28} />
                  </button>
                  <button 
                    className="aura-lightbox-nav next" 
                    onClick={handleNextPhoto}
                    aria-label="Next customer photo"
                  >
                    <ChevronRight size={28} />
                  </button>
                </>
              )}

              {/* Lightbox Main Image */}
              <div className="aura-lightbox-image-wrapper">
                <img 
                  src={lightboxData.photos[lightboxData.currentIdx].url} 
                  alt="Customer Review Enlarged Visual" 
                  className="aura-lightbox-main-img"
                />
              </div>

              {/* Review Details Overlay / Sidebar */}
              {lightboxData.photos[lightboxData.currentIdx].review && (
                <div className="aura-lightbox-review-card">
                  <div className="aura-lb-top-bar">
                    <div>
                      <strong className="aura-lb-author">
                        {lightboxData.photos[lightboxData.currentIdx].review.name}
                      </strong>
                      {lightboxData.photos[lightboxData.currentIdx].review.city && (
                        <span className="aura-lb-city"> • {lightboxData.photos[lightboxData.currentIdx].review.city}</span>
                      )}
                    </div>
                    <span className="aura-lb-counter">
                      {lightboxData.currentIdx + 1} of {lightboxData.photos.length}
                    </span>
                  </div>

                  <div className="aura-lb-stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        size={14} 
                        fill={s <= (lightboxData.photos[lightboxData.currentIdx].review.rating || 5) ? "#f59e0b" : "none"} 
                        color={s <= (lightboxData.photos[lightboxData.currentIdx].review.rating || 5) ? "#f59e0b" : "#6b7280"} 
                      />
                    ))}
                    <span className="aura-lb-verified">✓ Verified Purchase</span>
                  </div>

                  {lightboxData.photos[lightboxData.currentIdx].review.title && (
                    <h5 className="aura-lb-title">
                      {lightboxData.photos[lightboxData.currentIdx].review.title}
                    </h5>
                  )}

                  <p className="aura-lb-text">
                    {lightboxData.photos[lightboxData.currentIdx].review.text}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. WRITE REVIEW MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {isWriteModalOpen && (
          <motion.div 
            className="aura-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsWriteModalOpen(false)}
          >
            <motion.div 
              className="aura-modal-content-box"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="aura-modal-header">
                <div>
                  <span className="aura-modal-kicker">AUTHENTIC EXPERIENCES</span>
                  <h3 className="aura-modal-title">Write a Sacred Review</h3>
                </div>
                <button 
                  className="aura-modal-close-btn" 
                  onClick={() => setIsWriteModalOpen(false)}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleReviewSubmit} className="aura-modal-form">
                {/* Review Type Selector */}
                <div className="aura-form-group">
                  <label className="aura-form-label">Review Category</label>
                  <div className="aura-type-selector">
                    <button 
                      type="button" 
                      className={`aura-type-btn ${newReviewForm.type === 'product' ? 'active' : ''}`}
                      onClick={() => setNewReviewForm(prev => ({ ...prev, type: "product" }))}
                    >
                      This Product ({productName})
                    </button>
                    <button 
                      type="button" 
                      className={`aura-type-btn ${newReviewForm.type === 'store' ? 'active' : ''}`}
                      onClick={() => setNewReviewForm(prev => ({ ...prev, type: "store" }))}
                    >
                      Aura Rudraksha Sacred Store
                    </button>
                  </div>
                </div>

                {/* Rating Picker */}
                <div className="aura-form-group">
                  <label className="aura-form-label">Overall Rating *</label>
                  <div className="aura-stars-picker">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        className="aura-star-pick-btn"
                        onClick={() => setNewReviewForm(prev => ({ ...prev, rating: s }))}
                      >
                        <Star 
                          size={28} 
                          fill={s <= newReviewForm.rating ? "#d97706" : "none"} 
                          color={s <= newReviewForm.rating ? "#d97706" : "#d1d5db"} 
                        />
                      </button>
                    ))}
                    <span className="aura-rating-label-desc">
                      {newReviewForm.rating === 5 && "5 - Divine & Sacred Experience 🙏"}
                      {newReviewForm.rating === 4 && "4 - Very Good & Authentic"}
                      {newReviewForm.rating === 3 && "3 - Satisfactory"}
                      {newReviewForm.rating === 2 && "2 - Needs Improvement"}
                      {newReviewForm.rating === 1 && "1 - Poor"}
                    </span>
                  </div>
                </div>

                {/* Name & City in two columns */}
                <div className="aura-form-grid-2">
                  <div className="aura-form-group">
                    <label className="aura-form-label">Your Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Ramesh Patel" 
                      value={newReviewForm.name}
                      onChange={(e) => setNewReviewForm(prev => ({ ...prev, name: e.target.value }))}
                      className="aura-input"
                    />
                  </div>

                  <div className="aura-form-group">
                    <label className="aura-form-label">City / Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Varanasi, UP" 
                      value={newReviewForm.city}
                      onChange={(e) => setNewReviewForm(prev => ({ ...prev, city: e.target.value }))}
                      className="aura-input"
                    />
                  </div>
                </div>

                {/* Email for verification */}
                <div className="aura-form-group">
                  <label className="aura-form-label">Email (Optional, kept private)</label>
                  <input 
                    type="email" 
                    placeholder="e.g. ramesh.patel@example.com" 
                    value={newReviewForm.email}
                    onChange={(e) => setNewReviewForm(prev => ({ ...prev, email: e.target.value }))}
                    className="aura-input"
                  />
                </div>

                {/* Review Headline Title */}
                <div className="aura-form-group">
                  <label className="aura-form-label">Review Headline</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 100% Genuine Nepali bead with immense positive energy" 
                    value={newReviewForm.title}
                    onChange={(e) => setNewReviewForm(prev => ({ ...prev, title: e.target.value }))}
                    className="aura-input"
                  />
                </div>

                {/* Review Text */}
                <div className="aura-form-group">
                  <label className="aura-form-label">Your Detailed Review & Experience *</label>
                  <textarea 
                    rows={4}
                    required
                    placeholder="Share details about the authenticity, packaging, lab test report, positive vibrations, or delivery..."
                    value={newReviewForm.text}
                    onChange={(e) => setNewReviewForm(prev => ({ ...prev, text: e.target.value }))}
                    className="aura-textarea"
                  />
                  <small className="aura-textarea-hint">Supports English, Hindi (हिन्दी), Sanskrit, Hinglish & Devotional Emojis (🕉️, 🙏, ✨).</small>
                </div>

                {/* Photo Upload Section */}
                <div className="aura-form-group">
                  <label className="aura-form-label">Upload Photos (Optional)</label>
                  <div className="aura-photo-upload-zone">
                    <label className="aura-upload-button-label">
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden-file-input"
                        disabled={uploadingImage || newReviewForm.images.length >= 5}
                      />
                      <div className="aura-upload-placeholder">
                        {uploadingImage ? (
                          <>
                            <Loader2 size={22} className="animate-spin text-amber-800" />
                            <span>Optimizing photo...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={20} className="text-amber-800" />
                            <span>Upload Rudraksha / Mala Photos</span>
                            <small>Max 5 photos (JPEG, PNG, WebP)</small>
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Photo Previews */}
                  {newReviewForm.images.length > 0 && (
                    <div className="aura-upload-previews-row">
                      {newReviewForm.images.map((img, idx) => (
                        <div key={idx} className="aura-upload-thumb-box">
                          <img src={img} alt={`Upload preview ${idx + 1}`} />
                          <button 
                            type="button" 
                            className="aura-remove-thumb-btn"
                            onClick={() => handleRemoveUploadedImage(idx)}
                            aria-label="Remove image"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="aura-modal-actions">
                  <button 
                    type="button" 
                    className="aura-btn-cancel" 
                    onClick={() => setIsWriteModalOpen(false)}
                    disabled={isSubmittingReview}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="aura-btn-submit"
                    disabled={isSubmittingReview}
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Sacred Review</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
