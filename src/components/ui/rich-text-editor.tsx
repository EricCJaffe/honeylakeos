import * as React from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Undo,
  Redo,
  Code,
  Pilcrow,
  Type,
  FileText,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { sanitizeHtml, isHtmlContent, plainTextToHtml } from "@/lib/sanitize";

// ============================================================================
// Types
// ============================================================================

export type ContentFormat = "rich" | "plain";

export interface RichTextEditorProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  /** Allow user to toggle between rich and plain text */
  showFormatToggle?: boolean;
  /** Current format mode */
  format?: ContentFormat;
  /** Callback when format changes */
  onFormatChange?: (format: ContentFormat) => void;
}

export interface RichTextDisplayProps {
  content: string | null | undefined;
  className?: string;
  /** If true, auto-detect if content is HTML or plain text */
  autoDetect?: boolean;
}

// ============================================================================
// Toolbar Button
// ============================================================================

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: ToolbarButtonProps) {
  return (
    <Toggle
      size="sm"
      pressed={isActive}
      onPressedChange={onClick}
      disabled={disabled}
      className="h-8 w-8 p-0"
      title={title}
    >
      {children}
    </Toggle>
  );
}

// ============================================================================
// Link Popover
// ============================================================================

interface LinkPopoverProps {
  editor: Editor;
}

function LinkPopover({ editor }: LinkPopoverProps) {
  const [url, setUrl] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      // Ensure URL has protocol
      const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: finalUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setOpen(false);
    setUrl("");
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const existingUrl = editor.getAttributes("link").href || "";
      setUrl(existingUrl);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Toggle
          size="sm"
          pressed={editor.isActive("link")}
          className="h-8 w-8 p-0"
          title="Add link"
        >
          <LinkIcon className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            {editor.isActive("link") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setOpen(false);
                }}
              >
                Remove
              </Button>
            )}
            <Button type="submit" size="sm">
              {editor.isActive("link") ? "Update" : "Add"} Link
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Toolbar
// ============================================================================

interface ToolbarProps {
  editor: Editor | null;
}

function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        isActive={editor.isActive("paragraph")}
        title="Paragraph"
      >
        <Pilcrow className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Block elements */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Code block"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>
      <LinkPopover editor={editor} />

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

// ============================================================================
// Format Toggle
// ============================================================================

interface FormatToggleProps {
  format: ContentFormat;
  onFormatChange: (format: ContentFormat) => void;
}

function FormatToggle({ format, onFormatChange }: FormatToggleProps) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => onFormatChange("rich")}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded transition-colors",
          format === "rich"
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted"
        )}
      >
        <Type className="h-3 w-3" />
        Rich
      </button>
      <button
        type="button"
        onClick={() => onFormatChange("plain")}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded transition-colors",
          format === "plain"
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted"
        )}
      >
        <FileText className="h-3 w-3" />
        Plain
      </button>
    </div>
  );
}

// ============================================================================
// Rich Text Editor
// ============================================================================

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  minHeight = "150px",
  disabled = false,
  showFormatToggle = true,
  format: externalFormat,
  onFormatChange: externalOnFormatChange,
}: RichTextEditorProps) {
  // Internal format state if not controlled
  const [internalFormat, setInternalFormat] = React.useState<ContentFormat>(() => {
    // Auto-detect format from existing content
    if (value && isHtmlContent(value)) return "rich";
    return "rich"; // Default to rich for new content
  });

  const format = externalFormat ?? internalFormat;
  const handleFormatChange = externalOnFormatChange ?? setInternalFormat;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Only call onChange if content actually changed
      if (html !== value) {
        onChange(html);
      }
    },
  });

  // Sync external value changes
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  // Handle format switching
  const handleFormatSwitch = (newFormat: ContentFormat) => {
    if (newFormat === format) return;

    if (newFormat === "plain" && editor) {
      // Convert to plain text
      const text = editor.getText();
      onChange(text);
    } else if (newFormat === "rich" && value) {
      // Convert plain text to HTML
      const html = plainTextToHtml(value);
      onChange(html);
      editor?.commands.setContent(html);
    }

    handleFormatChange(newFormat);
  };

  // Plain text mode
  if (format === "plain") {
    return (
      <div className={cn("rounded-md border", className)}>
        {showFormatToggle && (
          <div className="flex justify-end p-1.5 border-b bg-muted/30">
            <FormatToggle format={format} onFormatChange={handleFormatSwitch} />
          </div>
        )}
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full p-3 text-sm bg-transparent resize-none focus:outline-none",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{ minHeight }}
        />
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b bg-muted/30">
        <Toolbar editor={editor} />
        {showFormatToggle && (
          <div className="pr-1.5">
            <FormatToggle format={format} onFormatChange={handleFormatSwitch} />
          </div>
        )}
      </div>
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none p-3 focus-within:outline-none",
          "[&_.ProseMirror]:min-h-[var(--editor-min-height)] [&_.ProseMirror]:outline-none",
          "[&_.ProseMirror.is-editor-empty]:before:content-[attr(data-placeholder)]",
          "[&_.ProseMirror.is-editor-empty]:before:text-muted-foreground",
          "[&_.ProseMirror.is-editor-empty]:before:float-left",
          "[&_.ProseMirror.is-editor-empty]:before:h-0",
          "[&_.ProseMirror.is-editor-empty]:before:pointer-events-none",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{ "--editor-min-height": minHeight } as React.CSSProperties}
      />
    </div>
  );
}

// ============================================================================
// Rich Text Display (Read-only)
// ============================================================================

export function RichTextDisplay({
  content,
  className,
  autoDetect = true,
}: RichTextDisplayProps) {
  const processedContent = React.useMemo(() => {
    if (!content) return "";

    // If auto-detect is on and content doesn't look like HTML, convert it
    if (autoDetect && !isHtmlContent(content)) {
      return plainTextToHtml(content);
    }

    // Sanitize HTML content
    return sanitizeHtml(content);
  }, [content, autoDetect]);

  if (!processedContent) {
    return (
      <p className={cn("text-muted-foreground italic", className)}>
        No content
      </p>
    );
  }

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        // Style links
        "[&_a]:text-primary [&_a]:underline",
        // Style blockquotes
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic",
        // Style code blocks
        "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto",
        "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded",
        className
      )}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}

export default RichTextEditor;
