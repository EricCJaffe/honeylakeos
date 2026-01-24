import * as React from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Lock, Users, X } from "lucide-react";
import { useFolders, Folder as FolderType, flattenFolderTree } from "@/hooks/useFolders";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FolderPickerProps {
  value: string | null | undefined;
  onChange: (folderId: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

export function FolderPicker({
  value,
  onChange,
  placeholder = "Select folder",
  allowClear = true,
  className,
}: FolderPickerProps) {
  const { data: folderTree, isLoading } = useFolders();

  const companyFolders = folderTree?.companyFolders ?? [];
  const personalFolders = folderTree?.personalFolders ?? [];

  const flatCompanyFolders = flattenFolderTree(companyFolders);
  const flatPersonalFolders = flattenFolderTree(personalFolders);

  const selectedFolder = React.useMemo(() => {
    if (!value) return null;
    const all = [...flatCompanyFolders, ...flatPersonalFolders];
    return all.find((f) => f.folder.id === value)?.folder ?? null;
  }, [value, flatCompanyFolders, flatPersonalFolders]);

  const handleChange = (newValue: string) => {
    if (newValue === "__none__") {
      onChange(null);
    } else {
      onChange(newValue);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("h-10 bg-muted rounded-md animate-pulse", className)} />
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Select value={value ?? "__none__"} onValueChange={handleChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder}>
            {selectedFolder ? (
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span>{selectedFolder.name}</span>
                {selectedFolder.scope === "personal" && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">No folder</span>
            </div>
          </SelectItem>

          {flatCompanyFolders.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase">
                <Users className="h-3 w-3" />
                Company
              </div>
              {flatCompanyFolders.map(({ folder, depth }) => (
                <SelectItem key={folder.id} value={folder.id}>
                  <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 12}px` }}>
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span>{folder.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {flatPersonalFolders.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase">
                <Lock className="h-3 w-3" />
                Personal
              </div>
              {flatPersonalFolders.map(({ folder, depth }) => (
                <SelectItem key={folder.id} value={folder.id}>
                  <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 12}px` }}>
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span>{folder.name}</span>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {allowClear && value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
