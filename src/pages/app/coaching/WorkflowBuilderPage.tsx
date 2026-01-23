import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { WorkflowBuilderList, WorkflowBuilderEditor } from "@/components/coaching/workflow-builder";
import { useCoachingRole } from "@/hooks/useCoachingRole";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

export default function WorkflowBuilderPage() {
  const { workflowId } = useParams<{ workflowId?: string }>();
  const navigate = useNavigate();
  const { activeCoachingOrgId, role, isLoading } = useCoachingRole();
  
  const [editingWorkflowId, setEditingWorkflowId] = React.useState<string | null>(workflowId || null);
  
  const isOrgAdmin = role === "site_admin" || role === "coaching_org_admin";
  
  // Sync URL param with state
  React.useEffect(() => {
    if (workflowId) {
      setEditingWorkflowId(workflowId);
    }
  }, [workflowId]);
  
  const handleEditWorkflow = (id: string) => {
    setEditingWorkflowId(id);
    navigate(`/app/coaching/org/workflows/${id}`);
  };
  
  const handleBack = () => {
    setEditingWorkflowId(null);
    navigate("/app/coaching/org/workflows");
  };
  
  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }
  
  if (!activeCoachingOrgId) {
    return (
      <div className="container py-6">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Not Available</AlertTitle>
          <AlertDescription>
            Workflow Builder is only available for coaching organizations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!isOrgAdmin) {
    return (
      <div className="container py-6">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only organization administrators can manage workflow templates.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container py-6">
      {editingWorkflowId ? (
        <WorkflowBuilderEditor
          workflowId={editingWorkflowId}
          coachingOrgId={activeCoachingOrgId}
          onBack={handleBack}
        />
      ) : (
        <WorkflowBuilderList
          coachingOrgId={activeCoachingOrgId}
          programKey="generic"
          onEditWorkflow={handleEditWorkflow}
        />
      )}
    </div>
  );
}
