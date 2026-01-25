import { useState, useMemo } from "react";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Eye,
  Search,
  FileText,
  Filter,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Link2,
  Video,
  File,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  User,
  ClipboardCheck,
} from "lucide-react";
import { format, isBefore, isAfter, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDepartmentSOPs, useSOPMutations, type SOP } from "@/hooks/useSOPs";
import { useDepartmentResources, useResourceMutations, type Resource } from "@/hooks/useResources";
import { useDepartmentMembers } from "@/hooks/useDepartments";
import { useMembership } from "@/lib/membership";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { CreateSOPFormDialog } from "@/components/forms/CreateSOPFormDialog";
import { SOPDetailDialog } from "./SOPDetailDialog";
import { ResourceFormDialog } from "../resources/ResourceFormDialog";
import { CompleteReviewDialog } from "@/components/sop/CompleteReviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DepartmentResourcesTabProps {
  departmentId: string;
}

type SOPStatus = "draft" | "active" | "review_due" | "archived";

const getSOPStatus = (sop: SOP): SOPStatus => {
  if (sop.is_archived) return "archived";
  // Use database status if set to review_due
  if (sop.status === "review_due") return "review_due";
  // Also check next_review_at for overdue SOPs
  if (sop.next_review_at && isBefore(new Date(sop.next_review_at), new Date())) {
    return "review_due";
  }
  if (sop.status === "active" || (sop.current_version > 0 && sop.visibility === "company_public")) {
    return "active";
  }
  return "draft";
};

const statusConfig: Record<SOPStatus, { label: string; icon: typeof CheckCircle2; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", icon: FileText, variant: "secondary" },
  active: { label: "Active", icon: CheckCircle2, variant: "default" },
  review_due: { label: "Review Due", icon: AlertTriangle, variant: "destructive" },
  archived: { label: "Archived", icon: Clock, variant: "outline" },
};

const resourceTypeIcons: Record<string, typeof FileText> = {
  document: FileText,
  link: Link2,
  file: File,
  video: Video,
};

export function DepartmentResourcesTab({ departmentId }: DepartmentResourcesTabProps) {
  const { isCompanyAdmin } = useMembership();
  const { data: members } = useDepartmentMembers(departmentId);
  const { data: sops, isLoading: isLoadingSOPs } = useDepartmentSOPs(departmentId);
  const { data: resources, isLoading: isLoadingResources } = useDepartmentResources(departmentId);
  const { deleteSOP } = useSOPMutations();
  const { deleteResource } = useResourceMutations();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [toolFilter, setToolFilter] = useState<string>("all");
  const [reviewDateFilter, setReviewDateFilter] = useState<string>("all");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    active: true,
    draft: true,
    review_due: true,
    archived: false,
  });

  // Permission checks
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });
  const isManager = members?.some(
    (m) => m.user_id === currentUser?.id && m.role === "manager"
  );
  const canManage = isCompanyAdmin || isManager;

  // Get all unique roles and tools from SOPs
  const allRoles = useMemo(() => {
    const roles = new Set<string>();
    sops?.forEach((sop) => {
      if (sop.owner_role) roles.add(sop.owner_role);
    });
    return Array.from(roles).sort();
  }, [sops]);

  const allTools = useMemo(() => {
    const tools = new Set<string>();
    sops?.forEach((sop) => {
      sop.tools_systems?.forEach((tool) => tools.add(tool));
    });
    return Array.from(tools).sort();
  }, [sops]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    sops?.forEach((sop) => {
      sop.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [sops]);

  // Filter SOPs
  const filteredSOPs = useMemo(() => {
    if (!sops) return [];

    return sops.filter((sop) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          sop.title.toLowerCase().includes(query) ||
          sop.purpose?.toLowerCase().includes(query) ||
          sop.scope?.toLowerCase().includes(query) ||
          sop.owner_role?.toLowerCase().includes(query) ||
          sop.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
          sop.tools_systems?.some((tool) => tool.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Role filter
      if (roleFilter !== "all" && sop.owner_role !== roleFilter) {
        return false;
      }

      // Tool filter
      if (toolFilter !== "all" && !sop.tools_systems?.includes(toolFilter)) {
        return false;
      }

      // Review date filter
      if (reviewDateFilter !== "all" && sop.last_reviewed_at) {
        const lastReviewed = new Date(sop.last_reviewed_at);
        const now = new Date();
        switch (reviewDateFilter) {
          case "last_30":
            if (isBefore(lastReviewed, subDays(now, 30))) return false;
            break;
          case "last_90":
            if (isBefore(lastReviewed, subDays(now, 90))) return false;
            break;
          case "last_year":
            if (isBefore(lastReviewed, subDays(now, 365))) return false;
            break;
          case "never":
            if (sop.last_reviewed_at) return false;
            break;
        }
      }

      // Non-admins can only see published/active SOPs
      if (!canManage) {
        const status = getSOPStatus(sop);
        if (status === "draft" || status === "archived") return false;
      }

      return true;
    });
  }, [sops, searchQuery, roleFilter, toolFilter, reviewDateFilter, canManage]);

  // Group SOPs by status
  const groupedSOPs = useMemo(() => {
    const groups: Record<SOPStatus, SOP[]> = {
      active: [],
      draft: [],
      review_due: [],
      archived: [],
    };

    filteredSOPs.forEach((sop) => {
      const status = getSOPStatus(sop);
      groups[status].push(sop);
    });

    return groups;
  }, [filteredSOPs]);

  // Group SOPs by tag/category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, SOP[]> = { Uncategorized: [] };

    filteredSOPs.forEach((sop) => {
      if (sop.tags && sop.tags.length > 0) {
        // Use the first tag as the primary category
        const category = sop.tags[0];
        if (!groups[category]) groups[category] = [];
        groups[category].push(sop);
      } else {
        groups["Uncategorized"].push(sop);
      }
    });

    return groups;
  }, [filteredSOPs]);

  // State management
  const [sopFormOpen, setSOPFormOpen] = useState(false);
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);
  const [viewingSOP, setViewingSOP] = useState<string | null>(null);
  const [deletingSOPId, setDeletingSOPId] = useState<string | null>(null);
  const [reviewingSOP, setReviewingSOP] = useState<SOP | null>(null);

  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);

  const [groupBy, setGroupBy] = useState<"status" | "category">("status");

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEditSOP = (sop: SOP) => {
    setEditingSOP(sop);
    setSOPFormOpen(true);
  };

  const handleDeleteSOP = async () => {
    if (deletingSOPId) {
      await deleteSOP.mutateAsync(deletingSOPId);
      setDeletingSOPId(null);
    }
  };

  const handleDeleteResource = async () => {
    if (deletingResourceId) {
      await deleteResource.mutateAsync(deletingResourceId);
      setDeletingResourceId(null);
    }
  };

  const hasActiveFilters = roleFilter !== "all" || toolFilter !== "all" || reviewDateFilter !== "all";

  const clearFilters = () => {
    setRoleFilter("all");
    setToolFilter("all");
    setReviewDateFilter("all");
    setSearchQuery("");
  };

  if (isLoadingSOPs || isLoadingResources) {
    return <ListSkeleton count={5} />;
  }

  const renderSOPCard = (sop: SOP) => {
    const status = getSOPStatus(sop);
    const StatusIcon = statusConfig[status].icon;

    return (
      <Card key={sop.id} className="hover:bg-muted/30 transition-colors">
        <CardContent className="flex items-center justify-between p-4">
          <div
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => setViewingSOP(sop.id)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{sop.title}</p>
                <Badge variant="outline" className="text-xs">
                  v{sop.current_version}
                </Badge>
                <Badge variant={statusConfig[status].variant} className="text-xs">
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {statusConfig[status].label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                {sop.owner_role && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {sop.owner_role}
                  </span>
                )}
                {sop.tools_systems && sop.tools_systems.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {sop.tools_systems.slice(0, 2).join(", ")}
                      {sop.tools_systems.length > 2 && ` +${sop.tools_systems.length - 2}`}
                    </span>
                  </>
                )}
                {sop.last_reviewed_at && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Reviewed {format(new Date(sop.last_reviewed_at), "MMM d, yyyy")}
                    </span>
                  </>
                )}
              </div>
              {sop.tags && sop.tags.length > 0 && (
                <div className="flex gap-1 mt-1">
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
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewingSOP(sop.id)}
            >
              <Eye className="h-4 w-4" />
            </Button>

            {canManage && (
              <>
                {status === "review_due" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReviewingSOP(sop);
                    }}
                  >
                    <ClipboardCheck className="mr-1 h-3 w-3" />
                    Complete Review
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setReviewingSOP(sop)}>
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Complete Review
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditSOP(sop)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeletingSOPId(sop.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSOPGroup = (status: SOPStatus, sopsInGroup: SOP[]) => {
    if (sopsInGroup.length === 0) return null;

    const config = statusConfig[status];
    const Icon = config.icon;
    const isExpanded = expandedGroups[status] ?? true;

    return (
      <Collapsible key={status} open={isExpanded} onOpenChange={() => toggleGroup(status)}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Icon className="h-4 w-4" />
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {sopsInGroup.length}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2 ml-4">
          {sopsInGroup.map(renderSOPCard)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderCategoryGroup = (category: string, sopsInGroup: SOP[]) => {
    if (sopsInGroup.length === 0) return null;

    const isExpanded = expandedGroups[category] ?? true;

    return (
      <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleGroup(category)}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <CardTitle className="text-sm font-medium">{category}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {sopsInGroup.length}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2 ml-4">
          {sopsInGroup.map(renderSOPCard)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sops" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="sops" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              SOPs ({filteredSOPs.length})
            </TabsTrigger>
            <TabsTrigger value="other" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Other Resources ({resources?.length || 0})
            </TabsTrigger>
          </TabsList>

          {canManage && (
            <div className="flex items-center gap-2">
              <Button onClick={() => setSOPFormOpen(true)}>
                <BookOpen className="mr-2 h-4 w-4" />
                Create SOP
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Resource
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setResourceFormOpen(true)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Add Document/Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <TabsContent value="sops" className="space-y-4 mt-0">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search SOPs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "status" | "category")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">By Status</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {allRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={toolFilter} onValueChange={setToolFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Filter by Tool" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tools</SelectItem>
                  {allTools.map((tool) => (
                    <SelectItem key={tool} value={tool}>
                      {tool}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={reviewDateFilter} onValueChange={setReviewDateFilter}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Last Reviewed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Review Date</SelectItem>
                  <SelectItem value="last_30">Last 30 Days</SelectItem>
                  <SelectItem value="last_90">Last 90 Days</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="never">Never Reviewed</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-8">
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {/* SOP List */}
          {filteredSOPs.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No SOPs found"
              description={
                searchQuery || hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : canManage
                  ? "Create Standard Operating Procedures to document your department's processes."
                  : "No Standard Operating Procedures have been added to this department yet."
              }
              actionLabel={!searchQuery && !hasActiveFilters && canManage ? "Create SOP" : undefined}
              onAction={!searchQuery && !hasActiveFilters && canManage ? () => setSOPFormOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-3">
              {groupBy === "status" ? (
                <>
                  {renderSOPGroup("review_due", groupedSOPs.review_due)}
                  {renderSOPGroup("active", groupedSOPs.active)}
                  {renderSOPGroup("draft", groupedSOPs.draft)}
                  {renderSOPGroup("archived", groupedSOPs.archived)}
                </>
              ) : (
                Object.entries(groupedByCategory)
                  .sort(([a], [b]) => (a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : a.localeCompare(b)))
                  .map(([category, sopsInCategory]) => renderCategoryGroup(category, sopsInCategory))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="other" className="space-y-4 mt-0">
          {!resources?.length ? (
            <EmptyState
              icon={FileText}
              title="No other resources yet"
              description={
                canManage
                  ? "Add documents, links, or files for this department."
                  : "No resources have been added to this department yet."
              }
              actionLabel={canManage ? "Add Resource" : undefined}
              onAction={canManage ? () => setResourceFormOpen(true) : undefined}
            />
          ) : (
            <div className="space-y-2">
              {resources.map((resource) => {
                const Icon = resourceTypeIcons[resource.resource_type] || FileText;

                return (
                  <Card key={resource.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{resource.title}</p>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {resource.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {resource.resource_type}
                        </Badge>

                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingResource(resource);
                                  setResourceFormOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingResourceId(resource.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* SOP Form Dialog */}
      <CreateSOPFormDialog
        open={sopFormOpen}
        onOpenChange={() => {
          setSOPFormOpen(false);
          setEditingSOP(null);
        }}
        departmentId={departmentId}
        editingSOP={editingSOP}
      />

      {/* SOP Detail Dialog */}
      {viewingSOP && (
        <SOPDetailDialog
          open={!!viewingSOP}
          onOpenChange={() => setViewingSOP(null)}
          sopId={viewingSOP}
          onEdit={
            canManage
              ? () => {
                  const sop = sops?.find((s) => s.id === viewingSOP);
                  if (sop) {
                    setViewingSOP(null);
                    handleEditSOP(sop);
                  }
                }
              : undefined
          }
        />
      )}

      {/* Resource Form Dialog */}
      <ResourceFormDialog
        open={resourceFormOpen}
        onOpenChange={() => {
          setResourceFormOpen(false);
          setEditingResource(null);
        }}
        departmentId={departmentId}
        editingResource={editingResource}
      />

      {/* Delete SOP Confirmation */}
      <AlertDialog open={!!deletingSOPId} onOpenChange={() => setDeletingSOPId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SOP?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this Standard Operating Procedure and all its revision history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSOP}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Resource Confirmation */}
      <AlertDialog open={!!deletingResourceId} onOpenChange={() => setDeletingResourceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this resource. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteResource}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Review Dialog */}
      {reviewingSOP && (
        <CompleteReviewDialog
          open={!!reviewingSOP}
          onOpenChange={(open) => !open && setReviewingSOP(null)}
          sop={reviewingSOP}
          onSuccess={() => setReviewingSOP(null)}
          onEditAndPublish={() => {
            const sopToEdit = reviewingSOP;
            setReviewingSOP(null);
            handleEditSOP(sopToEdit);
          }}
        />
      )}
    </div>
  );
}
