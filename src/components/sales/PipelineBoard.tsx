import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GripVertical, User, DollarSign, Building2, MoreHorizontal, Pencil, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePipelineStages } from "@/hooks/useSalesPipelines";
import { useOpportunitiesByStage, useMoveOpportunityStage, SalesOpportunity } from "@/hooks/useSalesOpportunities";
import { cn } from "@/lib/utils";
import { OpportunityFormDialog } from "@/pages/app/sales/OpportunityFormDialog";

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
  const [editingOpportunity, setEditingOpportunity] = useState<SalesOpportunity | null>(null);

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
                  onEdit={() => setEditingOpportunity(opp)}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
      
      {/* Edit Dialog */}
      <OpportunityFormDialog
        open={!!editingOpportunity}
        onOpenChange={(open) => !open && setEditingOpportunity(null)}
        opportunity={editingOpportunity || undefined}
        pipelineId={pipelineId}
      />
    </ScrollArea>
  );
}

// Helper to get the best display name for a client
function getClientDisplayName(client: SalesOpportunity["crm_client"]): string {
  if (!client) return "No client linked";
  // Prefer org name for organizations, person name for individuals
  if (client.type === "organization" || client.type === "b2b") {
    return client.org_name || client.person_full_name || "Unnamed";
  }
  return client.person_full_name || client.org_name || "Unnamed";
}

interface OpportunityCardProps {
  opportunity: SalesOpportunity;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onEdit: () => void;
}

function OpportunityCard({ opportunity, isDragging, onDragStart, onDragEnd, onClick, onEdit }: OpportunityCardProps) {
  const clientName = getClientDisplayName(opportunity.crm_client);
  const isOrg = opportunity.crm_client?.type === "organization" || opportunity.crm_client?.type === "b2b";

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md group",
        isDragging && "opacity-50 rotate-2"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground cursor-grab shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="font-medium truncate flex-1">{opportunity.name}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditClick}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onClick}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {isOrg ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
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
