import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RichTextField } from "@/components/ui/rich-text-field";
import { usePipelineStages, useSalesPipelines } from "@/hooks/useSalesPipelines";
import { useCreateOpportunity, useUpdateOpportunity, SalesOpportunity } from "@/hooks/useSalesOpportunities";
import { useCrmClients, getCrmClientDisplayName } from "@/hooks/useCrmClients";
import { useSalesCampaigns } from "@/hooks/useSalesCampaigns";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description_rich_text: z.string().optional(),
  pipeline_id: z.string().min(1, "Pipeline is required"),
  stage_id: z.string().min(1, "Stage is required"),
  crm_client_id: z.string().optional(),
  value_amount: z.coerce.number().optional(),
  expected_close_date: z.string().optional(),
  source_campaign_id: z.string().optional(),
  // Follow-up fields (only for create)
  follow_up_date: z.date().optional(),
  follow_up_task_title: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OpportunityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId?: string;
  opportunity?: SalesOpportunity;
}

export function OpportunityFormDialog({
  open,
  onOpenChange,
  pipelineId,
  opportunity,
}: OpportunityFormDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: pipelines = [] } = useSalesPipelines();
  const crmResult = useCrmClients();
  const clients = crmResult?.clients ?? [];
  const { data: campaigns = [] } = useSalesCampaigns();
  const createOpportunity = useCreateOpportunity();
  const updateOpportunity = useUpdateOpportunity();

  const isEdit = !!opportunity;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description_rich_text: "",
      pipeline_id: pipelineId || "",
      stage_id: "",
      crm_client_id: "",
      value_amount: undefined,
      expected_close_date: "",
      source_campaign_id: "",
      follow_up_date: addDays(new Date(), 3), // Default to 3 days from now
      follow_up_task_title: "",
    },
  });

  const selectedPipelineId = form.watch("pipeline_id");
  const { data: stages = [] } = usePipelineStages(selectedPipelineId);
  const oppName = form.watch("name");

  // Update default follow-up task title when name changes
  useEffect(() => {
    if (!isEdit && oppName && !form.getValues("follow_up_task_title")) {
      form.setValue("follow_up_task_title", `Follow up: ${oppName}`);
    }
  }, [oppName, isEdit, form]);

  useEffect(() => {
    if (opportunity) {
      form.reset({
        name: opportunity.name,
        description_rich_text: opportunity.description_rich_text || "",
        pipeline_id: opportunity.pipeline_id,
        stage_id: opportunity.stage_id,
        crm_client_id: opportunity.crm_client_id || "",
        value_amount: opportunity.value_amount ?? undefined,
        expected_close_date: opportunity.expected_close_date || "",
        source_campaign_id: opportunity.source_campaign_id || "",
        follow_up_date: undefined,
        follow_up_task_title: "",
      });
    } else if (pipelineId) {
      form.setValue("pipeline_id", pipelineId);
    }
  }, [opportunity, pipelineId, form]);

  // Set first stage when pipeline changes
  useEffect(() => {
    if (stages.length > 0 && !form.getValues("stage_id")) {
      form.setValue("stage_id", stages[0].id);
    }
  }, [stages, form]);

  const onSubmit = async (data: FormValues) => {
    if (!activeCompanyId || !user) {
      toast.error("Missing context");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit) {
        await updateOpportunity.mutateAsync({
          id: opportunity.id,
          name: data.name,
          description_rich_text: data.description_rich_text || null,
          stage_id: data.stage_id,
          crm_client_id: data.crm_client_id || null,
          value_amount: data.value_amount ?? null,
          expected_close_date: data.expected_close_date || null,
          source_campaign_id: data.source_campaign_id || null,
        });
      } else {
        // Create opportunity
        const newOpp = await createOpportunity.mutateAsync({
          name: data.name,
          description_rich_text: data.description_rich_text,
          pipeline_id: data.pipeline_id,
          stage_id: data.stage_id,
          crm_client_id: data.crm_client_id,
          value_amount: data.value_amount,
          expected_close_date: data.expected_close_date,
          source_campaign_id: data.source_campaign_id,
          owner_user_id: user.id,
        });

        // Create follow-up task if date is provided
        if (data.follow_up_date && newOpp?.id) {
          const taskTitle = data.follow_up_task_title || `Follow up: ${data.name}`;
          
          // Create the task
          const { data: task, error: taskError } = await supabase
            .from("tasks")
            .insert({
              company_id: activeCompanyId,
              title: taskTitle,
              description: `Follow-up task for pipeline opportunity: ${data.name}`,
              status: "to_do",
              priority: "medium",
              due_date: format(data.follow_up_date, "yyyy-MM-dd"),
              created_by: user.id,
            })
            .select("id")
            .single();

          if (taskError) {
            console.error("Failed to create follow-up task:", taskError);
            toast.error("Opportunity created, but follow-up task failed");
          } else if (task) {
            // Assign task to current user
            await supabase.from("task_assignees").insert({
              task_id: task.id,
              user_id: user.id,
            });

            // Link task to opportunity
            await supabase.from("entity_links").insert({
              company_id: activeCompanyId,
              from_type: "sales_opportunity",
              from_id: newOpp.id,
              to_type: "task",
              to_id: task.id,
              link_type: "related",
              created_by: user.id,
            });

            // Link task to CRM client if one is selected
            if (data.crm_client_id) {
              await supabase.from("entity_links").insert({
                company_id: activeCompanyId,
                from_type: "client",
                from_id: data.crm_client_id,
                to_type: "task",
                to_id: task.id,
                link_type: "related",
                created_by: user.id,
              });
            }

            // Audit log
            await supabase.from("audit_logs").insert({
              company_id: activeCompanyId,
              entity_type: "sales_opportunity",
              entity_id: newOpp.id,
              action: "follow_up_task_created",
              actor_user_id: user.id,
              metadata: { task_id: task.id, task_title: taskTitle },
            });

            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["entity-links"] });
          }
        }
      }

      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = isSubmitting || createOpportunity.isPending || updateOpportunity.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Pipeline Opportunity" : "New Pipeline Opportunity"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Deal name..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description_rich_text"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RichTextField
                      label="Description"
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Describe the opportunity, scope, background..."
                      minHeight="100px"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="pipeline_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pipeline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pipelines.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    {selectedPipelineId && stages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No stages configured.{" "}
                        <a href="/app/sales/pipelines" className="text-primary underline">
                          Manage pipeline stages
                        </a>
                      </p>
                    ) : (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!selectedPipelineId}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedPipelineId ? "Select stage" : "Select a pipeline first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stages.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="crm_client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Client</FormLabel>
                  <Select 
                    value={field.value || "__none__"} 
                    onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No client</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {getCrmClientDisplayName(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="value_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_close_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Close</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source_campaign_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Campaign</FormLabel>
                  <Select 
                    value={field.value || "__none__"} 
                    onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No campaign</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow-up Task Section - Only show on create */}
            {!isEdit && (
              <div className="border-t pt-4 mt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Follow-Up Task</h4>
                  <p className="text-xs text-muted-foreground">
                    Create a follow-up task to stay on top of this opportunity.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="follow_up_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Follow-Up Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When should you follow up on this opportunity?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="follow_up_task_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Follow up: [Opportunity Name]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            </DialogBody>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
