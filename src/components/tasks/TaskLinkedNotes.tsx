import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Plus, Link2, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { NoteFormDialog } from "@/pages/app/notes/NoteFormDialog";
import { toast } from "sonner";

interface TaskLinkedNotesProps {
  taskId: string;
}

export function TaskLinkedNotes({ taskId }: TaskLinkedNotesProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch notes linked to this task via entity_links
  const { data: linkedNotes = [], isLoading, refetch } = useQuery({
    queryKey: ["task-linked-notes", taskId],
    queryFn: async () => {
      if (!taskId || !activeCompanyId) return [];
      
      // Get entity links where from_type=task and to_type=note
      const { data: links, error: linksError } = await supabase
        .from("entity_links")
        .select("to_id")
        .eq("company_id", activeCompanyId)
        .eq("from_type", "task")
        .eq("from_id", taskId)
        .eq("to_type", "note");

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      const noteIds = links.map(l => l.to_id);
      
      // Fetch the actual notes
      const { data: notes, error: notesError } = await supabase
        .from("notes")
        .select("id, title, color, created_at, is_pinned")
        .in("id", noteIds)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;
      return notes || [];
    },
    enabled: !!taskId && !!activeCompanyId,
  });

  // Get IDs of already linked notes
  const linkedNoteIds = linkedNotes.map(n => n.id);

  // Search available notes for linking
  const { data: availableNotes = [] } = useQuery({
    queryKey: ["available-notes-for-link", activeCompanyId, searchQuery, linkedNoteIds],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      
      let query = supabase
        .from("notes")
        .select("id, title, color, created_at")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out already linked notes
      return (data || []).filter(n => !linkedNoteIds.includes(n.id));
    },
    enabled: !!activeCompanyId && isLinkDialogOpen,
  });

  const handleLinkNote = async (noteId: string) => {
    if (!user || !activeCompanyId) return;
    
    const { error } = await supabase
      .from("entity_links")
      .insert({
        company_id: activeCompanyId,
        from_type: "task",
        from_id: taskId,
        to_type: "note",
        to_id: noteId,
        created_by: user.id,
      });

    if (error) {
      toast.error("Failed to link note");
      return;
    }

    toast.success("Note linked");
    setIsLinkDialogOpen(false);
    setSearchQuery("");
    refetch();
  };

  const handleUnlinkNote = async (noteId: string) => {
    const { error } = await supabase
      .from("entity_links")
      .delete()
      .eq("from_type", "task")
      .eq("from_id", taskId)
      .eq("to_type", "note")
      .eq("to_id", noteId);

    if (error) {
      toast.error("Failed to unlink note");
      return;
    }

    toast.success("Note unlinked");
    refetch();
  };

  const handleNoteCreated = () => {
    setIsNoteDialogOpen(false);
    // Refresh linked notes after new note is created
    queryClient.invalidateQueries({ queryKey: ["task-linked-notes", taskId] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Linked Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Linked Notes ({linkedNotes.length})
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setIsLinkDialogOpen(true)}>
                <Link2 className="h-4 w-4 mr-1" />
                Link
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsNoteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {linkedNotes.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                No notes linked to this task yet.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsLinkDialogOpen(true)}>
                  <Link2 className="h-4 w-4 mr-1" />
                  Link Existing
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsNoteDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create New
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {linkedNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <Link
                    to={`/app/notes/${note.id}`}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    {note.color && (
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: note.color }}
                      />
                    )}
                    <span className="text-sm font-medium truncate">{note.title}</span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d")}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleUnlinkNote(note.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Existing Note Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Existing Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {availableNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchQuery ? "No matching notes found." : "No available notes to link."}
                </p>
              ) : (
                availableNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleLinkNote(note.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {note.color && (
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: note.color }}
                        />
                      )}
                      <span className="text-sm font-medium">{note.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create New Note Dialog - will be linked after creation */}
      <NoteFormDialog
        open={isNoteDialogOpen}
        onOpenChange={(open) => {
          setIsNoteDialogOpen(open);
          if (!open) {
            // Refresh links when dialog closes
            refetch();
          }
        }}
      />
    </>
  );
}
