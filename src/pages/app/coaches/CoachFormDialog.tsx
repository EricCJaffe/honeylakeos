import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RichTextField } from "@/components/ui/rich-text-field";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCoachProfiles, CoachProfile, CoachProfileType } from "@/hooks/useCoachProfiles";
import { useExternalContacts } from "@/hooks/useExternalContacts";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const coachFormSchema = z.object({
  profile_type: z.enum(["coach", "partner", "vendor"]),
  specialties: z.string().optional(),
  bio: z.string().optional(),
  // External contact fields for new contact creation
  contact_mode: z.enum(["existing", "new"]),
  external_contact_id: z.string().optional(),
  full_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  title: z.string().optional(),
  organization_name: z.string().optional(),
}).refine((data) => {
  if (data.contact_mode === "existing") {
    return !!data.external_contact_id;
  } else {
    return !!data.full_name;
  }
}, {
  message: "Please select an existing contact or provide a name for a new one",
  path: ["external_contact_id"],
});

type CoachFormValues = z.infer<typeof coachFormSchema>;

interface CoachFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: CoachProfile | null;
}

export function CoachFormDialog({ open, onOpenChange, profile }: CoachFormDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { createProfile, updateProfile, isCreating, isUpdating } = useCoachProfiles();
  const externalContactsQuery = useExternalContacts({ showArchived: false });
  const contacts = externalContactsQuery.data || [];
  const [contactMode, setContactMode] = useState<"existing" | "new">("existing");

  const form = useForm<CoachFormValues>({
    resolver: zodResolver(coachFormSchema),
    defaultValues: {
      profile_type: "coach",
      specialties: "",
      bio: "",
      contact_mode: "existing",
      external_contact_id: "",
      full_name: "",
      email: "",
      phone: "",
      title: "",
      organization_name: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        profile_type: profile.profile_type as CoachProfileType,
        specialties: Array.isArray(profile.specialties) 
          ? (profile.specialties as string[]).join(", ") 
          : "",
        bio: profile.bio || "",
        contact_mode: "existing",
        external_contact_id: profile.external_contact_id,
        full_name: "",
        email: "",
        phone: "",
        title: "",
        organization_name: "",
      });
      setContactMode("existing");
    } else {
      form.reset({
        profile_type: "coach",
        specialties: "",
        bio: "",
        contact_mode: "existing",
        external_contact_id: "",
        full_name: "",
        email: "",
        phone: "",
        title: "",
        organization_name: "",
      });
      setContactMode("existing");
    }
  }, [profile, form, open]);

  const onSubmit = async (values: CoachFormValues) => {
    try {
      const specialtiesArray = values.specialties
        ? values.specialties.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      if (profile) {
        await updateProfile({
          id: profile.id,
          input: {
            profile_type: values.profile_type,
            specialties: specialtiesArray,
            bio: values.bio || undefined,
          },
        });
      } else {
        let contactId = values.external_contact_id;

        // Create new external contact if needed
        if (values.contact_mode === "new" && values.full_name) {
          if (!activeCompanyId) throw new Error("No active company");

          const { data: userData } = await supabase.auth.getUser();

          const { data: newContact, error: contactError } = await supabase
            .from("external_contacts")
            .insert({
              company_id: activeCompanyId,
              full_name: values.full_name,
              email: values.email || null,
              phone: values.phone || null,
              title: values.title || null,
              organization_name: values.organization_name || null,
              created_by: userData.user?.id || null,
            })
            .select()
            .single();

          if (contactError) throw contactError;
          contactId = newContact.id;
        }

        if (!contactId) {
          toast.error("Please select or create a contact");
          return;
        }

        await createProfile({
          external_contact_id: contactId,
          profile_type: values.profile_type,
          specialties: specialtiesArray,
          bio: values.bio || undefined,
        });
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving coach profile:", error);
      toast.error(error.message || "Failed to save profile");
    }
  };

  const isSubmitting = isCreating || isUpdating;
  const isEditing = !!profile;

  // Filter out contacts that already have a coach profile (when creating new)
  const availableContacts = contacts;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Profile" : "Add Coach/Partner"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="profile_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <Tabs
                value={contactMode}
                onValueChange={(v) => {
                  setContactMode(v as "existing" | "new");
                  form.setValue("contact_mode", v as "existing" | "new");
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Existing Contact</TabsTrigger>
                  <TabsTrigger value="new">New Contact</TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="external_contact_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Contact</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a contact" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableContacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.full_name}
                                {contact.organization_name && ` (${contact.organization_name})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="new" className="space-y-4 mt-4">
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title/Role</FormLabel>
                          <FormControl>
                            <Input placeholder="Life Coach" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="organization_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Coaching" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <FormField
              control={form.control}
              name="specialties"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialties (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="Leadership, Career, Wellness" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RichTextField
                      label="Bio/Notes"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Brief description or notes about this person..."
                      minHeight="100px"
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
                {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
