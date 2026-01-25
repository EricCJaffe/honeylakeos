import * as React from "react";
import { FileText, ChevronDown, Check, Search, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAvailableFormBaseKeys } from "@/hooks/useFormResolver";

interface FormBaseKeySelectorProps {
  /** Currently selected base key */
  value: string | null;
  /** Callback when selection changes */
  onChange: (baseKey: string | null) => void;
  /** Optional coaching org context */
  coachingOrgId?: string | null;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Disable the selector */
  disabled?: boolean;
}

/**
 * FormBaseKeySelector - Select a form by base key
 * 
 * Shows available forms grouped by resolution status with program pack badges.
 * Used in workflow step editor to attach forms by base key.
 */
export function FormBaseKeySelector({
  value,
  onChange,
  coachingOrgId,
  placeholder = "Select a form...",
  className,
  disabled,
}: FormBaseKeySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const { data, isLoading, error } = useAvailableFormBaseKeys(coachingOrgId);

  const selectedForm = data?.baseKeys.find((f) => f.baseKey === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex items-center gap-2 truncate">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading forms...</span>
              </>
            ) : selectedForm ? (
              <>
                <span className="truncate">{selectedForm.title}</span>
                <Badge variant="outline" className="ml-1 text-xs shrink-0">
                  {selectedForm.activeVariant}
                </Badge>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search forms..." />
          <CommandList>
            <CommandEmpty>
              {error ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to load forms</span>
                </div>
              ) : (
                "No forms found."
              )}
            </CommandEmpty>
            <CommandGroup heading="Available Forms">
              {data?.baseKeys.map((form) => (
                <CommandItem
                  key={form.baseKey}
                  value={form.baseKey}
                  onSelect={() => {
                    onChange(form.baseKey === value ? null : form.baseKey);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === form.baseKey ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="truncate">{form.title}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <Badge 
                        variant={form.hasProgramSpecific ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        {form.activeVariant}
                      </Badge>
                      {form.hasGeneric && form.hasProgramSpecific && (
                        <Badge variant="outline" className="text-xs">+generic</Badge>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {value && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <span className="text-muted-foreground">Clear selection</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface FormBaseKeyListProps {
  /** Coaching org context */
  coachingOrgId?: string | null;
  /** Callback when a form is selected */
  onSelect?: (baseKey: string) => void;
  /** Currently selected base key */
  selectedKey?: string | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FormBaseKeyList - Display all available form base keys
 * 
 * Used in admin views to show all forms with their resolution status.
 */
export function FormBaseKeyList({
  coachingOrgId,
  onSelect,
  selectedKey,
  className,
}: FormBaseKeyListProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const { data, isLoading, error } = useAvailableFormBaseKeys(coachingOrgId);

  const filteredForms = React.useMemo(() => {
    if (!data?.baseKeys) return [];
    if (!searchTerm) return data.baseKeys;
    
    const term = searchTerm.toLowerCase();
    return data.baseKeys.filter(
      (f) =>
        f.title.toLowerCase().includes(term) ||
        f.baseKey.toLowerCase().includes(term)
    );
  }, [data?.baseKeys, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Failed to load forms: {error.message}</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search forms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {data?.programKey && data.programKey !== "generic" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Active program:</span>
          <Badge variant="outline">{data.programKey}</Badge>
        </div>
      )}

      <div className="space-y-2">
        {filteredForms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No forms found
          </p>
        ) : (
          filteredForms.map((form) => (
            <div
              key={form.baseKey}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                onSelect && "cursor-pointer hover:bg-muted/50",
                selectedKey === form.baseKey && "border-primary bg-primary/5"
              )}
              onClick={() => onSelect?.(form.baseKey)}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{form.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {form.baseKey}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={form.hasProgramSpecific ? "default" : "secondary"}
                >
                  {form.activeVariant}
                </Badge>
                {form.hasGeneric && form.hasProgramSpecific && (
                  <Badge variant="outline" className="text-xs">
                    +fallback
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
