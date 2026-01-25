import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Layers, MoreHorizontal, Pencil, Archive, Star, GripVertical } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModuleGuard } from "@/components/ModuleGuard";
import { EmptyState } from "@/components/EmptyState";
import {
  useSalesPipelines,
  usePipelineStages,
  useArchivePipeline,
  useUpdatePipeline,
  SalesPipeline,
} from "@/hooks/useSalesPipelines";
import { PipelineFormDialog } from "./PipelineFormDialog";
import { StagesManager } from "@/components/sales/StagesManager";
import { Skeleton } from "@/components/ui/skeleton";

function PipelinesContent() {
  const [showForm, setShowForm] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<SalesPipeline | null>(null);
  const [managingStagesPipeline, setManagingStagesPipeline] = useState<string | null>(null);

  const { data: pipelines = [], isLoading } = useSalesPipelines();
  const archivePipeline = useArchivePipeline();
  const updatePipeline = useUpdatePipeline();

  const handleEdit = (pipeline: SalesPipeline) => {
    setEditingPipeline(pipeline);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPipeline(null);
  };

  const handleSetDefault = async (pipeline: SalesPipeline) => {
    await updatePipeline.mutateAsync({ id: pipeline.id, is_default: true });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Pipelines"
          description="Configure sales pipelines and stages"
        />
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Pipeline
        </Button>
      </div>

      {pipelines.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Pipelines"
          description="Create a pipeline to organize your sales stages."
          actionLabel="Create Pipeline"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {pipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onEdit={() => handleEdit(pipeline)}
              onArchive={() => archivePipeline.mutate(pipeline.id)}
              onSetDefault={() => handleSetDefault(pipeline)}
              onManageStages={() => setManagingStagesPipeline(pipeline.id)}
            />
          ))}
        </motion.div>
      )}

      <PipelineFormDialog
        open={showForm}
        onOpenChange={handleCloseForm}
        pipeline={editingPipeline}
      />

      <StagesManager
        pipelineId={managingStagesPipeline}
        open={!!managingStagesPipeline}
        onOpenChange={(open) => !open && setManagingStagesPipeline(null)}
      />
    </div>
  );
}

function PipelineCard({
  pipeline,
  onEdit,
  onArchive,
  onSetDefault,
  onManageStages,
}: {
  pipeline: SalesPipeline;
  onEdit: () => void;
  onArchive: () => void;
  onSetDefault: () => void;
  onManageStages: () => void;
}) {
  const { data: stages = [] } = usePipelineStages(pipeline.id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{pipeline.name}</CardTitle>
            {pipeline.is_default && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3" />
                Default
              </Badge>
            )}
          </div>
          {pipeline.description && (
            <p className="text-sm text-muted-foreground mt-1">{pipeline.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onManageStages}>
              <GripVertical className="mr-2 h-4 w-4" />
              Manage Stages
            </DropdownMenuItem>
            {!pipeline.is_default && (
              <DropdownMenuItem onClick={onSetDefault}>
                <Star className="mr-2 h-4 w-4" />
                Set as Default
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onArchive} className="text-destructive">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {stages.map((stage) => (
            <Badge
              key={stage.id}
              variant={stage.is_closed_won ? "default" : stage.is_closed_lost ? "destructive" : "outline"}
              className="text-xs"
            >
              {stage.name}
              {stage.probability_percent != null && ` (${stage.probability_percent}%)`}
            </Badge>
          ))}
          {stages.length === 0 && (
            <span className="text-sm text-muted-foreground">No stages configured</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PipelinesPage() {
  return (
    <ModuleGuard moduleKey="sales" moduleName="Sales">
      <PipelinesContent />
    </ModuleGuard>
  );
}
