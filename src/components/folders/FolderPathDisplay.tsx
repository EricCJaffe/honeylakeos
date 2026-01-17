import * as React from "react";
import { useMemo } from "react";
import { useFolders, Folder } from "@/hooks/useFolders";
import { cn } from "@/lib/utils";

interface FolderPathDisplayProps {
  folderId: string | null;
  className?: string;
}

/**
 * Display the folder path for an item (e.g., "Company / Operations / Policies")
 */
export function FolderPathDisplay({ folderId, className }: FolderPathDisplayProps) {
  const { data: folderTree } = useFolders();

  const folderPath = useMemo(() => {
    if (!folderId || !folderTree) return null;

    // Build a flat map of all folders
    const folderMap = new Map<string, Folder>();
    
    const addToMap = (folders: Folder[]) => {
      for (const folder of folders) {
        folderMap.set(folder.id, folder);
        if (folder.children?.length) {
          addToMap(folder.children);
        }
      }
    };
    
    addToMap(folderTree.companyFolders);
    addToMap(folderTree.personalFolders);

    // Build path from folder to root
    const path: string[] = [];
    let current = folderMap.get(folderId);
    
    while (current) {
      path.unshift(current.name);
      current = current.parent_folder_id ? folderMap.get(current.parent_folder_id) : undefined;
    }

    // Add scope prefix
    const targetFolder = folderMap.get(folderId);
    if (targetFolder) {
      if (targetFolder.scope === "company") {
        path.unshift("Company");
      } else {
        path.unshift("Personal");
      }
    }

    return path;
  }, [folderId, folderTree]);

  if (!folderPath || folderPath.length === 0) {
    return null;
  }

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {folderPath.join(" / ")}
    </span>
  );
}
