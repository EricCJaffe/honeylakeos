import { useRef, useState, useCallback } from "react";
import { Paperclip, Upload, Download, Trash2, File, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { useAttachments, useAttachmentMutations, EntityType, Attachment, UploadFileState } from "@/hooks/useAttachments";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";

interface AttachmentsPanelProps {
  entityType: EntityType;
  entityId: string;
  title?: string;
  compact?: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string | null): string {
  if (!contentType) return "📄";
  if (contentType.startsWith("image/")) return "🖼️";
  if (contentType.startsWith("video/")) return "🎬";
  if (contentType.startsWith("audio/")) return "🎵";
  if (contentType.includes("pdf")) return "📕";
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) return "📊";
  if (contentType.includes("document") || contentType.includes("word")) return "📝";
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "📽️";
  if (contentType.includes("zip") || contentType.includes("archive")) return "📦";
  return "📄";
}

interface UploadQueueItemProps {
  state: UploadFileState;
  onRemove: () => void;
}

function UploadQueueItem({ state, onRemove }: UploadQueueItemProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-muted/30 rounded-lg">
      <span className="text-lg">{getFileIcon(state.file.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium truncate">{state.file.name}</p>
          {state.status === "success" && (
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 ml-2" />
          )}
          {state.status === "error" && (
            <XCircle className="h-4 w-4 text-destructive shrink-0 ml-2" />
          )}
          {(state.status === "pending" || state.status === "uploading") && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 ml-2" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{formatFileSize(state.file.size)}</span>
          {state.status === "uploading" && (
            <Progress value={state.progress} className="h-1 flex-1" />
          )}
          {state.status === "error" && (
            <span className="text-xs text-destructive truncate">{state.error || "Upload failed"}</span>
          )}
        </div>
      </div>
      {(state.status === "success" || state.status === "error") && (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function AttachmentsPanel({ entityType, entityId, title = "Attachments", compact = false }: AttachmentsPanelProps) {
  const { user } = useAuth();
  const { isCompanyAdmin } = useMembership();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Map<string, UploadFileState>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: attachments = [], isLoading } = useAttachments(entityType, entityId);
  const { uploadAttachment, uploadMultipleFiles, deleteAttachment, getDownloadUrl } = useAttachmentMutations(entityType, entityId);

  const handleProgressUpdate = useCallback((updates: Map<string, Partial<UploadFileState>>) => {
    setUploadQueue((prev) => {
      const next = new Map(prev);
      updates.forEach((update, id) => {
        const existing = next.get(id);
        if (existing) {
          next.set(id, { ...existing, ...update });
        } else if (update.file) {
          next.set(id, update as UploadFileState);
        }
      });
      return next;
    });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    if (fileArray.length === 1) {
      // Single file - use existing simple upload
      const file = fileArray[0];
      const tempId = crypto.randomUUID();
      
      setUploadQueue(new Map([[tempId, {
        id: tempId,
        file,
        status: "uploading",
        progress: 0,
      }]]));

      try {
        await uploadAttachment.mutateAsync(file);
        setUploadQueue(new Map([[tempId, {
          id: tempId,
          file,
          status: "success",
          progress: 100,
        }]]));
      } catch {
        setUploadQueue(new Map([[tempId, {
          id: tempId,
          file,
          status: "error",
          progress: 0,
          error: "Upload failed",
        }]]));
      }
    } else {
      // Multi-file upload
      setIsUploading(true);
      
      try {
        const { successful, failed } = await uploadMultipleFiles(fileArray, handleProgressUpdate, 4);
        
        if (successful.length > 0 && failed.length === 0) {
          toast.success(`${successful.length} file${successful.length > 1 ? "s" : ""} uploaded successfully`);
        } else if (successful.length > 0 && failed.length > 0) {
          toast.warning(`${successful.length} uploaded, ${failed.length} failed`);
        } else if (failed.length > 0) {
          toast.error(`Failed to upload ${failed.length} file${failed.length > 1 ? "s" : ""}`);
        }
      } finally {
        setIsUploading(false);
      }
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFromQueue = (id: string) => {
    setUploadQueue((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const clearCompletedUploads = () => {
    setUploadQueue((prev) => {
      const next = new Map(prev);
      [...next.entries()].forEach(([id, state]) => {
        if (state.status === "success" || state.status === "error") {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const handleDownload = async (attachment: Attachment) => {
    setDownloadingId(attachment.id);
    try {
      const url = await getDownloadUrl(attachment);
      if (url) {
        window.open(url, "_blank");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteAttachment.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const canDelete = (attachment: Attachment) => {
    return attachment.owner_user_id === user?.id || isCompanyAdmin;
  };

  const queueArray = [...uploadQueue.values()];
  const hasActiveUploads = queueArray.some((s) => s.status === "pending" || s.status === "uploading");
  const hasCompletedItems = queueArray.some((s) => s.status === "success" || s.status === "error");

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            {title} ({attachments.length})
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={hasActiveUploads}
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />

        {/* Upload Queue */}
        {queueArray.length > 0 && (
          <div className="space-y-2">
            {queueArray.map((state) => (
              <UploadQueueItem
                key={state.id}
                state={state}
                onRemove={() => removeFromQueue(state.id)}
              />
            ))}
            {hasCompletedItems && !hasActiveUploads && (
              <Button variant="ghost" size="sm" onClick={clearCompletedUploads} className="w-full text-xs">
                Clear completed
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : attachments.length === 0 && queueArray.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments yet</p>
        ) : (
          <ul className="space-y-1">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50 group text-sm"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span>{getFileIcon(attachment.content_type)}</span>
                  <span className="truncate">{attachment.file_name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({formatFileSize(attachment.file_size)})
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDownload(attachment)}
                    disabled={downloadingId === attachment.id}
                  >
                    {downloadingId === attachment.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                  </Button>
                  {canDelete(attachment) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(attachment)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTarget?.file_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            {title}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={hasActiveUploads}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />

        {/* Upload Queue */}
        {queueArray.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Uploading {queueArray.filter((s) => s.status === "pending" || s.status === "uploading").length} of {queueArray.length}
              </p>
              {hasCompletedItems && !hasActiveUploads && (
                <Button variant="ghost" size="sm" onClick={clearCompletedUploads} className="text-xs">
                  Clear completed
                </Button>
              )}
            </div>
            {queueArray.map((state) => (
              <UploadQueueItem
                key={state.id}
                state={state}
                onRemove={() => removeFromQueue(state.id)}
              />
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 && queueArray.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <File className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No attachments yet</p>
            <p className="text-xs">Upload files to attach them here</p>
          </div>
        ) : (
          <div className="divide-y">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between py-3 group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-2xl">{getFileIcon(attachment.content_type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)} • {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    disabled={downloadingId === attachment.id}
                  >
                    {downloadingId === attachment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </>
                    )}
                  </Button>
                  {canDelete(attachment) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(attachment)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTarget?.file_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
