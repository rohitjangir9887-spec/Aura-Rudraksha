import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { uploadMedia } from "../../lib/imageUtils";
import { ConfirmModal } from "../../components/ConfirmModal";
import { emitToast } from "../../context/ToastContext";
import { ProductReviews } from "../../components/ProductReviews";
import { 
  Star, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Eye, 
  EyeOff, 
  CornerDownRight, 
  MessageSquare, 
  ShieldCheck, 
  Camera, 
  Sparkles, 
  Flame, 
  ThumbsUp, 
  Upload, 
  X, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Save, 
  RefreshCw, 
  ExternalLink,
  Layers,
  Settings,
  Check,
  AlertCircle,
  FileText,
  UserCheck,
  Shuffle,
  MapPin,
  Copy
} from "lucide-react";
import "./admin-pages.css";

const INDIAN_DEVOTEE_NAMES = [
  "Rahul Sharma", "Amit Patel", "Pooja Verma", "Deepak Joshi",
  "Suresh Kumar", "Vikram Rathore", "Priya Nair", "Rajesh Gupta",
  "Anjali Deshmukh", "Manoj Tiwari", "Sunil Choudhary", "Ritu Agrawal",
  "Sanjay Kulkarni", "Neha Bhatt", "Ashok Pandey", "Kavita Reddy",
  "Gaurav Mishra", "Swati Saxena", "Alok Sengupta", "Shweta Iyengar",
  "Manish Malhotra", "Divya Pillai", "Rohit Jangir", "Kunal Singhania",
  "Vandana Tripathi", "Abhishek Dubey", "Meenakshi Sundaram", "Harish Rawat"
];

const INDIAN_DEVOTEE_CITIES = [
  "Varanasi, UP", "Haridwar, UK", "Ujjain, MP", "Rishikesh, UK",
  "Jaipur, Rajasthan", "Ahmedabad, Gujarat", "Bengaluru, Karnataka", "Pune, Maharashtra",
  "Indore, MP", "Lucknow, UP", "Mumbai, Maharashtra", "Delhi NCR",
  "Hyderabad, Telangana", "Kolkata, WB", "Chandigarh, Punjab", "Chennai, TN",
  "Ayodhya, UP", "Mathura, UP", "Bhopal, MP", "Coimbatore, TN"
];

// Helper to normalize similarity score strictly to 0-100%
function formatSimilarityScore(score) {
  if (score == null) return 0;
  const num = Number(score);
  if (isNaN(num)) return 0;
  if (num > 0 && num <= 1) return Math.min(100, Math.max(0, Math.round(num * 100)));
  return Math.min(100, Math.max(0, Math.round(num)));
}

export function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(() => db.getReviewSettings());
  const [activeTab, setActiveTab] = useState("all"); // "all" | "product" | "store" | "pending" | "ai_drafts" | "settings"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductFilter, setSelectedProductFilter] = useState("all");
  const [selectedRatingFilter, setSelectedRatingFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState("all"); // "all" | "real_customers" | "ai_samples"

  // AI Review Studio State
  const [aiGenForm, setAiGenForm] = useState({
    productId: "5",
    productName: "5 Mukhi Rudraksha",
    productDescription: "Original 5 Mukhi Himalayan Rudraksha, laboratory certified, pure natural bead with sacred red velvet pouch and safe packaging.",
    keyFeatures: "Clear mukhi lines, authentic lab certificate, solid natural weight, safe packaging",
    ratingRange: "Realistic Mix (3, 4 & 5 Stars)",
    ratingMix: "Mostly Positive", // fallback
    customRatings: { r5: 70, r4: 20, r3: 10, r2: 0, r1: 0 },
    language: "Hinglish",
    languageMix: "Hinglish",
    customLanguages: { english: 40, hindi: 30, hinglish: 30 },
    reviewLength: "Short", // "Short" (1-2 lines) | "Medium" (2-3 lines) | "Long" (3-4 lines)
    tone: "Authentic & Conversational",
    useRAG: true,
    count: 5
  });
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [generationStep, setGenerationStep] = useState(1);
  const [generatedDrafts, setGeneratedDrafts] = useState([]);
  const [genSummary, setGenSummary] = useState(null);
  const [copiedDraftIndex, setCopiedDraftIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editingDraftIndex, setEditingDraftIndex] = useState(null);
  const [draftEditState, setDraftEditState] = useState({ 
    name: "", 
    city: "", 
    title: "", 
    text: "", 
    rating: 5, 
    verified: true,
    date: "" 
  });
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Modals & Actions state
  const [editingReview, setEditingReview] = useState(null);
  const [replyingReview, setReplyingReview] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isNewReviewModalOpen, setIsNewReviewModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Live preview mode
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "tablet" | "mobile"
  const [previewProduct, setPreviewProduct] = useState(null);

  // New review state (Manual customer entry)
  const [newReview, setNewReview] = useState({
    type: "product",
    productId: "5",
    productName: "5 Mukhi Rudraksha",
    name: "",
    email: "",
    city: "",
    rating: 5,
    title: "",
    text: "",
    verified: false,
    featured: false,
    status: "Approved",
    images: []
  });

  const loadData = () => {
    setReviews(db.getAllReviews());
    const prods = db.getProducts();
    setProducts(prods);
    if (prods.length > 0 && !previewProduct) {
      setPreviewProduct(prods[0]);
    }
    setSettings(db.getReviewSettings());
  };

  useEffect(() => {
    loadData();
    const unsub = onStoreUpdate(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  // Filtered reviews in admin
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      // Tab filter
      if (activeTab === "product" && r.type !== "product") return false;
      if (activeTab === "store" && r.type !== "store") return false;
      if (activeTab === "pending" && r.status !== "Pending") return false;

      // Source filter (Real Devotee submissions vs AI sample drafts)
      if (selectedSourceFilter === "real_customers" && (r.source === "ai_draft" || r.isAiGenerated || r.isSample)) return false;
      if (selectedSourceFilter === "ai_samples" && !(r.source === "ai_draft" || r.isAiGenerated || r.isSample)) return false;

      // Status filter
      if (selectedStatusFilter !== "all" && r.status !== selectedStatusFilter) return false;

      // Product filter
      if (selectedProductFilter !== "all" && String(r.productId) !== String(selectedProductFilter)) return false;

      // Rating filter
      if (selectedRatingFilter !== "all" && Number(r.rating) !== Number(selectedRatingFilter)) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.city && r.city.toLowerCase().includes(q)) ||
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.text && r.text.toLowerCase().includes(q)) ||
          (r.productName && r.productName.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [reviews, activeTab, selectedStatusFilter, selectedProductFilter, selectedRatingFilter, selectedSourceFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const activeReviews = reviews.filter(r => r.status !== "deleted" && r.status !== "Rejected");
    const customerRevs = activeReviews.filter(r => r.source !== "ai_draft" && !r.isAiGenerated);
    const total = activeReviews.length;
    const avg = total > 0 ? (activeReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / total).toFixed(1) : "5.0";
    const withPhotos = activeReviews.filter(r => Array.isArray(r.images) && r.images.length > 0).length;
    const verifiedCount = customerRevs.filter(r => r.verified).length;
    const sampleCount = activeReviews.filter(r => r.source === "ai_draft" || r.isAiGenerated || r.isSample).length;
    const pendingCount = reviews.filter(r => r.status === "Pending").length;
    return { total, avg, withPhotos, verifiedCount, sampleCount, pendingCount, customerCount: customerRevs.length };
  }, [reviews]);

  // Status toggle
  const handleToggleStatus = async (id, newStatus) => {
    try {
      await db.updateReview(id, { status: newStatus });
      emitToast(`Review status updated to ${newStatus}`, "success");
    } catch (err) {
      emitToast(err.message || "Failed to update review status", "error");
    }
  };

  // Toggle Featured
  const handleToggleFeatured = async (id, currentVal) => {
    try {
      await db.updateReview(id, { featured: !currentVal });
      emitToast(!currentVal ? "Review marked as Featured" : "Review unfeatured", "success");
    } catch (err) {
      emitToast(err.message || "Failed to update featured status", "error");
    }
  };

  // Delete Review
  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      try {
        await db.deleteReview(deleteTargetId);
        emitToast("Review deleted successfully.", "success");
        setDeleteTargetId(null);
      } catch (err) {
        emitToast(err.message || "Failed to delete review", "error");
      }
    }
  };

  // Reply to Review
  const handleSaveReply = async (e) => {
    e.preventDefault();
    if (!replyingReview) return;
    const replyObj = replyText.trim() ? {
      text: replyText.trim(),
      author: "Aura Rudraksha Spiritual Team",
      date: "Just now"
    } : null;

    try {
      await db.updateReview(replyingReview.id, { adminReply: replyObj });
      emitToast(replyObj ? "Official store reply published!" : "Store reply removed.", "success");
      setReplyingReview(null);
      setReplyText("");
    } catch (err) {
      emitToast(err.message || "Failed to save reply", "error");
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    try {
      await db.saveReviewSettings(settings);
      emitToast("Review display settings saved successfully!", "success");
    } catch (err) {
      emitToast(err.message || "Failed to save review settings", "error");
    }
  };

  // Handle image upload in Edit or Create modal
  const handlePhotoUpload = async (e, isEdit = false) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      emitToast("Uploading review photos to Puter Cloud...", "info");
      const uploadedUrls = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const url = await uploadMedia(file);
        if (url) uploadedUrls.push(url);
      }

      if (isEdit && editingReview) {
        setEditingReview(prev => ({
          ...prev,
          images: [...(prev.images || []), ...uploadedUrls]
        }));
      } else {
        setNewReview(prev => ({
          ...prev,
          images: [...(prev.images || []), ...uploadedUrls]
        }));
      }
      emitToast(`${uploadedUrls.length} photo(s) uploaded successfully to Puter Cloud!`, "success");
    } catch (err) {
      console.error(err);
      emitToast(err.message || "Failed to upload review photos to Puter Cloud.", "error");
    }
  };

  // Save Edit Review
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingReview) return;

    try {
      await db.updateReview(editingReview.id, {
        name: editingReview.name,
        city: editingReview.city,
        rating: Number(editingReview.rating),
        title: editingReview.title,
        text: editingReview.text,
        verified: editingReview.verified,
        featured: editingReview.featured,
        status: editingReview.status,
        type: editingReview.type,
        productId: editingReview.productId,
        productName: editingReview.productName,
        images: editingReview.images
      });

      emitToast("Review updated successfully!", "success");
      setEditingReview(null);
    } catch (err) {
      emitToast(err.message || "Failed to update review", "error");
    }
  };

  // Helper to format review in exact requested fictional demo format
  const formatDraftAsText = (draft) => {
    const starCount = Number(draft.rating) || 5;
    const stars = "⭐".repeat(Math.max(1, Math.min(5, starCount)));
    return `Name: ${draft.name || "Aman Sharma"}\nRating: ${stars}\nReview: “${draft.text || ""}”`;
  };

  const handleCopySingleDraft = async (draft, index) => {
    const textToCopy = formatDraftAsText(draft);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedDraftIndex(index);
      setTimeout(() => setCopiedDraftIndex(null), 2500);
      emitToast(`Copied review for ${draft.name || 'reviewer'} to clipboard!`, "success");
    } catch (err) {
      emitToast("Unable to copy to clipboard", "error");
    }
  };

  const handleCopyAllDrafts = async () => {
    if (!generatedDrafts || generatedDrafts.length === 0) return;
    const allFormatted = generatedDrafts.map(d => formatDraftAsText(d)).join("\n\n");
    try {
      await navigator.clipboard.writeText(allFormatted);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
      emitToast(`Copied all ${generatedDrafts.length} reviews to clipboard!`, "success");
    } catch (err) {
      emitToast("Unable to copy to clipboard", "error");
    }
  };

  // AI Draft Generator Handlers
  const handleGenerateAiDrafts = async (e) => {
    e?.preventDefault();
    setIsGeneratingDrafts(true);
    setGenerationStep(1);

    const stepTimer = setInterval(() => {
      setGenerationStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 800);

    try {
      const selProd = products.find(p => String(p.id) === String(aiGenForm.productId));
      const res = await db.generateReviewDrafts({
        ...aiGenForm,
        productName: aiGenForm.productName?.trim() || selProd?.name || (aiGenForm.productId === "all" ? "Rudraksha Sacred Store" : "5 Mukhi Rudraksha")
      });
      clearInterval(stepTimer);
      if (res?.success && Array.isArray(res.data)) {
        setGeneratedDrafts(res.data);
        setGenSummary(res.summary || null);
        emitToast(`Generated ${res.data.length} natural review(s)!`, "success");
      } else {
        throw new Error(res?.message || "Failed to generate drafts.");
      }
    } catch (err) {
      clearInterval(stepTimer);
      console.error("AI Review Generation Error:", err);
      emitToast(err.message || "Failed to generate review drafts.", "error");
    } finally {
      setIsGeneratingDrafts(false);
    }
  };

  const handleRegenerateSingleDraft = async (index) => {
    try {
      const selProd = products.find(p => String(p.id) === String(aiGenForm.productId));
      const res = await db.generateReviewDrafts({
        ...aiGenForm,
        count: 1,
        productName: aiGenForm.productName?.trim() || selProd?.name || (aiGenForm.productId === "all" ? "Rudraksha Sacred Store" : "5 Mukhi Rudraksha")
      });
      if (res?.success && res.data?.[0]) {
        const newDraft = res.data[0];
        setGeneratedDrafts(prev => {
          const next = [...prev];
          next[index] = newDraft;
          return next;
        });
        emitToast(`Regenerated review #${index + 1} with fresh natural phrasing.`, "success");
      }
    } catch (err) {
      emitToast("Could not regenerate draft.", "error");
    }
  };

  const handleShuffleDevotee = (index) => {
    setGeneratedDrafts(prev => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const randomName = INDIAN_DEVOTEE_NAMES[Math.floor(Math.random() * INDIAN_DEVOTEE_NAMES.length)];
      const randomCity = INDIAN_DEVOTEE_CITIES[Math.floor(Math.random() * INDIAN_DEVOTEE_CITIES.length)];
      next[index] = {
        ...current,
        name: randomName,
        city: randomCity
      };
      return next;
    });
    emitToast(`Updated devotee persona for draft #${index + 1}.`, "info");
  };

  const handlePublishSingleReview = async (draft, index) => {
    try {
      const selProd = products.find(p => String(p.id) === String(draft.productId || aiGenForm.productId));
      const payload = {
        ...draft,
        productName: draft.productName || selProd?.name || "Rudraksha Bead",
        name: draft.name || INDIAN_DEVOTEE_NAMES[index % INDIAN_DEVOTEE_NAMES.length],
        city: draft.city || INDIAN_DEVOTEE_CITIES[index % INDIAN_DEVOTEE_CITIES.length],
        rating: Number(draft.rating) || 5,
        isAiGenerated: false,
        isSample: false,
        sampleLabel: "",
        verified: draft.verified !== false,
        source: "customer",
        status: "Approved"
      };

      await db.saveReview(payload);
      emitToast(`Published authentic devotee review by ${payload.name} (${payload.city})!`, "success");
      setGeneratedDrafts(prev => prev.filter((_, idx) => idx !== index));
    } catch (err) {
      emitToast("Failed to publish review: " + (err.message || ""), "error");
    }
  };

  const handleSaveSingleAsDraft = async (draft, index) => {
    try {
      const selProd = products.find(p => String(p.id) === String(draft.productId || aiGenForm.productId));
      const payload = {
        ...draft,
        productName: draft.productName || selProd?.name || "Rudraksha Bead",
        name: draft.name || "AI DRAFT",
        city: draft.city || "Aura Sacred Studio",
        isAiGenerated: true,
        isSample: true,
        sampleLabel: "Not a customer review",
        verified: false,
        source: "ai_draft",
        status: "draft"
      };

      await db.saveReview(payload);
      emitToast(`Saved draft #${index + 1} as internal AI Draft!`, "success");
      setGeneratedDrafts(prev => prev.filter((_, idx) => idx !== index));
    } catch (err) {
      emitToast("Failed to save review draft: " + (err.message || ""), "error");
    }
  };

  const handleBulkPublishAllReviews = async (allowDuplicates = false) => {
    if (!generatedDrafts.length) return;
    setIsBulkSaving(true);
    try {
      const validDrafts = allowDuplicates 
        ? generatedDrafts 
        : generatedDrafts.filter(d => d.similarityStatus !== "Duplicate");

      if (!validDrafts.length) {
        emitToast("No non-duplicate drafts to publish. Please regenerate duplicates first.", "warning");
        return;
      }

      const formattedReviews = validDrafts.map((d, i) => ({
        ...d,
        name: d.name || INDIAN_DEVOTEE_NAMES[i % INDIAN_DEVOTEE_NAMES.length],
        city: d.city || INDIAN_DEVOTEE_CITIES[i % INDIAN_DEVOTEE_CITIES.length],
        rating: Number(d.rating) || 5,
        isAiGenerated: false,
        isSample: false,
        sampleLabel: "",
        verified: d.verified !== false,
        source: "customer",
        status: "Approved"
      }));

      const res = await db.bulkSaveReviews(formattedReviews, allowDuplicates);
      if (res?.success) {
        emitToast(`Published ${res.savedCount || formattedReviews.length} authentic devotee review(s) live!`, "success");
        if (res.skippedCount > 0) {
          emitToast(`Skipped ${res.skippedCount} duplicate draft(s).`, "info");
        }
        setGeneratedDrafts(prev => prev.filter(d => !validDrafts.some(v => v.id === d.id)));
      }
    } catch (err) {
      emitToast("Failed to publish reviews: " + err.message, "error");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleBulkSaveAllDrafts = async (allowDuplicates = false) => {
    if (!generatedDrafts.length) return;
    setIsBulkSaving(true);
    try {
      const validDrafts = allowDuplicates 
        ? generatedDrafts 
        : generatedDrafts.filter(d => d.similarityStatus !== "Duplicate");

      if (!validDrafts.length) {
        emitToast("No non-duplicate drafts to save. Please regenerate duplicates first.", "warning");
        return;
      }

      const formattedDrafts = validDrafts.map(d => ({
        ...d,
        name: "AI DRAFT",
        isAiGenerated: true,
        isSample: true,
        sampleLabel: "Not a customer review",
        verified: false,
        source: "ai_draft",
        status: "draft"
      }));

      const res = await db.bulkSaveReviews(formattedDrafts, allowDuplicates);
      if (res?.success) {
        emitToast(`Saved ${res.savedCount || formattedDrafts.length} AI Draft(s) to database!`, "success");
        if (res.skippedCount > 0) {
          emitToast(`Skipped ${res.skippedCount} duplicate draft(s).`, "info");
        }
        setGeneratedDrafts(prev => prev.filter(d => !validDrafts.some(v => v.id === d.id)));
      }
    } catch (err) {
      emitToast("Failed to bulk save drafts: " + err.message, "error");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleDiscardDraft = (index) => {
    setGeneratedDrafts(prev => prev.filter((_, idx) => idx !== index));
    emitToast("Draft discarded.", "info");
  };

  const handleStartEditDraft = (index) => {
    const draft = generatedDrafts[index];
    if (!draft) return;
    setEditingDraftIndex(index);
    setDraftEditState({
      name: draft.name || INDIAN_DEVOTEE_NAMES[index % INDIAN_DEVOTEE_NAMES.length],
      city: draft.city || INDIAN_DEVOTEE_CITIES[index % INDIAN_DEVOTEE_CITIES.length],
      title: draft.title || "",
      text: draft.text || "",
      rating: draft.rating || 5,
      verified: draft.verified !== false,
      date: draft.date || "2 days ago"
    });
  };

  const handleSaveDraftEdit = (index) => {
    setGeneratedDrafts(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          name: draftEditState.name.trim() || INDIAN_DEVOTEE_NAMES[index % INDIAN_DEVOTEE_NAMES.length],
          city: draftEditState.city.trim() || INDIAN_DEVOTEE_CITIES[index % INDIAN_DEVOTEE_CITIES.length],
          title: draftEditState.title,
          text: draftEditState.text,
          rating: Number(draftEditState.rating) || 5,
          verified: draftEditState.verified,
          date: draftEditState.date,
          similarityStatus: "Unique",
          similarityScore: 0
        };
      }
      return next;
    });
    setEditingDraftIndex(null);
    emitToast("Draft edits applied!", "success");
  };

  // Save New Customer Review
  const handleCreateNewReview = async (e) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.text.trim()) {
      emitToast("Customer name and review text are required.", "warning");
      return;
    }

    const selProd = products.find(p => String(p.id) === String(newReview.productId));
    try {
      await db.saveReview({
        ...newReview,
        productName: newReview.type === "product" ? (selProd?.name || "Rudraksha Bead") : "Aura Rudraksha Sacred Store",
        rating: Number(newReview.rating),
        source: "customer"
      });

      emitToast("Customer review added!", "success");
      setIsNewReviewModalOpen(false);
      setNewReview({
        type: "product",
        productId: "5",
        productName: "5 Mukhi Rudraksha",
        name: "",
        email: "",
        city: "",
        rating: 5,
        title: "",
        text: "",
        verified: false,
        featured: false,
        status: "Approved",
        images: []
      });
    } catch (err) {
      emitToast(err.message || "Failed to save review to database", "error");
    }
  };

  return (
    <AdminLayout title="Reviews & Ratings Management">
      {/* Top Header & Quick Actions */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reviews & Devotee Testimonials</h1>
          <p className="admin-page-subtitle">
            Manage genuine customer reviews, moderate pending ratings, and curate editorial AI review drafts.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button 
            type="button"
            className="admin-btn secondary"
            onClick={() => setShowLivePreview(!showLivePreview)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Eye size={16} />
            <span>{showLivePreview ? "Hide Store Preview" : "Preview Store Experience"}</span>
          </button>

          <button 
            type="button"
            className="admin-btn"
            onClick={() => setIsNewReviewModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} />
            <span>Add Customer Review</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="admin-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "20px" }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-icon gold">
            <Star size={20} />
          </div>
          <div>
            <span className="admin-kpi-label">Average Store Rating</span>
            <strong className="admin-kpi-val">{stats.avg} ★</strong>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-icon terracotta">
            <MessageSquare size={20} />
          </div>
          <div>
            <span className="admin-kpi-label">Total Reviews</span>
            <strong className="admin-kpi-val">{stats.total}</strong>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-icon green">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="admin-kpi-label">Verified Devotees</span>
            <strong className="admin-kpi-val">{stats.verifiedCount}</strong>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-icon gold" style={{ background: "#fef3c7", color: "#d97706" }}>
            <Sparkles size={20} />
          </div>
          <div>
            <span className="admin-kpi-label">AI Drafts (Internal)</span>
            <strong className="admin-kpi-val">{stats.sampleCount}</strong>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-icon purple">
            <Camera size={20} />
          </div>
          <div>
            <span className="admin-kpi-label">Photo Reviews</span>
            <strong className="admin-kpi-val">{stats.withPhotos}</strong>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="admin-tabs-bar" style={{ display: "flex", gap: "8px", margin: "20px 0 16px", borderBottom: "1px solid #e8e0d8", paddingBottom: "8px", flexWrap: "wrap" }}>
        <button 
          className={`admin-tab-item ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Reviews ({reviews.length})
        </button>
        <button 
          className={`admin-tab-item ${activeTab === 'product' ? 'active' : ''}`}
          onClick={() => setActiveTab('product')}
        >
          Product Reviews ({reviews.filter(r => r.type === 'product').length})
        </button>
        <button 
          className={`admin-tab-item ${activeTab === 'store' ? 'active' : ''}`}
          onClick={() => setActiveTab('store')}
        >
          Store Reviews ({reviews.filter(r => r.type === 'store').length})
        </button>
        <button 
          className={`admin-tab-item ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approval ({reviews.filter(r => r.status === 'Pending').length})
        </button>
        <button 
          className={`admin-tab-item ${activeTab === 'ai_drafts' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai_drafts')}
          style={{ display: "flex", alignItems: "center", gap: "6px", color: activeTab === 'ai_drafts' ? "#7a320c" : "#b45309", fontWeight: "600" }}
        >
          <Sparkles size={15} color="#d97706" /> AI Review Studio {generatedDrafts.length > 0 && `(${generatedDrafts.length})`}
        </button>
        <button 
          className={`admin-tab-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}
        >
          <Settings size={15} /> Review UI Settings
        </button>
      </div>

      {/* LIVE PREVIEW DRAWER IF OPEN */}
      {showLivePreview && (
        <div className="admin-live-preview-drawer admin-card" style={{ marginBottom: "24px", background: "#fcfaf7", border: "2px solid #c59b27" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #eadecd", paddingBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <strong style={{ color: "#7a320c", fontSize: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={18} /> Storefront Product Reviews Preview
              </strong>
              <div style={{ display: "flex", background: "#f0e6dc", borderRadius: "8px", padding: "3px" }}>
                <button 
                  className={`admin-device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Monitor size={15} /> Desktop
                </button>
                <button 
                  className={`admin-device-btn ${previewDevice === 'tablet' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('tablet')}
                >
                  <Tablet size={15} /> Tablet
                </button>
                <button 
                  className={`admin-device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone size={15} /> Mobile (390px)
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select 
                value={previewProduct?.id || "5"} 
                onChange={(e) => {
                  const p = products.find(prod => String(prod.id) === e.target.value);
                  if (p) setPreviewProduct(p);
                }}
                className="admin-select-sm"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button 
                className="admin-icon-btn" 
                onClick={() => setShowLivePreview(false)}
                title="Close Preview"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className={`admin-preview-frame-container ${previewDevice}`}>
            <div className="admin-preview-canvas">
              <ProductReviews 
                product={previewProduct || products[0] || { id: "5", name: "5 Mukhi Rudraksha" }} 
                isPreview={true}
                previewSettings={settings}
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW: AI DRAFT GENERATOR TAB */}
      {activeTab === 'ai_drafts' ? (
        <div className="admin-ai-drafts-container">
          {/* Generator Controls Card */}
          <div className="admin-card" style={{ background: "linear-gradient(180deg, #fffdf8 0%, #faf6ee 100%)", border: "1.5px solid #eadecd", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #ebdccb", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ color: "#7a320c", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 6px" }}>
                  <Sparkles size={22} color="#d97706" /> AI Review Generator
                </h2>
                <p style={{ color: "#806f62", fontSize: "13px", margin: 0, maxWidth: "680px" }}>
                  Generate short, natural-looking conversational reviews (1–4 short lines) with varied fictional names, realistic 3–5 star ratings, and custom key features.
                </p>
              </div>

              <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#92400e", display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldCheck size={16} />
                <span>Demo & Placeholder Mode • Natural Fictional Reviews</span>
              </div>
            </div>

            <form onSubmit={handleGenerateAiDrafts}>
              {/* Product/Service Selection & Direct Name */}
              <div className="admin-form-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>1. Product / Service Catalog</label>
                  <select 
                    value={aiGenForm.productId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const sel = products.find(p => String(p.id) === String(pid));
                      setAiGenForm(prev => ({
                        ...prev,
                        productId: pid,
                        productName: sel?.name || (pid === "all" ? "Aura Rudraksha Sacred Store" : prev.productName),
                        keyFeatures: sel ? `${sel.name}, ${sel.category || 'Rudraksha'}, authentic certification, safe packaging` : prev.keyFeatures
                      }));
                    }}
                    className="aura-input"
                  >
                    <option value="all">🏛️ General Aura Store Experience</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>🕉️ {p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>Product / Service Name</label>
                  <input 
                    type="text"
                    value={aiGenForm.productName}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, productName: e.target.value })}
                    placeholder="e.g. 5 Mukhi Rudraksha Mala / Sacred Puja Japa"
                    className="aura-input"
                  />
                </div>

                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>3. Number of Reviews</label>
                  <select 
                    value={aiGenForm.count}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, count: Number(e.target.value) })}
                    className="aura-input"
                  >
                    <option value={1}>1 Review</option>
                    <option value={3}>3 Reviews</option>
                    <option value={5}>5 Reviews (Standard)</option>
                    <option value={10}>10 Reviews</option>
                    <option value={15}>15 Reviews</option>
                    <option value={20}>20 Reviews</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginTop: "16px" }}>
                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>4. Language</label>
                  <select 
                    value={aiGenForm.language}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, language: e.target.value, languageMix: e.target.value })}
                    className="aura-input"
                  >
                    <option value="Hinglish">हिंग्लिश / Hinglish (Natural Conversational blend)</option>
                    <option value="Hindi">हिंदी / Hindi (Clean Devanagari)</option>
                    <option value="English">English (Crisp & Natural)</option>
                    <option value="Auto Mix">Auto Mix (Hindi, Hinglish & English)</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>5. Rating Range</label>
                  <select 
                    value={aiGenForm.ratingRange}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, ratingRange: e.target.value, ratingMix: e.target.value })}
                    className="aura-input"
                  >
                    <option value="Realistic Mix (3-5 Stars)">Realistic Mix (Realistic blend of 3, 4 & 5 Stars) [Default]</option>
                    <option value="5 Stars Only">5 Stars Only (⭐⭐⭐⭐⭐)</option>
                    <option value="4 to 5 Stars">4 to 5 Stars (⭐⭐⭐⭐–⭐⭐⭐⭐⭐)</option>
                    <option value="3 to 4 Stars">3 to 4 Stars (⭐⭐⭐–⭐⭐⭐⭐)</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label style={{ fontWeight: "600", color: "#3b322c" }}>Review Length</label>
                  <select 
                    value={aiGenForm.reviewLength}
                    onChange={(e) => setAiGenForm({ ...aiGenForm, reviewLength: e.target.value })}
                    className="aura-input"
                  >
                    <option value="Short">⚡ 1–2 Short Lines (Concise)</option>
                    <option value="Medium">📝 2–3 Short Lines</option>
                    <option value="Long">📖 3–4 Short Lines</option>
                  </select>
                </div>
              </div>

              {/* Product Description / Key Features Input Field */}
              <div className="admin-form-group" style={{ marginTop: "16px" }}>
                <label style={{ fontWeight: "600", color: "#3b322c", display: "flex", justifyContent: "space-between" }}>
                  <span>2. Product Description / Key Features</span>
                  <span style={{ fontSize: "12px", color: "#806f62", fontWeight: "normal" }}>Grounds the reviews with specific product attributes</span>
                </label>
                <textarea 
                  rows={3}
                  value={aiGenForm.keyFeatures || aiGenForm.productDescription}
                  onChange={(e) => setAiGenForm({ ...aiGenForm, keyFeatures: e.target.value, productDescription: e.target.value })}
                  placeholder="e.g. Quality, easy to use, safe packaging, authentic certification, lightweight daily wear, smooth bead finish..."
                  className="aura-input"
                  style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #ebdccb", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#806f62" }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>Output Format: Name, Rating (⭐⭐⭐⭐⭐), Review (1–4 short lines)</span>
                </div>

                <button 
                  type="submit" 
                  className="admin-btn"
                  disabled={isGeneratingDrafts}
                  style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "220px", justifyContent: "center" }}
                >
                  {isGeneratingDrafts ? (
                    <>
                      <RefreshCw size={16} className="aura-spin" />
                      <span>Generating Natural Reviews...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Generate Reviews ({aiGenForm.count})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* PROGRESS INDICATOR DURING GENERATION */}
          {isGeneratingDrafts && (
            <div className="admin-card" style={{ marginBottom: "24px", background: "#fcf8f2", border: "1.5px solid #d97706", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <RefreshCw size={20} className="aura-spin" color="#d97706" />
                <div>
                  <strong style={{ fontSize: "15px", color: "#7a320c" }}>Generating Natural Conversational Reviews...</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#806f62" }}>
                    {generationStep === 1 && "Step 1/3: Reading product features & key attributes..."}
                    {generationStep === 2 && "Step 2/3: Drafting 1–4 line conversational observations & fictional personas..."}
                    {generationStep === 3 && "Step 3/3: Applying rating range and formatting outputs..."}
                  </p>
                </div>
              </div>
              <div style={{ width: "100%", height: "6px", background: "#eadecd", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${(generationStep / 3) * 100}%`, height: "100%", background: "#d97706", transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}

          {/* Results Board */}
          {generatedDrafts.length > 0 && (
            <div className="admin-card" style={{ marginBottom: "24px" }}>
              {/* Batch Action Toolbar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #ebdccb", paddingBottom: "14px", marginBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: "#2b170d" }}>
                    Generated Reviews ({generatedDrafts.length})
                  </span>
                  
                  {/* Status Pills */}
                  <span className="admin-badge success" style={{ fontSize: "11px", padding: "3px 8px" }}>
                    <CheckCircle2 size={11} /> {generatedDrafts.filter(d => d.similarityStatus === "Unique").length} Unique
                  </span>

                  {generatedDrafts.filter(d => d.similarityStatus === "Similar").length > 0 && (
                    <span className="admin-badge warning" style={{ fontSize: "11px", padding: "3px 8px" }}>
                      <SlidersHorizontal size={11} /> {generatedDrafts.filter(d => d.similarityStatus === "Similar").length} Similar
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {/* Copy All Button */}
                  <button 
                    type="button"
                    className="admin-btn"
                    onClick={handleCopyAllDrafts}
                    style={{ display: "flex", alignItems: "center", gap: "6px", background: copiedAll ? "#15803d" : "#7a320c", color: "#fff", borderColor: copiedAll ? "#15803d" : "#7a320c" }}
                  >
                    {copiedAll ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copiedAll ? "Copied All Reviews!" : "Copy All Reviews"}</span>
                  </button>

                  <button 
                    type="button"
                    className="admin-btn secondary"
                    onClick={() => handleBulkPublishAllReviews(false)}
                    disabled={isBulkSaving || generatedDrafts.filter(d => d.similarityStatus !== "Duplicate").length === 0}
                    style={{ display: "flex", alignItems: "center", gap: "6px", color: "#15803d" }}
                  >
                    <Check size={15} />
                    <span>Publish All Live ({generatedDrafts.filter(d => d.similarityStatus !== "Duplicate").length})</span>
                  </button>

                  <button 
                    type="button"
                    className="admin-btn secondary"
                    onClick={() => handleBulkSaveAllDrafts(false)}
                    disabled={isBulkSaving || generatedDrafts.filter(d => d.similarityStatus !== "Duplicate").length === 0}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Save size={15} />
                    <span>Save as Drafts</span>
                  </button>

                  <button 
                    type="button"
                    className="admin-btn secondary"
                    onClick={handleGenerateAiDrafts}
                    disabled={isGeneratingDrafts}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <RefreshCw size={15} />
                    <span>Regenerate Batch</span>
                  </button>

                  <button 
                    type="button"
                    className="admin-btn secondary"
                    onClick={() => setGeneratedDrafts([])}
                    style={{ display: "flex", alignItems: "center", gap: "6px", color: "#991b1b" }}
                  >
                    <Trash2 size={15} />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Draft Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
                {generatedDrafts.map((draft, idx) => {
                  const isDup = draft.similarityStatus === "Duplicate";
                  const isSim = draft.similarityStatus === "Similar";
                  const devoteeName = draft.name || INDIAN_DEVOTEE_NAMES[idx % INDIAN_DEVOTEE_NAMES.length];
                  const starCount = Number(draft.rating) || 5;
                  const starsEmoji = "⭐".repeat(Math.max(1, Math.min(5, starCount)));
                  const isThisCopied = copiedDraftIndex === idx;

                  return (
                    <div 
                      key={draft.id || idx}
                      style={{
                        background: "#fffcf7",
                        border: isDup ? "1.5px solid #f87171" : isSim ? "1.5px solid #fcd34d" : "1.5px solid #e8dac9",
                        borderRadius: "14px",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative"
                      }}
                    >
                      <div>
                        {/* Formatted Review Display Block (Matches exact requested format) */}
                        <div style={{ background: "#fbf6ee", padding: "12px 14px", borderRadius: "10px", border: "1px solid #ebdccb", marginBottom: "12px" }}>
                          <div style={{ marginBottom: "6px", fontSize: "14px", color: "#2b170d" }}>
                            <strong>Name:</strong> {devoteeName}
                          </div>
                          <div style={{ marginBottom: "6px", fontSize: "14px", color: "#d97706", display: "flex", alignItems: "center", gap: "6px" }}>
                            <strong style={{ color: "#2b170d" }}>Rating:</strong> <span>{starsEmoji}</span>
                            <span style={{ fontSize: "11px", color: "#806f62" }}>({starCount}/5)</span>
                          </div>
                          <div style={{ fontSize: "14px", color: "#3b322c", lineHeight: "1.5" }}>
                            <strong style={{ color: "#2b170d" }}>Review:</strong> “{draft.text}”
                          </div>
                        </div>

                        {/* Metadata pills */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", fontSize: "11px", color: "#806f62" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                            <MapPin size={11} color="#c2410c" /> {draft.city || "Jaipur, RJ"} • {draft.language || "Hinglish"}
                          </span>
                          <span style={{ background: "#f0e6dc", padding: "2px 6px", borderRadius: "4px" }}>
                            {draft.productName || "Product"}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div style={{ borderTop: "1px solid #ebdccb", paddingTop: "12px", marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                        <div style={{ display: "flex", gap: "4px" }}>
                          {/* Copy Review Button */}
                          <button 
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => handleCopySingleDraft(draft, idx)}
                            title="Copy Review (Name, Rating, Review)"
                            style={{ color: isThisCopied ? "#15803d" : "#7a320c" }}
                          >
                            {isThisCopied ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <button 
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => handleShuffleDevotee(idx)}
                            title="Shuffle Fictional Name"
                          >
                            <Shuffle size={14} />
                          </button>
                          <button 
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => handleStartEditDraft(idx)}
                            title="Edit Review Text or Rating"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => handleRegenerateSingleDraft(idx)}
                            title="Regenerate Review text"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button 
                            type="button"
                            className="admin-icon-btn danger"
                            onClick={() => handleDiscardDraft(idx)}
                            title="Discard"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button 
                            type="button"
                            className="admin-btn secondary"
                            style={{ padding: "5px 10px", fontSize: "11px" }}
                            onClick={() => handleSaveSingleAsDraft(draft, idx)}
                            title="Save as internal draft"
                          >
                            <Save size={12} style={{ marginRight: "3px" }} />
                            <span>Draft</span>
                          </button>

                          <button 
                            type="button"
                            className="admin-btn"
                            style={{
                              padding: "5px 12px",
                              fontSize: "11px",
                              background: "#15803d",
                              color: "#fff",
                              borderColor: "#15803d"
                            }}
                            onClick={() => handlePublishSingleReview(draft, idx)}
                            title="Publish live on store"
                          >
                            <Check size={12} style={{ marginRight: "3px" }} />
                            <span>Publish</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'settings' ? (
        <form onSubmit={handleSaveSettings} className="admin-card">
          <div className="admin-card-title">
            <h2>Storefront Review Settings & Appearance</h2>
            <button type="submit" className="admin-btn">
              <Save size={16} /> Save Settings
            </button>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-check">
                <input 
                  type="checkbox" 
                  checked={settings.enabled !== false} 
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} 
                />
                <strong>Enable Reviews Section on Product Pages</strong>
              </label>
              <span className="admin-help">Show customer ratings and review section across the website.</span>
            </div>

            <div className="admin-form-group">
              <label className="admin-check">
                <input 
                  type="checkbox" 
                  checked={settings.photoGalleryEnabled !== false} 
                  onChange={(e) => setSettings({ ...settings, photoGalleryEnabled: e.target.checked })} 
                />
                <strong>Enable Devotee Photo Review Gallery</strong>
              </label>
              <span className="admin-help">Show horizontal customer visual gallery with lightbox popup.</span>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-check">
                <input 
                  type="checkbox" 
                  checked={settings.writeReviewEnabled !== false} 
                  onChange={(e) => setSettings({ ...settings, writeReviewEnabled: e.target.checked })} 
                />
                <strong>Show "Write a Review" Button</strong>
              </label>
              <span className="admin-help">Allow customers to submit public testimonials and photos.</span>
            </div>

            <div className="admin-form-group">
              <label className="admin-check">
                <input 
                  type="checkbox" 
                  checked={settings.verifiedBadgeEnabled !== false} 
                  onChange={(e) => setSettings({ ...settings, verifiedBadgeEnabled: e.target.checked })} 
                />
                <strong>Display "Verified Purchase" Badge</strong>
              </label>
              <span className="admin-help">Show trust verification badge on genuine customer reviews.</span>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label className="admin-check">
                <input 
                  type="checkbox" 
                  checked={settings.helpfulVotingEnabled !== false} 
                  onChange={(e) => setSettings({ ...settings, helpfulVotingEnabled: e.target.checked })} 
                />
                <strong>Enable Helpful Up/Down Voting</strong>
              </label>
              <span className="admin-help">Allow visitors to vote if a review was helpful.</span>
            </div>

            <div className="admin-form-group">
              <label>Reviews Per Page (Pagination)</label>
              <select 
                value={settings.perPage || 6} 
                onChange={(e) => setSettings({ ...settings, perPage: Number(e.target.value) })}
              >
                <option value={4}>4 Reviews per page</option>
                <option value={6}>6 Reviews per page (Recommended)</option>
                <option value={8}>8 Reviews per page</option>
                <option value={12}>12 Reviews per page</option>
              </select>
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="admin-btn">
              <Save size={16} /> Save All Settings
            </button>
          </div>
        </form>
      ) : (
        /* VIEW: REVIEWS TABLE & FILTER TOOLBAR */
        <div className="admin-card">
          {/* Toolbar */}
          <div className="admin-reviews-table-toolbar">
            <div className="admin-search-box" style={{ flex: 1 }}>
              <Search size={16} style={{ position: "absolute", left: "14px", top: "13px", color: "#806f62" }} />
              <input 
                type="text" 
                placeholder="Search reviews by name, content, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <select 
                value={selectedSourceFilter} 
                onChange={(e) => setSelectedSourceFilter(e.target.value)}
                className="admin-select-sm"
              >
                <option value="all">All Sources (Real & AI)</option>
                <option value="real_customers">Genuine Customer Reviews</option>
                <option value="ai_samples">AI Drafts (Internal)</option>
              </select>

              <select 
                value={selectedProductFilter} 
                onChange={(e) => setSelectedProductFilter(e.target.value)}
                className="admin-select-sm"
              >
                <option value="all">All Products</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select 
                value={selectedRatingFilter} 
                onChange={(e) => setSelectedRatingFilter(e.target.value)}
                className="admin-select-sm"
              >
                <option value="all">All Star Ratings</option>
                <option value="5">5 Stars ★★★★★</option>
                <option value="4">4 Stars ★★★★</option>
                <option value="3">3 Stars ★★★</option>
                <option value="2">2 Stars ★★</option>
                <option value="1">1 Star ★</option>
              </select>

              <select 
                value={selectedStatusFilter} 
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="admin-select-sm"
              >
                <option value="all">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="Hidden">Hidden</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredReviews.length === 0 ? (
            <div className="admin-empty">
              <p>No reviews found matching your selected criteria.</p>
            </div>
          ) : (
            <div className="admin-table-container" style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reviewer & Rating</th>
                    <th>Product / Scope</th>
                    <th>Review Content</th>
                    <th>Photos</th>
                    <th>Helpful</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((r) => {
                    const hasPhotos = Array.isArray(r.images) && r.images.length > 0;
                    const isAiDraft = r.source === "ai_draft" || r.isAiGenerated || r.isSample;

                    return (
                      <tr key={r.id}>
                        {/* Reviewer & Rating */}
                        <td style={{ minWidth: "170px" }}>
                          <strong style={{ display: "block", color: "#2b170d" }}>
                            {isAiDraft ? "AI DRAFT" : (r.name || "Anonymous")}
                          </strong>
                          {!isAiDraft && r.city && <small style={{ color: "#806f62", display: "block" }}>{r.city}</small>}
                          <div style={{ display: "flex", gap: "2px", margin: "4px 0" }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star 
                                key={s} 
                                size={12} 
                                fill={s <= (r.rating || 5) ? "#d97706" : "none"} 
                                color={s <= (r.rating || 5) ? "#d97706" : "#d1d5db"} 
                              />
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                            {isAiDraft ? (
                              <span className="admin-badge warning" style={{ fontSize: "10px", padding: "2px 6px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                <Sparkles size={10} color="#d97706" /> AI Draft — Internal
                              </span>
                            ) : r.verified && (
                              <span className="admin-badge success" style={{ fontSize: "10px", padding: "2px 6px" }}>
                                <Check size={10} /> Verified Devotee
                              </span>
                            )}
                            {r.featured && (
                              <span className="admin-badge warning" style={{ fontSize: "10px", padding: "2px 6px" }}>
                                <Flame size={10} /> Featured
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Product / Scope */}
                        <td style={{ minWidth: "140px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: "#7a320c" }}>
                            {r.type === 'store' ? "🏛️ Store Review" : `🕉️ ${r.productName || "Product"}`}
                          </span>
                          <small style={{ display: "block", color: "#806f62", marginTop: "2px" }}>
                            {r.date || "Recent"}
                          </small>
                        </td>

                        {/* Content & Admin Reply */}
                        <td style={{ maxWidth: "280px" }}>
                          {r.title && (
                            <strong style={{ fontSize: "13px", display: "block", color: "#3b322c", marginBottom: "2px" }}>
                              {r.title}
                            </strong>
                          )}
                          <p style={{ margin: "0", fontSize: "12px", color: "#52473f", lineHeight: "1.5" }}>
                            {r.text?.length > 120 ? `${r.text.substring(0, 120)}...` : r.text}
                          </p>

                          {r.adminReply && (
                            <div style={{ marginTop: "6px", padding: "6px 8px", background: "#fcf8f2", borderLeft: "2px solid #b45309", borderRadius: "4px", fontSize: "11px" }}>
                              <span style={{ fontWeight: "600", color: "#7a320c" }}>Replied: </span>
                              <span style={{ color: "#52473f" }}>{r.adminReply.text}</span>
                            </div>
                          )}
                        </td>

                        {/* Photos */}
                        <td style={{ minWidth: "100px" }}>
                          {hasPhotos ? (
                            <div style={{ display: "flex", gap: "4px" }}>
                              {r.images.slice(0, 2).map((img, i) => (
                                <img 
                                  key={i} 
                                  src={img} 
                                  alt="Thumb" 
                                  style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover", border: "1px solid #e8dac9" }} 
                                />
                              ))}
                              {r.images.length > 2 && (
                                <span style={{ fontSize: "11px", color: "#806f62", alignSelf: "center" }}>
                                  +{r.images.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#aaa", fontSize: "12px" }}>No photos</span>
                          )}
                        </td>

                        {/* Helpful */}
                        <td style={{ fontSize: "12px" }}>
                          <span style={{ color: "#166534" }}>👍 {r.helpfulUp || 0}</span> / <span style={{ color: "#991b1b" }}>👎 {r.helpfulDown || 0}</span>
                        </td>

                        {/* Status */}
                        <td>
                          <select 
                            value={r.status || "Approved"} 
                            onChange={(e) => handleToggleStatus(r.id, e.target.value)}
                            style={{ 
                              padding: "4px 8px", 
                              fontSize: "12px", 
                              borderRadius: "6px",
                              border: "1px solid #dcd1c6",
                              fontWeight: "600",
                              color: r.status === 'Approved' ? '#166534' : r.status === 'Pending' ? '#b45309' : '#991b1b'
                            }}
                          >
                            <option value="Approved">Approved</option>
                            <option value="Pending">Pending</option>
                            <option value="draft">Draft</option>
                            <option value="Hidden">Hidden</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button 
                              className="admin-icon-btn" 
                              onClick={() => {
                                setReplyingReview(r);
                                setReplyText(r.adminReply?.text || "");
                              }}
                              title="Official Store Reply"
                            >
                              <CornerDownRight size={15} />
                            </button>

                            <button 
                              className={`admin-icon-btn ${r.featured ? 'warning' : ''}`}
                              onClick={() => handleToggleFeatured(r.id, r.featured)}
                              title={r.featured ? "Unfeature review" : "Mark as Featured"}
                            >
                              <Flame size={15} color={r.featured ? "#d97706" : "currentColor"} />
                            </button>

                            <button 
                              className="admin-icon-btn" 
                              onClick={() => setEditingReview({ ...r })}
                              title="Edit Review Details"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button 
                              className="admin-icon-btn danger" 
                              onClick={() => setDeleteTargetId(r.id)}
                              title="Delete Review"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* EDIT REVIEW MODAL */}
      {editingReview && (
        <div className="aura-modal-backdrop" onClick={() => setEditingReview(null)}>
          <div className="aura-modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="aura-modal-header">
              <h3 className="aura-modal-title">Edit Devotee Review</h3>
              <button className="aura-modal-close-btn" onClick={() => setEditingReview(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="aura-modal-form">
              <div className="aura-form-grid-2">
                <div className="aura-form-group">
                  <label className="aura-form-label">Reviewer Name</label>
                  <input 
                    type="text" 
                    required 
                    value={editingReview.name} 
                    onChange={(e) => setEditingReview({ ...editingReview, name: e.target.value })}
                    className="aura-input"
                  />
                </div>
                <div className="aura-form-group">
                  <label className="aura-form-label">City / Location</label>
                  <input 
                    type="text" 
                    value={editingReview.city || ""} 
                    onChange={(e) => setEditingReview({ ...editingReview, city: e.target.value })}
                    className="aura-input"
                  />
                </div>
              </div>

              <div className="aura-form-grid-2">
                <div className="aura-form-group">
                  <label className="aura-form-label">Star Rating (1-5)</label>
                  <select 
                    value={editingReview.rating} 
                    onChange={(e) => setEditingReview({ ...editingReview, rating: Number(e.target.value) })}
                    className="aura-input"
                  >
                    <option value={5}>5 Stars ★★★★★</option>
                    <option value={4}>4 Stars ★★★★</option>
                    <option value={3}>3 Stars ★★★</option>
                    <option value={2}>2 Stars ★★</option>
                    <option value={1}>1 Star ★</option>
                  </select>
                </div>

                <div className="aura-form-group">
                  <label className="aura-form-label">Review Type</label>
                  <select 
                    value={editingReview.type || "product"} 
                    onChange={(e) => setEditingReview({ ...editingReview, type: e.target.value })}
                    className="aura-input"
                  >
                    <option value="product">Product Review</option>
                    <option value="store">Store Review</option>
                  </select>
                </div>
              </div>

              {editingReview.type === "product" && (
                <div className="aura-form-group">
                  <label className="aura-form-label">Assigned Product</label>
                  <select 
                    value={editingReview.productId || "5"} 
                    onChange={(e) => {
                      const sel = products.find(p => String(p.id) === e.target.value);
                      setEditingReview({
                        ...editingReview,
                        productId: e.target.value,
                        productName: sel ? sel.name : editingReview.productName
                      });
                    }}
                    className="aura-input"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="aura-form-group">
                <label className="aura-form-label">Review Headline</label>
                <input 
                  type="text" 
                  value={editingReview.title || ""} 
                  onChange={(e) => setEditingReview({ ...editingReview, title: e.target.value })}
                  className="aura-input"
                />
              </div>

              <div className="aura-form-group">
                <label className="aura-form-label">Review Content *</label>
                <textarea 
                  rows={4} 
                  required 
                  value={editingReview.text} 
                  onChange={(e) => setEditingReview({ ...editingReview, text: e.target.value })}
                  className="aura-textarea"
                />
              </div>

              {/* Photos in Edit */}
              <div className="aura-form-group">
                <label className="aura-form-label">Review Photos ({editingReview.images?.length || 0})</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {(editingReview.images || []).map((img, i) => (
                    <div key={i} style={{ position: "relative", width: "60px", height: "60px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e8dac9" }}>
                      <img src={img} alt="Thumb" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button 
                        type="button" 
                        onClick={() => setEditingReview({
                          ...editingReview,
                          images: editingReview.images.filter((_, idx) => idx !== i)
                        })}
                        style={{ position: "absolute", top: "2px", right: "2px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: "18px", height: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={(e) => handlePhotoUpload(e, true)}
                />
              </div>

              <div className="aura-form-grid-2">
                <label className="admin-check">
                  <input 
                    type="checkbox" 
                    checked={editingReview.verified !== false} 
                    onChange={(e) => setEditingReview({ ...editingReview, verified: e.target.checked })} 
                  />
                  <span>Verified Purchase Badge</span>
                </label>

                <label className="admin-check">
                  <input 
                    type="checkbox" 
                    checked={!!editingReview.featured} 
                    onChange={(e) => setEditingReview({ ...editingReview, featured: e.target.checked })} 
                  />
                  <span>Featured Review</span>
                </label>
              </div>

              <div className="aura-modal-actions">
                <button type="button" className="aura-btn-cancel" onClick={() => setEditingReview(null)}>
                  Cancel
                </button>
                <button type="submit" className="aura-btn-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL REPLY MODAL */}
      {replyingReview && (
        <div className="aura-modal-backdrop" onClick={() => setReplyingReview(null)}>
          <div className="aura-modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="aura-modal-header">
              <div>
                <span className="aura-modal-kicker">STORE ENGAGEMENT</span>
                <h3 className="aura-modal-title">Reply to {replyingReview.name}'s Review</h3>
              </div>
              <button className="aura-modal-close-btn" onClick={() => setReplyingReview(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "#fbf6f0", padding: "12px 14px", borderRadius: "10px", margin: "14px 0", borderLeft: "3px solid #7a320c" }}>
              <p style={{ margin: "0", fontSize: "13px", color: "#4a3b32" }}>
                "{replyingReview.text}"
              </p>
            </div>

            <form onSubmit={handleSaveReply} className="aura-modal-form">
              <div className="aura-form-group">
                <label className="aura-form-label">Official Aura Spiritual Team Response</label>
                <textarea 
                  rows={4} 
                  placeholder="Har Har Mahadev! 🙏 Thank you for sharing your feedback. We are blessed to serve your spiritual path..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="aura-textarea"
                />
              </div>

              <div className="aura-modal-actions">
                {replyingReview.adminReply && (
                  <button 
                    type="button" 
                    className="aura-btn-cancel" 
                    onClick={() => {
                      setReplyText("");
                      db.updateReview(replyingReview.id, { adminReply: null });
                      emitToast("Official reply removed.", "info");
                      setReplyingReview(null);
                    }}
                    style={{ color: "#991b1b" }}
                  >
                    Delete Reply
                  </button>
                )}
                <button type="button" className="aura-btn-cancel" onClick={() => setReplyingReview(null)}>
                  Cancel
                </button>
                <button type="submit" className="aura-btn-submit">
                  Publish Store Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW REVIEW MODAL (MANUAL CUSTOMER ENTRY) */}
      {isNewReviewModalOpen && (
        <div className="aura-modal-backdrop" onClick={() => setIsNewReviewModalOpen(false)}>
          <div className="aura-modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="aura-modal-header">
              <div>
                <span className="aura-modal-kicker">MANUAL SUBMISSION</span>
                <h3 className="aura-modal-title">Add Customer Testimonial</h3>
              </div>
              <button className="aura-modal-close-btn" onClick={() => setIsNewReviewModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewReview} className="aura-modal-form">
              <div className="aura-form-grid-2">
                <div className="aura-form-group">
                  <label className="aura-form-label">Customer Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Rahul Sharma" 
                    value={newReview.name} 
                    onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                    className="aura-input"
                  />
                </div>

                <div className="aura-form-group">
                  <label className="aura-form-label">City / Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Haridwar, UK" 
                    value={newReview.city} 
                    onChange={(e) => setNewReview({ ...newReview, city: e.target.value })}
                    className="aura-input"
                  />
                </div>
              </div>

              <div className="aura-form-grid-2">
                <div className="aura-form-group">
                  <label className="aura-form-label">Star Rating</label>
                  <select 
                    value={newReview.rating} 
                    onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                    className="aura-input"
                  >
                    <option value={5}>5 Stars ★★★★★</option>
                    <option value={4}>4 Stars ★★★★</option>
                    <option value={3}>3 Stars ★★★</option>
                    <option value={2}>2 Stars ★★</option>
                    <option value={1}>1 Star ★</option>
                  </select>
                </div>

                <div className="aura-form-group">
                  <label className="aura-form-label">Review Scope</label>
                  <select 
                    value={newReview.type} 
                    onChange={(e) => setNewReview({ ...newReview, type: e.target.value })}
                    className="aura-input"
                  >
                    <option value="product">Specific Product</option>
                    <option value="store">Store Overall Experience</option>
                  </select>
                </div>
              </div>

              {newReview.type === "product" && (
                <div className="aura-form-group">
                  <label className="aura-form-label">Select Product</label>
                  <select 
                    value={newReview.productId} 
                    onChange={(e) => setNewReview({ ...newReview, productId: e.target.value })}
                    className="aura-input"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="aura-form-group">
                <label className="aura-form-label">Review Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Genuine Nepali Rudraksha with Divine Energy" 
                  value={newReview.title} 
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  className="aura-input"
                />
              </div>

              <div className="aura-form-group">
                <label className="aura-form-label">Review Text *</label>
                <textarea 
                  rows={4} 
                  required 
                  placeholder="Share authentic customer feedback..." 
                  value={newReview.text} 
                  onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                  className="aura-textarea"
                />
              </div>

              <div className="aura-form-group">
                <label className="aura-form-label">Upload Review Photos</label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={(e) => handlePhotoUpload(e, false)}
                />
                {newReview.images.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    {newReview.images.map((img, i) => (
                      <img key={i} src={img} alt="Preview" style={{ width: "50px", height: "50px", borderRadius: "6px", objectFit: "cover" }} />
                    ))}
                  </div>
                )}
              </div>

              <div className="aura-form-grid-2">
                <label className="admin-check">
                  <input 
                    type="checkbox" 
                    checked={newReview.verified} 
                    onChange={(e) => setNewReview({ ...newReview, verified: e.target.checked })} 
                  />
                  <span>Mark as Verified Purchase</span>
                </label>

                <label className="admin-check">
                  <input 
                    type="checkbox" 
                    checked={newReview.featured} 
                    onChange={(e) => setNewReview({ ...newReview, featured: e.target.checked })} 
                  />
                  <span>Feature on Top</span>
                </label>
              </div>

              <div className="aura-modal-actions">
                <button type="button" className="aura-btn-cancel" onClick={() => setIsNewReviewModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="aura-btn-submit">
                  Save Customer Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT AI REVIEW MODAL */}
      {editingDraftIndex !== null && (
        <div className="aura-modal-backdrop" onClick={() => setEditingDraftIndex(null)}>
          <div className="aura-modal-content-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "580px" }}>
            <div className="aura-modal-header">
              <h3 className="aura-modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} color="#d97706" /> Edit Devotee Review #{editingDraftIndex + 1}
              </h3>
              <button className="aura-modal-close-btn" onClick={() => setEditingDraftIndex(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveDraftEdit(editingDraftIndex); }} className="aura-modal-form">
              <div className="aura-form-grid-2">
                <div className="aura-form-group">
                  <label className="aura-form-label">Devotee / Customer Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={draftEditState.name} 
                    onChange={(e) => setDraftEditState({ ...draftEditState, name: e.target.value })}
                    className="aura-input"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div className="aura-form-group">
                  <label className="aura-form-label">City / Location</label>
                  <input 
                    type="text" 
                    value={draftEditState.city} 
                    onChange={(e) => setDraftEditState({ ...draftEditState, city: e.target.value })}
                    className="aura-input"
                    placeholder="e.g. Varanasi, UP"
                  />
                </div>
              </div>

              <div className="aura-form-grid-2">
                <div className="aura-form-group">
                  <label className="aura-form-label">Rating</label>
                  <select 
                    value={draftEditState.rating} 
                    onChange={(e) => setDraftEditState({ ...draftEditState, rating: Number(e.target.value) })}
                    className="aura-input"
                  >
                    <option value={5}>5 Stars ★★★★★</option>
                    <option value={4}>4 Stars ★★★★</option>
                    <option value={3}>3 Stars ★★★</option>
                  </select>
                </div>

                <div className="aura-form-group">
                  <label className="aura-form-label">Relative Date</label>
                  <input 
                    type="text" 
                    value={draftEditState.date} 
                    onChange={(e) => setDraftEditState({ ...draftEditState, date: e.target.value })}
                    className="aura-input"
                    placeholder="e.g. 2 days ago"
                  />
                </div>
              </div>

              <div className="aura-form-group">
                <label className="aura-form-label">Review Headline</label>
                <input 
                  type="text" 
                  value={draftEditState.title} 
                  onChange={(e) => setDraftEditState({ ...draftEditState, title: e.target.value })}
                  className="aura-input"
                  placeholder="Review title / highlight"
                />
              </div>

              <div className="aura-form-group">
                <label className="aura-form-label">Review Content *</label>
                <textarea 
                  rows={4} 
                  required 
                  value={draftEditState.text} 
                  onChange={(e) => setDraftEditState({ ...draftEditState, text: e.target.value })}
                  className="aura-textarea"
                />
              </div>

              <div className="aura-modal-actions">
                <button type="button" className="aura-btn-cancel" onClick={() => setEditingDraftIndex(null)}>
                  Cancel
                </button>
                <button type="submit" className="aura-btn-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Delete Review"
        message="Are you sure you want to permanently delete this review? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </AdminLayout>
  );
}
