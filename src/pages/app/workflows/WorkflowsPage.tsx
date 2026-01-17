import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Play, Settings2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useWfWorkflows, useWfWorkflowMutations } from "@/hooks/useWorkflows";
import { useWfForms, useWfFormMutations } from "@/hooks/useWorkflowForms";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useMembership } from "@/lib/membership";
import { WorkflowFormDialog } from "./WorkflowFormDialog";
import { FormBuilderDialog } from "./FormBuilderDialog";
import type { WfStatus } from "@/hooks/useWorkflowForms";

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { isCompanyAdmin } = useMembership();
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"workflows" | "forms">("workflows");

  const { data: workflows, isLoading: workflowsLoading } = useWfWorkflows({
    scopeType: "company",
    companyId: activeCompanyId ?? undefined,
  });

  const { data: forms, isLoading: formsLoading } = useWfForms({
    scopeType: "company",
    companyId: activeCompanyId ?? undefined,
  });

  const canManage = isCompanyAdmin;

  const getStatusBadge = (status: WfStatus) => {
    switch (status) {
      case "published":
        return <Badge variant="default">Published</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Workflows & Forms"
          description="Build automated workflows and forms for your organization"
        />
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFormDialog(true)}>
              <FileText className="mr-2 h-4 w-4" />
              New Form
            </Button>
            <Button onClick={() => setShowWorkflowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Workflow
            </Button>
          </div>
        )}
      </div>

      <div
      className="hidden" />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="workflows" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <FileText className="h-4 w-4" />
            Forms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-6">
          {workflowsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : workflows && workflows.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/app/workflows/${workflow.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{workflow.title}</CardTitle>
                        <CardDescription className="mt-1 capitalize">
                          {workflow.trigger_type.replace("_", " ")} trigger
                        </CardDescription>
                      </div>
                      {getStatusBadge(workflow.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {workflow.description || "No description"}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created {new Date(workflow.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Settings2}
              title="No workflows yet"
              description="Create your first workflow to automate processes like onboarding, approvals, and more."
              action={
                canManage ? (
                  <Button onClick={() => setShowWorkflowDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workflow
                  </Button>
                ) : undefined
              }
            />
          )}
        </TabsContent>

        <TabsContent value="forms" className="mt-6">
          {formsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : forms && forms.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {forms.map((form) => (
                <Card
                  key={form.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/app/workflows/forms/${form.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{form.title}</CardTitle>
                        <CardDescription className="mt-1 capitalize">
                          {form.scope_type} form
                        </CardDescription>
                      </div>
                      {getStatusBadge(form.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {form.description || "No description"}
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created {new Date(form.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No forms yet"
              description="Create your first form to collect information from your team or clients."
              action={
                canManage ? (
                  <Button onClick={() => setShowFormDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Form
                  </Button>
                ) : undefined
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <WorkflowFormDialog
        open={showWorkflowDialog}
        onOpenChange={setShowWorkflowDialog}
        companyId={activeCompanyId ?? ""}
      />

      <FormBuilderDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        companyId={activeCompanyId ?? ""}
      />
    </div>
  );
}
