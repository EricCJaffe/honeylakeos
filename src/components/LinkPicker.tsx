import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, CheckCircle2, X, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface LinkPickerProps {
  type: "project" | "task";
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showClear?: boolean;
}

export function LinkPicker({
  type,
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
  showClear = true,
}: LinkPickerProps) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled, loading: modulesLoading } = useCompanyModules();
  const [open, setOpen] = React.useState(false);

  // Check module access
  const moduleKey = type === "project" ? "projects" : "tasks";
  const moduleEnabled = !modulesLoading && isEnabled(moduleKey);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, emoji, status")
        .eq("company_id", activeCompanyId)
        .eq("is_template", false)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && type === "project" && moduleEnabled,
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-for-link", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, project_id")
        .eq("company_id", activeCompanyId)
        .neq("status", "done")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && type === "task" && moduleEnabled,
  });

  // If module is disabled, return null
  if (!moduleEnabled && !modulesLoading) {
    return null;
  }

  const items = type === "project" ? projects : tasks;
  // Ensure items is an array before calling .find()
  const selectedItem = Array.isArray(items) ? items.find((item) => item.id === value) : undefined;

  const Icon = type === "project" ? FolderKanban : CheckCircle2;
  const defaultPlaceholder = type === "project" ? "Link to project..." : "Link to task...";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "justify-start text-left font-normal flex-1",
              !value && "text-muted-foreground"
            )}
          >
            <Icon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            {selectedItem ? (
              <span className="truncate">
                {type === "project" && (selectedItem as any).emoji}{" "}
                {type === "project" ? (selectedItem as any).name : (selectedItem as any).title}
              </span>
            ) : (
              <span>{placeholder || defaultPlaceholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${type}s...`} />
            <CommandList>
              <CommandEmpty>No {type}s found.</CommandEmpty>
              <CommandGroup>
                {Array.isArray(items) && items.map((item: any) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {type === "project" && item.emoji}{" "}
                      {type === "project" ? item.name : item.title}
                    </span>
                    {item.status && (
                      <Badge
                        variant="secondary"
                        className="ml-auto text-[10px] px-1.5"
                      >
                        {item.status}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showClear && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(null)}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// Compact version for inline use
interface LinkBadgeProps {
  type: "project" | "task";
  id: string;
  onRemove?: () => void;
}

export function LinkBadge({ type, id, onRemove }: LinkBadgeProps) {
  const { activeCompanyId } = useActiveCompany();

  // Fetch project
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, emoji")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && type === "project",
  });

  // Fetch task
  const { data: task } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && type === "task",
  });

  const item = type === "project" ? project : task;
  if (!item) return null;

  const Icon = type === "project" ? FolderKanban : CheckCircle2;
  const label = type === "project" 
    ? `${(item as any).emoji || ""} ${(item as any).name}`
    : (item as any).title;

  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      <Icon className="h-3 w-3" />
      <span className="max-w-[120px] truncate">{label}</span>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 ml-1 hover:bg-destructive/20"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  );
}
