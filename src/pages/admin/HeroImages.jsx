import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { db, onStoreUpdate } from "../../lib/db";
import { compressImage } from "../../lib/imageUtils";
import { emitToast } from "../../context/ToastContext";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Upload, CheckCircle2, ArrowLeft, Plus, Trash2, Link as LinkIcon, Check, Edit3 } from "lucide-react";
import "./admin-pages.css";

export function HeroImages() {
  const [images, setImages] = useState([]);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editUrl, setEditUrl] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(-1);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteIndex, setDeleteIndex] = useState(null);

  useEffect(() => {
    const load = () => setImages(db.getBanners());
    load();
    db.fetchBanners().then(load);
    const unsub = onStoreUpdate(load);
    return () => unsub();
  }, []);

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditUrl(images[index] || "");
    setErrorMsg("");
    setSaveSuccess(-1);
  };

  const handleFileUpload = async (e, index) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1000, 600, 0.75);
      if (compressed) {
        if (index >= 0 && index < images.length) {
          setEditUrl(compressed);
        } else {
          // Adding new hero image
          const updated = [...images, compressed];
          setImages(updated);
          await db.saveBanners(updated);
          setSaveSuccess(updated.length - 1);
          emitToast("Hero image uploaded & saved!", "success");
          setTimeout(() => setSaveSuccess(-1), 3000);
        }
      }
    } catch (err) {
      emitToast(err.message || "Failed to upload image", "error");
    }
    e.target.value = "";
  };

  const handleSave = async (index) => {
    setErrorMsg("");
    const trimmed = editUrl.trim();
    if (!trimmed) {
      setErrorMsg("Please provide an image URL or upload a photo file.");
      return;
    }
    const newImages = [...images];
    newImages[index] = trimmed;
    try {
      setImages(newImages);
      await db.saveBanners(newImages);
      setEditingIndex(-1);
      setSaveSuccess(index);
      emitToast("Hero image updated successfully", "success");
      setTimeout(() => setSaveSuccess(-1), 3000);
    } catch (err) {
      emitToast(err.message || "Failed to save banner", "error");
    }
  };

  const handleAddNewHeroByUrl = async () => {
    const trimmed = editUrl.trim();
    if (!trimmed) {
      setErrorMsg("Please provide an image URL or upload a photo file.");
      return;
    }
    const updated = [...images, trimmed];
    try {
      setImages(updated);
      await db.saveBanners(updated);
      setEditingIndex(-1);
      setEditUrl("");
      setSaveSuccess(updated.length - 1);
      emitToast("New hero image added to carousel", "success");
      setTimeout(() => setSaveSuccess(-1), 3000);
    } catch (err) {
      emitToast(err.message || "Failed to add hero image", "error");
    }
  };

  const confirmDeleteHero = async () => {
    if (deleteIndex === null) return;
    if (images.length <= 1) {
      emitToast("At least one hero image must remain on the storefront.", "error");
      setDeleteIndex(null);
      return;
    }
    const updated = images.filter((_, idx) => idx !== deleteIndex);
    try {
      setImages(updated);
      await db.saveBanners(updated);
      emitToast("Hero image removed", "success");
      if (editingIndex === deleteIndex) {
        setEditingIndex(-1);
      }
      setDeleteIndex(null);
    } catch (err) {
      emitToast(err.message || "Failed to delete hero image", "error");
    }
  };

  return (
    <AdminLayout>
      <Link to="/admin/banners" className="admin-back-link">
        <ArrowLeft size={16} /> Back to Home Content
      </Link>

      <div className="admin-page-header">
        <div>
          <h1>Hero Slider Banners</h1>
          <p className="admin-page-subtitle">Manage storefront hero carousel images (Upload local photos or paste URLs)</p>
        </div>
        <button 
          className="admin-btn" 
          onClick={() => {
            setEditingIndex(images.length);
            setEditUrl("");
            setErrorMsg("");
          }}
        >
          <Plus size={16} /> Add Hero Image
        </button>
      </div>

      {errorMsg && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* NEW HERO BANNERS EDITOR */}
      {editingIndex === images.length && (
        <div className="admin-card" style={{ marginBottom: 20, border: '2px dashed #a54d2b' }}>
          <h2 style={{ fontSize: 16, margin: '0 0 15px', color: '#a54d2b' }}>Add New Hero Banner</h2>

          {editUrl && (
            <img 
              src={editUrl} 
              alt="New Hero Preview" 
              style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 15, background: '#eee' }} 
              onError={(e) => e.target.src = "https://via.placeholder.com/800x400?text=Invalid+Image+Source"}
            />
          )}

          <div className="admin-form-row" style={{ gap: '15px', marginBottom: '15px' }}>
            <div style={{ background: '#fdfbf7', padding: '14px', borderRadius: '8px', border: '1px solid #e8e0d8' }}>
              <b style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#a54d2b', marginBottom: '6px' }}>
                <Upload size={16} /> Upload Local Photo
              </b>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, -1)} style={{ fontSize: '12px' }} />
            </div>

            <div style={{ background: '#fdfbf7', padding: '14px', borderRadius: '8px', border: '1px solid #e8e0d8' }}>
              <b style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#52473f', marginBottom: '6px' }}>
                <LinkIcon size={16} /> Enter Image URL
              </b>
              <input 
                type="url" 
                value={editUrl} 
                onChange={(e) => setEditUrl(e.target.value)} 
                placeholder="https://images.unsplash.com/..." 
                style={{ fontSize: '12px', padding: '8px 10px' }}
              />
            </div>
          </div>

          <div className="admin-form-actions">
            <button className="admin-btn secondary" onClick={() => setEditingIndex(-1)}>Cancel</button>
            <button className="admin-btn" onClick={handleAddNewHeroByUrl}><Check size={16} /> Add Hero Image</button>
          </div>
        </div>
      )}

      {/* EXISTING HERO BANNERS LIST */}
      <div style={{ display: 'grid', gap: '20px' }}>
        {images.map((imgUrl, i) => (
          <div key={i} className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>Hero Image {i + 1}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {saveSuccess === i && (
                  <span style={{ fontSize: 12, color: '#1d9450', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle2 size={14} /> Saved
                  </span>
                )}
                {images.length > 1 && (
                  <button 
                    type="button" 
                    className="admin-icon-btn danger" 
                    onClick={() => setDeleteIndex(i)}
                    title="Delete Hero Banner"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            
            {editingIndex === i ? (
              <div>
                <img 
                  src={editUrl || imgUrl} 
                  alt={`Preview ${i+1}`} 
                  style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 15, background: '#eee' }} 
                  onError={(e) => e.target.src = "https://via.placeholder.com/800x400?text=Invalid+Image+Source"} 
                />

                <div className="admin-form-row" style={{ gap: '15px', marginBottom: '15px' }}>
                  <div style={{ background: '#fdfbf7', padding: '14px', borderRadius: '8px', border: '1px solid #e8e0d8' }}>
                    <b style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#a54d2b', marginBottom: '6px' }}>
                      <Upload size={16} /> Upload New Photo File
                    </b>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, i)} style={{ fontSize: '12px' }} />
                  </div>

                  <div style={{ background: '#fdfbf7', padding: '14px', borderRadius: '8px', border: '1px solid #e8e0d8' }}>
                    <b style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: '#52473f', marginBottom: '6px' }}>
                      <LinkIcon size={16} /> Or Edit Image URL
                    </b>
                    <input 
                      type="url" 
                      value={editUrl} 
                      onChange={(e) => setEditUrl(e.target.value)} 
                      placeholder="https://..." 
                      style={{ fontSize: '12px', padding: '8px 10px' }}
                    />
                  </div>
                </div>

                <div className="admin-form-actions">
                  <button className="admin-btn secondary" onClick={() => setEditingIndex(-1)}>Cancel</button>
                  <button className="admin-btn" onClick={() => handleSave(i)}>Save Changes</button>
                </div>
              </div>
            ) : (
              <div>
                <img 
                  src={imgUrl} 
                  alt={`Hero ${i+1}`} 
                  style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 15, background: '#eee' }} 
                  onError={(e) => e.target.src = "https://via.placeholder.com/800x400?text=Invalid+Image+Source"}
                />
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="admin-btn secondary" onClick={() => handleEdit(i)}>
                    <Edit3 size={16}/> Edit / Replace Image
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={deleteIndex !== null}
        title="Delete Hero Banner?"
        message={`Are you sure you want to remove Hero Banner ${(deleteIndex !== null ? deleteIndex + 1 : '')}?`}
        confirmText="Remove Banner"
        onConfirm={confirmDeleteHero}
        onClose={() => setDeleteIndex(null)}
      />
    </AdminLayout>
  );
}
