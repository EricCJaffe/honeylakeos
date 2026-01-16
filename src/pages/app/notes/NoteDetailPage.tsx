import * as React from "react";
import { useState, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Trash2, Share2, Lock, Users, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { NoteFormDialog } from "./NoteFormDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { EntityLinksPanel } from "@/components/EntityLinksPanel";

// Lazy load rich text components
const RichTextEditor = lazy(() => import("@/components/ui/rich-text-editor").then(m => ({ default: m.RichTextEditor })));
const RichTextDisplay = lazy(() => import("@/components/ui/rich-text-editor").then(m => ({ default: m.RichTextDisplay })));

export default function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      if (!noteId) return null;
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!noteId,
  });

  React.useEffect(() => {
    if (note?.content) {
      setContent(note.content);
    }
  }, [note?.content]);

  const updateContent = useMutation({
    mutationFn: async () => {
      if (!noteId) throw new Error("No note");
      const { error } = await supabase
        .from("notes")
        .update({ content })
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note", noteId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note saved");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Failed to save note");
    },
  });

  const deleteNote = useMutation({
    mutationFn: async () => {
      if (!noteId) throw new Error("No note");
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note deleted");
      navigate("/app/notes");
    },
    onError: () => {
      toast.error("Failed to delete note");
    },
  });

  const canEdit = note && (isCompanyAdmin || note.created_by === user?.id);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="p-6">
        <EmptyState
          icon={MessageSquare}
          title="Note not found"
          description="This note may have been deleted or you don't have access."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title={note.title}
        backHref="/app/notes"
      >
        {canEdit && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormDialogOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteNote.mutate()}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </>
        )}
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        {note.access_level === "personal" ? (
          <Badge variant="secondary">
            <Lock className="h-3 w-3 mr-1" />
            Private
          </Badge>
        ) : (
          <Badge variant="secondary">
            <Users className="h-3 w-3 mr-1" />
            Company
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          Last updated {format(new Date(note.updated_at), "MMM d, yyyy 'at' h:mm a")}
        </span>
      </div>

      {/* Links */}
      <div className="mb-6">
        <EntityLinksPanel entityType="note" entityId={note.id} />
      </div>

      <Card
        className="min-h-[400px]"
        style={note.color ? { borderLeftColor: note.color, borderLeftWidth: 4 } : undefined}
      >
        <CardContent className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded" />}>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write your note..."
                  minHeight="300px"
                  showFormatToggle={true}
                />
              </Suspense>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={() => updateContent.mutate()} disabled={updateContent.isPending}>
                  {updateContent.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="min-h-[300px] cursor-text"
              onClick={() => canEdit && setIsEditing(true)}
            >
              <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded" />}>
                {note.content ? (
                  <RichTextDisplay content={note.content} />
                ) : (
                  <p className="text-muted-foreground italic">
                    {canEdit ? "Click to add content..." : "No content"}
                  </p>
                )}
              </Suspense>
            </div>
          )}
        </CardContent>
      </Card>

      <NoteFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        note={note}
      />

      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        entityType="note"
        entityId={note.id}
        entityName={note.title}
      />
    </div>
  );
}
