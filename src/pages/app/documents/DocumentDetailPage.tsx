import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Trash2, Share2, Lock, Users, Link2, FolderKanban, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { DocumentFormDialog } from "./DocumentFormDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { LinkDocumentDialog } from "@/components/LinkDocumentDialog";
import { EntityLinksPanel } from "@/components/EntityLinksPanel";
import { ensureArray, safeFormatDate } from "@/core/runtime/safety";
import type { Tables } from "@/integrations/supabase/types";

type DocumentDetailRecord = Tables<"documents">;
type LinkedProjectRow = {
  project_id: string;
  projects: { id: string; name: string; emoji: string | null } | null;
};
type LinkedTaskRow = {
  task_id: string;
  tasks: { id: string; title: string } | null;
};

export default function DocumentDetailPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);

  const { data: document, isLoading } = useQuery<DocumentDetailRecord | null>({
    queryKey: ["document", documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });

  // Fetch linked items
  const { data: linkedProjects = [] } = useQuery<LinkedProjectRow[]>({
    queryKey: ["document-projects", documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from("project_documents")
        .select("project_id, projects(id, name, emoji)")
        .eq("document_id", documentId);
      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });

  const { data: linkedTasks = [] } = useQuery<LinkedTaskRow[]>({
    queryKey: ["document-tasks", documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from("task_documents")
        .select("task_id, tasks(id, title)")
        .eq("document_id", documentId);
      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });

  const deleteDocument = useMutation({
    mutationFn: async () => {
      if (!document) throw new Error("No document");
      
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([document.file_path]);

      if (storageError) throw storageError;

      const { error } = await supabase.from("documents").delete().eq("id", document.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document deleted");
      navigate("/app/documents");
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });

  const handleDownload = async () => {
    if (!document) return;
    
    const { data, error } = await supabase.storage
      .from("documents")
      .download(document.file_path);

    if (error) {
      toast.error("Failed to download");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = document.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canEdit = document && (isCompanyAdmin || document.created_by === user?.id);
  const safeLinkedProjects = ensureArray<LinkedProjectRow>(linkedProjects);
  const safeLinkedTasks = ensureArray<LinkedTaskRow>(linkedTasks);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FileText}
          title="Document not found"
          description="This document may have been deleted or you don't have access."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title={document.name}
        backHref="/app/documents"
      >
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
        {canEdit && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLinkDialogOpen(true)}
            >
              <Link2 className="h-4 w-4 mr-1" />
              Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteDocument.mutate()}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </>
        )}
      </PageHeader>

      {/* Universal Links */}
      <div className="mb-6">
        <EntityLinksPanel entityType="document" entityId={document.id} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Document Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{document.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(document.file_size)} • {document.mime_type}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Access</span>
                <Badge variant="secondary">
                  {document.access_level === "personal" ? (
                    <>
                      <Lock className="h-3 w-3 mr-1" /> Private
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3 mr-1" /> Company
                    </>
                  )}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uploaded</span>
                <span>{safeFormatDate(document.created_at, "MMM d, yyyy")}</span>
              </div>
            </div>

            {document.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{document.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {safeLinkedProjects.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" /> Projects
                </h4>
                <div className="space-y-1">
                  {safeLinkedProjects.map((link) => (
                    <div
                      key={link.project_id}
                      className="text-sm text-muted-foreground"
                    >
                      {link.projects?.emoji} {link.projects?.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {safeLinkedTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Tasks
                </h4>
                <div className="space-y-1">
                  {safeLinkedTasks.map((link) => (
                    <div
                      key={link.task_id}
                      className="text-sm text-muted-foreground"
                    >
                      {link.tasks?.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {safeLinkedProjects.length === 0 && safeLinkedTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No linked items. Click "Link" to connect this document to projects, tasks, or events.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <DocumentFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        document={document}
      />

      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        entityType="document"
        entityId={document.id}
        entityName={document.name}
      />

      <LinkDocumentDialog
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        documentId={document.id}
      />
    </div>
  );
}
