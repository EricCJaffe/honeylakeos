import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useExternalContactMutations, ExternalContact } from "@/hooks/useExternalContacts";
import { toast } from "sonner";
import { useEffect } from "react";

const formSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  organization_name: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExternalContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: ExternalContact | null;
}

export function ExternalContactFormDialog({
  open,
  onOpenChange,
  contact,
}: ExternalContactFormDialogProps) {
  const { create, update } = useExternalContactMutations();
  const isEditing = !!contact;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      title: "",
      organization_name: "",
      website: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        full_name: contact.full_name,
        email: contact.email || "",
        phone: contact.phone || "",
        title: contact.title || "",
        organization_name: contact.organization_name || "",
        website: contact.website || "",
        notes: contact.notes || "",
      });
    } else {
      form.reset({
        full_name: "",
        email: "",
        phone: "",
        title: "",
        organization_name: "",
        website: "",
        notes: "",
      });
    }
  }, [contact, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && contact) {
        await update.mutateAsync({
          id: contact.id,
          full_name: values.full_name,
          email: values.email || null,
          phone: values.phone || null,
          title: values.title || null,
          organization_name: values.organization_name || null,
          website: values.website || null,
          notes: values.notes || null,
        });
        toast.success("Contact updated");
      } else {
        await create.mutateAsync({
          full_name: values.full_name,
          email: values.email || null,
          phone: values.phone || null,
          title: values.title || null,
          organization_name: values.organization_name || null,
          website: values.website || null,
          notes: values.notes || null,
        });
        toast.success("Contact created");
      }
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save contact";
      // Handle duplicate email error
      if (message.includes("external_contacts_company_email_unique")) {
        toast.error("A contact with this email already exists");
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Person Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Person Information
              </h3>
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 555 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title/Role</FormLabel>
                    <FormControl>
                      <Input placeholder="Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Organization Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Organization Information
              </h3>
              <FormField
                control={form.control}
                name="organization_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
                Additional Notes
              </h3>
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
                        placeholder="Additional notes about this contact..."
                        minHeight="80px"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || update.isPending}
              >
                {create.isPending || update.isPending
                  ? "Saving..."
                  : isEditing
                    ? "Update"
                    : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
