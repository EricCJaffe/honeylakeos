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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePipelineStages, useSalesPipelines } from "@/hooks/useSalesPipelines";
import { useCreateOpportunity, useUpdateOpportunity, SalesOpportunity } from "@/hooks/useSalesOpportunities";
import { useCrmClients } from "@/hooks/useCrmClients";
import { useSalesCampaigns } from "@/hooks/useSalesCampaigns";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pipeline_id: z.string().min(1, "Pipeline is required"),
  stage_id: z.string().min(1, "Stage is required"),
  crm_client_id: z.string().optional(),
  value_amount: z.coerce.number().optional(),
  expected_close_date: z.string().optional(),
  source_campaign_id: z.string().optional(),
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
  const { data: pipelines = [] } = useSalesPipelines();
  const { clients = [] } = useCrmClients();
  const { data: campaigns = [] } = useSalesCampaigns();
  const createOpportunity = useCreateOpportunity();
  const updateOpportunity = useUpdateOpportunity();

  const isEdit = !!opportunity;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      pipeline_id: pipelineId || "",
      stage_id: "",
      crm_client_id: "",
      value_amount: undefined,
      expected_close_date: "",
      source_campaign_id: "",
    },
  });

  const selectedPipelineId = form.watch("pipeline_id");
  const { data: stages = [] } = usePipelineStages(selectedPipelineId);

  useEffect(() => {
    if (opportunity) {
      form.reset({
        name: opportunity.name,
        pipeline_id: opportunity.pipeline_id,
        stage_id: opportunity.stage_id,
        crm_client_id: opportunity.crm_client_id || "",
        value_amount: opportunity.value_amount ?? undefined,
        expected_close_date: opportunity.expected_close_date || "",
        source_campaign_id: opportunity.source_campaign_id || "",
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
    if (isEdit) {
      await updateOpportunity.mutateAsync({
        id: opportunity.id,
        name: data.name,
        stage_id: data.stage_id,
        crm_client_id: data.crm_client_id || null,
        value_amount: data.value_amount ?? null,
        expected_close_date: data.expected_close_date || null,
        source_campaign_id: data.source_campaign_id || null,
      });
    } else {
      await createOpportunity.mutateAsync({
        name: data.name,
        pipeline_id: data.pipeline_id,
        stage_id: data.stage_id,
        crm_client_id: data.crm_client_id,
        value_amount: data.value_amount,
        expected_close_date: data.expected_close_date,
        source_campaign_id: data.source_campaign_id,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  const isPending = createOpportunity.isPending || updateOpportunity.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Opportunity" : "New Opportunity"}</DialogTitle>
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
                    <Input placeholder="Deal name..." {...field} />
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No client</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.person_full_name || c.org_name || "Unnamed"}
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No campaign</SelectItem>
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
