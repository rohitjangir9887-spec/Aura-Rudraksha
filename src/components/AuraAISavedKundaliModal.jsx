import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, X, Trash2, Plus, User, Calendar, Clock, MapPin, Sparkles, Check } from "lucide-react";
import { auraChatStore } from "../lib/auraChatStore";
import { emitToast } from "../context/ToastContext";

export function AuraAISavedKundaliModal({ isOpen, onClose, onSelectKundali, onProfilesUpdated }) {
  const [profiles, setProfiles] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    birthTime: "",
    birthPlace: "",
    concern: "all",
    relation: "Self"
  });

  const loadProfiles = () => {
    try {
      const uid = auraChatStore.getCurrentUserUid();
      const storageKey = `aura_ai_saved_kundalis_${uid}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setProfiles(JSON.parse(raw));
      } else {
        // Check if active birth details exist to seed as first profile
        const active = auraChatStore.getVerifiedBirthDetails();
        if (active && active.dob) {
          const initial = [{
            id: "prof_initial_" + Date.now(),
            name: active.name || "Devotee",
            dob: active.dob,
            birthTime: active.birthTime,
            birthPlace: active.birthPlace,
            concern: active.concern || "all",
            relation: "Self",
            savedAt: new Date().toISOString()
          }];
          localStorage.setItem(storageKey, JSON.stringify(initial));
          setProfiles(initial);
        } else {
          setProfiles([]);
        }
      }
    } catch (_) {
      setProfiles([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.dob || !formData.birthPlace) {
      emitToast("कृपया नाम, जन्म तिथि एवं स्थान भरें", "warning");
      return;
    }

    try {
      const uid = auraChatStore.getCurrentUserUid();
      const storageKey = `aura_ai_saved_kundalis_${uid}`;
      const newProf = {
        id: "prof_" + Date.now(),
        ...formData,
        savedAt: new Date().toISOString()
      };
      const updated = [newProf, ...profiles];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setProfiles(updated);
      setShowAddForm(false);
      setFormData({ name: "", dob: "", birthTime: "", birthPlace: "", concern: "all", relation: "Self" });
      emitToast("✨ जन्म कुंडली प्रोफाइल सुरक्षित हो गई (Saved)", "success");
      if (onProfilesUpdated) onProfilesUpdated(updated.length);
    } catch (_) {}
  };

  const handleDeleteProfile = (e, id) => {
    e.stopPropagation();
    try {
      const uid = auraChatStore.getCurrentUserUid();
      const storageKey = `aura_ai_saved_kundalis_${uid}`;
      const updated = profiles.filter(p => p.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setProfiles(updated);
      emitToast("कुंडली प्रोफाइल हटा दी गई", "info");
      if (onProfilesUpdated) onProfilesUpdated(updated.length);
    } catch (_) {}
  };

  const handleSelect = (prof) => {
    if (onSelectKundali) {
      onSelectKundali(prof);
    }
    emitToast(`🙏 ${prof.name} की जन्म कुंडली लोड हो गई`, "success");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 12 }}
          className="w-full max-w-md bg-[#fdfaf5] border border-[#dfcfbc] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          style={{ boxShadow: "0 8px 36px rgba(74, 14, 23, 0.25)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#8c2b10] to-[#5c1c0a] text-white">
            <div className="flex items-center gap-2">
              <Bookmark size={16} className="text-amber-300" />
              <h3 className="text-sm font-bold tracking-wide">
                💾 सुरक्षित जन्म कुंडलियाँ (Saved Kundalis)
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/10 transition-colors text-amber-100"
            >
              <X size={16} />
            </button>
          </div>

          {/* Add Profile Section / Toggle */}
          <div className="p-3 bg-white border-b border-[#e5d2b8]">
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full py-2 px-3 bg-[#8c2b10] hover:bg-[#6e220c] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>+ नई जन्म कुंडली सेव करें (Save New Kundali)</span>
              </button>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#8c2b10]">नई कुंडली विवरण दर्ज करें:</span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-[11px] text-stone-500 hover:text-stone-800"
                  >
                    रद्द करें
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-[#4a0e17] block mb-0.5">नाम (Name) *</label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. राहुल शर्मा"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-[#dfcfbc] rounded bg-[#fcf8f2] outline-none focus:border-[#8c2b10]"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-[#4a0e17] block mb-0.5">संबंध (Relation)</label>
                    <select
                      value={formData.relation}
                      onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-[#dfcfbc] rounded bg-[#fcf8f2] outline-none focus:border-[#8c2b10]"
                    >
                      <option value="Self">स्वयं (Self)</option>
                      <option value="Spouse">पति / पत्नी (Spouse)</option>
                      <option value="Child">संतान (Child)</option>
                      <option value="Parent">माता / पिता (Parent)</option>
                      <option value="Sibling">भाई / बहन (Sibling)</option>
                      <option value="Friend">मित्र / अन्य (Friend)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-[#4a0e17] block mb-0.5">जन्म तिथि (DOB) *</label>
                    <input
                      type="date"
                      required
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-[#dfcfbc] rounded bg-[#fcf8f2] outline-none focus:border-[#8c2b10]"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-bold text-[#4a0e17] block mb-0.5">जन्म समय (Time)</label>
                    <input
                      type="time"
                      value={formData.birthTime}
                      onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-[#dfcfbc] rounded bg-[#fcf8f2] outline-none focus:border-[#8c2b10]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-[#4a0e17] block mb-0.5">जन्म स्थान (City / Place) *</label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. जयपुर, राजस्थान"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-[#dfcfbc] rounded bg-[#fcf8f2] outline-none focus:border-[#8c2b10]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 bg-[#8c2b10] hover:bg-[#6e220c] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 mt-1"
                >
                  <Check size={13} />
                  <span>कुंडली सुरक्षित करें (Save Profile)</span>
                </button>
              </form>
            )}
          </div>

          {/* Profiles List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[160px]">
            {profiles.length === 0 ? (
              <div className="text-center py-10 text-xs text-amber-900/60">
                <Bookmark size={28} className="mx-auto mb-2 text-amber-800/30" />
                <p className="font-medium">कोई सुरक्षित कुंडली प्रोफाइल नहीं है।</p>
                <p className="text-[11px] mt-1 text-stone-500">आप अपनी या परिवार के सदस्यों की कुंडलियाँ यहाँ सेव कर सकते हैं।</p>
              </div>
            ) : (
              profiles.map((p, idx) => (
                <div
                  key={p.id || idx}
                  onClick={() => handleSelect(p)}
                  className="p-3 rounded-xl border border-[#ebdccb] bg-white hover:border-[#c47a3a] hover:bg-amber-50/50 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-[#8c2b10]" />
                      <h4 className="text-xs font-bold text-[#2b1408] truncate">
                        {p.name}
                      </h4>
                      {p.relation && (
                        <span className="text-[10px] bg-amber-100 text-[#8c2b10] px-1.5 py-0.2 rounded font-semibold">
                          {p.relation}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-stone-600">
                      <span className="flex items-center gap-0.5">
                        <Calendar size={11} className="text-stone-400" /> {p.dob}
                      </span>
                      {p.birthTime && (
                        <span className="flex items-center gap-0.5">
                          <Clock size={11} className="text-stone-400" /> {p.birthTime}
                        </span>
                      )}
                      {p.birthPlace && (
                        <span className="flex items-center gap-0.5">
                          <MapPin size={11} className="text-stone-400" /> {p.birthPlace}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProfile(e, p.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelect(p)}
                      className="px-2.5 py-1 bg-[#8c2b10] text-white text-[11px] font-bold rounded-lg hover:bg-[#6e220c] transition-colors flex items-center gap-1"
                    >
                      <Sparkles size={11} />
                      <span>लोड करें</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-[#f4ebd9] border-t border-[#e5d2b8] text-[11px] text-[#5c3014] text-center">
            ✨ प्रोफाइल पर क्लिक करते ही AI पंडित जी तुरंत सटीक विश्लेषण शुरू करेंगे।
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
