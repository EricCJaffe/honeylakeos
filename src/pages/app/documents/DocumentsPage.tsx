import * as React from "react";
import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, MoreHorizontal, Pencil, Trash2, Download, Upload, Lock, Users, Filter, X, FolderInput, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useFolderItemMutations, useFolders, Folder } from "@/hooks/useFolders";
import { useSavedViews, SavedView, SavedViewConfig } from "@/hooks/useSavedViews";
import { useRecentDocuments } from "@/hooks/useRecentItems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { DocumentFormDialog } from "./DocumentFormDialog";
import { 
  FolderTreeSidebar, 
  FolderBreadcrumb, 
  MoveToFolderDialog, 
  SavedViewsSection, 
  RecentItemsSection, 
  FolderSearchBar,
  FolderPathDisplay,
  type FolderFilter,
  type RecentFilter,
} from "@/components/folders";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  updated_at: string;
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { activeCompanyId, isCompanyAdmin, loading: membershipLoading } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [recentFilter, setRecentFilter] = useState<RecentFilter>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchAllFolders, setSearchAllFolders] = useState(false);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveTargetDoc, setMoveTargetDoc] = useState<Document | null>(null);

  const { moveDocuments } = useFolderItemMutations();
  const { data: recentDocs = [] } = useRecentDocuments();
  const { data: savedViews = [] } = useSavedViews("documents");
  const { data: folderTree } = useFolders();

  // Build folder map for path display
  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>();
    const addToMap = (folders: Folder[]) => {
      for (const folder of folders) {
        map.set(folder.id, folder);
        if (folder.children?.length) addToMap(folder.children);
      }
    };
    if (folderTree) {
      addToMap(folderTree.companyFolders);
      addToMap(folderTree.personalFolders);
    }
    return map;
  }, [folderTree]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "lite", activeCompanyId],
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

  // Determine effective filter from saved view or manual selections
  const effectiveFilter = useMemo(() => {
    if (selectedViewId) {
      const view = savedViews.find((v) => v.id === selectedViewId);
      if (view) {
        return {
          folder_id: view.config_json.folder_id ?? null,
          unfiled: view.config_json.unfiled ?? false,
          search: view.config_json.search ?? "",
          search_all: view.config_json.search_all ?? false,
        };
      }
    }
    return {
      folder_id: folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : null,
      unfiled: folderFilter === "unfiled",
      search: searchQuery,
      search_all: searchAllFolders,
    };
  }, [selectedViewId, savedViews, folderFilter, searchQuery, searchAllFolders]);

  // Current config for save view
  const currentViewConfig = useMemo((): SavedViewConfig => ({
    folder_id: folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : null,
    unfiled: folderFilter === "unfiled",
    search: searchQuery || undefined,
    search_all: searchAllFolders || undefined,
  }), [folderFilter, searchQuery, searchAllFolders]);

  const hasActiveFilters = folderFilter !== "all" || searchQuery || searchAllFolders;

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", activeCompanyId, effectiveFilter.folder_id, effectiveFilter.unfiled, projectFilter, effectiveFilter.search_all],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from("documents")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("updated_at", { ascending: false });

      // Apply folder filter (only if not searching all folders)
      if (!effectiveFilter.search_all) {
        if (effectiveFilter.unfiled) {
          query = query.is("folder_id", null);
        } else if (effectiveFilter.folder_id) {
          query = query.eq("folder_id", effectiveFilter.folder_id);
        }
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
  const filteredDocuments = useMemo(() => {
    // If showing recent, use that list
    if (recentFilter === "recent") {
      const recentIds = new Set(recentDocs.map((d) => d.id));
      const result = documents.filter((doc) => recentIds.has(doc.id));
      // Sort by recent order
      result.sort((a, b) => {
        const aIdx = recentDocs.findIndex((d) => d.id === a.id);
        const bIdx = recentDocs.findIndex((d) => d.id === b.id);
        return aIdx - bIdx;
      });
      return result;
    }

    const query = (effectiveFilter.search || "").toLowerCase();
    if (!query) return documents;
    return documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
    );
  }, [documents, effectiveFilter.search, recentFilter, recentDocs]);

  // Calculate counts for folder sidebar
  const { itemCounts, unfiledCount, totalCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    let unfiled = 0;
    
    documents.forEach((doc) => {
      if (doc.folder_id) {
        counts[doc.folder_id] = (counts[doc.folder_id] || 0) + 1;
      } else {
        unfiled++;
      }
    });

    return { itemCounts: counts, unfiledCount: unfiled, totalCount: documents.length };
  }, [documents]);

  // Get current folder ID for breadcrumb
  const currentFolderId = effectiveFilter.folder_id;

  const handleSelectView = (view: SavedView | null) => {
    setSelectedViewId(view?.id ?? null);
    setRecentFilter(null);
    if (view) {
      // Apply view filters to state
      setFolderFilter(view.config_json.unfiled ? "unfiled" : view.config_json.folder_id ?? "all");
      setSearchQuery(view.config_json.search ?? "");
      setSearchAllFolders(view.config_json.search_all ?? false);
    }
  };

  const handleSelectRecent = (filter: RecentFilter) => {
    setRecentFilter(filter);
    setSelectedViewId(null);
    if (filter === "recent") {
      setFolderFilter("all");
      setSearchQuery("");
    }
  };

  const handleSelectFolder = (filter: FolderFilter) => {
    setFolderFilter(filter);
    setRecentFilter(null);
    setSelectedViewId(null);
  };

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `${activeCompanyId}/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documents").insert({
        company_id: activeCompanyId,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        folder_id: currentFolderId,
        access_level: "company",
        created_by: user.id,
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["recent-documents"] });
      toast.success("Document uploaded");
      setUploading(false);
    },
    onError: () => {
      toast.error("Failed to upload document");
      setUploading(false);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: Document) => {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["recent-documents"] });
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

  const handleMoveToFolder = (doc: Document) => {
    setMoveTargetDoc(doc);
    setSelectedIds(new Set([doc.id]));
    setIsMoveDialogOpen(true);
  };

  const handleBulkMove = () => {
    if (selectedIds.size === 0) return;
    setMoveTargetDoc(null);
    setIsMoveDialogOpen(true);
  };

  const handleMoveConfirm = (folderId: string | null) => {
    const ids = Array.from(selectedIds);
    moveDocuments.mutate(
      { documentIds: ids, folderId },
      {
        onSuccess: () => {
          setIsMoveDialogOpen(false);
          setSelectedIds(new Set());
          setMoveTargetDoc(null);
        },
      }
    );
  };

  const toggleSelection = (docId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocuments.map((d) => d.id)));
    }
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

  const getFileIcon = () => {
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

            <FolderSearchBar
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                setSelectedViewId(null);
              }}
              searchAllFolders={searchAllFolders}
              onSearchAllChange={(val) => {
                setSearchAllFolders(val);
                setSelectedViewId(null);
              }}
              placeholder="Search documents..."
              showToggle={folderFilter !== "all"}
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar with folders */}
        <div className="hidden lg:block">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Browse</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {/* Recent */}
              <RecentItemsSection
                selectedFilter={recentFilter}
                onSelectFilter={handleSelectRecent}
                recentCount={recentDocs.length}
              />

              {/* Saved Views */}
              <SavedViewsSection
                module="documents"
                selectedViewId={selectedViewId}
                onSelectView={handleSelectView}
                currentConfig={hasActiveFilters ? currentViewConfig : undefined}
              />

              {/* Folder Tree */}
              <FolderTreeSidebar
                selectedFilter={recentFilter ? "all" : folderFilter}
                onSelectFilter={handleSelectFolder}
                itemCounts={itemCounts}
                unfiledCount={unfiledCount}
                totalCount={totalCount}
              />
            </CardContent>
          </Card>
        </div>

        {/* Documents list */}
        <div>
          {/* Breadcrumb */}
          {currentFolderId && !recentFilter && (
            <FolderBreadcrumb
              folderId={currentFolderId}
              onNavigate={(id) => handleSelectFolder(id ?? "all")}
              rootLabel="All Documents"
            />
          )}

          {/* Current view indicator */}
          {(recentFilter || selectedViewId) && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              {recentFilter && (
                <Badge variant="secondary">
                  Showing recent documents
                  <button onClick={() => setRecentFilter(null)} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedViewId && (
                <Badge variant="secondary">
                  <Bookmark className="h-3 w-3 mr-1" />
                  {savedViews.find((v) => v.id === selectedViewId)?.name}
                  <button onClick={() => setSelectedViewId(null)} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {filteredDocuments.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={searchQuery || projectFilter !== "all" || folderFilter !== "all" || recentFilter ? "No matching documents" : "No documents yet"}
              description={searchQuery || projectFilter !== "all" || folderFilter !== "all" || recentFilter
                ? "Try adjusting your search or filters."
                : "Upload your first document to get started."}
              actionLabel={!searchQuery && projectFilter === "all" && folderFilter === "all" && !recentFilter ? "Upload Document" : undefined}
              onAction={!searchQuery && projectFilter === "all" && folderFilter === "all" && !recentFilter ? () => fileInputRef.current?.click() : undefined}
            />
          ) : (
            <div className="space-y-2">
              {/* Select all header */}
              <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={selectedIds.size === filteredDocuments.length && filteredDocuments.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span>Select all</span>
              </div>

              {filteredDocuments.map((doc, index) => {
                const FileIcon = getFileIcon();
                const isSelected = selectedIds.has(doc.id);
                const showFolderPath = searchAllFolders && doc.folder_id;
                
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card
                      className={cn(
                        "group cursor-pointer hover:border-primary/50 transition-colors",
                        isSelected && "border-primary bg-primary/5"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(doc.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className="flex items-center gap-4 flex-1 min-w-0"
                            onClick={() => navigate(`/app/documents/${doc.id}`)}
                          >
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
                                {showFolderPath && (
                                  <>
                                    <span>•</span>
                                    <FolderPathDisplay folderId={doc.folder_id} />
                                  </>
                                )}
                              </div>
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
                                  <DropdownMenuItem onClick={() => handleMoveToFolder(doc)}>
                                    <FolderInput className="h-4 w-4 mr-2" />
                                    Move to Folder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
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

      <MoveToFolderDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        itemCount={selectedIds.size}
        itemType="document"
        currentFolderId={moveTargetDoc?.folder_id}
        onMove={handleMoveConfirm}
        isMoving={moveDocuments.isPending}
      />
    </div>
  );
}
