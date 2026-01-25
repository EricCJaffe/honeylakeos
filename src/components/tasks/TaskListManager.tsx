import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { List, Plus, Pencil, Trash2, MoreHorizontal, User, Building2, GripVertical } from "lucide-react";
import { useTaskLists, TaskList, TaskListWithCount } from "@/hooks/useTaskLists";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

const listSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional().nullable(),
  isPersonal: z.boolean().default(false),
});

type ListFormValues = z.infer<typeof listSchema>;

const colors = [
  { value: null, label: "None", color: "transparent" },
  { value: "#2563eb", label: "Blue", color: "#2563eb" },
  { value: "#16a34a", label: "Green", color: "#16a34a" },
  { value: "#dc2626", label: "Red", color: "#dc2626" },
  { value: "#9333ea", label: "Purple", color: "#9333ea" },
  { value: "#ea580c", label: "Orange", color: "#ea580c" },
  { value: "#0891b2", label: "Cyan", color: "#0891b2" },
  { value: "#eab308", label: "Yellow", color: "#eab308" },
];

interface TaskListManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskListManager({ open, onOpenChange }: TaskListManagerProps) {
  const { personalLists, companyLists, isCompanyAdmin, canManageList, createList, updateList, deleteList, reorderList } = useTaskLists();
  const { activeCompanyId } = useActiveCompany();
  const [editingList, setEditingList] = React.useState<TaskList | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [draggedItem, setDraggedItem] = React.useState<TaskListWithCount | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [dragScope, setDragScope] = React.useState<"personal" | "company" | null>(null);

  const form = useForm<ListFormValues>({
    resolver: zodResolver(listSchema),
    defaultValues: { name: "", color: null, isPersonal: false },
  });

  React.useEffect(() => {
    if (editingList) {
      form.reset({ name: editingList.name, color: editingList.color, isPersonal: editingList.is_personal });
    } else {
      form.reset({ name: "", color: null, isPersonal: false });
    }
  }, [editingList, form]);

  const onSubmit = (values: ListFormValues) => {
    if (editingList) {
      updateList.mutate({ id: editingList.id, name: values.name, color: values.color }, {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingList(null);
          form.reset();
        },
      });
    } else {
      createList.mutate({ name: values.name, color: values.color, isPersonal: values.isPersonal }, {
        onSuccess: () => {
          setIsFormOpen(false);
          form.reset();
        },
      });
    }
  };

  const handleEdit = (list: TaskList) => {
    setEditingList(list);
    setIsFormOpen(true);
  };

  const handleDelete = (listId: string) => {
    if (confirm("Delete this list? Tasks will be moved to 'No List'.")) {
      deleteList.mutate(listId);
    }
  };

  const handleAddNew = (isPersonal: boolean = false) => {
    setEditingList(null);
    form.reset({ name: "", color: null, isPersonal });
    setIsFormOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, list: TaskListWithCount, scope: "personal" | "company") => {
    setDraggedItem(list);
    setDragScope(scope);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number, scope: "personal" | "company") => {
    e.preventDefault();
    if (dragScope !== scope) return; // Cannot drag between scopes
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedItem && dragOverIndex !== null && dragScope) {
      const lists = dragScope === "personal" ? personalLists : companyLists;
      const oldIndex = lists.findIndex(l => l.id === draggedItem.id);
      
      if (oldIndex !== dragOverIndex) {
        reorderList.mutate({ listId: draggedItem.id, newIndex: dragOverIndex });
      }
    }
    setDraggedItem(null);
    setDragOverIndex(null);
    setDragScope(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const renderListItem = (list: TaskListWithCount, index: number, scope: "personal" | "company") => {
    const canManage = canManageList(list);
    const isDragging = draggedItem?.id === list.id;
    const isDragOver = dragOverIndex === index && dragScope === scope;

    return (
      <div
        key={list.id}
        draggable={canManage}
        onDragStart={(e) => handleDragStart(e, list, scope)}
        onDragOver={(e) => handleDragOver(e, index, scope)}
        onDragEnd={handleDragEnd}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border bg-card transition-all",
          canManage && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50",
          isDragOver && "border-primary border-2"
        )}
      >
        <div className="flex items-center gap-3">
          {canManage && (
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          )}
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              !list.color && "border border-muted-foreground/30 bg-muted"
            )}
            style={list.color ? { backgroundColor: list.color } : undefined}
          />
          <span className="font-medium">{list.name}</span>
          <Badge variant="secondary" className="text-xs">
            {list.task_count}
          </Badge>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(list)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(list.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const hasNoLists = personalLists.length === 0 && companyLists.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Task Lists</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasNoLists && !isFormOpen ? (
            <EmptyState
              icon={List}
              title="No lists yet"
              description="Create your first list to organize tasks."
              actionLabel="Create List"
              onAction={() => handleAddNew(false)}
            />
          ) : (
            <>
              {/* Personal Lists Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal Lists
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => handleAddNew(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {personalLists.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-2">No personal lists</p>
                ) : (
                  <div className="space-y-2">
                    {personalLists.map((list, index) => renderListItem(list, index, "personal"))}
                  </div>
                )}
              </div>

              {/* Company Lists Section */}
              {activeCompanyId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company Lists
                    </h4>
                    {isCompanyAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => handleAddNew(false)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {companyLists.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-2">No company lists</p>
                  ) : (
                    <div className="space-y-2">
                      {companyLists.map((list, index) => renderListItem(list, index, "company"))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {isFormOpen && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>List Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Groceries" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Personal toggle - only show when creating new */}
                {!editingList && activeCompanyId && (
                  <FormField
                    control={form.control}
                    name="isPersonal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Personal List</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {field.value 
                              ? "Only you can see this list" 
                              : "Visible to company members"}
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isCompanyAdmin && !field.value}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <div className="flex gap-2 flex-wrap">
                        {colors.map((color) => (
                          <button
                            key={color.label}
                            type="button"
                            onClick={() => field.onChange(color.value)}
                            className={cn(
                              "w-8 h-8 rounded-full border-2 transition-all",
                              field.value === color.value ? "border-foreground scale-110" : "border-transparent",
                              !color.value && "bg-muted border-muted-foreground/30"
                            )}
                            style={color.value ? { backgroundColor: color.value } : undefined}
                            title={color.label}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingList(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createList.isPending || updateList.isPending}>
                    {editingList ? "Save" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
