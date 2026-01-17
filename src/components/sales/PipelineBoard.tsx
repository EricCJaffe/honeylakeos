import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GripVertical, User, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { usePipelineStages } from "@/hooks/useSalesPipelines";
import { useOpportunitiesByStage, useMoveOpportunityStage, SalesOpportunity } from "@/hooks/useSalesOpportunities";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PipelineBoardProps {
  pipelineId: string;
}

export function PipelineBoard({ pipelineId }: PipelineBoardProps) {
  const navigate = useNavigate();
  const { data: stages = [] } = usePipelineStages(pipelineId);
  const { byStage } = useOpportunitiesByStage(pipelineId);
  const moveStage = useMoveOpportunityStage();
  const [draggedOpp, setDraggedOpp] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData("text/plain", oppId);
    setDraggedOpp(oppId);
  };

  const handleDragEnd = () => {
    setDraggedOpp(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(stageId);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData("text/plain");
    if (oppId && stageId) {
      moveStage.mutate({ opportunityId: oppId, stageId });
    }
    setDragOverStage(null);
    setDraggedOpp(null);
  };

  const getStageColor = (stage: typeof stages[0]) => {
    if (stage.is_closed_won) return "bg-green-100 dark:bg-green-900/30 border-green-300";
    if (stage.is_closed_lost) return "bg-red-100 dark:bg-red-900/30 border-red-300";
    return "bg-muted/50";
  };

  const getStageValueTotal = (stageId: string) => {
    return (byStage[stageId] || []).reduce((sum, opp) => sum + (opp.value_amount || 0), 0);
  };

  return (
    <ScrollArea className="w-full pb-4">
      <div className="flex gap-4 min-w-max">
        {stages.map((stage) => (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "w-72 shrink-0 rounded-lg border p-3",
              getStageColor(stage),
              dragOverStage === stage.id && "ring-2 ring-primary"
            )}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{stage.name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{(byStage[stage.id] || []).length} deals</span>
                  {stage.probability_percent != null && (
                    <Badge variant="outline" className="text-xs">
                      {stage.probability_percent}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                ${getStageValueTotal(stage.id).toLocaleString()}
              </div>
            </div>

            <div className="space-y-2">
              {(byStage[stage.id] || []).map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  isDragging={draggedOpp === opp.id}
                  onDragStart={(e) => handleDragStart(e, opp.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => navigate(`/app/sales/opportunities/${opp.id}`)}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

interface OpportunityCardProps {
  opportunity: SalesOpportunity;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function OpportunityCard({ opportunity, isDragging, onDragStart, onDragEnd, onClick }: OpportunityCardProps) {
  const clientName =
    opportunity.crm_client?.person_full_name ||
    opportunity.crm_client?.org_name ||
    "No client linked";

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isDragging && "opacity-50 rotate-2"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground cursor-grab shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{opportunity.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <User className="h-3 w-3" />
              <span className="truncate">{clientName}</span>
            </div>
            {opportunity.value_amount != null && (
              <div className="flex items-center gap-1 text-sm font-semibold text-green-600 mt-1">
                <DollarSign className="h-3 w-3" />
                {opportunity.value_amount.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
