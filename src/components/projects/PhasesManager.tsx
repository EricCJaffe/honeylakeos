import * as React from "react";
import { useState } from "react";
import { Plus, GripVertical, Archive, Trash2, Edit2, Check, X, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
import { cn } from "@/lib/utils";
import {
  useProjectPhases,
  usePhaseMutations,
  usePhaseTemplates,
  ProjectPhase,
} from "@/hooks/useProjectPhases";

interface PhasesManagerProps {
  projectId: string;
}

export function PhasesManager({ projectId }: PhasesManagerProps) {
  const { data: phases = [], isLoading } = useProjectPhases(projectId);
  const { data: templates = [] } = usePhaseTemplates();
  const { createPhase, updatePhase, deletePhase, reorderPhases, applyTemplate } = usePhaseMutations(projectId);

  const [isAdding, setIsAdding] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<ProjectPhase | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const activePhases = phases.filter((p) => p.status === "active");
  const archivedPhases = phases.filter((p) => p.status === "archived");

  const handleAddPhase = () => {
    if (!newPhaseName.trim()) return;
    const maxOrder = phases.length > 0 ? Math.max(...phases.map((p) => p.sort_order)) : -1;
    createPhase.mutate({ name: newPhaseName.trim(), sortOrder: maxOrder + 1 });
    setNewPhaseName("");
    setIsAdding(false);
  };

  const handleStartEdit = (phase: ProjectPhase) => {
    setEditingId(phase.id);
    setEditingName(phase.name);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    updatePhase.mutate({ id: editingId, name: editingName.trim() });
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleArchive = (phase: ProjectPhase) => {
    updatePhase.mutate({ id: phase.id, status: "archived" });
  };

  const handleUnarchive = (phase: ProjectPhase) => {
    updatePhase.mutate({ id: phase.id, status: "active" });
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deletePhase.mutate(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  // Simple drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPhases = [...activePhases];
    const [dragged] = newPhases.splice(draggedIndex, 1);
    newPhases.splice(index, 0, dragged);

    // Update sort orders
    const updates = newPhases.map((p, i) => ({ id: p.id, sort_order: i }));
    reorderPhases.mutate(updates);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleApplyTemplate = (template: { name: string; phases: { name: string; sort_order: number }[] }) => {
    applyTemplate.mutate(template as any);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Phases</h3>
        <div className="flex gap-2">
          {templates.length > 0 && activePhases.length === 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <LayoutTemplate className="h-4 w-4 mr-1" />
                  Use Template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Apply Template</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {templates.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => handleApplyTemplate(template)}
                  >
                    {template.name} ({template.phases.length} phases)
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Phase
          </Button>
        </div>
      </div>

      {/* Active Phases */}
      <div className="space-y-1">
        {activePhases.map((phase, index) => (
          <div
            key={phase.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "flex items-center gap-2 p-2 rounded-md border bg-card group",
              draggedIndex === index && "opacity-50"
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

            {editingId === phase.id ? (
              <>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="h-7 flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{phase.name}</span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleStartEdit(phase)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleArchive(phase)}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add Phase Form */}
      {isAdding && (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
          <Input
            placeholder="Phase name"
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            className="h-7 flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddPhase();
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewPhaseName("");
              }
            }}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddPhase}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setIsAdding(false);
              setNewPhaseName("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Archived Phases */}
      {archivedPhases.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Archived</h4>
          <div className="space-y-1">
            {archivedPhases.map((phase) => (
              <div
                key={phase.id}
                className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 group"
              >
                <span className="flex-1 text-sm text-muted-foreground">{phase.name}</span>
                <Badge variant="secondary" className="text-xs">Archived</Badge>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleUnarchive(phase)}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteConfirm(phase)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {phases.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No phases yet. Add phases to organize your project tasks.
        </p>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Phase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? Tasks in this phase will become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
