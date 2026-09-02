import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { compressImage, uploadMedia } from "../../lib/imageUtils";
import { ConfirmModal } from "../../components/ConfirmModal";
import { emitToast } from "../../context/ToastContext";
import { authClient } from "../../lib/authClient";
import { Edit, Trash2, Plus, Search, ArrowLeft, ArrowRight, Upload, Link as LinkIcon, Star, X, Check, Sparkles } from "lucide-react";
import "./admin-pages.css";
import { RichTextEditor } from "../../components/RichTextEditor";

export function AdminProducts() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [homeFilter, setHomeFilter] = useState("All"); // "All" | "On Home" | "Hidden"
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    load();
    const unsub = onStoreUpdate(() => {
      load();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      handleEdit(null);
    }
  }, [searchParams]);

  useEffect(() => {
    let result = products;
    if (searchTerm) {
      result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedCategory !== "All") {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (homeFilter === "On Home") {
      result = result.filter(p => p.showOnHome !== false);
    } else if (homeFilter === "Hidden") {
      result = result.filter(p => p.showOnHome === false);
    }
    setFilteredProducts(result);
  }, [searchTerm, selectedCategory, homeFilter, products]);

  const load = () => {
    const list = db.getProducts();
    setProducts(list);
    setFilteredProducts(list);
    setLoading(false);
  };

  const handleToggleHomeShowcase = async (p, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nextVal = p.showOnHome === false ? true : false;
    try {
      await db.toggleProductHomeShowcase(p.id, nextVal);
      emitToast(nextVal ? `⭐ "${p.name}" added to Home Showcase!` : `"${p.name}" hidden from Home Showcase`, "success");
      load();
    } catch (err) {
      emitToast("Failed to update Home Showcase status", "error");
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deleteId) return;
    try {
      await db.deleteProduct(deleteId);
      emitToast("Product deleted successfully", "success");
      setDeleteId(null);
      load();
    } catch (err) {
      emitToast(err.message || "Failed to delete product from database", "error");
    }
  };

  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [aiLanguage, setAiLanguage] = useState("English");
  const [showAiOverwriteConfirm, setShowAiOverwriteConfirm] = useState(false);

  const triggerGenerateDescription = async () => {
    if (!editing?.name) {
      emitToast("Please enter a product name first", "error");
      return;
    }
    setIsGeneratingDesc(true);
    setShowAiOverwriteConfirm(false);
    try {
      const res = await fetch("/api/aura-ai/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (await authClient.getToken())
        },
        body: JSON.stringify({
          name: editing.name,
          category: editing.category,
          price: editing.price,
          mrp: editing.mrp,
          stock: editing.stock,
          language: aiLanguage,
          details: editing.highlight || editing.shortDesc || ""
        })
      });
      const data = await res.json();
      if (data.success && data.description) {
        setEditing(prev => ({ ...prev, description: data.description }));
        emitToast("Complete description generated with Aura AI ✨", "success");
      } else {
        emitToast(data.message || "Failed to generate description. Please try again.", "error");
      }
    } catch (err) {
      emitToast("Error connecting to Aura AI service. Please retry.", "error");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleGenerateDescription = () => {
    if (!editing?.name) {
      emitToast("Please enter a product name first", "error");
      return;
    }
    if (editing.description && editing.description.trim().length > 20) {
      setShowAiOverwriteConfirm(true);
    } else {
      triggerGenerateDescription();
    }
  };

const handleEdit = (p) => {
    setFormError("");
    setUrlInput("");
    if (p) {
      const imgs = (p.images && p.images.length > 0) ? [...p.images] : (p.img ? [p.img] : []);
      setEditing({
        ...p,
        showOnHome: p.showOnHome !== false,
        isPopular: !!p.isPopular,
        homeBadge: p.homeBadge || p.badge || "",
        homeOrder: p.homeOrder !== undefined ? p.homeOrder : 0,
        img: p.img || (imgs[0] || ""),
        images: imgs
      });
    } else {
      setEditing({
        name: "",
        price: "",
        mrp: "",
        stock: 50,
        img: "",
        images: [],
        category: "Rudraksha",
        description: "",
        status: "Active",
        showOnHome: true,
        isPopular: false,
        homeBadge: "Popular",
        homeOrder: 0,
        rating: 4.9,
        reviews: 0
      });
    }
  };

  // Image Upload Handler using Puter / Server Media Storage
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentCount = editing?.images?.length || 0;
    if (currentCount >= 10) {
      emitToast("Maximum of 10 images allowed.", "warning");
      e.target.value = "";
      return;
    }

    let loadedCount = currentCount;
    for (const file of files) {
      if (loadedCount >= 10) {
        emitToast("Maximum limit of 10 images reached.", "warning");
        break;
      }
      try {
        const mediaUrl = await uploadMedia(file);
        if (mediaUrl) {
          setEditing(prev => {
            if (!prev) return prev;
            const newImages = [...(prev.images || [])];
            if (newImages.length >= 10) return prev;
            newImages.push(mediaUrl);
            return {
              ...prev,
              images: newImages,
              img: prev.img || mediaUrl
            };
          });
          loadedCount++;
        }
      } catch (err) {
        emitToast(`Failed to upload ${file.name}: ${err.message}`, "error");
      }
    }
    setFormError("");
    e.target.value = "";
    emitToast("Images stored safely via Media Storage Pipeline", "success");
  };

  // Image URL Handler
  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (editing?.images?.length >= 10) {
      emitToast("Maximum of 10 images allowed.", "warning");
      return;
    }

    setEditing(prev => {
      if (!prev) return prev;
      const newImages = [...(prev.images || [])];
      if (newImages.length >= 10) return prev;
      newImages.push(trimmed);
      return {
        ...prev,
        images: newImages,
        img: prev.img || trimmed
      };
    });
    setUrlInput("");
    setFormError("");
    emitToast("Image URL added to list", "info");
  };

  const handleRemoveImage = (indexToRemove) => {
    setEditing(prev => {
      if (!prev) return prev;
      const newImages = prev.images.filter((_, idx) => idx !== indexToRemove);
      const newPrimary = prev.img === prev.images[indexToRemove] ? (newImages[0] || "") : prev.img;
      return {
        ...prev,
        images: newImages,
        img: newPrimary
      };
    });
    emitToast("Image removed from list", "info");
  };

  const handleSetPrimaryImage = (imgUrl) => {
    setEditing(prev => (prev ? { ...prev, img: imgUrl } : prev));
    emitToast("Primary product image set", "info");
  };

  const handleMoveImage = (index, direction) => {
    setEditing(prev => {
      if (!prev || !prev.images) return prev;
      const newImages = [...prev.images];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newImages.length) return prev;
      
      // Swap images
      const temp = newImages[index];
      newImages[index] = newImages[targetIndex];
      newImages[targetIndex] = temp;
      
      return {
        ...prev,
        images: newImages
      };
    });
    emitToast("Image reordered", "info");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!editing.name || !editing.name.trim()) {
      setFormError("Product name is required.");
      return;
    }

    const currentImages = editing.images || [];
    const primaryImg = editing.img || (currentImages[0] || "");

    if (currentImages.length === 0 && !primaryImg) {
      setFormError("At least ONE product image is required (Upload a file or enter Image URL).");
      return;
    }

    const finalProduct = {
      ...editing,
      name: editing.name.trim(),
      price: Number(editing.price) || 0,
      mrp: Number(editing.mrp) || Number(editing.price) || 0,
      stock: Number(editing.stock) >= 0 ? Number(editing.stock) : 50,
      img: primaryImg,
      images: currentImages.length > 0 ? currentImages : [primaryImg],
      category: editing.category || "Rudraksha",
      description: editing.description || "",
      status: editing.status || "Active",
      showOnHome: editing.showOnHome !== false,
      isPopular: !!editing.isPopular,
      homeOrder: Number(editing.homeOrder) || 0,
      homeBadge: (editing.homeBadge || editing.badge || "").trim(),
      badge: (editing.homeBadge || editing.badge || "").trim(),
      rating: Number(editing.rating) || 4.9,
      reviews: Number(editing.reviews) || 0
    };

    try {
      await db.saveProduct(finalProduct);
      emitToast(editing.id ? "Product updated successfully" : "Product added successfully", "success");
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message || "Failed to save product. Database is unavailable.");
      emitToast(err.message || "Failed to save product to database", "error");
    }
  };

  const shopCategories = db.getSettings().shopCategories || [];
  const dynamicCategoryNames = shopCategories.length > 0 
    ? shopCategories.map(c => c.name) 
    : ["Rudraksha", "Mala", "Gauri Shankar", "Spiritual"];
  const categories = ["All", ...dynamicCategoryNames];

  if (editing) {
    return (
      <AdminLayout>
        <button className="admin-back-link" onClick={() => setEditing(null)}>
          <ArrowLeft size={16} /> Back to Products
        </button>
        <div className="admin-page-header">
          <h1>{editing.id ? `Edit Product: ${editing.name}` : "Add New Product"}</h1>
        </div>

        {formError && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '500' }}>
            ⚠️ {formError}
          </div>
        )}

        <form onSubmit={handleSave} className="admin-card">
          <div className="admin-form-group">
            <label>Product Name *</label>
            <input 
              required
              value={editing.name} 
              onChange={e => setEditing({...editing, name: e.target.value})}
              placeholder="e.g., 5 Mukhi Rudraksha"
            />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Selling Price (₹) *</label>
              <input 
                type="number"
                required
                value={editing.price} 
                onChange={e => setEditing({...editing, price: e.target.value})}
                placeholder="999"
              />
            </div>
            <div className="admin-form-group">
              <label>MRP Original Price (₹)</label>
              <input 
                type="number"
                value={editing.mrp} 
                onChange={e => setEditing({...editing, mrp: e.target.value})}
                placeholder="1499"
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Available Stock Count *</label>
              <input 
                type="number"
                required
                value={editing.stock} 
                onChange={e => setEditing({...editing, stock: e.target.value})}
                placeholder="50"
              />
            </div>

            <div className="admin-form-group">
              <label>Category *</label>
              <select 
                value={editing.category} 
                onChange={e => setEditing({...editing, category: e.target.value})}
              >
                {dynamicCategoryNames.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 🏠 Home Page Display & Popular Showcase Controls */}
          <div style={{
            background: 'linear-gradient(135deg, #fdf8f3 0%, #faede1 100%)',
            border: '1.5px solid #e2cbba',
            borderRadius: '14px',
            padding: '18px 20px',
            marginBottom: '22px',
            boxShadow: '0 2px 8px rgba(107, 43, 16, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#541c09', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                  🏠 Home Page Showcase &amp; Popular Section
                </h3>
                <span style={{ fontSize: '12.5px', color: '#7a6a5e', marginTop: '2px', display: 'block' }}>
                  Control whether this product is showcased on the Home page and featured in the Popular collections.
                </span>
              </div>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '13px',
                color: editing.showOnHome !== false ? '#82270a' : '#6b7280',
                background: editing.showOnHome !== false ? '#fff' : '#f3f4f6',
                padding: '7px 16px',
                borderRadius: '30px',
                border: editing.showOnHome !== false ? '1.5px solid #d5a285' : '1.5px solid #d1d5db',
                boxShadow: editing.showOnHome !== false ? '0 2px 6px rgba(130, 39, 10, 0.12)' : 'none',
                userSelect: 'none',
                transition: 'all 0.2s ease'
              }}>
                <input 
                  type="checkbox"
                  checked={editing.showOnHome !== false}
                  onChange={e => setEditing({ ...editing, showOnHome: e.target.checked })}
                  style={{ width: '17px', height: '17px', accentColor: '#923a13', cursor: 'pointer' }}
                />
                {editing.showOnHome !== false ? '⭐ Visible on Home Page' : '⚪ Hidden from Home'}
              </label>
            </div>

            <div className="admin-form-row" style={{ marginTop: '12px' }}>
              <div className="admin-form-group">
                <label style={{ fontSize: '13px' }}>Showcase Badge / Tag</label>
                <input 
                  value={editing.homeBadge || editing.badge || ""}
                  onChange={e => setEditing({ ...editing, homeBadge: e.target.value, badge: e.target.value })}
                  placeholder="e.g. Best Seller, Popular, Sacred Nepal, Trending, Auspicious"
                  style={{ background: '#fff' }}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {["Best Seller", "Popular", "100% Nepali", "Lab Certified", "Auspicious", "Limited Edition"].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditing({ ...editing, homeBadge: preset, badge: preset })}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: '#fff',
                        border: '1px solid #dcc6b6',
                        color: '#7a320c',
                        cursor: 'pointer'
                      }}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-form-group">
                <label style={{ fontSize: '13px' }}>Home Display Order (1 = Top priority)</label>
                <input 
                  type="number"
                  value={editing.homeOrder !== undefined ? editing.homeOrder : 0}
                  onChange={e => setEditing({ ...editing, homeOrder: Number(e.target.value) || 0 })}
                  placeholder="1, 2, 3..."
                  style={{ background: '#fff' }}
                />
                <span style={{ fontSize: '11.5px', color: '#8c7d72', marginTop: '4px', display: 'block' }}>
                  Lower numbers display first on the Home showcase grid.
                </span>
              </div>

              <div className="admin-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '22px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#2b170d', fontWeight: '600' }}>
                  <input 
                    type="checkbox"
                    checked={!!editing.isPopular}
                    onChange={e => setEditing({ ...editing, isPopular: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#923a13', cursor: 'pointer' }}
                  />
                  🔥 Mark as <b>Popular / Trending Pick</b>
                </label>
              </div>
            </div>
          </div>

          <div className="admin-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <label style={{ marginBottom: 2, display: 'block' }}>Product Description (Rich Text) *</label>
                <span style={{ fontSize: '12px', color: '#7a6a5e' }}>Format with bold, headings, bullets, highlights, or write with AI</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select 
                  value={aiLanguage}
                  onChange={(e) => setAiLanguage(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #d5c0aa', background: '#fff', color: '#2b170d' }}
                  title="Select AI Generation Language"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Hinglish">Hinglish</option>
                </select>
                <button 
                  type="button" 
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDesc}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(135deg, #8c2b10, #c4551e)',
                    color: '#fff', border: 'none', borderRadius: '6px',
                    padding: '7px 14px', fontSize: '12.5px', fontWeight: '700',
                    cursor: isGeneratingDesc ? 'not-allowed' : 'pointer',
                    opacity: isGeneratingDesc ? 0.7 : 1,
                    boxShadow: '0 2px 6px rgba(140, 43, 16, 0.2)'
                  }}
                >
                  <Sparkles size={14} className={isGeneratingDesc ? "animate-spin" : ""} />
                  {isGeneratingDesc ? "Creating description..." : (editing.description ? "Regenerate with Aura AI" : "Generate with Aura AI")}
                </button>
              </div>
            </div>

            {/* AI Generation Loading Banner */}
            {isGeneratingDesc && (
              <div style={{
                background: '#fffbf2',
                border: '1px solid #e8dac9',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#7a320c'
              }}>
                <Sparkles size={16} className="animate-spin" style={{ color: '#c4551e' }} />
                <span><strong>Aura AI is writing:</strong> Creating a complete, structured description (Highlights, About, Suitability, How to Use &amp; Care)...</span>
              </div>
            )}

            {/* Overwrite Confirmation Box */}
            {showAiOverwriteConfirm && (
              <div style={{
                background: '#fff7ed',
                border: '1px solid #fdba74',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                color: '#9a3412'
              }}>
                <div>
                  <strong>Replace existing description?</strong> An existing description was found. Do you want Aura AI to generate and replace it?
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAiOverwriteConfirm(false)}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={triggerGenerateDescription}
                    style={{ background: '#c2410c', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Yes, Generate
                  </button>
                </div>
              </div>
            )}

            <RichTextEditor
              content={editing.description || ""}
              onChange={content => setEditing({...editing, description: content})}
            />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Status *</label>
              <select 
                value={editing.status} 
                onChange={e => setEditing({...editing, status: e.target.value})}
              >
                <option value="Active">Active (Visible in Store)</option>
                <option value="Inactive">Inactive (Hidden)</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>Rating (1.0 to 5.0)</label>
              <input 
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={editing.rating} 
                onChange={e => setEditing({...editing, rating: e.target.value})}
              />
            </div>
          </div>

          {/* DUAL IMAGE MANAGEMENT SECTION */}
          <div className="admin-form-group" style={{ background: '#fdfbf7', padding: '16px', borderRadius: '12px', border: '1px solid #e8e0d8', marginTop: '10px' }}>
            <label style={{ fontSize: '15px', color: '#2b170d', marginBottom: '4px', display: 'block', fontWeight: '600' }}>
              Product Image Gallery (Supports Multiple Images)
            </label>
            <p style={{ fontSize: '12px', color: '#806f62', margin: '0 0 16px' }}>
              Upload local image files or enter web URLs. Click on any image thumbnail to set it as the Primary Store Image.
            </p>

            <div className="admin-form-row" style={{ gap: '12px', marginBottom: '16px' }}>
              {/* Method A: File Upload */}
              <div style={{ background: '#fff', padding: '14px', borderRadius: '8px', border: '1px dashed #a54d2b', flex: 1 }}>
                <b style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#a54d2b', marginBottom: '6px' }}>
                  <Upload size={16} /> Method A: File Upload (Select Multiple)
                </b>
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  multiple 
                  onChange={handleFileUpload} 
                  style={{ fontSize: '12px', width: '100%' }} 
                />
              </div>

              {/* Method B: URL Input */}
              <div style={{ background: '#fff', padding: '14px', borderRadius: '8px', border: '1px dashed #806f62', flex: 1 }}>
                <b style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#52473f', marginBottom: '6px' }}>
                  <LinkIcon size={16} /> Method B: Image Web URL
                </b>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="url" 
                    value={urlInput} 
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://i.ibb.co/example.jpg" 
                    style={{ fontSize: '12px', flex: 1, padding: '6px 10px' }}
                  />
                  <button type="button" className="admin-btn secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={handleAddUrl}>
                    Add URL
                  </button>
                </div>
              </div>
            </div>

            {/* IMAGE GALLERY THUMBNAILS & PRIMARY BADGE */}
            {editing.images && editing.images.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <b style={{ fontSize: '13px', color: '#2b170d', display: 'block', marginBottom: '8px' }}>
                  Uploaded Product Photos ({editing.images.length}/10) — Set Primary & Reorder
                </b>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {editing.images.map((imgUrl, index) => {
                    const isPrimary = editing.img === imgUrl || (!editing.img && index === 0);
                    return (
                      <div 
                        key={index}
                        style={{
                          position: 'relative',
                          width: '100px',
                          height: '140px',
                          borderRadius: '10px',
                          border: isPrimary ? '2px solid #a54d2b' : '1px solid #dcd1c6',
                          background: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Image Preview Thumbnail */}
                        <div 
                          style={{ position: 'relative', width: '100%', height: '96px', cursor: 'pointer', background: '#fcfaf6' }}
                          onClick={() => handleSetPrimaryImage(imgUrl)}
                          title="Click to set as Primary Image"
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Product thumbnail ${index + 1}`} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                            onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                          />
                          {isPrimary ? (
                            <span style={{
                              position: 'absolute',
                              top: '4px',
                              left: '4px',
                              background: '#a54d2b',
                              color: '#fff',
                              fontSize: '8px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                              Primary
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetPrimaryImage(imgUrl);
                              }}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                background: 'rgba(255,255,255,0.9)',
                                border: '1px solid #dcd1c6',
                                color: '#806f62',
                                borderRadius: '4px',
                                padding: '1px 4px',
                                fontSize: '8px',
                                cursor: 'pointer'
                              }}
                            >
                              Make
                            </button>
                          )}
                          
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(index);
                            }}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(220,38,38,0.9)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'grid',
                              placeItems: 'center',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                            title="Remove image"
                          >
                            <X size={10} />
                          </button>
                        </div>

                        {/* Reordering controls */}
                        <div style={{
                          height: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: '1px solid #ebd8cb',
                          background: '#fdfbf9',
                          padding: '0 8px'
                        }}>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveImage(index, -1)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              color: index === 0 ? '#d1c4bc' : '#a54d2b',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Move Left"
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <span style={{ fontSize: '10px', fontWeight: '600', color: '#806f62' }}>
                            #{index + 1}
                          </span>
                          <button
                            type="button"
                            disabled={index === editing.images.length - 1}
                            onClick={() => handleMoveImage(index, 1)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: index === editing.images.length - 1 ? 'not-allowed' : 'pointer',
                              color: index === editing.images.length - 1 ? '#a54d2b' : '#a54d2b',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Move Right"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="admin-form-actions">
            <button type="button" className="admin-btn secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="admin-btn"><Check size={16} /> Save Product</button>
          </div>
        </form>
      </AdminLayout>
    );
  }

  const homeShowcaseCount = products.filter(p => p.showOnHome !== false).length;
  const hiddenShowcaseCount = products.filter(p => p.showOnHome === false).length;

  return (
    <AdminLayout>
      <Link to="/admin" className="admin-back-link">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      <div className="admin-page-header">
        <div>
          <h1>Product Catalog &amp; Home Showcase</h1>
          <p className="admin-page-subtitle">Manage store products, stock levels, pricing, and choose which products show on the Home UI</p>
        </div>
        <button className="admin-btn" onClick={() => handleEdit(null)}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Showcase Summary & Quick Switcher */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '18px'
      }}>
        <div 
          onClick={() => setHomeFilter("All")}
          style={{
            background: homeFilter === "All" ? '#fff' : '#fcfaf8',
            border: homeFilter === "All" ? '2px solid #8c2b10' : '1px solid #e7dcce',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            boxShadow: homeFilter === "All" ? '0 4px 12px rgba(140, 43, 16, 0.08)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '12px', color: '#7a6a5e', fontWeight: '600', textTransform: 'uppercase' }}>All Products</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#2b170d', marginTop: '4px' }}>
            {products.length} <span style={{ fontSize: '13px', fontWeight: '500', color: '#8c7d72' }}>Total In Catalog</span>
          </div>
        </div>

        <div 
          onClick={() => setHomeFilter("On Home")}
          style={{
            background: homeFilter === "On Home" ? '#fff9f4' : '#fcfaf8',
            border: homeFilter === "On Home" ? '2px solid #d97706' : '1px solid #e7dcce',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            boxShadow: homeFilter === "On Home" ? '0 4px 12px rgba(217, 119, 6, 0.12)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ⭐ On Home Showcase
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#92400e', marginTop: '4px' }}>
            {homeShowcaseCount} <span style={{ fontSize: '13px', fontWeight: '500', color: '#b45309' }}>Visible on Home UI</span>
          </div>
        </div>

        <div 
          onClick={() => setHomeFilter("Hidden")}
          style={{
            background: homeFilter === "Hidden" ? '#fff' : '#fcfaf8',
            border: homeFilter === "Hidden" ? '2px solid #6b7280' : '1px solid #e7dcce',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            boxShadow: homeFilter === "Hidden" ? '0 4px 12px rgba(107, 114, 128, 0.1)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ⚪ Hidden from Home
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#4b5563', marginTop: '4px' }}>
            {hiddenShowcaseCount} <span style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>Shop Catalog Only</span>
          </div>
        </div>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-search-box">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search by product name, tags or category..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="admin-category-pills">
          {categories.map(cat => (
            <button 
              key={cat}
              className={`admin-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="admin-empty">
          <p>No products found matching your filter.</p>
          {homeFilter !== "All" && (
            <button className="admin-btn secondary" style={{ marginTop: '10px' }} onClick={() => setHomeFilter("All")}>
              Show All Products
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="admin-mobile-cards">
            {filteredProducts.map(p => {
              const displayImg = p.img || (p.images && p.images[0]) || "/images/product-5mukhi.jpg";
              const imgCount = p.images?.length || (p.img ? 1 : 0);
              const isShownOnHome = p.showOnHome !== false;

              return (
                <div key={p.id} className="admin-mobile-card">
                  <div className="mobile-card-top">
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <img 
                        src={displayImg} 
                        alt={p.name} 
                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid #e8e0d8' }} 
                        onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                      />
                      <div>
                        <span className="mobile-card-title">{p.name}</span>
                        <div className="mobile-card-sub">{p.category || "Rudraksha"} • Stock: <b>{p.stock}</b></div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {p.badge && (
                            <span style={{ fontSize: '10.5px', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                              {p.badge}
                            </span>
                          )}
                          {imgCount > 1 && (
                            <span style={{ fontSize: '10.5px', color: '#a54d2b', fontWeight: '600' }}>
                              🖼️ {imgCount} Photos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`admin-badge ${p.status === 'Active' ? 'success' : 'error'}`}>{p.status}</span>
                  </div>
                  
                  {/* Home Showcase Switch on Mobile */}
                  <div style={{
                    margin: '10px 0',
                    padding: '8px 12px',
                    background: isShownOnHome ? '#fffbeb' : '#f3f4f6',
                    border: isShownOnHome ? '1px solid #fde68a' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: isShownOnHome ? '#92400e' : '#6b7280' }}>
                      {isShownOnHome ? '⭐ Visible on Home Page' : '⚪ Hidden on Home'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleToggleHomeShowcase(p, e)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        borderRadius: '20px',
                        border: 'none',
                        background: isShownOnHome ? '#d97706' : '#9ca3af',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      {isShownOnHome ? 'Toggle OFF' : 'Show on Home'}
                    </button>
                  </div>

                  <div className="mobile-card-body">
                    <div className="mobile-card-prices">
                      <b>₹{p.price?.toLocaleString("en-IN")}</b>
                      {p.mrp > p.price && <del>₹{p.mrp?.toLocaleString("en-IN")}</del>}
                    </div>
                    <div className="mobile-card-actions">
                      <button className="admin-btn secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleEdit(p)}>
                        <Edit size={14} /> Edit
                      </button>
                      <button className="admin-icon-btn danger" style={{ width: 34, height: 34 }} onClick={() => setDeleteId(p.id)} title="Delete Product">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="admin-table-container desktop-only">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th style={{ textAlign: 'center' }}>Home Showcase</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const displayImg = p.img || (p.images && p.images[0]) || "/images/product-5mukhi.jpg";
                  const isShownOnHome = p.showOnHome !== false;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="admin-product-cell">
                          <img 
                            src={displayImg} 
                            alt={p.name} 
                            onError={(e) => { if (!e.target.src.includes("product-5mukhi.jpg")) e.target.src = "/images/product-5mukhi.jpg"; }}
                          />
                          <div>
                            <strong>{p.name}</strong>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                              <small>{p.reviews || 0} reviews • {p.images?.length || 1} images</small>
                              {p.badge && (
                                <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                  {p.badge}
                                </span>
                              )}
                              {p.isPopular && (
                                <span style={{ fontSize: '10px', background: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                  🔥 Popular
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{p.category}</td>
                      <td>
                        <b>₹{p.price?.toLocaleString("en-IN")}</b>
                        {p.mrp > p.price && (
                          <div style={{ fontSize: '11px', color: '#8c7d72' }}><del>₹{p.mrp?.toLocaleString("en-IN")}</del></div>
                        )}
                      </td>
                      <td>
                        <span style={{ color: p.stock < 10 ? '#dc2626' : '#1d9450', fontWeight: '600' }}>
                          {p.stock} units
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleHomeShowcase(p, e)}
                          title={isShownOnHome ? "Click to hide from Home page" : "Click to show on Home page"}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            borderRadius: '20px',
                            border: isShownOnHome ? '1.5px solid #d97706' : '1px solid #d1d5db',
                            background: isShownOnHome ? '#fef3c7' : '#f3f4f6',
                            color: isShownOnHome ? '#92400e' : '#6b7280',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isShownOnHome ? (
                            <>
                              <span>⭐ On Home</span>
                              {p.homeOrder > 0 && <span style={{ background: '#d97706', color: '#fff', fontSize: '10px', padding: '0 4px', borderRadius: '4px' }}>#{p.homeOrder}</span>}
                            </>
                          ) : (
                            <>
                              <span>⚪ Hidden</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td>
                        <span className={`admin-badge ${p.status === 'Active' ? 'success' : 'error'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions-cell">
                          <button className="admin-icon-btn" onClick={() => handleEdit(p)} title="Edit Product">
                            <Edit size={16} />
                          </button>
                          <button className="admin-icon-btn danger" onClick={() => setDeleteId(p.id)} title="Delete Product">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Product?"
        message="This product will be permanently removed from your store catalog."
        confirmText="Delete Product"
        onConfirm={confirmDeleteProduct}
        onClose={() => setDeleteId(null)}
      />
    </AdminLayout>
  );
}
