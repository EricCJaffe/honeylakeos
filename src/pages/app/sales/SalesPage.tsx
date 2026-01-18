import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Target, TrendingUp, DollarSign, BarChart3, LayoutGrid, List } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ModuleGuard } from "@/components/ModuleGuard";
import { EmptyState } from "@/components/EmptyState";
import { useSalesPipelines, useCreateDefaultPipeline } from "@/hooks/useSalesPipelines";
import { useSalesOpportunities } from "@/hooks/useSalesOpportunities";
import { PipelineBoard } from "@/components/sales/PipelineBoard";
import { OpportunityListView } from "@/components/sales/OpportunityListView";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ViewMode = "board" | "list";
type ListFilter = "all" | "open" | "won" | "lost";

function SalesContent() {
  const navigate = useNavigate();
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [activePipelineId, setActivePipelineId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [listFilter, setListFilter] = useState<ListFilter>("all");

  const { data: pipelines = [], isLoading: pipelinesLoading } = useSalesPipelines();
  const { data: opportunities = [], isLoading: opportunitiesLoading } = useSalesOpportunities(activePipelineId);
  const createDefaultPipeline = useCreateDefaultPipeline();

  const defaultPipeline = pipelines.find((p) => p.is_default) || pipelines[0];
  const selectedPipelineId = activePipelineId || defaultPipeline?.id;

  // Stats
  const openOpportunities = opportunities.filter((o) => o.status === "open");
  const totalValue = openOpportunities.reduce((sum, o) => sum + (o.value_amount || 0), 0);
  const wonThisMonth = opportunities.filter(
    (o) => o.status === "won" && o.closed_at && new Date(o.closed_at).getMonth() === new Date().getMonth()
  );
  const wonValue = wonThisMonth.reduce((sum, o) => sum + (o.value_amount || 0), 0);

  const isLoading = pipelinesLoading || opportunitiesLoading;

  // Handle stat card click to switch to list view with filter
  const handleStatCardClick = (filter: ListFilter) => {
    setViewMode("list");
    setListFilter(filter);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <PageHeader title="Sales" description="Manage your sales pipeline and opportunities" />
        <EmptyState
          icon={Target}
          title="No Sales Pipeline"
          description="Create a sales pipeline to start tracking opportunities and deals."
          actionLabel={createDefaultPipeline.isPending ? "Creating..." : "Create Default Pipeline"}
          onAction={() => createDefaultPipeline.mutate()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Sales" description="Manage your sales pipeline and opportunities" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/app/sales/campaigns")}>
            Campaigns
          </Button>
          <Button variant="outline" onClick={() => navigate("/app/sales/pipelines")}>
            Manage Pipelines
          </Button>
          <Button onClick={() => setShowOpportunityForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Opportunity
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 md:grid-cols-4"
      >
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
            viewMode === "list" && listFilter === "open" && "ring-2 ring-primary"
          )}
          onClick={() => handleStatCardClick("open")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openOpportunities.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to view list</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
            viewMode === "list" && listFilter === "all" && "ring-2 ring-primary"
          )}
          onClick={() => handleStatCardClick("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Click to view all</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
            viewMode === "list" && listFilter === "won" && "ring-2 ring-primary"
          )}
          onClick={() => handleStatCardClick("won")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wonThisMonth.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to view won</p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
            viewMode === "list" && listFilter === "lost" && "ring-2 ring-primary"
          )}
          onClick={() => handleStatCardClick("lost")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Won Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${wonValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Click to view lost</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {pipelines.length > 1 && (
            <Tabs value={selectedPipelineId} onValueChange={setActivePipelineId}>
              <TabsList>
                {pipelines.map((pipeline) => (
                  <TabsTrigger key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                    {pipeline.is_default && " ★"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as ViewMode)}
          className="border rounded-lg"
        >
          <ToggleGroupItem value="board" aria-label="Board view" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Board
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" className="gap-2">
            <List className="h-4 w-4" />
            List
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* List Filter Tabs (only show in list view) */}
      {viewMode === "list" && (
        <Tabs value={listFilter} onValueChange={(v) => setListFilter(v as ListFilter)}>
          <TabsList>
            <TabsTrigger value="all">All ({opportunities.length})</TabsTrigger>
            <TabsTrigger value="open">Open ({openOpportunities.length})</TabsTrigger>
            <TabsTrigger value="won">Won ({opportunities.filter(o => o.status === "won").length})</TabsTrigger>
            <TabsTrigger value="lost">Lost ({opportunities.filter(o => o.status === "lost").length})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Content View */}
      {viewMode === "board" ? (
        <PipelineBoard pipelineId={selectedPipelineId!} />
      ) : (
        <OpportunityListView
          opportunities={opportunities}
          pipelineId={selectedPipelineId!}
          filter={listFilter}
        />
      )}

      <OpportunityFormDialog
        open={showOpportunityForm}
        onOpenChange={setShowOpportunityForm}
        pipelineId={selectedPipelineId}
      />
    </div>
  );
}

export default function SalesPage() {
  return (
    <ModuleGuard moduleKey="sales" moduleName="Sales">
      <SalesContent />
    </ModuleGuard>
  );
}
