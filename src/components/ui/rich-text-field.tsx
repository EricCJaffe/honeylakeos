import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Lazy load the rich text editor for performance
const RichTextEditor = React.lazy(() =>
  import("@/components/ui/rich-text-editor").then((m) => ({
    default: m.RichTextEditor,
  }))
);

const RichTextDisplay = React.lazy(() =>
  import("@/components/ui/rich-text-editor").then((m) => ({
    default: m.RichTextDisplay,
  }))
);

// ============================================================================
// Types
// ============================================================================

export type ContentFormat = "rich" | "plain";

export interface RichTextFieldProps {
  /** Field label */
  label?: string;
  /** Current value (HTML or plain text) */
  value: string | null | undefined;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
  /** Minimum editor height */
  minHeight?: string;
  /** Disable editing */
  disabled?: boolean;
  /** Read-only display mode */
  readOnly?: boolean;
  /** Show format toggle (rich/plain) */
  showFormatToggle?: boolean;
  /** Error message to display */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Required field */
  required?: boolean;
}

// ============================================================================
// Loading Fallback
// ============================================================================

function EditorSkeleton({ minHeight = "150px" }: { minHeight?: string }) {
  return (
    <div
      className="rounded-md border bg-muted/20 animate-pulse"
      style={{ minHeight }}
    >
      <div className="h-10 border-b bg-muted/30" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

// ============================================================================
// Rich Text Field
// ============================================================================

export function RichTextField({
  label,
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  minHeight = "150px",
  disabled = false,
  readOnly = false,
  showFormatToggle = true,
  error,
  helperText,
  required = false,
}: RichTextFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <React.Suspense fallback={<EditorSkeleton minHeight={minHeight} />}>
        {readOnly ? (
          <RichTextDisplay content={value} />
        ) : (
          <RichTextEditor
            value={value}
            onChange={onChange || (() => {})}
            placeholder={placeholder}
            minHeight={minHeight}
            disabled={disabled}
            showFormatToggle={showFormatToggle}
            className={cn(error && "border-destructive")}
          />
        )}
      </React.Suspense>

      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default RichTextField;
