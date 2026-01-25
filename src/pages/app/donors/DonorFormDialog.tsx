import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateDonorProfile, DonorStatus } from "@/hooks/useDonors";
import { useCrmClients } from "@/hooks/useCrmClients";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const donorSchema = z.object({
  crm_client_id: z.string().min(1, "Please select a contact"),
  donor_status: z.enum(["prospect", "active", "lapsed", "major"]).default("prospect"),
  notes: z.string().optional(),
});

type DonorFormValues = z.infer<typeof donorSchema>;

interface DonorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DonorFormDialog({ open, onOpenChange }: DonorFormDialogProps) {
  const { clients, isLoading: clientsLoading } = useCrmClients();
  const createDonor = useCreateDonorProfile();

  const form = useForm<DonorFormValues>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      crm_client_id: "",
      donor_status: "prospect",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        crm_client_id: "",
        donor_status: "prospect",
        notes: "",
      });
    }
  }, [open, form]);

  const onSubmit = (values: DonorFormValues) => {
    createDonor.mutate(
      {
        crm_client_id: values.crm_client_id,
        donor_status: values.donor_status as DonorStatus,
        notes: values.notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      }
    );
  };

  const getClientName = (client: { person_full_name: string | null; org_name: string | null }) => {
    return client.person_full_name || client.org_name || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Donor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="crm_client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientsLoading ? (
                        <SelectItem value="" disabled>Loading...</SelectItem>
                      ) : clients.length === 0 ? (
                        <SelectItem value="" disabled>No contacts available</SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {getClientName(client)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="donor_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="lapsed">Lapsed</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this donor..."
                      {...field}
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
              <Button type="submit" disabled={createDonor.isPending}>
                {createDonor.isPending ? "Creating..." : "Add Donor"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
