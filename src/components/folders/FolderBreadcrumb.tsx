import * as React from "react";
import { ChevronRight, Home, Folder } from "lucide-react";
import { useFolders, Folder as FolderType, flattenFolderTree } from "@/hooks/useFolders";
import { cn } from "@/lib/utils";

interface FolderBreadcrumbProps {
  folderId: string | null;
  onNavigate: (folderId: string | null) => void;
  rootLabel?: string;
}

export function FolderBreadcrumb({ folderId, onNavigate, rootLabel = "All" }: FolderBreadcrumbProps) {
  const { data: folderTree } = useFolders();

  // Build breadcrumb path from root to current folder
  const breadcrumbPath = React.useMemo(() => {
    if (!folderId || !folderTree) return [];

    const allFolders = [...folderTree.companyFolders, ...folderTree.personalFolders];
    const flatList = flattenFolderTree(allFolders);
    
    // Find the folder and build path up to root
    const findPath = (targetId: string): FolderType[] => {
      const path: FolderType[] = [];
      let currentId: string | null = targetId;
      
      while (currentId) {
        const item = flatList.find((f) => f.folder.id === currentId);
        if (item) {
          path.unshift(item.folder);
          currentId = item.folder.parent_folder_id;
        } else {
          break;
        }
      }
      
      return path;
    };

    return findPath(folderId);
  }, [folderId, folderTree]);

  if (!folderId) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span>{rootLabel}</span>
      </button>

      {breadcrumbPath.map((folder, index) => {
        const isLast = index === breadcrumbPath.length - 1;
        return (
          <React.Fragment key={folder.id}>
            <ChevronRight className="h-3.5 w-3.5" />
            <button
              onClick={() => onNavigate(folder.id)}
              className={cn(
                "flex items-center gap-1 transition-colors",
                isLast ? "text-foreground font-medium" : "hover:text-foreground"
              )}
              disabled={isLast}
            >
              <Folder className="h-3.5 w-3.5" />
              <span className="max-w-[150px] truncate">{folder.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
