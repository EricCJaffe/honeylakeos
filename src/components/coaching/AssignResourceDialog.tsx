import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileText, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useCoachingResources,
  useCoachingCollections,
  useCoachingAssignmentMutations,
} from "@/hooks/useCoachingResources";
import { useCoachingRole } from "@/hooks/useCoachingRole";
import type { Database } from "@/integrations/supabase/types";

type AssignableType = Database["public"]["Enums"]["coaching_assignable_type"];

interface AssignResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagementId?: string;
  userId?: string;
}

export function AssignResourceDialog({
  open,
  onOpenChange,
  engagementId,
  userId,
}: AssignResourceDialogProps) {
  const { activeCoachingOrgId } = useCoachingRole();
  const { data: resources } = useCoachingResources(activeCoachingOrgId);
  const { data: collections } = useCoachingCollections(activeCoachingOrgId);
  const { createAssignment } = useCoachingAssignmentMutations();

  const [assignableType, setAssignableType] = useState<AssignableType>("resource");
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [titleOverride, setTitleOverride] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();

  const handleSubmit = async () => {
    await createAssignment.mutateAsync({
      coaching_engagement_id: engagementId || null,
      member_user_id: userId || null,
      assignable_type: assignableType,
      resource_id: assignableType === "resource" ? selectedResourceId : null,
      collection_id: assignableType === "collection" ? selectedCollectionId : null,
      title_override: titleOverride || undefined,
      due_at: dueDate?.toISOString() || null,
    });

    // Reset form
    setSelectedResourceId("");
    setSelectedCollectionId("");
    setTitleOverride("");
    setDueDate(undefined);
    onOpenChange(false);
  };

  const isValid =
    (assignableType === "resource" && selectedResourceId) ||
    (assignableType === "collection" && selectedCollectionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Resource</DialogTitle>
          <DialogDescription>
            Select a resource or collection to assign.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={assignableType} onValueChange={(v) => setAssignableType(v as AssignableType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resource" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resource
            </TabsTrigger>
            <TabsTrigger value="collection" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Collection
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resource" className="mt-4">
            <div className="space-y-2">
              <Label>Select Resource</Label>
              <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a resource..." />
                </SelectTrigger>
                <SelectContent>
                  {resources?.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="collection" className="mt-4">
            <div className="space-y-2">
              <Label>Select Collection</Label>
              <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a collection..." />
                </SelectTrigger>
                <SelectContent>
                  {collections?.map((collection) => (
                    <SelectItem key={collection.id} value={collection.id}>
                      {collection.name} ({collection.items?.length || 0} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title-override">Title Override (optional)</Label>
            <Input
              id="title-override"
              value={titleOverride}
              onChange={(e) => setTitleOverride(e.target.value)}
              placeholder="Custom title for this assignment"
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createAssignment.isPending}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
