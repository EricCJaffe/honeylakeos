import * as React from "react";
import { useState } from "react";
import { Bookmark, MoreHorizontal, Pencil, Trash2, Plus, Lock, Users } from "lucide-react";
import { useSavedViews, useSavedViewMutations, SavedView, SavedViewModule, SavedViewConfig } from "@/hooks/useSavedViews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SavedViewsSectionProps {
  module: SavedViewModule;
  selectedViewId: string | null;
  onSelectView: (view: SavedView | null) => void;
  currentConfig?: SavedViewConfig;
}

export function SavedViewsSection({
  module,
  selectedViewId,
  onSelectView,
  currentConfig,
}: SavedViewsSectionProps) {
  const { data: views = [], isLoading } = useSavedViews(module);
  const { create, update, remove, canCreateCompanyView } = useSavedViewMutations(module);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewPersonal, setNewViewPersonal] = useState(true);
  const [renamingView, setRenamingView] = useState<SavedView | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const personalViews = views.filter((v) => v.is_personal);
  const companyViews = views.filter((v) => !v.is_personal);

  const handleSaveView = () => {
    if (!newViewName.trim() || !currentConfig) return;
    
    create.mutate(
      {
        module,
        name: newViewName.trim(),
        is_personal: newViewPersonal,
        config: currentConfig,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setNewViewName("");
          setNewViewPersonal(true);
        },
      }
    );
  };

  const handleRename = () => {
    if (!renamingView || !renameValue.trim()) return;
    
    update.mutate(
      { id: renamingView.id, name: renameValue.trim() },
      {
        onSuccess: () => {
          setRenamingView(null);
          setRenameValue("");
        },
      }
    );
  };

  const renderView = (view: SavedView) => {
    const isSelected = selectedViewId === view.id;
    
    return (
      <div
        key={view.id}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors group text-sm",
          isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
        )}
        onClick={() => onSelectView(isSelected ? null : view)}
      >
        <Bookmark className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{view.name}</span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setRenamingView(view);
                setRenameValue(view.name);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (selectedViewId === view.id) onSelectView(null);
                remove.mutate(view.id);
              }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-1 py-2">
        <div className="h-6 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (views.length === 0 && !currentConfig) {
    return null;
  }

  return (
    <div className="space-y-1">
      {/* Section header */}
      <div className="flex items-center justify-between px-2 pt-3 pb-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <Bookmark className="h-3 w-3" />
          Saved Views
        </div>
        {currentConfig && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => setIsCreateOpen(true)}
            title="Save current view"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Personal views */}
      {personalViews.length > 0 && (
        <div className="space-y-0.5">
          {personalViews.map(renderView)}
        </div>
      )}

      {/* Company views */}
      {companyViews.length > 0 && (
        <div className="space-y-0.5 pt-1">
          {companyViews.map(renderView)}
        </div>
      )}

      {views.length === 0 && (
        <p className="text-xs text-muted-foreground px-2 py-1">No saved views</p>
      )}

      {/* Create view dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">Name</Label>
              <Input
                id="view-name"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="My view"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {newViewPersonal ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="personal-toggle">
                  {newViewPersonal ? "Personal view" : "Company view"}
                </Label>
              </div>
              <Switch
                id="personal-toggle"
                checked={!newViewPersonal}
                onCheckedChange={(checked) => setNewViewPersonal(!checked)}
                disabled={!canCreateCompanyView}
              />
            </div>
            {!canCreateCompanyView && !newViewPersonal && (
              <p className="text-xs text-muted-foreground">
                Only admins can create company-wide views.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveView} disabled={!newViewName.trim() || create.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renamingView} onOpenChange={(open) => !open && setRenamingView(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename View</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="View name"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingView(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim() || update.isPending}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
