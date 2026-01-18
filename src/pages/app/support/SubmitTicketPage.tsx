import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Lightbulb, CheckCircle, Loader2, Sparkles } from "lucide-react";
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
import type { Database } from "@/integrations/supabase/types";

type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

const TICKET_CATEGORIES = [
  { value: "crm", label: "CRM" },
  { value: "lms", label: "LMS / Learning" },
  { value: "calendar", label: "Calendar" },
  { value: "tasks", label: "Tasks" },
  { value: "projects", label: "Projects" },
  { value: "frameworks", label: "Frameworks" },
  { value: "coaching", label: "Coaching" },
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
  coaching: [
    "Verify you have an active coaching engagement",
    "Check with your coach for access issues",
    "Ensure coaching module is enabled",
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
  const { data: siteId } = useSiteId();
  const { activeCompanyId } = useActiveCompany();
  const { createTicket } = useSupportTicketMutations();

  const [step, setStep] = useState<"describe" | "review">("describe");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Search KB based on description
  const { data: suggestedArticles } = useSearchKbArticles(description);

  const commonFixes = category ? COMMON_FIXES[category] || COMMON_FIXES.other : [];

  const handleGenerateAiSuggestion = async () => {
    if (!description) return;
    setIsGeneratingAi(true);
    setShowAiSuggestions(true);

    // Simulate AI suggestion (in production, this would call an edge function)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const categoryLabel = TICKET_CATEGORIES.find((c) => c.value === category)?.label || "General";
    setAiSuggestion(
      `Based on your description regarding "${categoryLabel}", here are some suggestions:\n\n` +
        `1. ${commonFixes[0] || "Try refreshing the page"}\n` +
        `2. Check if you have the necessary permissions for this feature\n` +
        `3. Clear your browser cache and cookies\n\n` +
        `If these steps don't resolve your issue, please proceed with submitting your ticket.`
    );
    setIsGeneratingAi(false);
  };

  const handleSubmit = async () => {
    if (!siteId || !subject) return;

    try {
      const ticket = await createTicket.mutateAsync({
        site_id: siteId,
        subject,
        description,
        category,
        priority,
        company_id: activeCompanyId || undefined,
      });

      // Navigate to the newly created ticket's detail page
      navigate(`/app/support/tickets/${ticket.id}`);
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error("Failed to submit ticket:", error);
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

      {step === "describe" && (
        <div className="space-y-6">
          {/* Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What area is this about?</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Describe your issue</CardTitle>
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

          {/* Continue Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => setStep("review")}
              disabled={!category || description.length < 10}
            >
              Continue to Submit
            </Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Details</CardTitle>
              <CardDescription>
                Review and complete your ticket submission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <div>
                  <Badge variant="secondary">
                    {TICKET_CATEGORIES.find((c) => c.value === category)?.label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">
                  {description}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
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
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("describe")}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!subject || createTicket.isPending}
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
      )}
    </div>
  );
}
