import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useCreatePipeline,
  useUpdatePipeline,
  SalesPipeline,
} from "@/hooks/useSalesPipelines";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  is_default: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PipelineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline?: SalesPipeline | null;
}

export function PipelineFormDialog({ open, onOpenChange, pipeline }: PipelineFormDialogProps) {
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();

  const isEdit = !!pipeline;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      is_default: false,
    },
  });

  useEffect(() => {
    if (pipeline) {
      form.reset({
        name: pipeline.name,
        description: pipeline.description || "",
        is_default: pipeline.is_default,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        is_default: false,
      });
    }
  }, [pipeline, form]);

  const onSubmit = async (data: FormValues) => {
    if (isEdit && pipeline) {
      await updatePipeline.mutateAsync({
        id: pipeline.id,
        name: data.name,
        description: data.description,
        is_default: data.is_default,
      });
    } else {
      await createPipeline.mutateAsync({
        name: data.name,
        description: data.description,
        is_default: data.is_default,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  const isPending = createPipeline.isPending || updatePipeline.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Pipeline" : "New Pipeline"}</DialogTitle>
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
                    <Input placeholder="Pipeline name..." {...field} />
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
                    <Textarea placeholder="Optional description..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Default Pipeline</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      New opportunities will use this pipeline by default
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
