import * as React from "react";
import { User, Building2, Lock, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { ReportVisibility } from "@/hooks/useReportDashboard";

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface ReportSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  onSave: (data: {
    name: string;
    description: string;
    visibility: ReportVisibility;
    roleIds: string[];
  }) => void;
  isPending?: boolean;
}

export function ReportSaveDialog({
  open,
  onOpenChange,
  defaultName,
  onSave,
  isPending = false,
}: ReportSaveDialogProps) {
  const { activeCompanyId, isCompanyAdmin } = useMembership();

  const [name, setName] = React.useState(defaultName);
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState<ReportVisibility>("personal");
  const [selectedRoleIds, setSelectedRoleIds] = React.useState<string[]>([]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription("");
      setVisibility("personal");
      setSelectedRoleIds([]);
    }
  }, [open, defaultName]);

  // Fetch groups for restricted visibility
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("groups")
        .select("id, name, description")
        .eq("company_id", activeCompanyId)
        .order("name");

      if (error) throw error;
      return data as Group[];
    },
    enabled: !!activeCompanyId && visibility === "company_restricted",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      visibility,
      roleIds: visibility === "company_restricted" ? selectedRoleIds : [],
    });
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Save Report</DialogTitle>
            <DialogDescription>
              Save this report configuration for quick access later
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name *</Label>
              <Input
                id="report-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekly Task Summary"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="report-description">Description</Label>
              <Textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            {/* Visibility */}
            <div className="space-y-3">
              <Label>Visibility</Label>
              <RadioGroup
                value={visibility}
                onValueChange={(v) => setVisibility(v as ReportVisibility)}
                className="space-y-2"
              >
                <div className="flex items-start space-x-3 rounded-lg border p-3">
                  <RadioGroupItem value="personal" id="vis-personal" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="vis-personal" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Personal
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Only you can see this report
                    </p>
                  </div>
                </div>

                {isCompanyAdmin && (
                  <>
                    <div className="flex items-start space-x-3 rounded-lg border p-3">
                      <RadioGroupItem value="company_shared" id="vis-shared" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="vis-shared" className="flex items-center gap-2 cursor-pointer">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          Company (Shared)
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Visible to all company members with module access
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 rounded-lg border p-3">
                      <RadioGroupItem value="company_restricted" id="vis-restricted" className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor="vis-restricted" className="flex items-center gap-2 cursor-pointer">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          Company (Restricted)
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Only visible to selected groups
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </RadioGroup>
            </div>

            {/* Role Selection for Restricted */}
            {visibility === "company_restricted" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select Groups
                </Label>
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No groups available. Create groups first to restrict access.
                  </p>
                ) : (
                  <ScrollArea className="h-[150px] rounded-md border p-2">
                    <div className="space-y-2">
                      {groups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center space-x-2 py-1"
                        >
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={selectedRoleIds.includes(group.id)}
                            onCheckedChange={() => toggleRole(group.id)}
                          />
                          <Label
                            htmlFor={`group-${group.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            {group.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? "Saving..." : "Save Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
