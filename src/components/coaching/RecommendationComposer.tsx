import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyAssignedEngagements, useRecommendationMutations, RecommendationType } from "@/hooks/useCoaching";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Lightbulb,
  Send,
  CheckCircle2,
  FileText,
  Calendar,
  FolderOpen,
  Settings,
  Eye,
} from "lucide-react";

interface RecommendationComposerProps {
  preselectedEngagementId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const recommendationTypes: {
  value: RecommendationType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "task",
    label: "Task",
    description: "Recommend a new task or action item",
    icon: CheckCircle2,
  },
  {
    value: "project",
    label: "Project",
    description: "Recommend starting a new project or rock",
    icon: FolderOpen,
  },
  {
    value: "calendar_event",
    label: "Meeting",
    description: "Recommend scheduling a meeting or event",
    icon: Calendar,
  },
  {
    value: "note_prompt",
    label: "Note",
    description: "Prompt them to document something",
    icon: FileText,
  },
  {
    value: "document_prompt",
    label: "Document",
    description: "Prompt them to create or upload a document",
    icon: FileText,
  },
  {
    value: "framework_change_suggestion",
    label: "Framework Change",
    description: "Suggest adjusting their framework setup",
    icon: Settings,
  },
];

export function RecommendationComposer({
  preselectedEngagementId,
  onSuccess,
  onCancel,
}: RecommendationComposerProps) {
  const navigate = useNavigate();
  const { data: engagements, isLoading: engagementsLoading } = useMyAssignedEngagements();
  const { createRecommendation } = useRecommendationMutations();

  const [selectedEngagement, setSelectedEngagement] = useState(preselectedEngagementId || "");
  const [recommendationType, setRecommendationType] = useState<RecommendationType>("task");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rationale, setRationale] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const selectedEngagementData = engagements?.find(
    (e: any) => e.engagement?.id === selectedEngagement
  );

  const selectedType = recommendationTypes.find((t) => t.value === recommendationType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEngagement || !title.trim()) return;

    try {
      await createRecommendation.mutateAsync({
        engagement_id: selectedEngagement,
        target_company_id: selectedEngagementData?.engagement?.client_company_id,
        recommendation_type: recommendationType,
        title: title.trim(),
        description: `${description.trim()}${rationale ? `\n\n**Why:** ${rationale}` : ""}`,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/app/coaching/clients/${selectedEngagement}`);
      }
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Create Recommendation
          </CardTitle>
          <CardDescription>
            Suggest an action for your client. They can accept or decline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select
              value={selectedEngagement}
              onValueChange={setSelectedEngagement}
              disabled={!!preselectedEngagementId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {engagements?.map((assignment: any) => (
                  <SelectItem
                    key={assignment.engagement?.id}
                    value={assignment.engagement?.id || ""}
                  >
                    {assignment.engagement?.client?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recommendation Type */}
          <div className="space-y-2">
            <Label>Type *</Label>
            <div className="grid gap-2 md:grid-cols-3">
              {recommendationTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = recommendationType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setRecommendationType(type.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g., ${
                recommendationType === "task"
                  ? "Complete leadership assessment"
                  : recommendationType === "project"
                  ? "Launch Q2 Rock: Improve hiring process"
                  : recommendationType === "calendar_event"
                  ? "Schedule quarterly planning session"
                  : "Create vision document"
              }`}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about what you're recommending..."
              rows={3}
            />
          </div>

          {/* Rationale */}
          <div className="space-y-2">
            <Label>Why are you recommending this?</Label>
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Help your client understand the reasoning behind this recommendation..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Adding context helps clients make informed decisions
            </p>
          </div>

          <Separator />

          {/* Preview Toggle */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? "Hide Preview" : "Show Preview"}
            </Button>
          </div>

          {/* Preview */}
          {showPreview && title && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {selectedType?.icon && <selectedType.icon className="mr-1 h-3 w-3" />}
                        {selectedType?.label}
                      </Badge>
                      <span className="text-xs">From your coaching team</span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Preview</Badge>
                </div>
              </CardHeader>
              {(description || rationale) && (
                <CardContent className="text-sm">
                  {description && <p>{description}</p>}
                  {rationale && (
                    <p className="mt-2 text-muted-foreground">
                      <strong>Why:</strong> {rationale}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                !selectedEngagement ||
                !title.trim() ||
                createRecommendation.isPending
              }
            >
              <Send className="mr-2 h-4 w-4" />
              {createRecommendation.isPending ? "Sending..." : "Send Recommendation"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
