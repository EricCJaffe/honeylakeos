import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecentFilter = "recent" | null;

interface RecentItemsSectionProps {
  selectedFilter: RecentFilter;
  onSelectFilter: (filter: RecentFilter) => void;
  recentCount?: number;
}

export function RecentItemsSection({
  selectedFilter,
  onSelectFilter,
  recentCount = 0,
}: RecentItemsSectionProps) {
  const isSelected = selectedFilter === "recent";

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm",
        isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
      )}
      onClick={() => onSelectFilter(isSelected ? null : "recent")}
    >
      <Clock className="h-4 w-4" />
      <span className="flex-1">Recent</span>
      {recentCount > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">{recentCount}</span>
      )}
    </div>
  );
}
