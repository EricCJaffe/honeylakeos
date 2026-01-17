import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FolderSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchAllFolders: boolean;
  onSearchAllChange: (searchAll: boolean) => void;
  placeholder?: string;
  showToggle?: boolean;
  className?: string;
}

export function FolderSearchBar({
  searchQuery,
  onSearchChange,
  searchAllFolders,
  onSearchAllChange,
  placeholder = "Search...",
  showToggle = true,
  className,
}: FolderSearchBarProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 pr-8"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {showToggle && (
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="search-all"
            checked={searchAllFolders}
            onCheckedChange={onSearchAllChange}
          />
          <Label htmlFor="search-all" className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
            All folders
          </Label>
        </div>
      )}
    </div>
  );
}
