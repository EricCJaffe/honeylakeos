import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  FileText,
  Settings2,
  Search,
  Copy,
  Archive,
  RotateCcw,
  LayoutList,
  ClipboardList,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useWfWorkflows, useWfWorkflowMutations } from "@/hooks/useWorkflows";
import { useWfForms, useWfFormMutations } from "@/hooks/useWorkflowForms";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useMembership } from "@/lib/membership";
import { WorkflowFormDialog } from "./WorkflowFormDialog";
import { FormBuilderDialog } from "./FormBuilderDialog";
import { useAuditLog } from "@/hooks/useAuditLog";
import { StarterTemplateLibrary } from "@/components/workflows/StarterTemplateLibrary";
import type { WfStatus, WfScopeType } from "@/hooks/useWorkflowForms";

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { isCompanyAdmin, isSiteAdmin } = useMembership();
  const { log } = useAuditLog();
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"workflows" | "forms">("workflows");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WfStatus | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<WfScopeType | "all">("all");

  const { data: workflows, isLoading: workflowsLoading } = useWfWorkflows({
    companyId: activeCompanyId ?? undefined,
  });

  const { data: forms, isLoading: formsLoading } = useWfForms({
    companyId: activeCompanyId ?? undefined,
  });

  const { createWorkflow, archiveWorkflow } = useWfWorkflowMutations();
  const { createForm, archiveForm } = useWfFormMutations();

  const canManage = isCompanyAdmin;

  // Filter workflows
  const filteredWorkflows = useMemo(() => {
    if (!workflows) return [];
    return workflows.filter((wf) => {
      const matchesSearch =
        !searchQuery ||
        wf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wf.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || wf.status === statusFilter;
      const matchesScope = scopeFilter === "all" || wf.scope_type === scopeFilter;
      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [workflows, searchQuery, statusFilter, scopeFilter]);

  // Filter forms
  const filteredForms = useMemo(() => {
    if (!forms) return [];
    return forms.filter((form) => {
      const matchesSearch =
        !searchQuery ||
        form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || form.status === statusFilter;
      const matchesScope = scopeFilter === "all" || form.scope_type === scopeFilter;
      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [forms, searchQuery, statusFilter, scopeFilter]);

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

  const getScopeBadge = (scope: WfScopeType) => {
    switch (scope) {
      case "site":
        return <Badge variant="outline" className="text-xs">Site</Badge>;
      case "company":
        return <Badge variant="outline" className="text-xs">Company</Badge>;
      case "group":
        return <Badge variant="outline" className="text-xs">Group</Badge>;
      default:
        return null;
    }
  };

  const handleDuplicateWorkflow = async (workflow: typeof workflows[0]) => {
    await createWorkflow.mutateAsync({
      title: `${workflow.title} (Copy)`,
      description: workflow.description,
      trigger_type: workflow.trigger_type,
      scope_type: workflow.scope_type,
      company_id: workflow.company_id,
      site_id: workflow.site_id,
      group_id: workflow.group_id,
    });
    log("workflow.created", "workflow", workflow.id, { action: "duplicate" });
  };

  const handleDuplicateForm = async (form: typeof forms[0]) => {
    await createForm.mutateAsync({
      title: `${form.title} (Copy)`,
      description: form.description,
      scope_type: form.scope_type,
      company_id: form.company_id,
      site_id: form.site_id,
      group_id: form.group_id,
    });
    log("form.created", "form", form.id, { action: "duplicate" });
  };

  const handleArchiveWorkflow = async (workflowId: string) => {
    await archiveWorkflow.mutateAsync(workflowId);
    log("workflow.archived", "workflow", workflowId);
  };

  const handleArchiveForm = async (formId: string) => {
    await archiveForm.mutateAsync(formId);
    log("form.archived", "form", formId);
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {isSiteAdmin && (
          <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as typeof scopeFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              <SelectItem value="site">Site</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="group">Group</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="workflows" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Workflows
            {filteredWorkflows.length > 0 && (
              <Badge variant="secondary" className="ml-1">{filteredWorkflows.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="forms" className="gap-2">
            <FileText className="h-4 w-4" />
            Forms
            {filteredForms.length > 0 && (
              <Badge variant="secondary" className="ml-1">{filteredForms.length}</Badge>
            )}
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
          ) : filteredWorkflows.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWorkflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(`/app/workflows/${workflow.id}`)}
                      >
                        <CardTitle className="text-lg">{workflow.title}</CardTitle>
                        <CardDescription className="mt-1 capitalize">
                          {workflow.trigger_type.replace("_", " ")} trigger
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getScopeBadge(workflow.scope_type)}
                        {getStatusBadge(workflow.status)}
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <LayoutList className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateWorkflow(workflow);
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              {workflow.status !== "archived" && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveWorkflow(workflow.id);
                                  }}
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/app/workflows/runs?workflowId=${workflow.id}`);
                                }}
                              >
                                <ClipboardList className="mr-2 h-4 w-4" />
                                View Runs
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent onClick={() => navigate(`/app/workflows/${workflow.id}`)}>
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
              title="No workflows found"
              description={
                searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create your first workflow to automate processes like onboarding, approvals, and more."
              }
              actionLabel={canManage && !searchQuery ? "Create Workflow" : undefined}
              onAction={canManage && !searchQuery ? () => setShowWorkflowDialog(true) : undefined}
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
          ) : filteredForms.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredForms.map((form) => (
                <Card
                  key={form.id}
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(`/app/workflows/forms/${form.id}`)}
                      >
                        <CardTitle className="text-lg">{form.title}</CardTitle>
                        <CardDescription className="mt-1 capitalize">
                          {form.scope_type} form
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getScopeBadge(form.scope_type)}
                        {getStatusBadge(form.status)}
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <LayoutList className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateForm(form);
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              {form.status !== "archived" && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveForm(form.id);
                                  }}
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/app/workflows/forms/${form.id}?tab=submissions`);
                                }}
                              >
                                <ClipboardList className="mr-2 h-4 w-4" />
                                View Submissions
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent onClick={() => navigate(`/app/workflows/forms/${form.id}`)}>
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
              title="No forms found"
              description={
                searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create your first form to collect information from your team or clients."
              }
              actionLabel={canManage && !searchQuery ? "Create Form" : undefined}
              onAction={canManage && !searchQuery ? () => setShowFormDialog(true) : undefined}
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
