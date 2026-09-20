import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bookmark, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Trash2, 
  Plus, 
  X, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  ShieldCheck,
  Compass,
  Zap,
  Flame,
  Copy,
  Check
} from "lucide-react";
import { auraChatStore } from "../lib/auraChatStore";
import { emitToast } from "../context/ToastContext";

const CONCERN_OPTIONS = [
  { id: "career", label: "⚡ व्यापार, नौकरी व धन वृद्धि (Career & Wealth)" },
  { id: "peace", label: "🧘 मानसिक शांति व तनाव मुक्ति (Peace & Focus)" },
  { id: "shani_dosha", label: "🛡️ शनि साढ़े साती व ग्रह दोष (Dosha Shanti)" },
  { id: "marriage", label: "❤️ विवाह, प्रेम व पारिवारिक समृद्धि (Relationships)" },
  { id: "health", label: "🩺 स्वास्थ्य व आरोग्य (Health & Vitality)" },
  { id: "spiritual", label: "🕉️ आध्यात्मिक उन्नति व शिव कृपा (Moksha & Sadhana)" }
];

export function AuraAISavedKundaliModal({
  isOpen,
  onClose,
  onSelectKundali
}) {
  const [profiles, setProfiles] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // New Profile Form State
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [concern, setConcern] = useState("career");

  const loadProfiles = () => {
    try {
      const saved = auraChatStore.getSavedKundalis();
      setProfiles(saved);
    } catch (e) {
      console.warn("Error loading saved kundalis:", e);
      setProfiles([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
      setShowAddForm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNewProfile = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      emitToast("कृपया जातक का नाम दर्ज करें", "warning");
      return;
    }
    if (!dob) {
      emitToast("कृपया जन्म तिथि (Date of Birth) चुनें", "warning");
      return;
    }
    if (!time.trim()) {
      emitToast("कृपया जन्म समय (Birth Time) दर्ज करें", "warning");
      return;
    }
    if (!place.trim()) {
      emitToast("कृपया जन्म स्थान (Birth City) दर्ज करें", "warning");
      return;
    }

    const newProfile = {
      name: name.trim(),
      dob,
      birthTime: time.trim(),
      birthPlace: place.trim(),
      concern,
      notes: "Saved via Kundali Manager"
    };

    const updated = auraChatStore.saveKundaliProfile(newProfile);
    setProfiles(updated);
    emitToast("✨ कुंडली सफलतापूर्वक सहेज ली गई! (Kundali Saved)", "success");
    
    // Reset Form
    setName("");
    setDob("");
    setTime("");
    setPlace("");
    setConcern("career");
    setShowAddForm(false);
  };

  const handleDeleteProfile = (e, profileId) => {
    e.stopPropagation();
    try {
      const updated = auraChatStore.deleteSavedKundali(profileId);
      setProfiles(updated);
      emitToast("कुंडली प्रोफाइल हटा दी गई", "info");
    } catch (err) {
      emitToast("हटाने में समस्या आई", "error");
    }
  };

  const handleSelect = (profile) => {
    if (onSelectKundali) {
      onSelectKundali(profile);
    }
    onClose();
  };

  const handleCopyDetails = (e, profile) => {
    e.stopPropagation();
    const txt = `👤 जातक: ${profile.name}\n🗓️ जन्म तिथि: ${profile.dob}\n⏰ जन्म समय: ${profile.birthTime}\n📍 जन्म स्थान: ${profile.birthPlace}\n🎯 संकल्प: ${profile.concern || "Vedic Analysis"}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt);
      setCopiedId(profile.id);
      emitToast("कुंडली विवरण कॉपी हो गया", "info");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-[#f5e6d3]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4A0E17] via-[#651520] to-[#781B28] px-4 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Bookmark size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-amber-100 flex items-center gap-1.5">
                सहेजी गई कुंडलियां (Saved Kundalis)
              </h3>
              <p className="text-[11px] text-amber-200/80">
                1-क्लिक में किसी भी जातक की कुंडली से वैदिक परामर्श शुरू करें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="बंद करें"
          >
            <X size={15} />
          </button>
        </div>

        {/* Action Header */}
        <div className="p-3 bg-[#fdfbf7] border-b border-[#f5e6d3] flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">
            सुरक्षित प्रोफाइल ({profiles.length})
          </span>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
              showAddForm
                ? "bg-gray-200 text-gray-700"
                : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm"
            }`}
          >
            {showAddForm ? (
              <>
                <X size={12} />
                <span>फॉर्म बंद करें</span>
              </>
            ) : (
              <>
                <Plus size={12} />
                <span>+ नयी कुंडली जोड़ें</span>
              </>
            )}
          </button>
        </div>

        {/* Add Profile Form Accordion */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddNewProfile}
              className="p-3.5 bg-gradient-to-br from-amber-50/70 to-orange-50/50 border-b border-amber-200/80 space-y-2.5 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <span>✨</span> जातक विवरण भरें
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                  सटीक गणना हेतु सभी अनिवार्य
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                    जातक का नाम *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="जैसे: राहुल शर्मा"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                    जन्म तिथि (DOB) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                    जन्म समय (Time) *
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                    जन्म स्थान (City, State) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="जैसे: जयपुर, राजस्थान"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                  मुख्य संकल्प / समस्या
                </label>
                <select
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-600"
                >
                  {CONCERN_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gradient-to-r from-[#4A0E17] to-[#781B28] text-white text-xs font-semibold rounded-lg shadow-sm hover:from-[#601420] hover:to-[#8c2030]"
                >
                  💾 सुरक्षित करें (Save Profile)
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Profiles List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2.5 max-h-[50vh]">
          {profiles.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3">
                <Bookmark size={20} />
              </div>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">
                अभी कोई कुंडली सहेजी नहीं गई है
              </h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                अपनी या अपने परिवार की कुंडली सहेजें ताकि बार-बार जन्म विवरण दर्ज न करना पड़े।
              </p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-3 px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>+ पहली कुंडली सहेजें</span>
              </button>
            </div>
          ) : (
            profiles.map((profile) => {
              const concernObj = CONCERN_OPTIONS.find(c => c.id === profile.concern);
              const concernLabel = concernObj ? concernObj.label : profile.concern;

              return (
                <div
                  key={profile.id}
                  onClick={() => handleSelect(profile)}
                  className="p-3.5 rounded-xl border border-amber-200/90 bg-gradient-to-r from-[#FFFDF8] to-[#FAF4EB] hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">
                          {profile.name?.charAt(0) || "🕉️"}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#4A0E17]">
                          {profile.name}
                        </h4>
                        {profile.rashi && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                            {profile.rashi} राशि
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-600 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar size={11} className="text-amber-700" />
                          <span>जन्म: {profile.dob}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={11} className="text-amber-700" />
                          <span>समय: {profile.birthTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={11} className="text-amber-700" />
                          <span className="truncate">स्थान: {profile.birthPlace}</span>
                        </div>
                        {profile.recommendedMukhi && (
                          <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                            <Sparkles size={11} className="text-emerald-600" />
                            <span>{profile.recommendedMukhi}</span>
                          </div>
                        )}
                      </div>

                      {concernLabel && (
                        <div className="mt-2 text-[10px] text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded inline-block">
                          {concernLabel}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCopyDetails(e, profile)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="विवरण कॉपी करें"
                        >
                          {copiedId === profile.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProfile(e, profile.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="हटाएं (Delete)"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelect(profile)}
                        className="px-2.5 py-1 bg-[#4A0E17] group-hover:bg-[#681421] text-amber-100 text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow-sm mt-2 transition-colors"
                      >
                        <span>परामर्श लें</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#fdfbf7] border-t border-[#f5e6d3] flex items-center justify-between text-xs text-gray-500">
          <span>कुल सुरक्षित कुंडलियां: {profiles.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium"
          >
            बंद करें
          </button>
        </div>
      </motion.div>
    </div>
  );
}
