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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResourceMutations, type Resource } from "@/hooks/useResources";
import type { Database } from "@/integrations/supabase/types";

type ResourceType = Database["public"]["Enums"]["resource_type"];

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(500).optional(),
  resource_type: z.enum(["document", "link", "file", "video"]),
  content_ref: z.string().min(1, "Content reference is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string | null;
  editingResource?: Resource | null;
}

export function ResourceFormDialog({
  open,
  onOpenChange,
  departmentId,
  editingResource,
}: ResourceFormDialogProps) {
  const { createResource, updateResource } = useResourceMutations();
  const isEditing = !!editingResource;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      resource_type: "link",
      content_ref: "",
    },
  });

  const resourceType = form.watch("resource_type");

  useEffect(() => {
    if (editingResource) {
      form.reset({
        title: editingResource.title,
        description: editingResource.description || "",
        resource_type: editingResource.resource_type,
        content_ref: editingResource.content_ref,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        resource_type: "link",
        content_ref: "",
      });
    }
  }, [editingResource, form]);

  const onSubmit = async (values: FormValues) => {
    if (isEditing && editingResource) {
      await updateResource.mutateAsync({
        id: editingResource.id,
        title: values.title,
        description: values.description || null,
        resource_type: values.resource_type as ResourceType,
        content_ref: values.content_ref,
      });
    } else {
      await createResource.mutateAsync({
        title: values.title,
        description: values.description,
        resource_type: values.resource_type as ResourceType,
        content_ref: values.content_ref,
        department_id: departmentId,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  const getContentLabel = () => {
    switch (resourceType) {
      case "link":
        return "URL";
      case "video":
        return "Video URL";
      case "document":
        return "Document Link";
      case "file":
        return "File Path / URL";
      default:
        return "Content Reference";
    }
  };

  const getContentPlaceholder = () => {
    switch (resourceType) {
      case "link":
        return "https://example.com/resource";
      case "video":
        return "https://youtube.com/watch?v=...";
      case "document":
        return "Link to document or internal path";
      case "file":
        return "Path to file or download URL";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Resource" : "Add Resource"}</DialogTitle>
          <DialogDescription>
            {departmentId
              ? "Add a resource specific to this department."
              : "Add a company-wide resource accessible to all team members."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Employee Handbook" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resource_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content_ref"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getContentLabel()}</FormLabel>
                  <FormControl>
                    <Input placeholder={getContentPlaceholder()} {...field} />
                  </FormControl>
                  <FormDescription>
                    {resourceType === "link" || resourceType === "video"
                      ? "Users can open this link directly."
                      : "Path or link to the resource."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this resource..."
                      rows={2}
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
                disabled={createResource.isPending || updateResource.isPending}
              >
                {createResource.isPending || updateResource.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Add Resource"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
