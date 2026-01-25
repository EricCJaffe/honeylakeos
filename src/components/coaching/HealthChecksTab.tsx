import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  useHealthCheckTemplates,
  useEngagementHealthChecks,
  useHealthCheckTrends,
  useCreateHealthCheck,
  useSubmitHealthCheckResponses,
} from "@/hooks/useHealthChecks";
import { Plus, TrendingUp, TrendingDown, Minus, Heart, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";

interface HealthChecksTabProps {
  engagementId: string;
  coachingOrgId: string;
  isCoach?: boolean;
}

export function HealthChecksTab({ engagementId, coachingOrgId, isCoach = false }: HealthChecksTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().split("T")[0]);
  const [activeHealthCheck, setActiveHealthCheck] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});

  const { data: templates, isLoading: templatesLoading } = useHealthCheckTemplates(coachingOrgId);
  const { data: healthChecks, isLoading: healthChecksLoading } = useEngagementHealthChecks(engagementId);
  const { data: trends } = useHealthCheckTrends(engagementId);
  const createHealthCheck = useCreateHealthCheck();
  const submitResponses = useSubmitHealthCheckResponses();

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  const handleCreateHealthCheck = async () => {
    if (!selectedTemplate) return;
    
    const result = await createHealthCheck.mutateAsync({
      engagementId,
      templateId: selectedTemplateId,
      subjectType: selectedTemplate.subject_type,
      assessmentPeriod: selectedTemplate.cadence === "ad_hoc" ? "ad_hoc" : selectedTemplate.cadence,
      periodStart,
    });
    
    setShowCreateDialog(false);
    
    // Open submit dialog with the new health check
    setActiveHealthCheck({ ...result, template: selectedTemplate });
    setResponses({});
    setShowSubmitDialog(true);
  };

  const handleSubmitResponses = async () => {
    if (!activeHealthCheck || !selectedTemplate?.questions) return;
    
    const responseArray = selectedTemplate.questions.map(q => ({
      templateQuestionId: q.id,
      question: q.question_text,
      numericValue: responses[q.id] || 0,
    }));
    
    await submitResponses.mutateAsync({
      healthCheckId: activeHealthCheck.id,
      engagementId,
      responses: responseArray,
    });
    
    setShowSubmitDialog(false);
    setActiveHealthCheck(null);
    setResponses({});
  };

  const handleOpenDraft = (hc: any) => {
    setActiveHealthCheck(hc);
    setSelectedTemplateId(hc.template_id);
    setResponses({});
    setShowSubmitDialog(true);
  };

  const getTrendIcon = (delta?: number) => {
    if (!delta) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (delta > 0) return <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />;
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  if (healthChecksLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const draftChecks = healthChecks?.filter(hc => hc.status === "draft") || [];
  const submittedChecks = healthChecks?.filter(hc => hc.status === "submitted") || [];

  return (
    <div className="space-y-6">
      {/* Trend Summary */}
      {trends && trends.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Current Health Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {trends.map((trend) => (
                <div key={`${trend.subject_type}-${trend.period_start}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium capitalize">{trend.subject_type}</p>
                    <p className="text-2xl font-bold">{trend.overall_score?.toFixed(1) || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trend.delta)}
                    {trend.delta !== null && (
                      <span className={`text-sm ${trend.delta && trend.delta > 0 ? "text-green-600 dark:text-green-400" : trend.delta && trend.delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {trend.delta && trend.delta > 0 ? "+" : ""}{trend.delta?.toFixed(1) || "0"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Health Checks</h3>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Start Health Check
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Health Check</DialogTitle>
              <DialogDescription>
                Select a template to begin a new health assessment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.subject_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateHealthCheck}
                disabled={!selectedTemplateId || createHealthCheck.isPending}
              >
                {createHealthCheck.isPending ? "Creating..." : "Start"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Draft Health Checks */}
      {draftChecks.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">In Progress</h4>
          {draftChecks.map((hc) => (
            <Card key={hc.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{hc.template?.name || "Health Check"}</p>
                    <p className="text-sm text-muted-foreground">
                      {hc.subject_type} · Started {format(new Date(hc.created_at), "PP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Draft</Badge>
                    <Button size="sm" onClick={() => handleOpenDraft(hc)}>
                      Continue
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submitted Health Checks */}
      {submittedChecks.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Completed</h4>
          {submittedChecks.map((hc) => (
            <Card key={hc.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{hc.template?.name || "Health Check"}</p>
                    <p className="text-sm text-muted-foreground">
                      {hc.subject_type} · Submitted {hc.submitted_at ? format(new Date(hc.submitted_at), "PP") : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {hc.overall_score !== null && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className="text-lg font-bold">{hc.overall_score?.toFixed(1)}</p>
                      </div>
                    )}
                    <Badge>Submitted</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : draftChecks.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No health checks yet. Start one to track organizational health.</p>
          </CardContent>
        </Card>
      )}

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Health Check</DialogTitle>
            <DialogDescription>
              {activeHealthCheck?.template?.name || "Answer the questions below"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {selectedTemplate?.questions?.sort((a, b) => a.question_order - b.question_order).map((q) => (
              <div key={q.id} className="space-y-3">
                <Label>{q.question_text}</Label>
                {q.response_type === "scale_1_5" && (
                  <div className="space-y-2">
                    <Slider
                      value={[responses[q.id] || 3]}
                      onValueChange={([value]) => setResponses({ ...responses, [q.id]: value })}
                      min={1}
                      max={5}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 - Poor</span>
                      <span>3 - Average</span>
                      <span>5 - Excellent</span>
                    </div>
                    <p className="text-center font-medium">{responses[q.id] || 3}</p>
                  </div>
                )}
                {q.response_type === "scale_1_10" && (
                  <div className="space-y-2">
                    <Slider
                      value={[responses[q.id] || 5]}
                      onValueChange={([value]) => setResponses({ ...responses, [q.id]: value })}
                      min={1}
                      max={10}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                    <p className="text-center font-medium">{responses[q.id] || 5}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Save Draft
            </Button>
            <Button 
              onClick={handleSubmitResponses}
              disabled={submitResponses.isPending}
            >
              {submitResponses.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
