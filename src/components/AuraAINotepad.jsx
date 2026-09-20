import React, { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { motion, AnimatePresence } from "framer-motion";
import { X, Notebook, Download, Trash2, Type, Bold, Italic, AlignLeft, AlignCenter, Highlighter } from "lucide-react";

// Converts AI plain text / markdown → rich HTML for Tiptap
function aiTextToHtml(text) {
  if (!text) return "";
  let html = text
    // Strip [AURA_KEYWORDS] line
    .replace(/\[AURA_KEYWORDS\]:[^\n]*/g, "")
    // Bold **text**
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italic *text*
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Heading lines starting with # or ## or ###
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bullet lines starting with • or - or *
    .replace(/^[•\-\*]\s+(.+)$/gm, "<li>$1</li>")
    // Emoji section headers (lines starting with emoji + bold)
    .replace(/^(🙏|🔭|🪐|📅|⏱️|⚠️|✨|🎯|📿|🌟|🔤|✅|🌸|📿|🕉️|💰|🏠|❤️|📚|💼|⚡|✈️|⚖️|🛡️|👶|🩺)\s*(.+)$/gm, "<h3>$1 $2</h3>")
    // Double newlines → paragraph breaks
    .replace(/\n\n+/g, "</p><p>")
    // Single newlines → <br>
    .replace(/\n/g, "<br/>");

  // Wrap loose list items
  html = html.replace(/(<li>.*?<\/li>)+/gs, "<ul>$&</ul>");

  // Wrap remaining in <p> if not already a block
  if (!html.startsWith("<h") && !html.startsWith("<ul") && !html.startsWith("<p")) {
    html = "<p>" + html + "</p>";
  }

  return html;
}

// Toolbar button component
function ToolbarBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1 rounded text-xs transition-colors ${active ? "bg-[#8c2b10] text-white" : "text-[#5c1c0a] hover:bg-[#f0dcc9]"}`}
    >
      {children}
    </button>
  );
}

export function AuraAINotepad({ isOpen, onClose, initialContent = "", mode = "standard" }) {
  const [saved, setSaved] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialContent ? aiTextToHtml(initialContent) : "<p>✏️ यहाँ अपने विचार, मंत्र, या AI पंडित जी का परामर्श सेव करें...</p>",
    editorProps: {
      attributes: {
        class: "outline-none min-h-[200px] text-[13px] text-[#1a0a02] leading-relaxed px-4 py-3 font-[\"Noto Sans Devanagari\", sans-serif]"
      }
    }
  });

  // Update content when initialContent changes
  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.setContent(aiTextToHtml(initialContent));
    }
  }, [initialContent, editor]);

  // Load from localStorage on first open
  useEffect(() => {
    if (isOpen && editor) {
      const saved = localStorage.getItem(`aura_notepad_${mode}`);
      if (saved && !initialContent) {
        editor.commands.setContent(saved);
      }
    }
  }, [isOpen, mode, editor]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    localStorage.setItem(`aura_notepad_${mode}`, html);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [editor, mode]);

  const handleClear = useCallback(() => {
    if (!editor) return;
    editor.commands.clearContent();
    localStorage.removeItem(`aura_notepad_${mode}`);
  }, [editor, mode]);

  const handleDownload = useCallback(() => {
    if (!editor) return;
    const text = editor.getText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "panditji" ? "AI_Pandit_Ji_Kundali.txt" : "Aura_Notes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [editor, mode]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="w-full max-w-lg bg-[#fdfaf5] border border-[#dfcfbc] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
          style={{ boxShadow: "0 8px 48px rgba(140,43,16,0.18)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#8c2b10] to-[#5c1c0a] text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <Notebook size={15} className="text-amber-300" />
              <h3 className="text-sm font-bold tracking-wide">
                {mode === "panditji" ? "📝 आध्यात्मिक डायरी — AI Pandit Ji Notepad" : "📝 Aura Shopping Notes"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                title="Download as Text"
                className="p-1 rounded-full hover:bg-white/20 transition-colors text-amber-200"
              >
                <Download size={14} />
              </button>
              <button
                type="button"
                onClick={handleClear}
                title="Clear All"
                className="p-1 rounded-full hover:bg-white/20 transition-colors text-red-300"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full hover:bg-white/20 transition-colors text-amber-100"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Formatting Toolbar */}
          {editor && (
            <div className="flex items-center gap-0.5 px-3 py-1.5 bg-[#f7eee0] border-b border-[#e5d2b8] flex-shrink-0 flex-wrap">
              <ToolbarBtn
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive("bold")}
                title="Bold"
              >
                <Bold size={13} />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive("italic")}
                title="Italic"
              >
                <Italic size={13} />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive("underline")}
                title="Underline"
              >
                <span className="underline text-[11px] font-bold">U</span>
              </ToolbarBtn>
              <div className="w-px h-4 bg-[#d4b896] mx-1" />
              <ToolbarBtn
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive("heading", { level: 2 })}
                title="Heading"
              >
                <Type size={13} />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive("bulletList")}
                title="Bullet List"
              >
                <span className="text-[11px] font-bold">•≡</span>
              </ToolbarBtn>
              <div className="w-px h-4 bg-[#d4b896] mx-1" />
              <ToolbarBtn
                onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
                active={editor.isActive("highlight")}
                title="Highlight"
              >
                <Highlighter size={13} />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                active={editor.isActive({ textAlign: "left" })}
                title="Align Left"
              >
                <AlignLeft size={13} />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                active={editor.isActive({ textAlign: "center" })}
                title="Align Center"
              >
                <AlignCenter size={13} />
              </ToolbarBtn>
              <div className="ml-auto">
                <select
                  className="text-[11px] border border-[#dfcfbc] rounded px-1.5 py-0.5 bg-white text-[#5c1c0a]"
                  onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                  defaultValue=""
                  title="Text Color"
                >
                  <option value="" disabled>🎨 रंग</option>
                  <option value="#1a0a02">Black</option>
                  <option value="#8c2b10">Rudraksha Red</option>
                  <option value="#1a6b2f">Sacred Green</option>
                  <option value="#b45309">Saffron</option>
                  <option value="#1d4ed8">Blue</option>
                </select>
              </div>
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 overflow-y-auto bg-[#fffdf8]" style={{ fontFamily: "'Noto Sans Devanagari', 'Lohit Devanagari', sans-serif" }}>
            <EditorContent editor={editor} />
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-[#f4ebd9] border-t border-[#e5d2b8] flex items-center justify-between gap-2 flex-shrink-0">
            <span className="text-[11px] text-[#5c3014]">
              ✨ {mode === "panditji"
                ? "AI पंडित जी का परामर्श यहाँ सेव करें — अगली बार AI इसे याद रखेगा।"
                : "AI notes are shared with Aura AI for personalized guidance."}
            </span>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#8c2b10] text-white text-xs font-bold rounded-lg hover:bg-[#6a200a] transition-colors whitespace-nowrap"
            >
              {saved ? "✅ सेव हो गया!" : "💾 Save"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
