import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";

export type EntityType = "task" | "project" | "note" | "document" | "event" | "bill" | "ticket" | "sales_quote";

// Attachment limits and validation
export const ATTACHMENT_LIMITS = {
  maxFileSizeBytes: 25 * 1024 * 1024, // 25MB
  maxFileSizeMB: 25,
  allowedContentTypes: [
    // PDFs
    "application/pdf",
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    // Office docs
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // Text files
    "text/plain",
    "text/csv",
    "text/markdown",
  ],
  allowedExtensions: [
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".md",
  ],
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAttachmentFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > ATTACHMENT_LIMITS.maxFileSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${ATTACHMENT_LIMITS.maxFileSizeMB}MB limit`,
    };
  }

  // Check content type
  const isAllowedType = ATTACHMENT_LIMITS.allowedContentTypes.includes(file.type);
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  const isAllowedExtension = ATTACHMENT_LIMITS.allowedExtensions.includes(extension);

  if (!isAllowedType && !isAllowedExtension) {
    return {
      valid: false,
      error: `File type not allowed. Supported: PDF, images, Office docs, text files`,
    };
  }

  // TODO: Future - Add virus scanning check here
  // if (await scanForViruses(file)) { return { valid: false, error: "Security scan failed" }; }

  return { valid: true };
}

export interface Attachment {
  id: string;
  company_id: string;
  owner_user_id: string;
  entity_type: EntityType;
  entity_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  file_size: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
}

export function useAttachments(entityType: EntityType, entityId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["attachments", entityType, entityId, activeCompanyId],
    queryFn: async () => {
      if (!entityId || !activeCompanyId) return [];

      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!entityId && !!activeCompanyId,
  });
}

export interface UploadFileState {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  attachment?: Attachment;
}

// Utility to run promises with concurrency limit
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task().then((result) => {
      results.push(result);
    });
    executing.push(p as Promise<void>);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((e) => e === p),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

export function useAttachmentMutations(entityType: EntityType, entityId: string) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  // Single file upload (existing)
  const uploadAttachment = useMutation({
    mutationFn: async (file: File) => {
      if (!activeCompanyId || !user) throw new Error("Not authenticated");

      // Validate file before upload
      const validation = validateAttachmentFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const attachmentId = crypto.randomUUID();
      const storagePath = `company/${activeCompanyId}/${entityType}/${entityId}/${attachmentId}/${file.name}`;

      // Create attachment record first
      const { data: attachment, error: insertError } = await supabase
        .from("attachments")
        .insert({
          id: attachmentId,
          company_id: activeCompanyId,
          owner_user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          storage_bucket: "attachments",
          storage_path: storagePath,
          file_name: file.name,
          content_type: file.type || "application/octet-stream",
          file_size: file.size,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        // Orphan cleanup: soft-delete attachment record on storage failure
        await supabase
          .from("attachments")
          .update({ deleted_at: new Date().toISOString(), deleted_by_user_id: user.id })
          .eq("id", attachmentId);
        throw uploadError;
      }

      return attachment as Attachment;
    },
    onSuccess: (attachment) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] });
      log("attachment.created", entityType, entityId, {
        attachment_id: attachment.id,
        file_name: attachment.file_name,
        file_size: attachment.file_size,
      });
      toast.success("File uploaded successfully");
    },
    onError: (error) => {
      console.error("Upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    },
  });

  // Multi-file upload with parallel limit
  const uploadMultipleFiles = async (
    files: File[],
    onProgress: (updates: Map<string, Partial<UploadFileState>>) => void,
    concurrencyLimit = 4
  ): Promise<{ successful: Attachment[]; failed: string[] }> => {
    if (!activeCompanyId || !user) throw new Error("Not authenticated");

    const fileStates = new Map<string, UploadFileState>();
    files.forEach((file) => {
      const id = crypto.randomUUID();
      fileStates.set(id, {
        id,
        file,
        status: "pending",
        progress: 0,
      });
    });

    // Notify initial state
    onProgress(new Map([...fileStates.entries()].map(([id, state]) => [id, state])));

    const successful: Attachment[] = [];
    const failed: string[] = [];

    const uploadTasks = [...fileStates.entries()].map(([id, state]) => async () => {
      const file = state.file;

      // Validate file before upload
      const validation = validateAttachmentFile(file);
      if (!validation.valid) {
        onProgress(new Map([[id, { status: "error", progress: 0, error: validation.error }]]));
        failed.push(file.name);
        return null;
      }

      const attachmentId = crypto.randomUUID();
      const storagePath = `company/${activeCompanyId}/${entityType}/${entityId}/${attachmentId}/${file.name}`;

      // Update to uploading
      onProgress(new Map([[id, { status: "uploading", progress: 10 }]]));

      try {
        // Create attachment record
        const { data: attachment, error: insertError } = await supabase
          .from("attachments")
          .insert({
            id: attachmentId,
            company_id: activeCompanyId,
            owner_user_id: user.id,
            entity_type: entityType,
            entity_id: entityId,
            storage_bucket: "attachments",
            storage_path: storagePath,
            file_name: file.name,
            content_type: file.type || "application/octet-stream",
            file_size: file.size,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        onProgress(new Map([[id, { progress: 40 }]]));

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(storagePath, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          // Orphan cleanup: soft-delete attachment record on storage failure
          await supabase
            .from("attachments")
            .update({ deleted_at: new Date().toISOString(), deleted_by_user_id: user.id })
            .eq("id", attachmentId);
          throw new Error(uploadError.message);
        }

        onProgress(new Map([[id, { status: "success", progress: 100, attachment: attachment as Attachment }]]));

        // Log audit event
        log("attachment.created", entityType, entityId, {
          attachment_id: attachment.id,
          file_name: attachment.file_name,
          file_size: attachment.file_size,
        });

        successful.push(attachment as Attachment);
        return attachment;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
        onProgress(new Map([[id, { status: "error", progress: 0, error: errorMessage }]]));
        failed.push(file.name);
        return null;
      }
    });

    await runWithConcurrency(uploadTasks, concurrencyLimit);

    // Invalidate cache once after all uploads
    queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] });

    return { successful, failed };
  };

  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Soft delete in DB
      const { data, error } = await supabase
        .from("attachments")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by_user_id: user.id,
        })
        .eq("id", attachmentId)
        .select()
        .single();

      if (error) throw error;

      // Also remove from storage
      if (data?.storage_path) {
        await supabase.storage.from("attachments").remove([data.storage_path]);
      }

      return data as Attachment;
    },
    onSuccess: (attachment) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] });
      log("attachment.deleted", entityType, entityId, {
        attachment_id: attachment.id,
        file_name: attachment.file_name,
      });
      toast.success("File deleted");
    },
    onError: (error) => {
      console.error("Delete failed:", error);
      toast.error("Failed to delete file");
    },
  });

  const getDownloadUrl = async (attachment: Attachment): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("attachments")
      .createSignedUrl(attachment.storage_path, 3600); // 1 hour expiry

    if (error) {
      console.error("Failed to get download URL:", error);
      toast.error("Failed to get download link");
      return null;
    }

    return data.signedUrl;
  };

  return {
    uploadAttachment,
    uploadMultipleFiles,
    deleteAttachment,
    getDownloadUrl,
  };
}
