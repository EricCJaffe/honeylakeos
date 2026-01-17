import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Target, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleGuard } from "@/components/ModuleGuard";
import { EmptyState } from "@/components/EmptyState";
import { useSalesPipelines, useCreateDefaultPipeline } from "@/hooks/useSalesPipelines";
import { useSalesOpportunities } from "@/hooks/useSalesOpportunities";
import { PipelineBoard } from "@/components/sales/PipelineBoard";
import { OpportunityFormDialog } from "./OpportunityFormDialog";
import { Skeleton } from "@/components/ui/skeleton";

function SalesContent() {
  const navigate = useNavigate();
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [activePipelineId, setActivePipelineId] = useState<string | undefined>();

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openOpportunities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wonThisMonth.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Won Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${wonValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pipeline Tabs */}
      {pipelines.length > 1 ? (
        <Tabs value={selectedPipelineId} onValueChange={setActivePipelineId}>
          <TabsList>
            {pipelines.map((pipeline) => (
              <TabsTrigger key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
                {pipeline.is_default && " ★"}
              </TabsTrigger>
            ))}
          </TabsList>
          {pipelines.map((pipeline) => (
            <TabsContent key={pipeline.id} value={pipeline.id} className="mt-4">
              <PipelineBoard pipelineId={pipeline.id} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <PipelineBoard pipelineId={selectedPipelineId!} />
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
