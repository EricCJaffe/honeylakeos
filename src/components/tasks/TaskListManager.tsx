import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { List, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { useTaskLists, TaskList } from "@/hooks/useTaskLists";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

const listSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional().nullable(),
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
  const { taskLists, isCompanyAdmin, createList, updateList, deleteList } = useTaskLists();
  const [editingList, setEditingList] = React.useState<TaskList | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const form = useForm<ListFormValues>({
    resolver: zodResolver(listSchema),
    defaultValues: { name: "", color: null },
  });

  React.useEffect(() => {
    if (editingList) {
      form.reset({ name: editingList.name, color: editingList.color });
    } else {
      form.reset({ name: "", color: null });
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
      createList.mutate({ name: values.name, color: values.color }, {
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
    if (confirm("Delete this list? Tasks will be moved to 'Unlisted'.")) {
      deleteList.mutate(listId);
    }
  };

  const handleAddNew = () => {
    setEditingList(null);
    form.reset({ name: "", color: null });
    setIsFormOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Task Lists</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {taskLists.length === 0 && !isFormOpen ? (
            <EmptyState
              icon={List}
              title="No lists yet"
              description="Create your first list to organize tasks."
              actionLabel={isCompanyAdmin ? "Create List" : undefined}
              onAction={isCompanyAdmin ? handleAddNew : undefined}
            />
          ) : (
            <>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {taskLists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full",
                          !list.color && "border border-muted-foreground/30 bg-muted"
                        )}
                        style={list.color ? { backgroundColor: list.color } : undefined}
                      />
                      <span className="font-medium">{list.name}</span>
                    </div>
                    {isCompanyAdmin && (
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
                ))}
              </div>

              {isCompanyAdmin && !isFormOpen && (
                <Button variant="outline" className="w-full" onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add List
                </Button>
              )}
            </>
          )}

          {isFormOpen && isCompanyAdmin && (
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
