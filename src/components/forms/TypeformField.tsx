import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { WfFormField, WfFieldType } from "@/hooks/useWorkflowForms";

interface TypeformFieldProps {
  field: WfFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  autoFocus?: boolean;
}

export function TypeformField({
  field,
  value,
  onChange,
  error,
  autoFocus,
}: TypeformFieldProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const options = (field.options as string[]) ?? [];

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, field.id]);

  const renderField = () => {
    const fieldType = field.field_type as string;

    switch (fieldType) {
      case "short_text":
      case "email":
      case "phone":
        return (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={fieldType === "email" ? "email" : fieldType === "phone" ? "tel" : "text"}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.help_text ?? "Type your answer here..."}
            className={cn(
              "text-2xl h-16 border-0 border-b-2 rounded-none bg-transparent px-0 focus-visible:ring-0",
              error ? "border-destructive" : "border-muted-foreground/30 focus:border-primary"
            )}
          />
        );

      case "long_text":
        return (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.help_text ?? "Type your answer here..."}
            rows={4}
            className={cn(
              "text-xl border-0 border-b-2 rounded-none bg-transparent px-0 resize-none focus-visible:ring-0",
              error ? "border-destructive" : "border-muted-foreground/30 focus:border-primary"
            )}
          />
        );

      case "number":
        return (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : "")}
            placeholder={field.help_text ?? "0"}
            className={cn(
              "text-2xl h-16 border-0 border-b-2 rounded-none bg-transparent px-0 focus-visible:ring-0",
              error ? "border-destructive" : "border-muted-foreground/30 focus:border-primary"
            )}
          />
        );

      case "date":
        return (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "text-xl h-14 border-0 border-b-2 rounded-none bg-transparent px-0 focus-visible:ring-0",
              error ? "border-destructive" : "border-muted-foreground/30 focus:border-primary"
            )}
          />
        );

      case "dropdown":
        return (
          <div className="space-y-3">
            {options.map((option, index) => (
              <motion.button
                key={option}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onChange(option)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all",
                  value === option
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/20 hover:border-primary/50"
                )}
              >
                <span className="flex-shrink-0 w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-lg">{option}</span>
              </motion.button>
            ))}
          </div>
        );

      case "multi_select":
        const selectedOptions = (value as string[]) ?? [];
        return (
          <div className="space-y-3">
            {options.map((option, index) => {
              const isSelected = selectedOptions.includes(option);
              return (
                <motion.button
                  key={option}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    const newSelected = isSelected
                      ? selectedOptions.filter((o) => o !== option)
                      : [...selectedOptions, option];
                    onChange(newSelected);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/20 hover:border-primary/50"
                  )}
                >
                  <span className={cn(
                    "flex-shrink-0 w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-medium",
                    isSelected && "bg-primary text-primary-foreground border-primary"
                  )}>
                    {isSelected ? "✓" : String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-lg">{option}</span>
                </motion.button>
              );
            })}
            <p className="text-sm text-muted-foreground mt-2">
              Choose as many as you like
            </p>
          </div>
        );

      case "yes_no":
        return (
          <div className="flex gap-4">
            {[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ].map((opt, index) => (
              <motion.button
                key={opt.value}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onChange(opt.value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all",
                  value === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/20 hover:border-primary/50"
                )}
              >
                <span className="flex-shrink-0 w-10 h-10 rounded border-2 flex items-center justify-center text-lg font-medium">
                  {opt.value === "yes" ? "Y" : "N"}
                </span>
                <span className="text-xl font-medium">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-4">
            <Checkbox
              id={field.id}
              checked={(value as boolean) ?? false}
              onCheckedChange={(checked) => onChange(!!checked)}
              className="h-6 w-6"
            />
            <Label htmlFor={field.id} className="text-lg cursor-pointer">
              {field.help_text || "Yes, I agree"}
            </Label>
          </div>
        );

      case "rating":
        const currentRating = (value as number) ?? 0;
        return (
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.button
                key={n}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: n * 0.05 }}
                onClick={() => onChange(n)}
                className={cn(
                  "w-14 h-14 rounded-lg border-2 text-xl font-bold transition-all",
                  currentRating >= n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/20 hover:border-primary/50"
                )}
              >
                {n}
              </motion.button>
            ))}
          </div>
        );

      case "statement":
        // Statement is display-only, no input
        return (
          <div className="text-lg text-muted-foreground">
            {field.help_text}
          </div>
        );

      default:
        return (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer..."
            className="text-xl h-14"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">
          {field.label}
          {field.is_required && <span className="text-destructive ml-1">*</span>}
        </h2>
      {field.help_text && (field.field_type as string) !== "checkbox" && (field.field_type as string) !== "statement" && (
          <p className="text-lg text-muted-foreground">{field.help_text}</p>
        )}
      </div>

      {renderField()}

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-destructive text-sm"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}