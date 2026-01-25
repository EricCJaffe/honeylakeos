import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Loader2, User, Building2 } from "lucide-react";
import { useCompanyTerminology } from "@/hooks/useCompanyTerminology";
import {
  useCrmClients,
  CrmClient,
  CrmClientType,
  CrmLifecycleStatus,
  EntityKind,
} from "@/hooks/useCrmClients";

const crmFormSchema = z.object({
  entity_kind: z.enum(["organization", "individual"]),
  type: z.enum(["b2c", "b2b", "mixed"]),
  lifecycle_status: z.enum(["prospect", "client"]),
  person_full_name: z.string().optional().nullable(),
  person_email: z.string().email().optional().or(z.literal("")).nullable(),
  person_phone: z.string().optional().nullable(),
  org_name: z.string().optional().nullable(),
  org_email: z.string().email().optional().or(z.literal("")).nullable(),
  org_phone: z.string().optional().nullable(),
  org_website: z.string().url().optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.entity_kind === "organization") {
      return !!data.org_name;
    }
    return !!data.person_full_name;
  },
  {
    message: "Required field is missing",
    path: ["org_name"],
  }
);

type CrmFormValues = z.infer<typeof crmFormSchema>;

interface CrmFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: CrmClient | null;
}

export function CrmFormDialog({ open, onOpenChange, client }: CrmFormDialogProps) {
  const { getSingular } = useCompanyTerminology();
  const { createClient, updateClient } = useCrmClients();
  const clientTerm = getSingular("crm_client");
  const isEditing = !!client;

  const form = useForm<CrmFormValues>({
    resolver: zodResolver(crmFormSchema),
    defaultValues: {
      entity_kind: "organization",
      type: "mixed",
      lifecycle_status: "prospect",
      person_full_name: "",
      person_email: "",
      person_phone: "",
      org_name: "",
      org_email: "",
      org_phone: "",
      org_website: "",
      notes: "",
    },
  });

  const entityKind = form.watch("entity_kind");

  // Reset form when client changes
  React.useEffect(() => {
    if (client) {
      form.reset({
        entity_kind: client.entity_kind as EntityKind,
        type: client.type as CrmClientType,
        lifecycle_status: client.lifecycle_status as CrmLifecycleStatus,
        person_full_name: client.person_full_name || "",
        person_email: client.person_email || "",
        person_phone: client.person_phone || "",
        org_name: client.org_name || "",
        org_email: client.org_email || "",
        org_phone: client.org_phone || "",
        org_website: client.org_website || "",
        notes: client.notes || "",
      });
    } else {
      form.reset({
        entity_kind: "organization",
        type: "mixed",
        lifecycle_status: "prospect",
        person_full_name: "",
        person_email: "",
        person_phone: "",
        org_name: "",
        org_email: "",
        org_phone: "",
        org_website: "",
        notes: "",
      });
    }
  }, [client, form]);

  const onSubmit = async (values: CrmFormValues) => {
    const cleanValues = {
      entity_kind: values.entity_kind as EntityKind,
      type: values.type as CrmClientType,
      lifecycle_status: values.lifecycle_status as CrmLifecycleStatus,
      person_full_name: values.person_full_name || null,
      person_email: values.person_email || null,
      person_phone: values.person_phone || null,
      org_name: values.entity_kind === "organization" ? (values.org_name || null) : null,
      org_email: values.entity_kind === "organization" ? (values.org_email || null) : null,
      org_phone: values.entity_kind === "organization" ? (values.org_phone || null) : null,
      org_website: values.entity_kind === "organization" ? (values.org_website || null) : null,
      notes: values.notes || null,
    };

    if (isEditing && client) {
      await updateClient.mutateAsync({ id: client.id, ...cleanValues });
    } else {
      await createClient.mutateAsync(cleanValues);
    }
    onOpenChange(false);
  };

  const isSubmitting = createClient.isPending || updateClient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit ${clientTerm}` : `New ${clientTerm}`}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update ${clientTerm.toLowerCase()} information`
              : `Add a new ${clientTerm.toLowerCase()} to your CRM`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="space-y-6 py-2">
            {/* Entity Kind Toggle */}
            <div className="space-y-2">
              <Label>Record Type</Label>
              <FormField
                control={form.control}
                name="entity_kind"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={(value) => value && field.onChange(value)}
                        className="justify-start"
                      >
                        <ToggleGroupItem value="organization" className="gap-2">
                          <Building2 className="h-4 w-4" />
                          Organization
                        </ToggleGroupItem>
                        <ToggleGroupItem value="individual" className="gap-2">
                          <User className="h-4 w-4" />
                          Individual
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="b2c">B2C (Consumer)</SelectItem>
                        <SelectItem value="b2b">B2B (Business)</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lifecycle_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="client">{clientTerm}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Organization Fields */}
            {entityKind === "organization" && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Organization Details
                </div>

                <FormField
                  control={form.control}
                  name="org_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Acme Inc."
                          autoFocus
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="org_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="contact@acme.com"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="org_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+1 234 567 8900"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="org_website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://acme.com"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Primary Contact / Individual Fields */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                {entityKind === "organization" ? "Primary Contact" : "Person Details"}
              </div>

              <FormField
                control={form.control}
                name="person_full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Full Name {entityKind === "individual" && "*"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        autoFocus={entityKind === "individual"}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="person_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="person_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 234 567 8900"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RichTextField
                      label="Notes"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Additional notes..."
                      minHeight="100px"
                      helperText={`Internal notes about this ${clientTerm.toLowerCase()}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
              />
            </DialogBody>

            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : `Create ${clientTerm}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
