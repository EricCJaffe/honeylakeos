import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessageSquare, MoreHorizontal, Pencil, Trash2, Pin, Lock, Users, Archive, ArchiveRestore, Filter, X, FolderInput, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useFolderItemMutations } from "@/hooks/useFolders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { NoteFormDialog } from "./NoteFormDialog";
import { FolderTreeSidebar, FolderBreadcrumb, MoveToFolderDialog, type FolderFilter } from "@/components/folders";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Note {
  id: string;
  title: string;
  content: string | null;
  folder_id: string | null;
  project_id: string | null;
  access_level: string;
  is_pinned: boolean;
  color: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function NotesPage() {
  const navigate = useNavigate();
  const { activeCompanyId, isCompanyAdmin, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived">("active");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveTargetNote, setMoveTargetNote] = useState<Note | null>(null);

  const { moveNotes } = useFolderItemMutations();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, emoji")
        .eq("company_id", activeCompanyId)
        .eq("is_template", false)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", activeCompanyId, folderFilter, statusFilter, projectFilter],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from("notes")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("status", statusFilter)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      // Apply folder filter
      if (folderFilter === "unfiled") {
        query = query.is("folder_id", null);
      } else if (folderFilter !== "all") {
        query = query.eq("folder_id", folderFilter);
      }

      if (projectFilter === "standalone") {
        query = query.is("project_id", null);
      } else if (projectFilter !== "all") {
        query = query.eq("project_id", projectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Note[];
    },
    enabled: !!activeCompanyId,
  });

  // Client-side search filtering
  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  // Calculate counts for folder sidebar
  const { itemCounts, unfiledCount, totalCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    let unfiled = 0;
    
    notes.forEach((note) => {
      if (note.folder_id) {
        counts[note.folder_id] = (counts[note.folder_id] || 0) + 1;
      } else {
        unfiled++;
      }
    });

    return { itemCounts: counts, unfiledCount: unfiled, totalCount: notes.length };
  }, [notes]);

  // Get current folder ID for breadcrumb
  const currentFolderId = folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : null;

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted");
    },
    onError: () => {
      toast.error("Failed to delete note");
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("notes")
        .update({ is_pinned: !isPinned })
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const archiveNote = useMutation({
    mutationFn: async ({ noteId, archive }: { noteId: string; archive: boolean }) => {
      const { error } = await supabase
        .from("notes")
        .update({ status: archive ? "archived" : "active" })
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success(archive ? "Note archived" : "Note restored");
    },
    onError: () => {
      toast.error("Failed to update note");
    },
  });

  const handleCreate = () => {
    setEditingNote(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setIsDialogOpen(true);
  };

  const handleMoveToFolder = (note: Note) => {
    setMoveTargetNote(note);
    setSelectedIds(new Set([note.id]));
    setIsMoveDialogOpen(true);
  };

  const handleBulkMove = () => {
    if (selectedIds.size === 0) return;
    setMoveTargetNote(null);
    setIsMoveDialogOpen(true);
  };

  const handleMoveConfirm = (folderId: string | null) => {
    const ids = Array.from(selectedIds);
    moveNotes.mutate(
      { noteIds: ids, folderId },
      {
        onSuccess: () => {
          setIsMoveDialogOpen(false);
          setSelectedIds(new Set());
          setMoveTargetNote(null);
        },
      }
    );
  };

  const toggleSelection = (noteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotes.map((n) => n.id)));
    }
  };

  const canEdit = (note: Note) => {
    return isCompanyAdmin || note.created_by === user?.id;
  };

  const getPreview = (content: string | null) => {
    if (!content) return "No content";
    // Strip HTML tags for preview
    const stripped = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return stripped.length > 100 ? stripped.substring(0, 100) + "..." : stripped;
  };

  if (membershipLoading || isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={MessageSquare}
          title="No company selected"
          description="Please select a company to view notes."
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Notes"
        description="Capture and organize your ideas"
        actionLabel="New Note"
        onAction={handleCreate}
      />

      <div className="flex flex-wrap items-center gap-4 mb-6">
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.size} selected</Badge>
            <Button variant="outline" size="sm" onClick={handleBulkMove}>
              <FolderInput className="h-4 w-4 mr-1" />
              Move to Folder
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        ) : (
          <>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as "active" | "archived")}>
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notes</SelectItem>
                  <SelectItem value="standalone">Standalone Only</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.emoji} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projectFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setProjectFilter("all")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px] pl-8"
              />
            </div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar with folders */}
        <div className="hidden lg:block">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Folders</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <FolderTreeSidebar
                selectedFilter={folderFilter}
                onSelectFilter={setFolderFilter}
                itemCounts={itemCounts}
                unfiledCount={unfiledCount}
                totalCount={totalCount}
              />
            </CardContent>
          </Card>
        </div>

        {/* Notes grid */}
        <div>
          {/* Breadcrumb */}
          {currentFolderId && (
            <FolderBreadcrumb
              folderId={currentFolderId}
              onNavigate={(id) => setFolderFilter(id ?? "all")}
              rootLabel="All Notes"
            />
          )}

          {filteredNotes.length === 0 ? (
            <EmptyState
              icon={statusFilter === "archived" ? Archive : MessageSquare}
              title={searchQuery || folderFilter !== "all" ? "No matching notes" : statusFilter === "archived" ? "No archived notes" : "No notes yet"}
              description={searchQuery || folderFilter !== "all"
                ? "Try adjusting your search or filters." 
                : statusFilter === "archived" 
                  ? "Notes you archive will appear here." 
                  : "Create your first note to start capturing your ideas."}
              actionLabel={!searchQuery && statusFilter === "active" && folderFilter === "all" ? "Create Note" : undefined}
              onAction={!searchQuery && statusFilter === "active" && folderFilter === "all" ? handleCreate : undefined}
            />
          ) : (
            <>
              {/* Select all header */}
              <div className="flex items-center gap-2 px-1 py-2 mb-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={selectedIds.size === filteredNotes.length && filteredNotes.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span>Select all</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredNotes.map((note, index) => {
                  const isSelected = selectedIds.has(note.id);
                  return (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card
                        className={cn(
                          "group cursor-pointer hover:border-primary/50 transition-colors h-full relative",
                          note.color && `border-l-4`,
                          isSelected && "border-primary bg-primary/5"
                        )}
                        style={note.color ? { borderLeftColor: note.color } : undefined}
                      >
                        {/* Selection checkbox */}
                        <div className="absolute top-3 left-3 z-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(note.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div onClick={() => navigate(`/app/notes/${note.id}`)}>
                          <CardHeader className="pb-2 pl-10">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {note.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                                  <CardTitle className="text-sm truncate">{note.title}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                  {note.access_level === "personal" ? (
                                    <Badge variant="secondary" className="text-xs">
                                      <Lock className="h-3 w-3 mr-1" />
                                      Private
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      <Users className="h-3 w-3 mr-1" />
                                      Company
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {canEdit(note) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {note.status === "active" && (
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          togglePin.mutate({ noteId: note.id, isPinned: note.is_pinned });
                                        }}
                                      >
                                        <Pin className="h-4 w-4 mr-2" />
                                        {note.is_pinned ? "Unpin" : "Pin"}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(note);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveToFolder(note);
                                      }}
                                    >
                                      <FolderInput className="h-4 w-4 mr-2" />
                                      Move to Folder
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        archiveNote.mutate({ noteId: note.id, archive: note.status === "active" });
                                      }}
                                    >
                                      {note.status === "active" ? (
                                        <>
                                          <Archive className="h-4 w-4 mr-2" />
                                          Archive
                                        </>
                                      ) : (
                                        <>
                                          <ArchiveRestore className="h-4 w-4 mr-2" />
                                          Restore
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNote.mutate(note.id);
                                      }}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pl-10">
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                              {getPreview(note.content)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(note.updated_at), "MMM d, yyyy")}
                            </p>
                          </CardContent>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <NoteFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        note={editingNote}
        folderId={currentFolderId}
      />

      <MoveToFolderDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        itemCount={selectedIds.size}
        itemType="note"
        currentFolderId={moveTargetNote?.folder_id}
        onMove={handleMoveConfirm}
        isMoving={moveNotes.isPending}
      />
    </div>
  );
}
