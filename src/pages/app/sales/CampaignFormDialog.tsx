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
import { RichTextField } from "@/components/ui/rich-text-field";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateCampaign,
  useUpdateCampaign,
  CAMPAIGN_TYPE_LABELS,
  SalesCampaign,
  CampaignType,
} from "@/hooks/useSalesCampaigns";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["email", "event", "referral", "content", "other"]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: SalesCampaign | null;
}

export function CampaignFormDialog({ open, onOpenChange, campaign }: CampaignFormDialogProps) {
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();

  const isEdit = !!campaign;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "other",
      start_date: "",
      end_date: "",
      description: "",
    },
  });

  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name,
        type: campaign.type,
        start_date: campaign.start_date || "",
        end_date: campaign.end_date || "",
        description: campaign.description || "",
      });
    } else {
      form.reset({
        name: "",
        type: "other",
        start_date: "",
        end_date: "",
        description: "",
      });
    }
  }, [campaign, form]);

  const onSubmit = async (data: FormValues) => {
    if (isEdit && campaign) {
      await updateCampaign.mutateAsync({
        id: campaign.id,
        name: data.name,
        type: data.type as CampaignType,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        description: data.description || null,
      });
    } else {
      await createCampaign.mutateAsync({
        name: data.name,
        type: data.type as CampaignType,
        start_date: data.start_date,
        end_date: data.end_date,
        description: data.description,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  const isPending = createCampaign.isPending || updateCampaign.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Campaign" : "New Campaign"}</DialogTitle>
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
                    <Input placeholder="Campaign name..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CAMPAIGN_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
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
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RichTextField
                      label="Description"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Campaign details..."
                      minHeight="80px"
                    />
                  </FormControl>
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
