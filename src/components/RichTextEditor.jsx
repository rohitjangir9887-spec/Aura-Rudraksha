import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Heading1, Heading2, Heading3, List, ListOrdered, Link as LinkIcon, 
  Undo, Redo, RemoveFormatting, Palette, Highlighter,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Quote
} from 'lucide-react';
import './RichTextEditor.css';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter Web URL for Link (https://...):', previousUrl || '');
    
    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    const formattedUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: formattedUrl }).run();
  };

  return (
    <div className="tiptap-toolbar">
      {/* Headings */}
      <div className="tiptap-toolbar-group" title="Headings">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          title="Heading 1 (Main Title)"
          aria-label="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          title="Heading 2 (Section Title, e.g. PRODUCT HIGHLIGHTS)"
          aria-label="Heading 2"
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
          title="Heading 3 (Sub-heading)"
          aria-label="Heading 3"
        >
          <Heading3 size={16} />
        </button>
      </div>
      
      <div className="tiptap-toolbar-divider" />
      
      {/* Text Formats: Bold, Italic, Underline, Strike */}
      <div className="tiptap-toolbar-group" title="Typography Styles">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Bold (Strong Dark Text)"
          aria-label="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Italic"
          aria-label="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="Underline"
          aria-label="Underline"
        >
          <UnderlineIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-divider" />
      
      {/* Color & Highlight */}
      <div className="tiptap-toolbar-group" title="Colors & Highlights">
        <button
          type="button"
          onClick={() => {
            if (editor.isActive('textStyle', { color: '#8c2b10' })) {
              editor.chain().focus().unsetColor().run();
            } else {
              editor.chain().focus().setColor('#8c2b10').run();
            }
          }}
          className={editor.isActive('textStyle', { color: '#8c2b10' }) ? 'is-active' : ''}
          title="Aura Sacred Copper Color"
          aria-label="Brand Color"
        >
          <Palette size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef3c7' }).run()}
          className={editor.isActive('highlight') ? 'is-active' : ''}
          title="Highlight Text (Gold)"
          aria-label="Highlight"
        >
          <Highlighter size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Lists & Quotes */}
      <div className="tiptap-toolbar-group" title="Lists & Quotes">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="Bullet List (• Highlights)"
          aria-label="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
          title="Blockquote / Sacred Quote"
          aria-label="Blockquote"
        >
          <Quote size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Alignments */}
      <div className="tiptap-toolbar-group" title="Text Alignment">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
          title="Align Left"
          aria-label="Align Left"
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
          title="Align Center"
          aria-label="Align Center"
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
          title="Align Right"
          aria-label="Align Right"
        >
          <AlignRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
          title="Justify Text"
          aria-label="Justify"
        >
          <AlignJustify size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Link & Clear Formatting */}
      <div className="tiptap-toolbar-group" title="Links & Actions">
        <button
          type="button"
          onClick={setLink}
          className={editor.isActive('link') ? 'is-active' : ''}
          title="Insert / Edit Link"
          aria-label="Link"
        >
          <LinkIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear All Formatting"
          aria-label="Clear Formatting"
        >
          <RemoveFormatting size={16} />
        </button>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* History */}
      <div className="tiptap-toolbar-group" title="Undo / Redo">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="Undo"
          aria-label="Undo"
        >
          <Undo size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="Redo"
          aria-label="Redo"
        >
          <Redo size={16} />
        </button>
      </div>
    </div>
  );
};

const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3]
    },
    blockquote: {},
    bulletList: {
      keepMarks: true,
      keepAttributes: false
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false
    }
  }),
  Underline,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      target: '_blank',
      rel: 'noopener noreferrer'
    }
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph']
  })
];

export const RichTextEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions,
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content'
      }
    }
  });

  const prevContent = React.useRef(content);

  // Update editor content if it changes externally (e.g. AI generation or loading)
  React.useEffect(() => {
    if (editor && content !== prevContent.current) {
      prevContent.current = content;
      if (content !== editor.getHTML()) {
        editor.commands.setContent(content || '', false);
      }
    }
  }, [content, editor]);

  return (
    <div className="tiptap-container">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

