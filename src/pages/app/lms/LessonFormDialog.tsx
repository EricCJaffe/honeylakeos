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
import { RichTextField } from "@/components/ui/rich-text-field";
import { useLmsLesson, useLmsLessonMutations, ContentType, Visibility } from "@/hooks/useLmsLessons";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  content_type: z.enum(["youtube", "file_asset", "external_link", "rich_text"]),
  youtube_url: z.string().url().optional().or(z.literal("")),
  external_url: z.string().url().optional().or(z.literal("")),
  file_asset_path: z.string().optional(),
  rich_text_body: z.string().optional(),
  visibility: z.enum(["company_private", "company_public"]),
  estimated_minutes: z.coerce.number().min(0).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId?: string | null;
}

export function LessonFormDialog({ open, onOpenChange, lessonId }: LessonFormDialogProps) {
  const isEditing = !!lessonId;
  const { data: lesson, isLoading: lessonLoading } = useLmsLesson(lessonId || undefined);
  const { createLesson, updateLesson } = useLmsLessonMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      content_type: "youtube",
      youtube_url: "",
      external_url: "",
      file_asset_path: "",
      rich_text_body: "",
      visibility: "company_private",
      estimated_minutes: null,
    },
  });

  const contentType = form.watch("content_type");

  useEffect(() => {
    if (lesson && isEditing) {
      form.reset({
        title: lesson.title,
        description: lesson.description || "",
        content_type: lesson.content_type as ContentType,
        youtube_url: lesson.youtube_url || "",
        external_url: lesson.external_url || "",
        file_asset_path: lesson.file_asset_path || "",
        rich_text_body: lesson.rich_text_body || "",
        visibility: lesson.visibility as Visibility,
        estimated_minutes: lesson.estimated_minutes,
      });
    } else if (!isEditing) {
      form.reset({
        title: "",
        description: "",
        content_type: "youtube",
        youtube_url: "",
        external_url: "",
        file_asset_path: "",
        rich_text_body: "",
        visibility: "company_private",
        estimated_minutes: null,
      });
    }
  }, [lesson, isEditing, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        title: values.title,
        description: values.description,
        content_type: values.content_type as ContentType,
        youtube_url: values.content_type === "youtube" ? values.youtube_url : null,
        external_url: values.content_type === "external_link" ? values.external_url : null,
        file_asset_path: values.content_type === "file_asset" ? values.file_asset_path : null,
        rich_text_body: values.content_type === "rich_text" ? values.rich_text_body : null,
        visibility: values.visibility as Visibility,
        estimated_minutes: values.estimated_minutes,
      };

      if (isEditing && lessonId) {
        await updateLesson.mutateAsync({ id: lessonId, ...payload });
      } else {
        await createLesson.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createLesson.isPending || updateLesson.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Lesson" : "Create Lesson"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the lesson details below." 
              : "Add a new lesson to your LMS."}
          </DialogDescription>
        </DialogHeader>

        {lessonLoading && isEditing ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Lesson title" {...field} />
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
                        placeholder="Brief description of the lesson" 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube Video</SelectItem>
                        <SelectItem value="file_asset">File/PDF</SelectItem>
                        <SelectItem value="external_link">External Link</SelectItem>
                        <SelectItem value="rich_text">Rich Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {contentType === "youtube" && (
                <FormField
                  control={form.control}
                  name="youtube_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Paste the full YouTube video URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {contentType === "external_link" && (
                <FormField
                  control={form.control}
                  name="external_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>External URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {contentType === "file_asset" && (
                <FormField
                  control={form.control}
                  name="file_asset_path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File Path</FormLabel>
                      <FormControl>
                        <Input placeholder="Path to file in storage" {...field} />
                      </FormControl>
                      <FormDescription>
                        Upload support coming soon. Enter the storage path.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {contentType === "rich_text" && (
                <FormField
                  control={form.control}
                  name="rich_text_body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <RichTextField
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="Enter lesson content..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (min)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          placeholder="e.g., 15" 
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

              <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-background pb-1">
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
