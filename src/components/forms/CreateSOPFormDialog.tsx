import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, GripVertical, CheckSquare } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DepartmentSelect } from "@/components/DepartmentSelect";
import { RichTextField } from "@/components/ui/rich-text-field";
import { useSOPMutations, useDepartmentSOPs, useAllSOPs, type SOP, type ProcedureStep } from "@/hooks/useSOPs";

// SOP Format options
const SOP_FORMATS = [
  { value: "narrative", label: "Narrative" },
  { value: "checklist", label: "Checklist" },
  { value: "flowchart", label: "Flowchart" },
  { value: "hybrid", label: "Hybrid" },
] as const;

type SOPFormat = (typeof SOP_FORMATS)[number]["value"];

// Common tools/systems suggestions
const COMMON_TOOLS = [
  "Slack",
  "Microsoft Teams",
  "Google Workspace",
  "Salesforce",
  "HubSpot",
  "Jira",
  "Trello",
  "Notion",
  "Confluence",
  "Zoom",
  "Excel",
  "Google Sheets",
];

const procedureStepSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string().min(1, "Step title is required"),
  description: z.string(),
  isChecklistItem: z.boolean().optional(),
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  department_id: z.string().min(1, "Department is required"),
  purpose: z.string().max(1000).optional(),
  scope: z.string().max(1000).optional(),
  owner_role: z.string().max(100).optional(),
  tools_systems: z.array(z.string()).optional(),
  sop_format: z.enum(["narrative", "checklist", "flowchart", "hybrid"]),
  procedure_content: z.string().optional(), // Rich text for narrative/hybrid
  procedure_steps: z.array(procedureStepSchema), // For checklist/hybrid
  exceptions_notes: z.string().max(2000).optional(),
  related_sop_ids: z.array(z.string()).optional(),
  visibility: z.enum(["department_only", "company_public"]),
  tags: z.string().optional(),
  next_review_at: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface CreateSOPFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 
   * If provided, the department is pre-selected and the field is hidden.
   * If undefined/null, the user must select a department.
   */
  departmentId?: string | null;
  /** Optional: SOP to edit */
  editingSOP?: SOP | null;
  /** Optional: Callback when SOP is created/updated successfully */
  onSuccess?: (sopId: string) => void;
}

export function CreateSOPFormDialog({
  open,
  onOpenChange,
  departmentId: inheritedDepartmentId,
  editingSOP,
  onSuccess,
}: CreateSOPFormDialogProps) {
  const { createSOP, updateSOP } = useSOPMutations();
  const isEditing = !!editingSOP;
  const hasDepartmentContext = !!inheritedDepartmentId;

  // Use department-specific SOPs if we have a department, otherwise all SOPs
  const { data: departmentSOPs } = useDepartmentSOPs(inheritedDepartmentId || editingSOP?.department_id);
  const { data: allSOPs } = useAllSOPs();
  
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [customTool, setCustomTool] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      department_id: inheritedDepartmentId || "",
      purpose: "",
      scope: "",
      owner_role: "",
      tools_systems: [],
      sop_format: "narrative",
      procedure_content: "",
      procedure_steps: [],
      exceptions_notes: "",
      related_sop_ids: [],
      visibility: "department_only",
      tags: "",
      next_review_at: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "procedure_steps",
  });

  const sopFormat = form.watch("sop_format");
  const selectedDepartmentId = form.watch("department_id");

  // Get SOPs for the selected department for "Related SOPs" selection
  const availableRelatedSOPs = (selectedDepartmentId ? departmentSOPs : allSOPs)?.filter(
    (sop) => sop.id !== editingSOP?.id
  ) || [];

  useEffect(() => {
    if (editingSOP) {
      setSelectedTools(editingSOP.tools_systems || []);
      form.reset({
        title: editingSOP.title,
        department_id: editingSOP.department_id,
        purpose: editingSOP.purpose || "",
        scope: editingSOP.scope || "",
        owner_role: editingSOP.owner_role || "",
        tools_systems: editingSOP.tools_systems || [],
        sop_format: "narrative", // Default, as format isn't stored yet
        procedure_content: "", // Would need to reconstruct from steps
        procedure_steps: editingSOP.procedure_steps || [],
        exceptions_notes: editingSOP.exceptions_notes || "",
        related_sop_ids: editingSOP.related_sop_ids || [],
        visibility: editingSOP.visibility,
        tags: editingSOP.tags?.join(", ") || "",
        next_review_at: editingSOP.next_review_at?.split("T")[0] || "",
      });
    } else {
      setSelectedTools([]);
      form.reset({
        title: "",
        department_id: inheritedDepartmentId || "",
        purpose: "",
        scope: "",
        owner_role: "",
        tools_systems: [],
        sop_format: "narrative",
        procedure_content: "",
        procedure_steps: [],
        exceptions_notes: "",
        related_sop_ids: [],
        visibility: "department_only",
        tags: "",
        next_review_at: "",
      });
    }
  }, [editingSOP, inheritedDepartmentId, form]);

  const addProcedureStep = (isChecklistItem = false) => {
    append({
      id: crypto.randomUUID(),
      order: fields.length + 1,
      title: "",
      description: "",
      isChecklistItem,
    });
  };

  const toggleTool = (tool: string) => {
    const newTools = selectedTools.includes(tool)
      ? selectedTools.filter((t) => t !== tool)
      : [...selectedTools, tool];
    setSelectedTools(newTools);
    form.setValue("tools_systems", newTools);
  };

  const addCustomTool = () => {
    if (customTool.trim() && !selectedTools.includes(customTool.trim())) {
      const newTools = [...selectedTools, customTool.trim()];
      setSelectedTools(newTools);
      form.setValue("tools_systems", newTools);
      setCustomTool("");
    }
  };

  const onSubmit = async (values: FormValues) => {
    const tags = values.tags
      ? values.tags.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    // Build procedure steps from either rich text content or step list
    const procedureSteps: ProcedureStep[] = values.procedure_steps.map((step, idx) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: idx + 1,
    }));

    // If using narrative format with rich text, store it in a single step
    if ((sopFormat === "narrative" || sopFormat === "flowchart") && values.procedure_content && procedureSteps.length === 0) {
      procedureSteps.push({
        id: crypto.randomUUID(),
        title: "Procedure",
        description: values.procedure_content,
        order: 1,
      });
    }

    try {
      if (isEditing && editingSOP) {
        await updateSOP.mutateAsync({
          id: editingSOP.id,
          title: values.title,
          purpose: values.purpose || null,
          scope: values.scope || null,
          owner_role: values.owner_role || null,
          tools_systems: selectedTools,
          procedure_steps: procedureSteps,
          exceptions_notes: values.exceptions_notes || null,
          related_sop_ids: values.related_sop_ids || [],
          visibility: values.visibility,
          tags: tags,
          next_review_at: values.next_review_at || null,
        });
        onSuccess?.(editingSOP.id);
      } else {
        const result = await createSOP.mutateAsync({
          department_id: values.department_id,
          title: values.title,
          purpose: values.purpose,
          scope: values.scope,
          owner_role: values.owner_role,
          tools_systems: selectedTools,
          procedure_steps: procedureSteps,
          exceptions_notes: values.exceptions_notes,
          related_sop_ids: values.related_sop_ids,
          visibility: values.visibility,
          tags: tags,
          next_review_at: values.next_review_at,
        });
        onSuccess?.(result.id);
      }
      onOpenChange(false);
      form.reset();
      setSelectedTools([]);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit SOP" : "Create SOP"}</DialogTitle>
          <DialogDescription>
            Standard Operating Procedures document processes and workflows.
            {!hasDepartmentContext && " Select a department to assign this SOP to."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SOP Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Customer Onboarding Process" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Department Selection - Only show if no inherited department */}
              {!hasDepartmentContext && (
                <FormField
                  control={form.control}
                  name="department_id"
                  render={({ field }) => (
                    <FormItem>
                      <DepartmentSelect
                        value={field.value}
                        onChange={(val) => field.onChange(val || "")}
                        label="Department *"
                        placeholder="Select department"
                        showCompanyWideOption={false}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Visibility */}
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

                {/* SOP Format */}
                <FormField
                  control={form.control}
                  name="sop_format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SOP Format</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SOP_FORMATS.map((format) => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose how this SOP will be structured
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Owner Role */}
              <FormField
                control={form.control}
                name="owner_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Role</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Operations Manager" {...field} />
                    </FormControl>
                    <FormDescription>Who is responsible for maintaining this SOP?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Purpose */}
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

              {/* Scope & Audience */}
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope & Audience</FormLabel>
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

              <Separator />

              {/* Tools & Systems - Multi-select */}
              <div className="space-y-3">
                <FormLabel>Tools / Systems Used</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TOOLS.map((tool) => (
                    <Badge
                      key={tool}
                      variant={selectedTools.includes(tool) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTool(tool)}
                    >
                      {tool}
                    </Badge>
                  ))}
                </div>
                {/* Show selected custom tools */}
                {selectedTools.filter((t) => !COMMON_TOOLS.includes(t)).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTools
                      .filter((t) => !COMMON_TOOLS.includes(t))
                      .map((tool) => (
                        <Badge
                          key={tool}
                          variant="default"
                          className="cursor-pointer"
                          onClick={() => toggleTool(tool)}
                        >
                          {tool} ×
                        </Badge>
                      ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tool..."
                    value={customTool}
                    onChange={(e) => setCustomTool(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTool();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addCustomTool}>
                    Add
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Procedure Section - Varies by format */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base">Step-by-Step Procedure</FormLabel>
                  {(sopFormat === "checklist" || sopFormat === "hybrid") && (
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => addProcedureStep(false)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Step
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => addProcedureStep(true)}>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        Add Checklist Item
                      </Button>
                    </div>
                  )}
                  {sopFormat === "narrative" && (
                    <Button type="button" variant="outline" size="sm" onClick={() => addProcedureStep(false)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Step
                    </Button>
                  )}
                </div>

                {/* Rich text editor for narrative/flowchart formats */}
                {(sopFormat === "narrative" || sopFormat === "flowchart") && fields.length === 0 && (
                  <FormField
                    control={form.control}
                    name="procedure_content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RichTextField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Document the step-by-step procedure..."
                            minHeight="200px"
                          />
                        </FormControl>
                        <FormDescription>
                          Use formatting to structure your procedure. You can also add individual steps above.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Step-by-step list for checklist/hybrid or when steps exist */}
                {(fields.length > 0 || sopFormat === "checklist") && (
                  <div className="space-y-3">
                    {fields.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No steps added yet. Click "Add Step" or "Add Checklist Item" to begin.
                      </p>
                    )}

                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex gap-3 items-start p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2 pt-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          {field.isChecklistItem ? (
                            <Checkbox disabled className="h-5 w-5" />
                          ) : (
                            <Badge variant="secondary" className="h-6 w-6 p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                          )}
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
                )}
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

              {/* Tags & Review Date */}
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

              <FormField
                control={form.control}
                name="next_review_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial / Next Review Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>When should this SOP be reviewed next?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
