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
import { useLmsCourse, useLmsCourseMutations, Visibility } from "@/hooks/useLmsCourses";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  visibility: z.enum(["company_private", "company_public"]),
  estimated_hours: z.coerce.number().min(0).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string | null;
}

export function CourseFormDialog({ open, onOpenChange, courseId }: CourseFormDialogProps) {
  const isEditing = !!courseId;
  const { data: course, isLoading: courseLoading } = useLmsCourse(courseId || undefined);
  const { createCourse, updateCourse } = useLmsCourseMutations();

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
    if (course && isEditing) {
      form.reset({
        title: course.title,
        description: course.description || "",
        visibility: course.visibility as Visibility,
        estimated_hours: course.estimated_hours,
      });
    } else if (!isEditing) {
      form.reset({
        title: "",
        description: "",
        visibility: "company_private",
        estimated_hours: null,
      });
    }
  }, [course, isEditing, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && courseId) {
        await updateCourse.mutateAsync({
          id: courseId,
          title: values.title,
          description: values.description,
          visibility: values.visibility,
          estimated_hours: values.estimated_hours,
        });
      } else {
        await createCourse.mutateAsync({
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

  const isPending = createCourse.isPending || updateCourse.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Course" : "Create Course"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the course details below." 
              : "Add a new course to your LMS."}
          </DialogDescription>
        </DialogHeader>

        {courseLoading && isEditing ? (
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
                      <Input placeholder="Course title" {...field} />
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
                        placeholder="Brief description of the course" 
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
                        Who can see this course
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
                          placeholder="e.g., 2.5" 
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
