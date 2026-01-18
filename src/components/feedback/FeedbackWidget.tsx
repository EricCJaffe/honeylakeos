import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus, Bug, Lightbulb, HelpCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  useIsPilot,
  useSubmitFeedback,
  type FeedbackType,
  type FeedbackSeverity,
} from "@/hooks/usePilotValidation";
import { cn } from "@/lib/utils";

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "bug",
    label: "Bug",
    icon: <Bug className="h-4 w-4" />,
    description: "Something isn't working",
  },
  {
    value: "idea",
    label: "Idea",
    icon: <Lightbulb className="h-4 w-4" />,
    description: "Feature suggestion",
  },
  {
    value: "confusion",
    label: "Confusion",
    icon: <HelpCircle className="h-4 w-4" />,
    description: "Something is unclear",
  },
];

const SEVERITY_OPTIONS: { value: FeedbackSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface FeedbackWidgetProps {
  moduleKey?: string;
}

export function FeedbackWidget({ moduleKey }: FeedbackWidgetProps) {
  const location = useLocation();
  const { data: isPilot, isLoading: isPilotLoading } = useIsPilot();
  const { mutate: submitFeedback, isPending } = useSubmitFeedback();

  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("idea");
  const [severity, setSeverity] = useState<FeedbackSeverity>("medium");
  const [message, setMessage] = useState("");

  // Don't show widget for non-pilot companies
  if (isPilotLoading || !isPilot) {
    return null;
  }

  const handleSubmit = () => {
    if (!message.trim()) return;

    submitFeedback(
      {
        feedbackType,
        message: message.trim(),
        severity,
        moduleKey,
        pagePath: location.pathname,
      },
      {
        onSuccess: () => {
          setMessage("");
          setFeedbackType("idea");
          setSeverity("medium");
          setIsOpen(false);
        },
      }
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="shadow-lg gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Feedback
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-80"
          side="top"
          sideOffset={8}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Share Feedback</h4>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Feedback Type Selection */}
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {FEEDBACK_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFeedbackType(type.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-md border text-xs transition-colors",
                      feedbackType === type.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {type.icon}
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="feedback-message">Message</Label>
              <Textarea
                id="feedback-message"
                placeholder={
                  feedbackType === "bug"
                    ? "What went wrong? What did you expect?"
                    : feedbackType === "idea"
                    ? "What would make this better?"
                    : "What's confusing? What were you trying to do?"
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Severity (for bugs) */}
            {feedbackType === "bug" && (
              <div className="space-y-2">
                <Label>Severity</Label>
                <RadioGroup
                  value={severity}
                  onValueChange={(v) => setSeverity(v as FeedbackSeverity)}
                  className="flex gap-4"
                >
                  {SEVERITY_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center gap-1.5">
                      <RadioGroupItem value={option.value} id={`severity-${option.value}`} />
                      <Label htmlFor={`severity-${option.value}`} className="text-sm font-normal cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!message.trim() || isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </>
                )}
              </Button>
            </div>

            {/* Context info (subtle) */}
            <p className="text-xs text-muted-foreground text-center">
              Page: {location.pathname.split("/").slice(-2).join("/")}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
