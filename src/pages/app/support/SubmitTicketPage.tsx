import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Lightbulb, CheckCircle, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useSupportTicketMutations,
  useSearchKbArticles,
  useSiteId,
} from "@/hooks/useSupportCenter";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

const TICKET_CATEGORIES = [
  { value: "crm", label: "CRM" },
  { value: "lms", label: "LMS / Learning" },
  { value: "calendar", label: "Calendar" },
  { value: "tasks", label: "Tasks" },
  { value: "projects", label: "Projects" },
  { value: "frameworks", label: "Frameworks" },
  { value: "billing", label: "Billing & Plans" },
  { value: "other", label: "Other" },
];

const COMMON_FIXES: Record<string, string[]> = {
  crm: [
    "Make sure you have the CRM module enabled",
    "Check that you have the correct permissions",
    "Try refreshing the page",
  ],
  lms: [
    "Ensure you're enrolled in the course",
    "Check if the lesson is published",
    "Clear your browser cache and try again",
  ],
  calendar: [
    "Verify your timezone settings",
    "Check if the event is within the visible date range",
    "Try switching to a different calendar view",
  ],
  tasks: [
    "Check task filters and status settings",
    "Verify you have access to the project",
    "Try clearing any active search filters",
  ],
  projects: [
    "Ensure you have project access permissions",
    "Check if the project is archived",
    "Verify your membership status",
  ],
  frameworks: [
    "Make sure a framework is adopted for your company",
    "Check framework marketplace for available options",
    "Contact your admin if you need framework access",
  ],
  billing: [
    "Check your current plan status",
    "Review usage limits on the Plans page",
    "Contact admin for plan upgrades",
  ],
  other: [
    "Try logging out and back in",
    "Clear your browser cache",
    "Check for any browser extensions that might interfere",
  ],
};

export default function SubmitTicketPage() {
  const navigate = useNavigate();
  const { data: siteId, isLoading: siteIdLoading, error: siteIdError } = useSiteId();
  const { activeCompanyId } = useActiveCompany();
  const { createTicket } = useSupportTicketMutations();
  const { toast } = useToast();

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Search KB based on description
  const { data: suggestedArticles } = useSearchKbArticles(description);

  const commonFixes = category ? COMMON_FIXES[category] || COMMON_FIXES.other : [];

  const handleGenerateAiSuggestion = async () => {
    if (!description) return;
    setIsGeneratingAi(true);
    setShowAiSuggestions(true);

    const categoryLabel = TICKET_CATEGORIES.find((c) => c.value === category)?.label || "General";

    try {
      if (activeCompanyId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const response = await supabase.functions.invoke("ai-gateway", {
            body: {
              companyId: activeCompanyId,
              taskType: "support_triage",
              userPrompt: `Category: ${categoryLabel}\n\nIssue description: ${description}`,
              context: { category },
            },
          });

          if (response.data?.outputJson) {
            const triage = response.data.outputJson as {
              suggestions: string[];
              likely_cause: string;
            };
            const suggestions = triage.suggestions
              .map((s: string, i: number) => `${i + 1}. ${s}`)
              .join("\n");
            setAiSuggestion(
              `${triage.likely_cause}\n\n${suggestions}\n\n` +
              `If these steps don't resolve your issue, please proceed with submitting your ticket.`
            );
            setIsGeneratingAi(false);
            return;
          }
        }
      }
    } catch {
      // AI not available — fall through to static suggestions
    }

    setAiSuggestion(
      `Based on your description regarding "${categoryLabel}", here are some suggestions:\n\n` +
        `1. ${commonFixes[0] || "Try refreshing the page"}\n` +
        `2. Check if you have the necessary permissions for this feature\n` +
        `3. Clear your browser cache and cookies\n\n` +
        `If these steps don't resolve your issue, please proceed with submitting your ticket.`
    );
    setIsGeneratingAi(false);
  };

  const canSubmit = subject.trim().length > 0 && description.trim().length >= 10 && !createTicket.isPending;

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!subject.trim()) {
      setSubmitError("Subject is required.");
      return;
    }

    if (description.trim().length < 10) {
      setSubmitError("Please provide a more detailed description (at least 10 characters).");
      return;
    }

    if (siteIdLoading) {
      setSubmitError("Still loading your account info. Please wait a moment and try again.");
      return;
    }

    if (!siteId) {
      console.error("[SubmitTicket] siteId is null", { siteIdError });
      setSubmitError(
        "Could not determine your site. Please reload the page and try again. " +
        "If this persists, contact your administrator."
      );
      return;
    }

    try {
      const ticket = await createTicket.mutateAsync({
        site_id: siteId,
        subject: subject.trim(),
        description: description.trim(),
        category: category || "other",
        priority,
        company_id: activeCompanyId ?? null,
      });

      navigate(`/app/support/tickets/${ticket.id}`);
    } catch (error) {
      console.error("[SubmitTicket] mutation failed:", error);
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      setSubmitError(`Failed to submit ticket: ${message}`);
      toast({
        title: "Failed to submit ticket",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/app/support/tickets")}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Tickets
      </Button>

      <PageHeader
        title="Submit a Support Ticket"
        description="Describe your issue and we'll help you find a solution"
      />

      {/* Subject */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subject *</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Brief summary of your issue"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Category & Priority */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category & Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TicketPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Describe your issue *</CardTitle>
          <CardDescription>
            Be as specific as possible so we can help you better
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="I'm having trouble with..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />

          {description.length >= 20 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAiSuggestion}
              disabled={isGeneratingAi}
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get AI Suggestions
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {showAiSuggestions && aiSuggestion && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>AI Assistant Suggestions</AlertTitle>
          <AlertDescription className="whitespace-pre-line mt-2">
            {aiSuggestion}
          </AlertDescription>
        </Alert>
      )}

      {/* Common Fixes */}
      {category && commonFixes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Quick troubleshooting steps
            </CardTitle>
            <CardDescription>
              Try these before submitting a ticket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {commonFixes.map((fix, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary font-medium">{index + 1}.</span>
                  {fix}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Suggested Articles */}
      {suggestedArticles && suggestedArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              Related Knowledge Base Articles
            </CardTitle>
            <CardDescription>
              These articles might help answer your question
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestedArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => navigate(`/app/support/kb/${article.id}`)}
                className="block w-full text-left p-3 rounded-md border hover:border-primary transition-colors"
              >
                <div className="font-medium text-sm">{article.title}</div>
                {article.category && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {article.category.name}
                  </Badge>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {submitError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Submission Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          size="lg"
        >
          {createTicket.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Ticket"
          )}
        </Button>
      </div>
    </div>
  );
}
