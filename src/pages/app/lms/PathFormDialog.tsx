import * as React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLmsLearningPath, useLmsLearningPathMutations, Visibility } from "@/hooks/useLmsLearningPaths";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  visibility: z.enum(["company_private", "company_public"]),
  estimated_hours: z.coerce.number().min(0).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface PathFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathId?: string | null;
}

export function PathFormDialog({ open, onOpenChange, pathId }: PathFormDialogProps) {
  const isEditing = !!pathId;
  const { data: path, isLoading: pathLoading } = useLmsLearningPath(pathId || undefined);
  const { createPath, updatePath } = useLmsLearningPathMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      visibility: "company_private",
      estimated_hours: null,
    },
  });

  useEffect(() => {
    if (path && isEditing) {
      form.reset({
        title: path.title,
        description: path.description || "",
        visibility: path.visibility as Visibility,
        estimated_hours: path.estimated_hours,
      });
    } else if (!isEditing) {
      form.reset({
        title: "",
        description: "",
        visibility: "company_private",
        estimated_hours: null,
      });
    }
  }, [path, isEditing, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && pathId) {
        await updatePath.mutateAsync({
          id: pathId,
          title: values.title,
          description: values.description,
          visibility: values.visibility,
          estimated_hours: values.estimated_hours,
        });
      } else {
        await createPath.mutateAsync({
          title: values.title,
          description: values.description,
          visibility: values.visibility,
          estimated_hours: values.estimated_hours || undefined,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createPath.isPending || updatePath.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Learning Path" : "Create Learning Path"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the learning path details below." 
              : "Add a new learning path to organize courses."}
          </DialogDescription>
        </DialogHeader>

        {pathLoading && isEditing ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Learning path title" {...field} />
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
                        placeholder="Brief description of this learning path" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="company_private">Private</SelectItem>
                          <SelectItem value="company_public">Company Public</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Who can see this path
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (hours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          step={0.5}
                          placeholder="e.g., 10" 
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
