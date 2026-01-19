import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, GripVertical } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSOPMutations, useDepartmentSOPs, type SOP, type ProcedureStep } from "@/hooks/useSOPs";

const procedureStepSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string().min(1, "Step title is required"),
  description: z.string(),
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  purpose: z.string().max(1000).optional(),
  scope: z.string().max(1000).optional(),
  owner_role: z.string().max(100).optional(),
  tools_systems: z.string().optional(), // Comma-separated
  procedure_steps: z.array(procedureStepSchema),
  exceptions_notes: z.string().max(2000).optional(),
  related_sop_ids: z.array(z.string()).optional(),
  visibility: z.enum(["department_only", "company_public"]),
  tags: z.string().optional(), // Comma-separated
  last_reviewed_at: z.string().optional(),
  next_review_at: z.string().optional(),
  change_summary: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SOPFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  editingSOP?: SOP | null;
}

export function SOPFormDialog({
  open,
  onOpenChange,
  departmentId,
  editingSOP,
}: SOPFormDialogProps) {
  const { createSOP, updateSOP } = useSOPMutations();
  const { data: departmentSOPs } = useDepartmentSOPs(departmentId);
  const isEditing = !!editingSOP;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      purpose: "",
      scope: "",
      owner_role: "",
      tools_systems: "",
      procedure_steps: [],
      exceptions_notes: "",
      related_sop_ids: [],
      visibility: "department_only",
      tags: "",
      last_reviewed_at: "",
      next_review_at: "",
      change_summary: "",
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "procedure_steps",
  });

  useEffect(() => {
    if (editingSOP) {
      form.reset({
        title: editingSOP.title,
        purpose: editingSOP.purpose || "",
        scope: editingSOP.scope || "",
        owner_role: editingSOP.owner_role || "",
        tools_systems: editingSOP.tools_systems?.join(", ") || "",
        procedure_steps: editingSOP.procedure_steps || [],
        exceptions_notes: editingSOP.exceptions_notes || "",
        related_sop_ids: editingSOP.related_sop_ids || [],
        visibility: editingSOP.visibility,
        tags: editingSOP.tags?.join(", ") || "",
        last_reviewed_at: editingSOP.last_reviewed_at?.split("T")[0] || "",
        next_review_at: editingSOP.next_review_at?.split("T")[0] || "",
        change_summary: "",
      });
    } else {
      form.reset({
        title: "",
        purpose: "",
        scope: "",
        owner_role: "",
        tools_systems: "",
        procedure_steps: [],
        exceptions_notes: "",
        related_sop_ids: [],
        visibility: "department_only",
        tags: "",
        last_reviewed_at: "",
        next_review_at: "",
        change_summary: "",
      });
    }
  }, [editingSOP, form]);

  const addProcedureStep = () => {
    append({
      id: crypto.randomUUID(),
      order: fields.length + 1,
      title: "",
      description: "",
    });
  };

  const onSubmit = async (values: FormValues) => {
    const toolsSystems = values.tools_systems
      ? values.tools_systems.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const tags = values.tags
      ? values.tags.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const procedureSteps: ProcedureStep[] = values.procedure_steps.map((step, idx) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: idx + 1,
    }));

    if (isEditing && editingSOP) {
      await updateSOP.mutateAsync({
        id: editingSOP.id,
        title: values.title,
        purpose: values.purpose || null,
        scope: values.scope || null,
        owner_role: values.owner_role || null,
        tools_systems: toolsSystems,
        procedure_steps: procedureSteps,
        exceptions_notes: values.exceptions_notes || null,
        related_sop_ids: values.related_sop_ids || [],
        visibility: values.visibility,
        tags: tags,
        last_reviewed_at: values.last_reviewed_at || null,
        next_review_at: values.next_review_at || null,
        change_summary: values.change_summary,
      });
    } else {
      await createSOP.mutateAsync({
        department_id: departmentId,
        title: values.title,
        purpose: values.purpose,
        scope: values.scope,
        owner_role: values.owner_role,
        tools_systems: toolsSystems,
        procedure_steps: procedureSteps,
        exceptions_notes: values.exceptions_notes,
        related_sop_ids: values.related_sop_ids,
        visibility: values.visibility,
        tags: tags,
        last_reviewed_at: values.last_reviewed_at,
        next_review_at: values.next_review_at,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  const availableRelatedSOPs = departmentSOPs?.filter(
    (sop) => sop.id !== editingSOP?.id
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit SOP" : "Create SOP"}</DialogTitle>
          <DialogDescription>
            Standard Operating Procedures document processes and workflows for your department.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Customer Onboarding Process" {...field} />
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
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="department_only">Department Only</SelectItem>
                            <SelectItem value="company_public">Company Public</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="owner_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Operations Manager" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Why does this SOP exist? What problem does it solve?"
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
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What does this SOP cover? Who should follow it?"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Tools & Systems */}
              <FormField
                control={form.control}
                name="tools_systems"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tools / Systems Used</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Salesforce, Slack, Google Docs (comma-separated)" {...field} />
                    </FormControl>
                    <FormDescription>Enter tools separated by commas</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Procedure Steps */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base">Step-by-Step Procedure</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={addProcedureStep}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Step
                  </Button>
                </div>

                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No steps added yet. Click "Add Step" to begin.
                  </p>
                )}

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex gap-3 items-start p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2 pt-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                      </div>
                      <div className="flex-1 space-y-2">
                        <FormField
                          control={form.control}
                          name={`procedure_steps.${index}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Step title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`procedure_steps.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  placeholder="Detailed instructions for this step..."
                                  rows={2}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Exceptions & Notes */}
              <FormField
                control={form.control}
                name="exceptions_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exceptions / Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any exceptions to the procedure or additional notes..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Related SOPs */}
              {availableRelatedSOPs.length > 0 && (
                <FormField
                  control={form.control}
                  name="related_sop_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related SOPs</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {availableRelatedSOPs.map((sop) => {
                          const isSelected = field.value?.includes(sop.id);
                          return (
                            <Badge
                              key={sop.id}
                              variant={isSelected ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                if (isSelected) {
                                  field.onChange(field.value?.filter((id) => id !== sop.id));
                                } else {
                                  field.onChange([...(field.value || []), sop.id]);
                                }
                              }}
                            >
                              {sop.title}
                            </Badge>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              {/* Tags & Review Dates */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., onboarding, customer, sales (comma-separated)" {...field} />
                    </FormControl>
                    <FormDescription>Tags help with searching and filtering</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="last_reviewed_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Reviewed Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_review_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Review Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isEditing && (
                <FormField
                  control={form.control}
                  name="change_summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change Summary</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of changes made..." {...field} />
                      </FormControl>
                      <FormDescription>This will be recorded in the revision history</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createSOP.isPending || updateSOP.isPending}
          >
            {createSOP.isPending || updateSOP.isPending
              ? "Saving..."
              : isEditing
              ? "Save Changes"
              : "Create SOP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
