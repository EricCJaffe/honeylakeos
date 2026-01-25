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
import {
  useWorkflowTemplates,
  useWorkflowAssignments,
  useCreateWorkflowAssignment,
  useUpdateWorkflowAssignment,
  useGenerateWorkflowRun,
  WorkflowCadence,
} from "@/hooks/useWorkflowAutomation";
import { Play, Pause, Plus, RefreshCw, Calendar } from "lucide-react";
import { format } from "date-fns";

interface WorkflowsTabProps {
  engagementId: string;
  coachingOrgId: string;
}

export function WorkflowsTab({ engagementId, coachingOrgId }: WorkflowsTabProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [cadence, setCadence] = useState<WorkflowCadence>("monthly");
  const [startOn, setStartOn] = useState(new Date().toISOString().split("T")[0]);

  const { data: templates, isLoading: templatesLoading } = useWorkflowTemplates(coachingOrgId);
  const { data: assignments, isLoading: assignmentsLoading } = useWorkflowAssignments(engagementId);
  const createAssignment = useCreateWorkflowAssignment();
  const updateAssignment = useUpdateWorkflowAssignment();
  const generateRun = useGenerateWorkflowRun();

  const handleAssignWorkflow = async () => {
    if (!selectedTemplateId) return;
    
    await createAssignment.mutateAsync({
      engagementId,
      templateId: selectedTemplateId,
      cadence,
      startOn,
    });
    
    setShowAssignDialog(false);
    setSelectedTemplateId("");
  };

  const handleToggleStatus = async (assignmentId: string, currentStatus: string) => {
    await updateAssignment.mutateAsync({
      assignmentId,
      engagementId,
      status: currentStatus === "active" ? "paused" : "active",
    });
  };

  const handleRunNow = async (assignmentId: string) => {
    await generateRun.mutateAsync({ assignmentId, engagementId });
  };

  if (assignmentsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Assigned Workflows</h3>
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Assign Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Workflow Template</DialogTitle>
              <DialogDescription>
                Select a workflow template to assign to this engagement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Workflow Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.workflow_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cadence</Label>
                <Select value={cadence} onValueChange={(v) => setCadence(v as WorkflowCadence)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startOn}
                  onChange={(e) => setStartOn(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignWorkflow}
                disabled={!selectedTemplateId || createAssignment.isPending}
              >
                {createAssignment.isPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!assignments || assignments.length === 0) ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No workflows assigned yet. Click "Assign Workflow" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {assignment.name_override || assignment.template?.name || "Workflow"}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      {assignment.cadence} · Started {format(new Date(assignment.start_on), "PP")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={assignment.status === "active" ? "default" : "secondary"}>
                      {assignment.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    {assignment.next_run_at && (
                      <span>Next run: {format(new Date(assignment.next_run_at), "PPp")}</span>
                    )}
                    {assignment.last_run_at && (
                      <span className="ml-4">Last run: {format(new Date(assignment.last_run_at), "PPp")}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(assignment.id, assignment.status)}
                      disabled={updateAssignment.isPending}
                    >
                      {assignment.status === "active" ? (
                        <>
                          <Pause className="mr-1 h-3 w-3" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" /> Resume
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRunNow(assignment.id)}
                      disabled={generateRun.isPending || assignment.status !== "active"}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Run Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
