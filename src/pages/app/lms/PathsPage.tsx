import * as React from "react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  Eye,
  Send
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useLmsLearningPaths, useLmsLearningPathMutations, getPathStatusLabel, getPathStatusColor, PathStatus } from "@/hooks/useLmsLearningPaths";
import { useLmsPermissions } from "@/hooks/useModulePermissions";
import { PathFormDialog } from "./PathFormDialog";

export default function PathsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PathStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(searchParams.get("new") === "1");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  
  const permissions = useLmsPermissions();
  const { data: paths = [], isLoading } = useLmsLearningPaths({ 
    status: statusFilter, 
    search: search || undefined 
  });
  const { archivePath, deletePath, publishPath } = useLmsLearningPathMutations();

  const handleOpenNew = () => {
    setEditingPath(null);
    setDialogOpen(true);
    setSearchParams({});
  };

  const handleEdit = (pathId: string) => {
    setEditingPath(pathId);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPath(null);
    setSearchParams({});
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader 
        title="Learning Paths" 
        description="Create structured sequences of courses"
      >
        {permissions.canCreate && (
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Learning Path
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search learning paths..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PathStatus | "all")}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Paths Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : paths.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No learning paths yet"
          description="Create your first learning path to organize courses into structured sequences."
          actionLabel={permissions.canCreate ? "Create Learning Path" : undefined}
          onAction={permissions.canCreate ? handleOpenNew : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paths.map((path, index) => (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full hover:shadow-md transition-shadow group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{path.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getPathStatusColor(path.status)}>
                          {getPathStatusLabel(path.status)}
                        </Badge>
                        {path.estimated_hours && (
                          <span className="text-xs text-muted-foreground">
                            {path.estimated_hours}h
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/app/lms/paths/${path.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        {permissions.canEdit && (
                          <DropdownMenuItem onClick={() => handleEdit(path.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {permissions.canPublish && path.status === "draft" && (
                          <DropdownMenuItem onClick={() => publishPath.mutate(path.id)}>
                            <Send className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {permissions.canArchive && path.status !== "archived" && (
                          <DropdownMenuItem onClick={() => archivePath.mutate(path.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {permissions.canDelete && (
                          <DropdownMenuItem 
                            onClick={() => deletePath.mutate(path.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-2">
                    {path.description || "No description"}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <PathFormDialog 
        open={dialogOpen} 
        onOpenChange={handleDialogClose}
        pathId={editingPath}
      />
    </div>
  );
}
