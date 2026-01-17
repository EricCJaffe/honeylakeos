import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useMyAssignedEngagements, useRecommendationMutations, RecommendationType } from "@/hooks/useCoaching";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Lightbulb, Send } from "lucide-react";

const recommendationTypes: { value: RecommendationType; label: string; description: string }[] = [
  { value: "task", label: "Task", description: "Recommend a new task or to-do item" },
  { value: "project", label: "Project", description: "Recommend starting a new project" },
  { value: "calendar_event", label: "Calendar Event", description: "Recommend scheduling a meeting or event" },
  { value: "note_prompt", label: "Note", description: "Prompt them to create a note or document" },
  { value: "document_prompt", label: "Document", description: "Prompt them to upload or create a document" },
  { value: "framework_change_suggestion", label: "Framework Change", description: "Suggest a framework adjustment" },
];

export default function RecommendationFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedEngagement = searchParams.get("engagement");

  const { data: engagements, isLoading: engagementsLoading } = useMyAssignedEngagements();
  const { createRecommendation } = useRecommendationMutations();

  const [selectedEngagement, setSelectedEngagement] = useState(preselectedEngagement || "");
  const [recommendationType, setRecommendationType] = useState<RecommendationType>("task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const selectedEngagementData = engagements?.find(
    (e: any) => e.engagement?.id === selectedEngagement
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEngagement || !title.trim()) return;

    try {
      await createRecommendation.mutateAsync({
        engagement_id: selectedEngagement,
        target_company_id: selectedEngagementData?.engagement?.client_company_id,
        recommendation_type: recommendationType,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      navigate(`/app/coaching/clients/${selectedEngagement}`);
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/coaching">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="New Recommendation"
          description="Suggest an action for your client to take"
        />
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Create Recommendation
            </CardTitle>
            <CardDescription>
              Recommendations are suggestions that your client can accept or decline.
              When accepted, they convert into actual tasks, projects, or events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={selectedEngagement}
                onValueChange={setSelectedEngagement}
                disabled={!!preselectedEngagement}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {engagements?.map((assignment: any) => (
                    <SelectItem key={assignment.engagement?.id} value={assignment.engagement?.id || ""}>
                      {assignment.engagement?.client?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recommendation Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={recommendationType}
                onValueChange={(value) => setRecommendationType(value as RecommendationType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recommendationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div>{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Schedule Q1 Planning Session"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context and rationale for this recommendation..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to="/app/coaching">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={!selectedEngagement || !title.trim() || createRecommendation.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                {createRecommendation.isPending ? "Sending..." : "Send Recommendation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
