import * as React from "react";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, MoreHorizontal, Pencil, Trash2, Download, Upload, Lock, Users, Link2, Filter, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { DocumentFormDialog } from "./DocumentFormDialog";
import FoldersPage from "../folders/FoldersPage";
import { format } from "date-fns";

interface Document {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  folder_id: string | null;
  access_level: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { activeCompanyId, isCompanyAdmin, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", activeCompanyId, selectedFolderId, projectFilter],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from("documents")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (selectedFolderId) {
        query = query.eq("folder_id", selectedFolderId);
      }
      if (projectFilter !== "all") {
        query = query.eq("project_id", projectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!activeCompanyId,
  });

  // Client-side search filtering
  const filteredDocuments = React.useMemo(() => {
    if (!searchQuery) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `${activeCompanyId}/${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: insertError } = await supabase.from("documents").insert({
        company_id: activeCompanyId,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        folder_id: selectedFolderId,
        access_level: "company",
        created_by: user.id,
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded");
      setUploading(false);
    },
    onError: (error) => {
      toast.error("Failed to upload document");
      setUploading(false);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: Document) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadDocument.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .download(doc.file_path);

    if (error) {
      toast.error("Failed to download");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (doc: Document) => {
    setEditingDocument(doc);
    setIsDialogOpen(true);
  };

  const canEdit = (doc: Document) => {
    return isCompanyAdmin || doc.created_by === user?.id;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string | null) => {
    return FileText;
  };

  if (membershipLoading || isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
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
          icon={FileText}
          title="No company selected"
          description="Please select a company to view documents."
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Documents"
        description="Upload and manage your files"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-1" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </PageHeader>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
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
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px] pl-8"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[250px_1fr] gap-6">
        {/* Sidebar with folders */}
        <div className="hidden lg:block">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Folders</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <FoldersPage
                onSelectFolder={setSelectedFolderId}
                selectedFolderId={selectedFolderId}
                showHeader={false}
              />
            </CardContent>
          </Card>
        </div>

        {/* Documents list */}
        <div>
          {filteredDocuments.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={searchQuery || projectFilter !== "all" ? "No matching documents" : "No documents yet"}
              description={searchQuery || projectFilter !== "all" 
                ? "Try adjusting your search or filters."
                : "Upload your first document to get started."}
              actionLabel={!searchQuery && projectFilter === "all" ? "Upload Document" : undefined}
              onAction={!searchQuery && projectFilter === "all" ? () => fileInputRef.current?.click() : undefined}
            />
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc, index) => {
                const FileIcon = getFileIcon(doc.mime_type);
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card
                      className="group cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => navigate(`/app/documents/${doc.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium truncate">{doc.name}</h3>
                              {doc.access_level === "personal" ? (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <Users className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(doc);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {canEdit(doc) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(doc)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteDocument.mutate(doc);
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
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DocumentFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        document={editingDocument}
      />
    </div>
  );
}
