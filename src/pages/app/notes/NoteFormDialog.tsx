import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip } from "lucide-react";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { applyTemplateToForm } from "@/hooks/useTemplates";
import { LinkPicker } from "@/components/LinkPicker";
import { FolderPicker } from "@/components/folders";
import { CrmClientPicker } from "@/components/crm/CrmClientPicker";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  access_level: z.string().default("company"),
  folder_id: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
});

type NoteFormValues = z.infer<typeof noteSchema>;

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: any;
  folderId?: string | null;
  projectId?: string | null;
  crmClientId?: string | null;
  onSuccess?: (noteId: string) => void;
}

const colors = [
  { value: null, label: "None", color: "transparent" },
  { value: "#2563eb", label: "Blue", color: "#2563eb" },
  { value: "#16a34a", label: "Green", color: "#16a34a" },
  { value: "#dc2626", label: "Red", color: "#dc2626" },
  { value: "#9333ea", label: "Purple", color: "#9333ea" },
  { value: "#ea580c", label: "Orange", color: "#ea580c" },
  { value: "#0891b2", label: "Cyan", color: "#0891b2" },
];

export function NoteFormDialog({
  open,
  onOpenChange,
  note,
  folderId,
  projectId: initialProjectId,
  crmClientId,
  onSuccess,
}: NoteFormDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!note;

  // CRM client link state
  const [linkedCrmClientId, setLinkedCrmClientId] = React.useState<string | null>(crmClientId || null);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: "",
      content: "",
      access_level: "company",
      folder_id: folderId || null,
      color: null,
      project_id: initialProjectId || null,
    },
  });

  React.useEffect(() => {
    if (note) {
      form.reset({
        title: note.title,
        content: note.content || "",
        access_level: note.access_level,
        folder_id: note.folder_id || null,
        color: note.color || null,
        project_id: note.project_id || null,
      });
    } else {
      form.reset({
        title: "",
        content: "",
        access_level: "company",
        folder_id: folderId || null,
        color: null,
        project_id: initialProjectId || null,
      });
      setLinkedCrmClientId(crmClientId || null);
    }
  }, [note, folderId, form, initialProjectId, crmClientId, open]);

  const mutation = useMutation({
    mutationFn: async (values: NoteFormValues) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const noteData = {
        title: values.title,
        content: values.content || null,
        access_level: values.access_level,
        folder_id: values.folder_id || null,
        color: values.color || null,
        project_id: values.project_id || null,
      };

      let noteId: string;

      if (isEditing && note) {
        const { error } = await supabase
          .from("notes")
          .update(noteData)
          .eq("id", note.id);
        if (error) throw error;
        noteId = note.id;
      } else {
        const { data, error } = await supabase.from("notes").insert({
          ...noteData,
          company_id: activeCompanyId,
          created_by: user.id,
        }).select("id").single();
        if (error) throw error;
        noteId = data.id;

        // Create CRM client link if specified
        if (linkedCrmClientId) {
          try {
            await supabase.rpc("create_entity_link", {
              p_company_id: activeCompanyId,
              p_from_type: "crm_client",
              p_from_id: linkedCrmClientId,
              p_to_type: "note",
              p_to_id: noteId,
              p_link_type: "related",
            });
          } catch (linkError) {
            console.error("Failed to link note to client:", linkError);
          }
        }
      }

      return noteId;
    },
    onSuccess: (noteId: string) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["project-notes"] });
      queryClient.invalidateQueries({ queryKey: ["entity-links"] });
      queryClient.invalidateQueries({ queryKey: ["crm-hub-links"] });
      queryClient.invalidateQueries({ queryKey: ["crm-hub-notes"] });
      toast.success(isEditing ? "Note updated" : "Note created");
      onOpenChange(false);
      form.reset();
      setLinkedCrmClientId(null);
      onSuccess?.(noteId);
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong");
    },
  });

  const onSubmit = (values: NoteFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Note" : "New Note"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="space-y-4 py-2">
            {!isEditing && (
              <TemplateSelector
                templateType="note"
                hasExistingData={!!form.watch("title") || !!form.watch("content")}
                onSelect={(template, overwrite) => {
                  const payload = template.payload as Record<string, any>;
                  const currentValues = form.getValues();
                  const newValues = applyTemplateToForm(currentValues, payload, overwrite);
                  form.reset(newValues);
                }}
              />
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Note title" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RichTextField
                      label="Content"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Write your note..."
                      minHeight="180px"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="access_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="folder_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Folder</FormLabel>
                    <FormControl>
                      <FolderPicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="No folder"
                        allowClear={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <FormControl>
                    <LinkPicker
                      type="project"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Link to project (optional)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CRM Client Link */}
            <div className="space-y-2">
              <FormLabel>Client</FormLabel>
              <CrmClientPicker
                value={linkedCrmClientId}
                onChange={setLinkedCrmClientId}
                placeholder="Link to client (optional)"
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex gap-2">
                    {colors.map((color) => (
                      <button
                        key={color.label}
                        type="button"
                        onClick={() => field.onChange(color.value)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          field.value === color.value ? "border-foreground scale-110" : "border-transparent",
                          !color.value && "bg-muted"
                        )}
                        style={color.value ? { backgroundColor: color.value } : undefined}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                <Paperclip className="h-4 w-4 flex-shrink-0" />
                <span>You can add file attachments after creating the note.</span>
              </div>
            )}
            </DialogBody>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Note"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
