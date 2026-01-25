import * as React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Folder, ChevronRight, ChevronDown, Plus, MoreHorizontal, Pencil, Trash2, FolderOpen, Lock, Users } from "lucide-react";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useFolders, useFolderMutations, Folder as FolderType, FolderScope, flattenFolderTree } from "@/hooks/useFolders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

interface FoldersPageProps {
  onSelectFolder?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  showHeader?: boolean;
}

export default function FoldersPage({ onSelectFolder, selectedFolderId, showHeader = true }: FoldersPageProps) {
  const { isCompanyAdmin, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const { data: folderTree, isLoading } = useFolders();
  const { create, update, remove, isCompanyAdmin: canManageCompanyFolders } = useFolderMutations();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderScope, setNewFolderScope] = useState<FolderScope>("personal");
  const [newFolderParent, setNewFolderParent] = useState<string>("root");

  const companyFolders = folderTree?.companyFolders ?? [];
  const personalFolders = folderTree?.personalFolders ?? [];
  const allFolders = [...companyFolders, ...personalFolders];
  const flatFolders = flattenFolderTree(allFolders);

  const resetForm = () => {
    setNewFolderName("");
    setNewFolderScope("personal");
    setNewFolderParent("root");
    setEditingFolder(null);
  };

  const handleCreate = (scope: FolderScope = "personal") => {
    resetForm();
    setNewFolderScope(scope);
    setIsDialogOpen(true);
  };

  const handleEdit = (folder: FolderType) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderScope(folder.scope);
    setNewFolderParent(folder.parent_folder_id || "root");
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!newFolderName.trim()) return;
    
    if (editingFolder) {
      update.mutate({
        id: editingFolder.id,
        name: newFolderName,
        parent_folder_id: newFolderParent === "root" ? null : newFolderParent,
      });
    } else {
      create.mutate({
        name: newFolderName,
        scope: newFolderScope,
        parent_folder_id: newFolderParent === "root" ? null : newFolderParent,
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

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

  const renderFolder = (folder: FolderType, depth: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group",
            isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => onSelectFolder?.(folder.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="flex-1 text-sm truncate">{folder.name}</span>
          {folder.scope === "personal" && (
            <span className="text-xs text-muted-foreground">Private</span>
          )}
          {canEdit(folder) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(folder)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
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
        {hasChildren && isExpanded && (
          <div>{folder.children!.map((child) => renderFolder(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (membershipLoading || isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={showHeader ? "p-6" : ""}>
      {showHeader && (
        <PageHeader
          title="Folders"
          description="Organize your notes and documents"
          actionLabel="New Folder"
          onAction={() => handleCreate("personal")}
        />
      )}

      <Card className={showHeader ? "" : "border-0 shadow-none"}>
        <CardContent className={showHeader ? "p-4" : "p-0"}>
          {/* Root level */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-1",
              selectedFolderId === null ? "bg-primary/10 text-primary" : "hover:bg-muted"
            )}
            onClick={() => onSelectFolder?.(null)}
          >
            <Folder className="h-4 w-4" />
            <span className="text-sm font-medium">All Files</span>
          </div>

          {allFolders.length === 0 && !showHeader ? (
            <p className="text-sm text-muted-foreground px-3 py-2">No folders yet</p>
          ) : (
            <>
              {/* Company Folders Section */}
              {companyFolders.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
                    <Users className="h-3 w-3" />
                    Company Folders
                  </div>
                  {companyFolders.map((folder) => renderFolder(folder))}
                </div>
              )}
              
              {/* Personal Folders Section */}
              {personalFolders.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
                    <Lock className="h-3 w-3" />
                    My Folders
                  </div>
                  {personalFolders.map((folder) => renderFolder(folder))}
                </div>
              )}
            </>
          )}

          {!showHeader && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 justify-start"
              onClick={() => handleCreate("personal")}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFolder ? "Edit Folder" : "New Folder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
              />
            </div>
            <div>
              <Label>Parent Folder</Label>
              <Select value={newFolderParent} onValueChange={setNewFolderParent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root</SelectItem>
                  {flatFolders
                    .filter(({ folder }) => folder.id !== editingFolder?.id)
                    .map(({ folder, depth }) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {"  ".repeat(depth)}{folder.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {!editingFolder && (
              <div>
                <Label>Type</Label>
                <Select value={newFolderScope} onValueChange={(v) => setNewFolderScope(v as FolderScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {canManageCompanyFolders && (
                      <SelectItem value="company">Company (Everyone)</SelectItem>
                    )}
                    <SelectItem value="personal">Personal (Only me)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!newFolderName || create.isPending || update.isPending}
              >
                {editingFolder ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
