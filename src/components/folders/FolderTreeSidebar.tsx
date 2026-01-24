import * as React from "react";
import { useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
  Lock,
  Users,
  FileStack,
} from "lucide-react";
import { useFolders, useFolderMutations, Folder as FolderType, FolderScope } from "@/hooks/useFolders";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type FolderFilter = "all" | "unfiled" | string;

interface FolderTreeSidebarProps {
  selectedFilter: FolderFilter;
  onSelectFilter: (filter: FolderFilter) => void;
  itemCounts?: Record<string, number>;
  unfiledCount?: number;
  totalCount?: number;
}

export function FolderTreeSidebar({
  selectedFilter,
  onSelectFilter,
  itemCounts = {},
  unfiledCount = 0,
  totalCount = 0,
}: FolderTreeSidebarProps) {
  const { isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const { data: folderTree, isLoading } = useFolders();
  const { create, update, remove } = useFolderMutations();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingIn, setCreatingIn] = useState<{ parentId: string | null; scope: FolderScope } | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  const companyFolders = folderTree?.companyFolders ?? [];
  const personalFolders = folderTree?.personalFolders ?? [];

  const toggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const canEdit = (folder: FolderType) => {
    if (folder.scope === "personal") return folder.owner_user_id === user?.id;
    return isCompanyAdmin || folder.created_by === user?.id;
  };

  const handleRename = (folder: FolderType) => {
    setRenamingFolder(folder.id);
    setRenameValue(folder.name);
  };

  const submitRename = () => {
    if (renamingFolder && renameValue.trim()) {
      update.mutate({ id: renamingFolder, name: renameValue.trim() });
    }
    setRenamingFolder(null);
    setRenameValue("");
  };

  const handleCreateSubfolder = (parentId: string | null, scope: FolderScope) => {
    setCreatingIn({ parentId, scope });
    setNewFolderName("");
    if (parentId) {
      setExpandedFolders((prev) => new Set(prev).add(parentId));
    }
  };

  const submitCreate = () => {
    if (creatingIn && newFolderName.trim()) {
      create.mutate({
        name: newFolderName.trim(),
        scope: creatingIn.scope,
        parent_folder_id: creatingIn.parentId,
      });
    }
    setCreatingIn(null);
    setNewFolderName("");
  };

  const renderFolder = (folder: FolderType, depth: number = 0): React.ReactNode => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFilter === folder.id;
    const isRenaming = renamingFolder === folder.id;
    const count = itemCounts[folder.id] ?? 0;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors group text-sm",
            isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
          )}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => !isRenaming && onSelectFilter(folder.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5 hover:bg-muted-foreground/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          {isRenaming ? (
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") setRenamingFolder(null);
              }}
              onBlur={submitRename}
              autoFocus
              className="h-6 text-sm py-0 px-1"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate">{folder.name}</span>
          )}

          {count > 0 && !isRenaming && (
            <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
          )}

          {canEdit(folder) && !isRenaming && (
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
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleCreateSubfolder(folder.id, folder.scope)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Subfolder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRename(folder)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => remove.mutate(folder.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Show create input inside folder if creating subfolder */}
        {creatingIn?.parentId === folder.id && isExpanded && (
          <div
            className="flex items-center gap-1 px-2 py-1"
            style={{ paddingLeft: `${8 + (depth + 1) * 12}px` }}
          >
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
                if (e.key === "Escape") setCreatingIn(null);
              }}
              onBlur={() => {
                if (newFolderName.trim()) submitCreate();
                else setCreatingIn(null);
              }}
              autoFocus
              placeholder="Folder name"
              className="h-6 text-sm py-0 px-1"
            />
          </div>
        )}

        {hasChildren && isExpanded && (
          <div>{folder.children!.map((child) => renderFolder(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* All items */}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm",
          selectedFilter === "all" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
        )}
        onClick={() => onSelectFilter("all")}
      >
        <FileStack className="h-4 w-4" />
        <span className="flex-1">All</span>
        {totalCount > 0 && <span className="text-xs text-muted-foreground tabular-nums">{totalCount}</span>}
      </div>

      {/* Unfiled */}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm",
          selectedFilter === "unfiled" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
        )}
        onClick={() => onSelectFilter("unfiled")}
      >
        <Folder className="h-4 w-4" />
        <span className="flex-1">Unfiled</span>
        {unfiledCount > 0 && <span className="text-xs text-muted-foreground tabular-nums">{unfiledCount}</span>}
      </div>

      {/* Company Folders */}
      <div className="pt-3">
        <div className="flex items-center justify-between px-2 mb-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Users className="h-3 w-3" />
            Company
          </div>
          {isCompanyAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => handleCreateSubfolder(null, "company")}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
        {companyFolders.length === 0 && !creatingIn ? (
          <p className="text-xs text-muted-foreground px-2 py-1">No folders</p>
        ) : (
          companyFolders.map((folder) => renderFolder(folder))
        )}
        {creatingIn?.parentId === null && creatingIn?.scope === "company" && (
          <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: "20px" }}>
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
                if (e.key === "Escape") setCreatingIn(null);
              }}
              onBlur={() => {
                if (newFolderName.trim()) submitCreate();
                else setCreatingIn(null);
              }}
              autoFocus
              placeholder="Folder name"
              className="h-6 text-sm py-0 px-1"
            />
          </div>
        )}
      </div>

      {/* Personal Folders */}
      <div className="pt-3">
        <div className="flex items-center justify-between px-2 mb-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Lock className="h-3 w-3" />
            Personal
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => handleCreateSubfolder(null, "personal")}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {personalFolders.length === 0 && !creatingIn ? (
          <p className="text-xs text-muted-foreground px-2 py-1">No folders</p>
        ) : (
          personalFolders.map((folder) => renderFolder(folder))
        )}
        {creatingIn?.parentId === null && creatingIn?.scope === "personal" && (
          <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: "20px" }}>
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
                if (e.key === "Escape") setCreatingIn(null);
              }}
              onBlur={() => {
                if (newFolderName.trim()) submitCreate();
                else setCreatingIn(null);
              }}
              autoFocus
              placeholder="Folder name"
              className="h-6 text-sm py-0 px-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}
