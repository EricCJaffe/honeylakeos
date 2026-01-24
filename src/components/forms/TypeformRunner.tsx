import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TypeformField } from "./TypeformField";
import type { WfFormField } from "@/hooks/useWorkflowForms";

export interface FormSettings {
  displayMode?: "typeform" | "classic";
  showProgress?: boolean;
  thankYouTitle?: string;
  thankYouBody?: string;
  brandingLogoUrl?: string | null;
}

export interface LogicRule {
  id: string;
  source_field_id: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value: unknown;
  action: "skip_to" | "hide_block" | "end_form";
  target_field_id: string | null;
}

interface TypeformRunnerProps {
  formTitle: string;
  formDescription?: string | null;
  fields: WfFormField[];
  settings?: FormSettings;
  logicRules?: LogicRule[];
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  isSubmitting?: boolean;
  linkedEntityType?: string;
  linkedEntityId?: string;
}

export function TypeformRunner({
  formTitle,
  formDescription,
  fields,
  settings = {},
  logicRules = [],
  onSubmit,
  isSubmitting = false,
  linkedEntityType,
  linkedEntityId,
}: TypeformRunnerProps) {
  const {
    showProgress = true,
    thankYouTitle = "Thank you!",
    thankYouBody = "Your response has been recorded.",
    brandingLogoUrl,
  } = settings;

  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = intro screen
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [visibleFieldIds, setVisibleFieldIds] = useState<Set<string>>(
    new Set(fields.map((f) => f.id))
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Evaluate logic rules to determine visible fields and next field
  const evaluateLogic = useCallback(
    (fieldId: string, fieldValue: unknown) => {
      const newHiddenFields = new Set<string>();
      let skipToFieldId: string | null = null;
      let shouldEndForm = false;

      for (const rule of logicRules) {
        if (rule.source_field_id !== fieldId) continue;

        const matchesCondition = evaluateCondition(
          fieldValue,
          rule.operator,
          rule.value
        );

        if (matchesCondition) {
          if (rule.action === "hide_block" && rule.target_field_id) {
            newHiddenFields.add(rule.target_field_id);
          } else if (rule.action === "skip_to" && rule.target_field_id) {
            skipToFieldId = rule.target_field_id;
          } else if (rule.action === "end_form") {
            shouldEndForm = true;
          }
        }
      }

      // Update visible fields
      if (newHiddenFields.size > 0) {
        setVisibleFieldIds((prev) => {
          const next = new Set(prev);
          newHiddenFields.forEach((id) => next.delete(id));
          return next;
        });
      }

      return { skipToFieldId, shouldEndForm };
    },
    [logicRules]
  );

  const evaluateCondition = (
    value: unknown,
    operator: LogicRule["operator"],
    compareValue: unknown
  ): boolean => {
    switch (operator) {
      case "equals":
        return value === compareValue;
      case "not_equals":
        return value !== compareValue;
      case "contains":
        return String(value).toLowerCase().includes(String(compareValue).toLowerCase());
      case "greater_than":
        return Number(value) > Number(compareValue);
      case "less_than":
        return Number(value) < Number(compareValue);
      case "is_empty":
        return value === undefined || value === null || value === "" || 
          (Array.isArray(value) && value.length === 0);
      case "is_not_empty":
        return value !== undefined && value !== null && value !== "" &&
          !(Array.isArray(value) && value.length === 0);
      default:
        return false;
    }
  };

  // Get visible fields in order
  const visibleFields = fields.filter((f) => visibleFieldIds.has(f.id));
  const currentField = currentIndex >= 0 ? visibleFields[currentIndex] : null;
  const totalSteps = visibleFields.length;
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / totalSteps) * 100 : 0;

  // Handle value change
  const handleValueChange = useCallback(
    (fieldId: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    },
    []
  );

  // Validate current field
  const validateCurrentField = (): boolean => {
    if (!currentField) return true;

    if (currentField.is_required) {
      const value = values[currentField.id];
      if (value === undefined || value === null || value === "" || 
          (Array.isArray(value) && value.length === 0)) {
        setErrors((prev) => ({
          ...prev,
          [currentField.id]: "This field is required",
        }));
        return false;
      }
    }

    // Additional validation based on field type
    const value = values[currentField.id];
    if (value && currentField.field_type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        setErrors((prev) => ({
          ...prev,
          [currentField.id]: "Please enter a valid email address",
        }));
        return false;
      }
    }

    return true;
  };

  // Navigate to next field
  const goNext = useCallback(() => {
    if (currentIndex === -1) {
      setCurrentIndex(0);
      return;
    }

    if (!validateCurrentField()) return;

    // Evaluate logic for current field
    if (currentField) {
      const { skipToFieldId, shouldEndForm } = evaluateLogic(
        currentField.id,
        values[currentField.id]
      );

      if (shouldEndForm) {
        handleSubmit();
        return;
      }

      if (skipToFieldId) {
        const skipIndex = visibleFields.findIndex((f) => f.id === skipToFieldId);
        if (skipIndex > currentIndex) {
          setCurrentIndex(skipIndex);
          return;
        }
      }
    }

    if (currentIndex < visibleFields.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  }, [currentIndex, currentField, values, visibleFields, evaluateLogic]);

  // Navigate to previous field
  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (currentIndex === 0) {
      setCurrentIndex(-1);
    }
  }, [currentIndex]);

  // Handle form submission
  const handleSubmit = async () => {
    // Validate all required visible fields
    let hasErrors = false;
    const newErrors: Record<string, string> = {};

    for (const field of visibleFields) {
      if (field.is_required) {
        const value = values[field.id];
        if (value === undefined || value === null || value === "" ||
            (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = "This field is required";
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      setErrors(newErrors);
      // Go to first field with error
      const firstErrorIndex = visibleFields.findIndex((f) => newErrors[f.id]);
      if (firstErrorIndex >= 0) {
        setCurrentIndex(firstErrorIndex);
      }
      return;
    }

    try {
      await onSubmit(values);
      setSubmitted(true);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (submitted || isSubmitting) return;

      // Enter to go next (but not in textarea)
      if (e.key === "Enter" && !e.shiftKey) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          goNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, submitted, isSubmitting]);

  // Auto-focus on field change
  useEffect(() => {
    if (containerRef.current && currentIndex >= 0) {
      const input = containerRef.current.querySelector("input, textarea, button[role='combobox']");
      if (input instanceof HTMLElement) {
        setTimeout(() => input.focus(), 300);
      }
    }
  }, [currentIndex]);

  // Thank you screen
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4">{thankYouTitle}</h1>
          <p className="text-muted-foreground text-lg">{thankYouBody}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      {showProgress && currentIndex >= 0 && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>
      )}

      {/* Branding */}
      {brandingLogoUrl && (
        <div className="fixed top-4 left-4 z-40">
          <img src={brandingLogoUrl} alt="Logo" className="h-8 w-auto" />
        </div>
      )}

      {/* Main content */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-6"
      >
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {currentIndex === -1 ? (
              // Intro screen
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <h1 className="text-4xl font-bold mb-4">{formTitle}</h1>
                {formDescription && (
                  <p className="text-xl text-muted-foreground mb-8">
                    {formDescription}
                  </p>
                )}
                <Button size="lg" onClick={goNext} className="gap-2">
                  Start
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter ↵</kbd> to continue
                </p>
              </motion.div>
            ) : currentField ? (
              // Field screen
              <motion.div
                key={currentField.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-2 text-sm text-muted-foreground">
                  {currentIndex + 1} → {totalSteps}
                </div>
                <TypeformField
                  field={currentField}
                  value={values[currentField.id]}
                  onChange={(value) => handleValueChange(currentField.id, value)}
                  error={errors[currentField.id]}
                  autoFocus
                />
                <div className="mt-8 flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={goNext}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : currentIndex === visibleFields.length - 1 ? (
                      <>
                        Submit
                        <Check className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        OK
                        <Check className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter ↵</kbd>
                  </span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-6 right-6 flex gap-2">
        {currentIndex > -1 && (
          <Button
            variant="outline"
            size="icon"
            onClick={goBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={goNext}
          disabled={isSubmitting}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Step indicator */}
      {showProgress && currentIndex >= 0 && (
        <div className="fixed bottom-6 left-6 text-sm text-muted-foreground">
          {currentIndex + 1} of {totalSteps}
        </div>
      )}
    </div>
  );
}