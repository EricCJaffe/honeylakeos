import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  FileText,
  Settings2,
  Search,
  Copy,
  Archive,
  LayoutList,
  ClipboardList,
  BookOpen,
  Pencil,
  Trash2,
  Eye,
  User,
  Wrench,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useWfWorkflows, useWfWorkflowMutations } from "@/hooks/useWorkflows";
import { useWfForms, useWfFormMutations } from "@/hooks/useWorkflowForms";
import { useAllSOPs, useSOPMutations, type SOP } from "@/hooks/useSOPs";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useMembership } from "@/lib/membership";
import { WorkflowFormDialog } from "./WorkflowFormDialog";
import { FormBuilderDialog } from "./FormBuilderDialog";
import { CreateSOPFormDialog } from "@/components/forms/CreateSOPFormDialog";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { WfStatus, WfScopeType } from "@/hooks/useWorkflowForms";
import { format, isBefore } from "date-fns";

type SOPStatus = "draft" | "active" | "review_due" | "archived";

const getSOPStatus = (sop: SOP): SOPStatus => {
  if (sop.is_archived) return "archived";
  if (sop.status === "review_due") return "review_due";
  if (sop.next_review_at && isBefore(new Date(sop.next_review_at), new Date())) {
    return "review_due";
  }
  if (sop.status === "active" || (sop.current_version > 0 && sop.visibility === "company_public")) {
    return "active";
  }
  return "draft";
};

const sopStatusConfig: Record<SOPStatus, { label: string; icon: typeof CheckCircle2; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", icon: FileText, variant: "secondary" },
  active: { label: "Active", icon: CheckCircle2, variant: "default" },
  review_due: { label: "Review Due", icon: AlertTriangle, variant: "destructive" },
  archived: { label: "Archived", icon: Clock, variant: "outline" },
};

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { isCompanyAdmin, isSiteAdmin } = useMembership();
  const { log } = useAuditLog();
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showSOPDialog, setShowSOPDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"workflows" | "forms" | "sops">("workflows");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WfStatus | "all">("all");
  const [scopeFilter, setScopeFilter] = useState<WfScopeType | "all">("all");
  const [sopStatusFilter, setSOPStatusFilter] = useState<SOPStatus | "all">("all");
  const [deletingSOPId, setDeletingSOPId] = useState<string | null>(null);

  const { data: workflows, isLoading: workflowsLoading } = useWfWorkflows({
    companyId: activeCompanyId ?? undefined,
  });

  const { data: forms, isLoading: formsLoading } = useWfForms({
    companyId: activeCompanyId ?? undefined,
  });

  const { data: sops, isLoading: sopsLoading } = useAllSOPs();

  const { createWorkflow, archiveWorkflow } = useWfWorkflowMutations();
  const { createForm, archiveForm } = useWfFormMutations();
  const { deleteSOP, archiveSOP } = useSOPMutations();

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

  // Filter SOPs
  const filteredSOPs = useMemo(() => {
    if (!sops) return [];
    return sops.filter((sop) => {
      const matchesSearch =
        !searchQuery ||
        sop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sop.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sop.scope?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const status = getSOPStatus(sop);
      const matchesStatus = sopStatusFilter === "all" || status === sopStatusFilter;
      
      // Non-admins only see active SOPs
      if (!canManage && (status === "draft" || status === "archived")) {
        return false;
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [sops, searchQuery, sopStatusFilter, canManage]);

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

  const handleDeleteSOP = async () => {
    if (deletingSOPId) {
      await deleteSOP.mutateAsync(deletingSOPId);
      setDeletingSOPId(null);
    }
  };

  const handleArchiveSOP = async (sopId: string) => {
    await archiveSOP.mutateAsync(sopId);
  };

  const renderSOPCard = (sop: SOP) => {
    const status = getSOPStatus(sop);
    const StatusIcon = sopStatusConfig[status].icon;

    return (
      <Card
        key={sop.id}
        className="cursor-pointer hover:shadow-md transition-shadow group"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div
              className="flex-1 cursor-pointer"
              onClick={() => navigate(`/app/departments/${sop.department_id}?tab=resources&sop=${sop.id}`)}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">{sop.title}</CardTitle>
              </div>
              {sop.department && (
                <CardDescription className="mt-1">
                  {sop.department.name}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">v{sop.current_version}</Badge>
              <Badge variant={sopStatusConfig[status].variant}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {sopStatusConfig[status].label}
              </Badge>
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
                        navigate(`/app/departments/${sop.department_id}?tab=resources&sop=${sop.id}`);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/departments/${sop.department_id}?tab=resources&edit=${sop.id}`);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    {status !== "archived" && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveSOP(sop.id);
                        }}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingSOPId(sop.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent onClick={() => navigate(`/app/departments/${sop.department_id}?tab=resources&sop=${sop.id}`)}>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {sop.purpose || "No description"}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {sop.owner_role && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {sop.owner_role}
              </span>
            )}
            {sop.tools_systems && sop.tools_systems.length > 0 && (
              <span className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {sop.tools_systems.slice(0, 2).join(", ")}
                {sop.tools_systems.length > 2 && ` +${sop.tools_systems.length - 2}`}
              </span>
            )}
            {sop.last_reviewed_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Reviewed {format(new Date(sop.last_reviewed_at), "MMM d, yyyy")}
              </span>
            )}
          </div>
          {sop.tags && sop.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {sop.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs py-0">
                  {tag}
                </Badge>
              ))}
              {sop.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs py-0">
                  +{sop.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Workflows & Forms"
          description="Build automated workflows, forms, and SOPs for your organization"
        />
        {canManage && (
          <div className="flex gap-2">
            {activeTab === "sops" ? (
              <Button onClick={() => setShowSOPDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New SOP
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowFormDialog(true)}>
                  <FileText className="mr-2 h-4 w-4" />
                  New Form
                </Button>
                <Button onClick={() => setShowWorkflowDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Workflow
                </Button>
              </>
            )}
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
        {activeTab === "sops" ? (
          <Select value={sopStatusFilter} onValueChange={(v) => setSOPStatusFilter(v as typeof sopStatusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="review_due">Review Due</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <>
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
          </>
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
          <TabsTrigger value="sops" className="gap-2">
            <BookOpen className="h-4 w-4" />
            SOPs
            {filteredSOPs.length > 0 && (
              <Badge variant="secondary" className="ml-1">{filteredSOPs.length}</Badge>
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

        <TabsContent value="sops" className="mt-6">
          {sopsLoading ? (
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
          ) : filteredSOPs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSOPs.map(renderSOPCard)}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No SOPs found"
              description={
                searchQuery || sopStatusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create your first Standard Operating Procedure to document processes for your team."
              }
              actionLabel={canManage && !searchQuery ? "Create SOP" : undefined}
              onAction={canManage && !searchQuery ? () => setShowSOPDialog(true) : undefined}
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

      {canManage && (
        <CreateSOPFormDialog
          open={showSOPDialog}
          onOpenChange={setShowSOPDialog}
          onSuccess={() => setShowSOPDialog(false)}
        />
      )}

      <AlertDialog open={!!deletingSOPId} onOpenChange={() => setDeletingSOPId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOP</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this SOP? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSOP} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
