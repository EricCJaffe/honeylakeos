import * as React from "react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Folder, ChevronRight, ChevronDown, Plus, MoreHorizontal, Pencil, Trash2, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
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
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

interface FolderType {
  id: string;
  name: string;
  parent_folder_id: string | null;
  access_level: string;
  created_by: string | null;
  children?: FolderType[];
}

interface FoldersPageProps {
  onSelectFolder?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  showHeader?: boolean;
}

export default function FoldersPage({ onSelectFolder, selectedFolderId, showHeader = true }: FoldersPageProps) {
  const { activeCompanyId, isCompanyAdmin, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState<string>("root");
  const [newFolderAccess, setNewFolderAccess] = useState<string>("company");

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ["folders", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("name");

      if (error) throw error;
      return data as FolderType[];
    },
    enabled: !!activeCompanyId,
  });

  // Build tree structure
  const buildTree = (items: FolderType[], parentId: string | null = null): FolderType[] => {
    return items
      .filter((item) => item.parent_folder_id === parentId)
      .map((item) => ({
        ...item,
        children: buildTree(items, item.id),
      }));
  };

  const folderTree = buildTree(folders);

  const createFolder = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("folders").insert({
        company_id: activeCompanyId,
        name: newFolderName,
        parent_folder_id: newFolderParent === "root" ? null : newFolderParent,
        access_level: newFolderAccess,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success(editingFolder ? "Folder updated" : "Folder created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to save folder");
    },
  });

  const updateFolder = useMutation({
    mutationFn: async () => {
      if (!editingFolder) throw new Error("No folder");
      const { error } = await supabase
        .from("folders")
        .update({
          name: newFolderName,
          parent_folder_id: newFolderParent === "root" ? null : newFolderParent,
          access_level: newFolderAccess,
        })
        .eq("id", editingFolder.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder updated");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to update folder");
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase.from("folders").delete().eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder deleted");
    },
    onError: () => {
      toast.error("Failed to delete folder");
    },
  });

  const resetForm = () => {
    setNewFolderName("");
    setNewFolderParent("root");
    setNewFolderAccess("company");
    setEditingFolder(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (folder: FolderType) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderParent(folder.parent_folder_id || "root");
    setNewFolderAccess(folder.access_level);
    setIsDialogOpen(true);
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
          {folder.access_level === "personal" && (
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
                  onClick={() => deleteFolder.mutate(folder.id)}
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
          onAction={handleCreate}
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

          {folders.length === 0 && !showHeader ? (
            <p className="text-sm text-muted-foreground px-3 py-2">No folders yet</p>
          ) : (
            folderTree.map((folder) => renderFolder(folder))
          )}

          {!showHeader && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 justify-start"
              onClick={handleCreate}
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
                  {folders
                    .filter((f) => f.id !== editingFolder?.id)
                    .map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Access Level</Label>
              <Select value={newFolderAccess} onValueChange={setNewFolderAccess}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company (Everyone)</SelectItem>
                  <SelectItem value="personal">Personal (Only me)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => (editingFolder ? updateFolder.mutate() : createFolder.mutate())}
                disabled={!newFolderName || createFolder.isPending || updateFolder.isPending}
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
