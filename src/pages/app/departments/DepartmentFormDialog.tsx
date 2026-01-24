import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useDepartmentMutations } from "@/hooks/useDepartments";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDepartment?: { id: string; name: string; description: string | null } | null;
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  editingDepartment,
}: DepartmentFormDialogProps) {
  const { createDepartment, updateDepartment } = useDepartmentMutations();
  const isEditing = !!editingDepartment;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (editingDepartment) {
      form.reset({
        name: editingDepartment.name,
        description: editingDepartment.description || "",
      });
    } else {
      form.reset({ name: "", description: "" });
    }
  }, [editingDepartment, form]);

  const onSubmit = async (values: FormValues) => {
    if (isEditing && editingDepartment) {
      await updateDepartment.mutateAsync({
        id: editingDepartment.id,
        name: values.name,
        description: values.description || null,
      });
    } else {
      await createDepartment.mutateAsync({
        name: values.name,
        description: values.description,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Department" : "New Department"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the department details."
              : "Create a new department to organize your team."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Operations, Finance, HR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the department's purpose..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createDepartment.isPending || updateDepartment.isPending}
              >
                {createDepartment.isPending || updateDepartment.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
